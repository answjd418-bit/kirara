/* Result popup only: convert the combined emotion graphic into a volumetric 3D view. */
(() => {
  const host = document.querySelector('#result-artwork-preview');
  const dialog = document.querySelector('#result-dialog');
  if (!host || !dialog) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sampleCache = new WeakMap();
  const loaderState = { promise: null };

  const ui = {
    hint: document.createElement('div'),
    status: document.createElement('div')
  };
  ui.hint.textContent = 'DRAG / ROTATE  ·  SCROLL / ZOOM  ·  R / RESET';
  ui.status.textContent = 'BUILDING 3D VIEW…';
  Object.assign(ui.hint.style, {
    position: 'absolute',
    left: '12px',
    bottom: '10px',
    fontSize: '10px',
    color: '#a1aaa5',
    letterSpacing: '.04em',
    pointerEvents: 'none',
    filter: 'none',
    zIndex: '2'
  });
  Object.assign(ui.status.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '.4rem .55rem',
    border: '1px solid #444',
    background: 'rgba(0,0,0,.85)',
    color: '#cfd5d2',
    font: '400 11px/1.3 "Roboto Mono", monospace',
    letterSpacing: '.04em',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    zIndex: '2',
    opacity: '0',
    transition: 'opacity .18s ease'
  });

  let THREE = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let root = null;
  let rAF = 0;
  let result = null;
  let resizeObserver = null;
  let sourceCanvas = null;
  let disposed = false;
  let buildToken = 0;

  const state = {
    width: 0,
    height: 0,
    pointerX: 0,
    pointerY: 0,
    hover: false,
    dragging: false,
    dragX: 0,
    dragY: 0,
    theta: 0,
    thetaTarget: 0,
    phi: Math.PI * 0.5,
    phiTarget: Math.PI * 0.5,
    radius: 4.2,
    radiusTarget: 4.2,
    autoSpin: 0.0027,
    lastTime: 0
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (loaderState.promise) return loaderState.promise;
    loaderState.promise = import('https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js').catch(error => {
      loaderState.promise = null;
      throw error;
    });
    return loaderState.promise;
  }

  function setStatus(text, visible) {
    if (text) ui.status.textContent = text;
    ui.status.style.opacity = visible ? '1' : '0';
  }

  function findSourceCanvas() {
    return host.querySelector('canvas:not(.emotion-webgl-canvas)');
  }

  function hideSource(flag) {
    sourceCanvas = findSourceCanvas();
    if (sourceCanvas) sourceCanvas.style.visibility = flag ? 'hidden' : '';
  }

  function ensureUI() {
    if (!ui.hint.isConnected) host.appendChild(ui.hint);
    if (!ui.status.isConnected) host.appendChild(ui.status);
  }

  async function ensureScene() {
    if (renderer) {
      if (!renderer.domElement.isConnected) host.appendChild(renderer.domElement);
      ensureUI();
      resize();
      return true;
    }
    try {
      THREE = await loadThree();
      if (disposed) return false;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.setClearColor(0x000000, 1);
      renderer.domElement.className = 'emotion-webgl-canvas';
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute('aria-label', 'Interactive 3D emotion graphic. Drag to rotate, scroll to zoom, press R to reset.');
      Object.assign(renderer.domElement.style, {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: 'grab',
        touchAction: 'none',
        pointerEvents: 'auto',
        filter: 'none',
        zIndex: '1'
      });

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      root = new THREE.Group();
      scene.add(root);

      const ambient = new THREE.AmbientLight(0xffffff, 1.35);
      scene.add(ambient);
      const key = new THREE.PointLight(0x8ff7ff, 22, 18, 2.0);
      key.position.set(2.4, 2.8, 4.6);
      scene.add(key);
      const rim = new THREE.PointLight(0xff6fff, 14, 16, 1.8);
      rim.position.set(-3.2, -1.6, 3.4);
      scene.add(rim);
      const fill = new THREE.PointLight(0xffffff, 6, 12, 2.0);
      fill.position.set(0.2, -2.4, 3.2);
      scene.add(fill);

      ensureUI();
      host.style.position = 'relative';
      host.appendChild(renderer.domElement);
      host.appendChild(ui.hint);
      host.appendChild(ui.status);
      bindPointerEvents(renderer.domElement);
      resize();

      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(host);
      return true;
    } catch (error) {
      console.warn('[emotion-3d] Could not start 3D viewer:', error);
      setStatus('3D VIEW UNAVAILABLE', true);
      hideSource(false);
      return false;
    }
  }

  function resize() {
    if (!renderer || !camera) return;
    const rect = host.getBoundingClientRect();
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(state.width, state.height, false);
    camera.aspect = state.width / state.height;
    camera.updateProjectionMatrix();
  }

  function resetView() {
    state.theta = state.thetaTarget = 0;
    state.phi = state.phiTarget = Math.PI * 0.5;
    state.radius = state.radiusTarget = 4.2;
  }

  function disposeMaterial(material) {
    if (!material) return;
    if (Array.isArray(material)) {
      material.forEach(disposeMaterial);
      return;
    }
    for (const key of ['map', 'alphaMap']) {
      if (material[key]) material[key].dispose?.();
    }
    material.dispose?.();
  }

  function disposeObject(node) {
    if (!node) return;
    node.traverse(obj => {
      obj.geometry?.dispose?.();
      disposeMaterial(obj.material);
    });
    node.removeFromParent?.();
  }

  function clearRoot() {
    if (!root) return;
    while (root.children.length) disposeObject(root.children[0]);
  }

  function sampleImage(image, maxPoints = 1800) {
    if (sampleCache.has(image)) return sampleCache.get(image);
    const canvas = document.createElement('canvas');
    const longest = Math.max(image.width, image.height) || 1;
    const scale = Math.min(1, 112 / longest);
    canvas.width = Math.max(8, Math.round(image.width * scale));
    canvas.height = Math.max(8, Math.round(image.height * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = [];
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const a = data[i + 3] / 255;
        if (a < 0.16) continue;
        const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        pixels.push({
          x: x / Math.max(1, canvas.width - 1),
          y: y / Math.max(1, canvas.height - 1),
          r, g, b, a, lum
        });
      }
    }
    const step = Math.max(1, Math.ceil(pixels.length / maxPoints));
    const sampled = [];
    for (let i = 0; i < pixels.length; i += step) sampled.push(pixels[i]);
    const payload = { pixels: sampled, width: image.width || 1, height: image.height || 1 };
    sampleCache.set(image, payload);
    return payload;
  }

  function colorFromPixels(pixels) {
    if (!pixels.length) return new THREE.Color(0xffffff);
    let r = 0, g = 0, b = 0, sum = 0;
    for (const p of pixels) {
      const w = Math.max(0.15, p.a);
      r += p.r * w; g += p.g * w; b += p.b * w; sum += w;
    }
    return new THREE.Color(r / sum, g / sum, b / sum);
  }

  function buildLayerVolume(layer, meta, index, total) {
    const group = new THREE.Group();
    const image = layer.texture.texture;
    const sample = sampleImage(image);
    const averageColor = colorFromPixels(sample.pixels);

    const texture = new THREE.Texture(image);
    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.premultiplyAlpha = true;

    const width = meta.width;
    const height = meta.height;
    const thickness = clamp(Math.max(width, height) * 0.18, 0.11, 0.42);

    const planeGeometry = new THREE.PlaneGeometry(width, height);
    const shells = 5;
    for (let i = 0; i < shells; i++) {
      const t = shells === 1 ? 0.5 : i / (shells - 1);
      const shell = new THREE.Mesh(
        planeGeometry,
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: lerp(0.08, 0.28, 1 - Math.abs(t - 0.5) * 2),
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        })
      );
      shell.position.z = (t - 0.5) * thickness;
      const expand = 1 + Math.abs(t - 0.5) * 0.045;
      shell.scale.set(expand, expand, 1);
      group.add(shell);
    }

    const count = sample.pixels.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = sample.pixels[i];
      const x = (p.x - 0.5) * width;
      const y = (0.5 - p.y) * height;
      const depth = (p.lum - 0.5) * thickness * 2.2 + (Math.random() - 0.5) * thickness * 0.9;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = depth;
      colors[i * 3] = p.r;
      colors[i * 3 + 1] = p.g;
      colors[i * 3 + 2] = p.b;
    }
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(pointsGeometry, new THREE.PointsMaterial({
      size: clamp(Math.max(width, height) * 0.028, 0.012, 0.055),
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    }));
    group.add(points);

    const orbGeometry = new THREE.SphereGeometry(clamp(Math.max(width, height) * 0.045, 0.028, 0.085), 14, 14);
    const orbCount = Math.min(18, Math.max(6, Math.round(count / 90)));
    for (let i = 0; i < orbCount; i++) {
      const p = sample.pixels[(i * Math.floor(count / orbCount || 1)) % Math.max(1, count)] || sample.pixels[0];
      if (!p) continue;
      const sphere = new THREE.Mesh(
        orbGeometry,
        new THREE.MeshPhongMaterial({
          color: new THREE.Color(p.r, p.g, p.b),
          emissive: new THREE.Color(p.r, p.g, p.b),
          emissiveIntensity: 0.9,
          transparent: true,
          opacity: 0.78,
          shininess: 90
        })
      );
      sphere.position.set(
        (p.x - 0.5) * width,
        (0.5 - p.y) * height,
        (p.lum - 0.5) * thickness * 3.1 + (Math.random() - 0.5) * 0.12
      );
      sphere.scale.setScalar(0.8 + Math.random() * 0.55);
      group.add(sphere);
    }

    const haloGeometry = new THREE.TorusGeometry(clamp(Math.max(width, height) * 0.35, 0.18, 0.85), clamp(Math.max(width, height) * 0.01, 0.005, 0.016), 10, 64);
    const halo = new THREE.Mesh(
      haloGeometry,
      new THREE.MeshBasicMaterial({
        color: averageColor,
        transparent: true,
        opacity: 0.26,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    halo.rotation.x = Math.PI * (0.18 + (index % 3) * 0.12);
    halo.rotation.y = Math.PI * (0.15 + (index % 4) * 0.08);
    halo.scale.setScalar(0.45 + Math.min(1.15, Math.max(width, height) * 0.45));
    group.add(halo);

    group.position.copy(meta.position);
    group.rotation.z = layer.angle;
    group.rotation.x = (index % 2 ? 1 : -1) * 0.14;
    group.rotation.y = ((index % 3) - 1) * 0.18;
    group.userData = {
      basePosition: meta.position.clone(),
      baseRotation: group.rotation.clone(),
      averageColor,
      phase: index * 0.9 + Math.random() * Math.PI,
      bobX: 0.22 + Math.random() * 0.28,
      bobY: 0.26 + Math.random() * 0.22,
      bobZ: 0.28 + Math.random() * 0.25,
      spin: 0.14 + Math.random() * 0.16,
      tilt: 0.08 + Math.random() * 0.12
    };
    return group;
  }

  function buildConstellation() {
    if (!result || !root) return;
    clearRoot();
    const { frame, offsetX, offsetY, artwork, layers } = result;
    const basis = Math.min(frame.width, frame.height);
    const unit = Math.max(artwork.width, artwork.height) || 1;
    const total = Math.max(1, layers.length);

    const background = new THREE.Points(
      (() => {
        const g = new THREE.BufferGeometry();
        const count = 250;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 5.3;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 3.4;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 3.8;
          const c = Math.random() > 0.5 ? [0.55, 0.95, 1.0] : [1.0, 0.45, 0.92];
          colors.set(c, i * 3);
        }
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        return g;
      })(),
      new THREE.PointsMaterial({
        size: 0.022,
        vertexColors: true,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      })
    );
    background.userData = { background: true, phase: 0 };
    root.add(background);

    layers.forEach((layer, index) => {
      const image = layer.texture.texture;
      const ratio = (layer.size * basis * 1.02) / Math.max(image.width || 1, image.height || 1) / unit;
      const x = (layer.x * frame.width + offsetX - artwork.width / 2) / unit;
      const y = -(layer.y * frame.height + offsetY - artwork.height / 2) / unit;
      const z = (index - (total - 1) / 2) * clamp(0.22 / Math.max(1, total / 5), 0.04, 0.12);
      const width = (image.width || 1) * ratio;
      const height = (image.height || 1) * ratio;
      const volume = buildLayerVolume(layer, {
        width,
        height,
        position: new THREE.Vector3(x * 2.3, y * 2.3, z * 3.1)
      }, index, total);
      root.add(volume);
    });

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.sub(center);
    const radius = Math.max(size.x, size.y, size.z, 1.1);
    state.radius = state.radiusTarget = clamp(radius * 1.8, 3.1, 6.8);
    state.theta = state.thetaTarget = 0;
    state.phi = state.phiTarget = Math.PI * 0.5;
  }

  async function rebuildFromResult(nextResult) {
    result = nextResult;
    const token = ++buildToken;
    if (!dialog.open) return;
    ensureUI();
    setStatus('BUILDING 3D VIEW…', true);
    const ok = await ensureScene();
    if (!ok || token !== buildToken || disposed) return;
    hideSource(true);
    buildConstellation();
    setStatus('', false);
    if (dialog.open) start();
  }

  function updateCamera(dt) {
    const ease = reduced.matches ? 1 : clamp(dt * 8, 0.08, 0.18);
    state.theta = lerp(state.theta, state.thetaTarget, ease);
    state.phi = lerp(state.phi, state.phiTarget, ease);
    state.radius = lerp(state.radius, state.radiusTarget, ease);
    if (!state.dragging && !reduced.matches) {
      state.thetaTarget += state.autoSpin * dt * 60;
    }

    const phi = clamp(state.phi, 0.22, Math.PI - 0.22);
    const radius = clamp(state.radius, 2.2, 8.2);
    const x = Math.sin(phi) * Math.sin(state.theta) * radius;
    const y = Math.cos(phi) * radius;
    const z = Math.sin(phi) * Math.cos(state.theta) * radius;
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  }

  function animate(now) {
    rAF = 0;
    if (!renderer || !scene || !camera || !dialog.open || !result) return;
    const time = now * 0.001;
    const dt = Math.max(0.001, Math.min(0.05, state.lastTime ? time - state.lastTime : 1 / 60));
    state.lastTime = time;

    updateCamera(dt);
    const pointerLiftX = state.hover ? state.pointerX * 0.08 : 0;
    const pointerLiftY = state.hover ? state.pointerY * 0.06 : 0;

    for (const child of root.children) {
      if (child.userData.background) {
        child.rotation.z += dt * 0.04;
        continue;
      }
      const u = child.userData;
      child.position.x = u.basePosition.x + Math.sin(time * (0.8 + u.bobX) + u.phase) * 0.08 + pointerLiftX;
      child.position.y = u.basePosition.y + Math.cos(time * (0.7 + u.bobY) + u.phase * 0.7) * 0.06 - pointerLiftY;
      child.position.z = u.basePosition.z + Math.sin(time * (0.9 + u.bobZ) + u.phase * 1.2) * 0.10;
      child.rotation.x = u.baseRotation.x + Math.sin(time * (0.6 + u.spin) + u.phase) * u.tilt + state.pointerY * 0.18;
      child.rotation.y = u.baseRotation.y + Math.cos(time * (0.7 + u.spin) + u.phase) * u.tilt + state.pointerX * 0.24;
      child.rotation.z = u.baseRotation.z + Math.sin(time * 0.55 + u.phase) * 0.09;
    }

    renderer.render(scene, camera);
    rAF = requestAnimationFrame(animate);
  }

  function start() {
    if (!renderer || !result || rAF) return;
    if (!renderer.domElement.isConnected) host.appendChild(renderer.domElement);
    ensureUI();
    resize();
    hideSource(true);
    state.lastTime = 0;
    rAF = requestAnimationFrame(animate);
  }

  function stop() {
    cancelAnimationFrame(rAF);
    rAF = 0;
  }

  function pointerFromEvent(event) {
    const rect = host.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
    state.pointerX = clamp(x, -1, 1);
    state.pointerY = clamp(y, -1, 1);
  }

  function bindPointerEvents(canvas) {
    canvas.addEventListener('pointerdown', event => {
      pointerFromEvent(event);
      state.dragging = true;
      state.dragX = event.clientX;
      state.dragY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
      canvas.focus({ preventScroll: true });
    });
    canvas.addEventListener('pointermove', event => {
      pointerFromEvent(event);
      state.hover = true;
      if (!state.dragging) return;
      const dx = event.clientX - state.dragX;
      const dy = event.clientY - state.dragY;
      state.dragX = event.clientX;
      state.dragY = event.clientY;
      state.thetaTarget += dx * 0.0085;
      state.phiTarget = clamp(state.phiTarget + dy * 0.0075, 0.28, Math.PI - 0.28);
    });
    function endDrag(event) {
      if (event) pointerFromEvent(event);
      state.dragging = false;
      canvas.style.cursor = 'grab';
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('lostpointercapture', endDrag);
    canvas.addEventListener('pointerleave', () => { state.hover = false; });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      state.radiusTarget = clamp(state.radiusTarget * Math.exp(event.deltaY * 0.001), 2.3, 8.2);
    }, { passive: false });
    canvas.addEventListener('dblclick', () => resetView());
    canvas.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if (!['r', 'home', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', '+', '=', '-'].includes(key)) return;
      event.preventDefault();
      if (key === 'r' || key === 'home') resetView();
      else if (key === 'arrowleft') state.thetaTarget -= 0.18;
      else if (key === 'arrowright') state.thetaTarget += 0.18;
      else if (key === 'arrowup') state.phiTarget = clamp(state.phiTarget - 0.12, 0.28, Math.PI - 0.28);
      else if (key === 'arrowdown') state.phiTarget = clamp(state.phiTarget + 0.12, 0.28, Math.PI - 0.28);
      else state.radiusTarget = clamp(state.radiusTarget * (key === '-' ? 1.08 : 0.92), 2.3, 8.2);
    });
  }

  function teardown() {
    disposed = true;
    stop();
    hideSource(false);
    resizeObserver?.disconnect();
    clearRoot();
    renderer?.dispose?.();
    renderer?.domElement?.remove?.();
    ui.hint.remove();
    ui.status.remove();
  }

  dialog.addEventListener('close', () => {
    stop();
    hideSource(false);
  });
  dialog.addEventListener('cancel', () => {
    stop();
    hideSource(false);
  });

  new MutationObserver(() => {
    if (!dialog.open) return;
    if (result) rebuildFromResult(result);
  }).observe(dialog, { attributes: true, attributeFilter: ['open'] });

  window.addEventListener('beforeunload', teardown, { once: true });

  window.emotionOrbit = {
    setResult(nextResult) {
      rebuildFromResult(nextResult);
    }
  };
})();
