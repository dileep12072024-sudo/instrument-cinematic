export function createAmbience() {
  let context, master, birds, enabled = false, muted = false, volume = .4;

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
    const windGain = context.createGain(); windGain.gain.value = .3;
    master = context.createGain(); master.gain.value = 0;
    breeze.connect(highpass).connect(lowpass).connect(windGain);
    breeze.connect(rustle).connect(rustleGain).connect(windGain);
    windGain.connect(master);
    master.connect(context.destination);
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
    const gain = context.createGain(); gain.gain.value = 0;
    gain.gain.setTargetAtTime(.85, context.currentTime, .6);
    birds.connect(gain).connect(master); birds.start();
  }

  async function sync() {
    if (!context) return;
    if (!enabled || muted) {
      await context.suspend();
      return;
    }
    await context.resume();
    if (!enabled || muted) return context.suspend();
    master.gain.setTargetAtTime(volume * .65, context.currentTime, .3);
  }

  return {
    async setEnabled(value) {
      enabled = value;
      try { if (enabled && !context) prepare(); await sync(); if (enabled && !birds) await prepareBirds(); }
      catch (error) { enabled = false; await context?.close(); context = null; birds = null; throw error; }
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
  };
}
