export function createAmbience() {
  let context, master, birds, birdPromise, enabled = false, muted = false, volume = .4;
  let rainGain, rainFilter, windGain, birdGain, insectGain, lastMix = '';
  let weather = { rainFactor: 0, windSpeed: 0 }, indoors = false, windSpeed = 0, daylight = 0;
  const birdLevel = () => .85 * daylight * (1 - Math.max(0, Math.min(1, weather.rainFactor || 0)) * .95) * (indoors ? .35 : 1);

  function mixWeather() {
    if (!context || !rainGain) return;
    const rain = Math.max(0, Math.min(1, weather.rainFactor || 0));
    const wind = Math.max(0, Math.min(1, windSpeed / 60));
    const key = `${rain.toFixed(2)}:${wind.toFixed(2)}:${indoors}:${!!birdGain}:${daylight.toFixed(2)}`;
    if (key === lastMix) return;
    lastMix = key;
    const now = context.currentTime;
    const heard = rain && Math.sqrt(rain); // light drizzle should still be audible
    rainGain.gain.setTargetAtTime(heard * (indoors ? .2 : .95), now, .7);
    rainFilter.frequency.setTargetAtTime(indoors ? 950 : 4200 + rain * 3200, now, .7);
    windGain.gain.setTargetAtTime((.015 + wind * .5) * (indoors ? .2 : 1), now, .7);
    birdGain?.gain.setTargetAtTime(birdLevel(), now, .7);
    // Night insects around the building; rain and indoors quieten them.
    insectGain?.gain.setTargetAtTime(.32 * (1 - daylight) * (1 - rain * .85) * (indoors ? .3 : 1), now, 1.5);
  }

  function prepare() {
    context = new AudioContext();
    // Mobile browsers start audio only on a gesture and resume asynchronously: fade in whenever it starts running.
    context.onstatechange = () => { if (context?.state === 'running' && enabled && !muted) master.gain.setTargetAtTime(volume * .65, context.currentTime, .3); };
    const buffer = context.createBuffer(2, context.sampleRate * 12, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel);
      let brown = 0;
      for (let i = 0; i < samples.length; i++) {
        const white = Math.random() * 2 - 1;
        brown = (brown + .02 * white) / 1.02;
        const fade = Math.min(1, i / 2400, (samples.length - 1 - i) / 2400);
        samples[i] = (brown * 3.5 + white * .08) * fade;
      }
    }
    const breeze = context.createBufferSource(); breeze.buffer = buffer; breeze.loop = true;
    const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 90;
    const lowpass = context.createBiquadFilter(); lowpass.frequency.value = 1100; lowpass.Q.value = .4;
    const rustle = context.createBiquadFilter(); rustle.type = 'bandpass'; rustle.frequency.value = 2400; rustle.Q.value = .55;
    const rustleGain = context.createGain(); rustleGain.gain.value = .2;
    windGain = context.createGain(); windGain.gain.value = 0;
    master = context.createGain(); master.gain.value = 0;
    breeze.connect(highpass).connect(lowpass).connect(windGain);
    breeze.connect(rustle).connect(rustleGain).connect(windGain);
    windGain.connect(master);
    master.connect(context.destination);
    // Layer a diffuse stereo hiss with irregular short impacts for rain on foliage/paving.
    const rainBuffer = context.createBuffer(2, context.sampleRate * 17, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const samples = rainBuffer.getChannelData(channel);
      let impact = 0;
      for (let i = 0; i < samples.length; i++) {
        if (Math.random() < .0015) impact = .3 + Math.random() * .7;
        impact *= .985;
        samples[i] = (Math.random() * 2 - 1) * (.16 + impact * .5);
      }
    }
    const rainSource = context.createBufferSource(); rainSource.buffer = rainBuffer; rainSource.loop = true;
    const rainHighpass = context.createBiquadFilter(); rainHighpass.type = 'highpass'; rainHighpass.frequency.value = 240;
    rainFilter = context.createBiquadFilter(); rainFilter.type = 'lowpass'; rainFilter.Q.value = .4;
    rainGain = context.createGain(); rainGain.gain.value = 0;
    rainSource.connect(rainHighpass).connect(rainFilter).connect(rainGain).connect(master); rainSource.start();
    lastMix = ''; mixWeather();
    // Slow filter movement creates gusts without a repeating melody or sharp loop boundary.
    const gust = context.createOscillator(); gust.frequency.value = .075;
    const depth = context.createGain(); depth.gain.value = 350;
    gust.connect(depth).connect(lowpass.frequency);
    breeze.start(); gust.start();
    // Crickets: a few individuals with their own pitch, chirp rhythm and place in the stereo field.
    const seconds = 9, rate = context.sampleRate, insects = context.createBuffer(2, rate * seconds, rate);
    const left = insects.getChannelData(0), right = insects.getChannelData(1);
    for (let k = 0; k < 6; k++) {
      const pitch = 4100 + Math.random() * 1300, pulse = 26 + Math.random() * 12, period = .45 + Math.random() * .6, pan = Math.random();
      for (let start = Math.random() * period; start < seconds - .2; start += period * (.85 + Math.random() * .3)) {
        const pulses = 3 + Math.floor(Math.random() * 3), length = pulses / pulse, gainK = .05 + Math.random() * .05;
        for (let i = Math.floor(start * rate), end = Math.floor((start + length) * rate); i < end; i++) {
          const t = i / rate - start, envelope = Math.max(0, Math.sin(Math.PI * ((t * pulse) % 1)));
          const sample = Math.sin(2 * Math.PI * pitch * t) * envelope * envelope * gainK;
          left[i] += sample * (1 - pan); right[i] += sample * pan;
        }
      }
    }
    const insectSource = context.createBufferSource(); insectSource.buffer = insects; insectSource.loop = true;
    insectGain = context.createGain(); insectGain.gain.value = 0;
    insectSource.connect(insectGain).connect(master); insectSource.start();
  }

  async function prepareBirds() {
    // Generous limit: on a slow phone link this competes with the 20 MB campus download.
    const response = await fetch('/media/birds.mp3', { signal: AbortSignal.timeout(90000) });
    if (!response.ok) throw new Error('Bird ambience could not be loaded');
    const recording = await context.decodeAudioData(await response.arrayBuffer());
    const fade = Math.round(recording.sampleRate * 1.2), length = recording.length - fade;
    const loop = context.createBuffer(recording.numberOfChannels, length, recording.sampleRate);
    // Blend the recording's tail into its start so the natural calls loop without a click or gap.
    for (let c = 0; c < recording.numberOfChannels; c++) {
      const input = recording.getChannelData(c), output = loop.getChannelData(c);
      output.set(input.subarray(0, length));
      for (let i = 0; i < fade; i++) {
        const t = i / fade;
        output[i] = input[length + i] * (1 - t) + input[i] * t;
      }
    }
    birds = context.createBufferSource(); birds.buffer = loop; birds.loop = true;
    birdGain = context.createGain(); birdGain.gain.value = 0;
    birds.connect(birdGain).connect(master); birds.start(); mixWeather();
  }

  async function sync() {
    if (!context) return;
    if (!enabled || muted) {
      await context.suspend();
      return;
    }
    // Autoplay policy can leave the context suspended until the first gesture.
    // Do not hold asset decoding hostage to that browser decision.
    try { await Promise.race([context.resume(), new Promise(resolve => setTimeout(resolve, 80))]); } catch {}
    if (!enabled || muted) return context.suspend();
    if (context.state === 'running') master.gain.setTargetAtTime(volume * .65, context.currentTime, .3);
  }

  const api = {
    setDaylight(value) { daylight = Math.max(0, Math.min(1, value)); mixWeather(); },
    get birdLevel() { return birdLevel(); },
    setWeather(value, sheltered = false, speed = value.windSpeed || 0) {
      weather = value; indoors = sheltered; windSpeed = speed; mixWeather();
    },
    async setEnabled(value) {
      enabled = value;
      try {
        if (enabled && !context) prepare();
        await sync();
        if (enabled && !birds) {
          birdPromise ||= prepareBirds().finally(() => { birdPromise = null; });
          // A missing recording must not silence the generated rain and wind.
          await birdPromise.catch(error => {
            console.warn(error.message);
            setTimeout(() => { if (enabled && !birds && !birdPromise) api.setEnabled(true).catch(() => {}); }, 20000); // retry later
          });
        }
      } catch (error) { enabled = false; await context?.close(); context = null; birds = null; birdPromise = null; throw error; }
    },
    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
      if (master && context) master.gain.setTargetAtTime(volume * .65, context.currentTime, .1);
    },
    async setMuted(value) { muted = value; await sync(); },
    get enabled() { return enabled; },
    get muted() { return muted; },
    get volume() { return volume; },
    get context() { return context; },
    get birdsReady() { return !!birds; },
    // Thunder for a lightning strike: low filtered rumble arriving after the light (sound is slower).
    thunder(delay = 2) {
      if (!context || !enabled || muted) return;
      const rate = context.sampleRate, length = 5 + Math.random() * 3, burst = context.createBuffer(2, rate * length, rate);
      for (let c = 0; c < 2; c++) {
        const d = burst.getChannelData(c); let low = 0;
        for (let i = 0; i < d.length; i++) { low += (Math.random() * 2 - 1 - low) * .02; const t = i / rate; d[i] = low * 6 * Math.min(1, t * 4) * Math.exp(-t * .9) * (1 + .6 * Math.sin(t * 3.1)); }
      }
      const source = context.createBufferSource(); source.buffer = burst;
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 180 + 400 / (1 + delay);
      const gain = context.createGain(); gain.gain.value = (indoors ? .35 : .85) * Math.min(1, 2.2 / (1 + delay));
      source.connect(filter).connect(gain).connect(master); source.start(context.currentTime + delay);
    },
    get weatherMix() { return { rain: rainGain?.gain.value || 0, wind: windGain?.gain.value || 0, insects: insectGain?.gain.value || 0, indoors, rainCutoff: rainFilter?.frequency.value || 0 }; },
  };
  return api;
}
