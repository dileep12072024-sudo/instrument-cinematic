import * as T from 'three';
import * as SunCalc from 'suncalc';

export function lunarState(date, location) {
  const light = SunCalc.getMoonIllumination(date);
  const position = SunCalc.getMoonPosition(date, location.latitude, location.longitude);
  return { phase: light.phase, illumination: light.fraction, altitude: position.altitude, azimuth: position.azimuth, rotation: (light.angle - position.parallacticAngle) * Math.PI / 180 };
}

export function solarState(date, location) {
  const position = SunCalc.getPosition(date, location.latitude, location.longitude);
  return { ...position, night: 1 - T.MathUtils.smoothstep(position.altitude, -6, 4) };
}

export function campusDate(hour, now = Date.now()) {
  const local = new Date(now + 330 * 60000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + hour * 3600000 - 330 * 60000);
}

export function skyDirection(altitude, azimuth) {
  // Approximate site heading from the north-up reference plan: +X is ENE.
  const bearing = T.MathUtils.degToRad(azimuth + 22), elevation = T.MathUtils.degToRad(altitude);
  return new T.Vector3(Math.sin(bearing) * Math.cos(elevation), Math.sin(elevation), -Math.cos(bearing) * Math.cos(elevation));
}

export function createLiveSky(scene, camera) {
  const uniforms = { time: { value: 0 }, night: { value: 0 }, cover: { value: 0 }, storm: { value: 0 }, horizon: { value: scene.fog.color } };
  const noise = `
    float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
    float noise3(vec3 p) { vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
    float fbm(vec3 p) { float n=0.,a=.5; for(int i=0;i<4;i++){n+=noise3(p)*a;p=p*2.03+3.1;a*=.5;}return n; }
  `;
  const vertexShader = 'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
  const sky = new T.Mesh(new T.SphereGeometry(280, 32, 20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, uniforms, vertexShader,
    fragmentShader: `${noise}
      varying vec3 vDirection; uniform float night; uniform vec3 horizon;
      void main(){vec3 d=normalize(vDirection); float h=max(d.y,0.);
        vec3 day=mix(horizon,vec3(.14,.34,.57),pow(h,.45));
        vec3 dark=mix(horizon,vec3(.001,.002,.006),pow(h,.4));
        vec3 p=d*650.; float star=step(.9975,hash(floor(p)))*pow(max(0.,1.-length(fract(p)-.5)*2.),5.);
        gl_FragColor=vec4(mix(day,dark,night)+star*night*.8,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb=mix(linearToOutputTexel(vec4(horizon,1.)).rgb,gl_FragColor.rgb,smoothstep(0.,.35,h));
      }`
  })); sky.name = 'Day night sky'; sky.renderOrder = -10; scene.add(sky);
  const clouds = new T.Mesh(new T.SphereGeometry(270, 32, 20), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, transparent: true, uniforms, vertexShader,
    fragmentShader: `${noise}
      varying vec3 vDirection; uniform float time,cover,night,storm;
      void main(){vec3 d=normalize(vDirection);vec3 p=d*5.+vec3(time*.007,0.,time*.004);
        float n=fbm(p);float density=smoothstep(.68-cover*.42,.88-cover*.32,n);
        density=max(density,cover*.65); density*=smoothstep(0.,.15,d.y);
        vec3 color=mix(vec3(.84,.86,.86),vec3(.10,.12,.18),night);
        color*=mix(1.,.42,storm);color*=.75+n*.4;
        gl_FragColor=vec4(color,density*cover);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  })); clouds.name = 'Live moving cloud cover'; clouds.renderOrder = 3; scene.add(clouds);
  const texture = new T.TextureLoader().load('/media/moon-reference.jpg'); texture.colorSpace = T.SRGBColorSpace;
  const moonUniforms = { photo: { value: texture }, light: { value: new T.Vector3(0, 0, 1) }, opacity: { value: 0 } };
  const moon = new T.Mesh(new T.PlaneGeometry(11.5, 11.5), new T.ShaderMaterial({
    uniforms: moonUniforms, transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv;varying vec3 vSkyDirection;void main(){vUv=uv;vSkyDirection=(modelMatrix*vec4(position,1.)).xyz-cameraPosition;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.9999;}',
    fragmentShader: `uniform sampler2D photo;uniform vec3 light;uniform float opacity;varying vec2 vUv;varying vec3 vSkyDirection;
      void main(){vec2 p=(vUv-.5)*2.;float r=length(p);if(r>1.||vSkyDirection.y<=0.)discard;
        vec3 n=vec3(p,sqrt(max(0.,1.-r*r)));float lit=smoothstep(0.,.045,dot(n,light));if(lit<.001)discard;
        vec2 uv=vec2((154.+vUv.x*430.)/736.,1.-(255.+(1.-vUv.y)*430.)/1104.);
        vec3 albedo=texture2D(photo,uv).rgb;gl_FragColor=vec4(albedo*.72,opacity*lit*(1.-smoothstep(.989,1.,r)));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  })); moon.name = 'Photographic phased moon'; moon.visible = false; moon.renderOrder = 1; scene.add(moon);
  const moonDirection = new T.Vector3();
  const moonlight = new T.DirectionalLight('#c7d8ff', 0); scene.add(moonlight);
  let illumination = 0;
  return {
    moon, uniforms,
    phase(state) {
      const z = 2 * state.illumination - 1, xy = Math.sqrt(Math.max(0, 1 - z * z));
      moonUniforms.light.value.set(Math.sin(state.rotation) * xy, Math.cos(state.rotation) * xy, z);
      illumination = state.illumination;
    },
    update(time, night, weather, reduced) {
      uniforms.time.value = reduced ? 0 : time; uniforms.night.value = night;
      uniforms.cover.value = weather.cloudCover / 100; uniforms.storm.value = weather.storm ? 1 : 0;
      sky.position.copy(camera.position); clouds.position.copy(camera.position);
      // Compose the lunar backdrop above the roofline, with a centred mobile framing.
      moonDirection.set(camera.aspect < .85 ? -.465 : -.25, .104, camera.aspect < .85 ? -.885 : -.968).normalize();
      moon.position.copy(camera.position).addScaledVector(moonDirection, 240); moon.lookAt(camera.position);
      // Cloud hides the moon: thinning from 30 % cover, gone by 85 %, and always gone while it rains.
      const clear = weather.storm || weather.rainFactor > 0 ? 0 : 1 - T.MathUtils.smoothstep(weather.cloudCover, 30, 85);
      const moonOpacity = T.MathUtils.smoothstep(night, .65, .95) * clear;
      moon.visible = moonOpacity > 0 && illumination > .005;
      moonUniforms.opacity.value = moonOpacity;
      moonlight.position.copy(moonDirection).multiplyScalar(80);
      moonlight.intensity = .14 * Math.pow(illumination, 1.4) * moonOpacity;
      // A light that is off still costs every lit pixel on integrated GPUs; only include it while it shines.
      moonlight.visible = moonlight.intensity > .001;
      // Lightning is handled in main.js, synchronised with thunder (this used to flash independently).
    }
  };
}
