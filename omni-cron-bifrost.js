import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.module.js';

const MAX_COLORS = 8;

const frag = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

  vec3 col = vec3(0.0);
  float a = 1.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    float cover = 0.0;
    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-6.0 / exp(6.0 * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }
    col = clamp(sumCol, 0.0, 1.0);
    a = uTransparent > 0 ? cover : 1.0;
  } else {
    vec2 s = q;
    for (int k = 0; k < 3; ++k) {
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float m = mix(m0, m1, kMix);
      col[k] = 1.0 - exp(-6.0 / exp(6.0 * m));
    }
    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
  }

  if (uNoise > 0.0001) {
    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  vec3 rgb = (uTransparent > 0) ? col * a : col;
  gl_FragColor = vec4(rgb, a);
}
`;

const vert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

function getSettingsFromDataAttributes(element) {
  if (!(element instanceof HTMLElement) || !element.dataset) return {};
  const settings = {};
  const data = element.dataset;
  for (const key in data) {
    let value = data[key];
    const parsedValue = parseFloat(value);
    if (!isNaN(parsedValue) && isFinite(parsedValue)) {
      settings[key] = (value.indexOf('.') === -1 && parsedValue === Math.floor(parsedValue)) ? parseInt(value, 10) : parsedValue;
    } else if (value === 'true') settings[key] = true;
    else if (value === 'false') settings[key] = false;
    else {
      try { settings[key] = JSON.parse(value); } catch (e) { settings[key] = value; }
    }
  }
  return settings;
}

function getTotalZoom(element) {
  let totalZoom = 1;
  let el = element;
  while (el && el !== document) {
    try {
      const style = window.getComputedStyle(el);
      const z = parseFloat(style.zoom) || 1;
      if (z !== 1) totalZoom *= z;
    } catch (e) { }
    el = el.parentElement;
  }
  return totalZoom;
}

class ColorBendsPureJS {
  constructor(container, settings) {
    this.container = container;
    this.settings = {
      rotation: 45, speed: 0.2, colors: [], transparent: true, autoRotate: 0,
      scale: 1, frequency: 1, warpStrength: 1, mouseInfluence: 1,
      parallax: 0.5, noise: 0.1, ...settings
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.material = null;
    this.mesh = null;
    this.rafId = null;
    this.resizeObserver = null;
    this.isVisible = false; // Состояние видимости
    this.clock = new THREE.Clock();
    
    this.pointerTarget = new THREE.Vector2(0, 0);
    this.pointerCurrent = new THREE.Vector2(0, 0);
    this.pointerSmooth = 8;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    const uColorsArray = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3(0, 0, 0));
    const isTransparent = this.settings.transparent;

    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpeed: { value: this.settings.speed },
        uRot: { value: new THREE.Vector2(1, 0) },
        uColorCount: { value: 0 },
        uColors: { value: uColorsArray },
        uTransparent: { value: isTransparent ? 1 : 0 },
        uScale: { value: this.settings.scale },
        uFrequency: { value: this.settings.frequency },
        uWarpStrength: { value: this.settings.warpStrength },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: this.settings.mouseInfluence },
        uParallax: { value: this.settings.parallax },
        uNoise: { value: this.settings.noise }
      },
      premultipliedAlpha: true,
      transparent: true
    });

    this.updateUniforms(this.settings);
    this.updateColors();

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, isTransparent ? 0 : 1);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.container.appendChild(this.renderer.domElement);

    this.handleResize = this.handleResize.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.loop = this.loop.bind(this);

    this.handleResize();
    
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.container);
    } else {
      window.addEventListener('resize', this.handleResize);
    }

    this.container.addEventListener('pointermove', this.handlePointerMove);

    // Умная пауза через IntersectionObserver
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const wasVisible = this.isVisible;
        this.isVisible = entry.isIntersecting;
        if (this.isVisible && !wasVisible) {
          this.loop(); // Запускаем цикл, когда блок появился
        } else if (!this.isVisible) {
          cancelAnimationFrame(this.rafId); // Стоп, если блок ушел
        }
      });
    }, { threshold: 0.05 });
    
    this.observer.observe(this.container);
  }

  updateUniforms(newSettings) {
    if (!this.material) return;
    this.material.uniforms.uSpeed.value = newSettings.speed;
    this.material.uniforms.uScale.value = newSettings.scale;
    this.material.uniforms.uFrequency.value = newSettings.frequency;
    this.material.uniforms.uWarpStrength.value = newSettings.warpStrength;
    this.material.uniforms.uMouseInfluence.value = newSettings.mouseInfluence;
    this.material.uniforms.uParallax.value = newSettings.parallax;
    this.material.uniforms.uNoise.value = newSettings.noise;
    this.material.uniforms.uTransparent.value = newSettings.transparent ? 1 : 0;
    if (this.renderer) this.renderer.setClearColor(0x000000, newSettings.transparent ? 0 : 1);
  }

  updateColors() {
    if (!this.material) return;
    const toVec3 = hex => {
      const h = hex.replace('#', '').trim();
      const v = h.length === 3
        ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
        : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      return new THREE.Vector3(v[0] / 255, v[1] / 255, v[2] / 255);
    };
    const colorsList = Array.isArray(this.settings.colors) ? this.settings.colors : [];
    const arr = colorsList.filter(Boolean).slice(0, MAX_COLORS).map(toVec3);
    for (let i = 0; i < MAX_COLORS; i++) {
      const vec = this.material.uniforms.uColors.value[i];
      if (i < arr.length) vec.copy(arr[i]);
      else vec.set(0, 0, 0);
    }
    this.material.uniforms.uColorCount.value = arr.length;
  }

  handleResize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.material.uniforms.uCanvas.value.set(w, h);
  }

  getPointerPosition(e) {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const zoom = getTotalZoom(this.container);
    const cssW = this.container.offsetWidth || 1;
    const cssH = this.container.offsetHeight || 1;
    const canvasW = this.renderer.domElement.width;
    const canvasH = this.renderer.domElement.height;
    const dpr = window.devicePixelRatio || 1;
    const canvasVisualWidth = canvasW / dpr;
    const canvasVisualHeight = canvasH / dpr;
    let x, y;
    if (isSafari) {
      x = (Math.max(0, Math.min(cssW, e.offsetX / zoom)) / cssW) * canvasVisualWidth;
      y = (Math.max(0, Math.min(cssH, e.offsetY / zoom)) / cssH) * canvasVisualHeight;
    } else {
      const rect = this.container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
      x = (e.clientX - rect.left) * (canvasVisualWidth / rect.width);
      y = (e.clientY - rect.top) * (canvasVisualHeight / rect.height);
    }
    return { x, y };
  }

  handlePointerMove(e) {
    const { x, y } = this.getPointerPosition(e);
    const w = this.renderer.domElement.width / (window.devicePixelRatio || 1);
    const h = this.renderer.domElement.height / (window.devicePixelRatio || 1);
    this.pointerTarget.set((x / w) * 2 - 1, -((y / h) * 2 - 1));
  }

  loop() {
    if (!this.isVisible) return; // Полная остановка, если не в кадре

    const dt = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;
    this.material.uniforms.uTime.value = elapsed;
    const deg = (this.settings.rotation % 360) + this.settings.autoRotate * elapsed;
    const rad = (deg * Math.PI) / 180;
    this.material.uniforms.uRot.value.set(Math.cos(rad), Math.sin(rad));
    this.pointerCurrent.lerp(this.pointerTarget, Math.min(1, dt * this.pointerSmooth));
    this.material.uniforms.uPointer.value.copy(this.pointerCurrent);

    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.loop);
  }

  dispose() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.observer) this.observer.disconnect();
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    if (this.mesh) {
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
    }
    if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement && this.renderer.domElement.parentElement === this.container) {
          this.container.removeChild(this.renderer.domElement);
        }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const containers = document.querySelectorAll('.color-bends-container');
  containers.forEach((container) => {
    const settings = getSettingsFromDataAttributes(container);
    const parentDiv = container.parentElement;
    if (parentDiv) {
      parentDiv.style.position = 'absolute';
      parentDiv.style.top = '0'; parentDiv.style.bottom = '0';
      parentDiv.style.left = '0'; parentDiv.style.right = '0';
      parentDiv.style.height = '100%'; parentDiv.style.minHeight = '100%';
    }
    if (container) new ColorBendsPureJS(container, settings);
  });
});
