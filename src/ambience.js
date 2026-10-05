export function createAmbience() {
  let context, master, birds, birdPromise, enabled = false, muted = false, volume = .4;
  let rainGain, rainFilter, windGain, birdGain, lastMix = '';
  let weather = { rainFactor: 0, windSpeed: 0 }, indoors = false, windSpeed = 0;

  function mixWeather() {
    if (!context || !rainGain) return;
    const rain = Math.max(0, Math.min(1, weather.rainFactor || 0));
    const wind = Math.max(0, Math.min(1, windSpeed / 60));
    const key = `${rain.toFixed(2)}:${wind.toFixed(2)}:${indoors}:${!!birdGain}`;
    if (key === lastMix) return;
    lastMix = key;
    const now = context.currentTime;
    rainGain.gain.setTargetAtTime(rain * (indoors ? .18 : .65), now, .7);
    rainFilter.frequency.setTargetAtTime(indoors ? 950 : 4200 + rain * 3200, now, .7);
    windGain.gain.setTargetAtTime((.015 + wind * .5) * (indoors ? .2 : 1), now, .7);
    birdGain?.gain.setTargetAtTime(.85 * (1 - rain * .95) * (indoors ? .35 : 1), now, .7);
  }

  function prepare() {
    context = new AudioContext();
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
  }

  async function prepareBirds() {
    const response = await fetch('/media/birds.mp3', { signal: AbortSignal.timeout(15000) });
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

  return {
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
          await birdPromise.catch(error => console.warn(error.message));
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
    get weatherMix() { return { rain: rainGain?.gain.value || 0, wind: windGain?.gain.value || 0, indoors, rainCutoff: rainFilter?.frequency.value || 0 }; },
  };
}
