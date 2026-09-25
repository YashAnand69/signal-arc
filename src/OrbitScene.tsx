import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const palette = [0xd5ff55, 0xff906b, 0xa894ff, 0x71dfff];

export function OrbitScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.z = 10.8;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' }); }
    catch { setFallback(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xb8c8ff, 1.5));
    const key = new THREE.PointLight(0xd5ff55, 42, 15);
    key.position.set(2.3, 2.6, 4);
    scene.add(key);
    const fill = new THREE.PointLight(0x8878ff, 25, 12);
    fill.position.set(-3, -1, -1);
    scene.add(fill);

    const world = new THREE.Group();
    scene.add(world);
    const core = new THREE.Group();
    world.add(core);
    core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.92, 4), new THREE.MeshPhysicalMaterial({ color: 0x203028, emissive: 0x153318, emissiveIntensity: 0.32, metalness: 0.34, roughness: 0.21, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true, clearcoat: 1 })));
    core.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.94, 2)), new THREE.LineBasicMaterial({ color: 0xe4ffb5, transparent: true, opacity: 0.57 })));
    const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), new THREE.MeshBasicMaterial({ color: 0xd5ff55 }));
    core.add(heart);

    const halos = new THREE.Group();
    world.add(halos);
    [1.55, 2.15, 2.8].forEach((radius, index) => {
      const group = new THREE.Group();
      group.rotation.set(0.58 + index * 0.42, -0.3 + index * 0.62, 0.22 - index * 0.42);
      group.add(new THREE.Mesh(new THREE.TorusGeometry(radius, index === 1 ? 0.012 : 0.007, 6, 240), new THREE.MeshBasicMaterial({ color: palette[index], transparent: true, opacity: index === 1 ? 0.48 : 0.31, depthWrite: false })));
      const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.019, 8, 100, Math.PI * (0.34 + index * 0.08)), new THREE.MeshBasicMaterial({ color: palette[index], transparent: true, opacity: 0.95, depthWrite: false }));
      arc.rotation.z = index * 2.1;
      group.add(arc);
      halos.add(group);
    });

    const satellites = new THREE.Group();
    world.add(satellites);
    for (let index = 0; index < 12; index += 1) {
      const angle = index * 2.399963;
      const radius = 1.65 + (index % 4) * 0.36;
      const size = index % 4 === 0 ? 0.105 : 0.043;
      const node = new THREE.Mesh(new THREE.SphereGeometry(size, 14, 14), new THREE.MeshBasicMaterial({ color: palette[index % palette.length] }));
      node.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.4) * 0.68, Math.sin(angle) * radius * 0.6);
      satellites.add(node);
    }

    const positions = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      const angle = index * 2.399963;
      const radius = 2.2 + ((index * 37) % 100) / 100 * 2.4;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = Math.sin(angle * 1.7) * radius * 0.62;
      positions[index * 3 + 2] = Math.sin(angle) * 1.8 - 1.2;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: 0xb9d4cb, size: 0.025, transparent: true, opacity: 0.52, depthWrite: false }));
    scene.add(particles);

    const pointer = new THREE.Vector2();
    const targetPointer = new THREE.Vector2();
    let drag = false, dragStartX = 0, dragStartY = 0, dragX = 0, dragY = 0, visible = true, scrollProgress = 0;
    let frame = 0, last = performance.now();
    const resize = () => { const { width, height } = host.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.position.z = width < 520 ? 12 : 10.8; camera.updateProjectionMatrix(); };
    const updateScroll = () => { const section = host.closest('.hero') || host; const rect = section.getBoundingClientRect(); scrollProgress = THREE.MathUtils.clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1); };
    const onMove = (event: PointerEvent) => { const bounds = host.getBoundingClientRect(); targetPointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2; targetPointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2; if (drag) { dragX += (event.clientX - dragStartX) * 0.007; dragY += (event.clientY - dragStartY) * 0.007; dragStartX = event.clientX; dragStartY = event.clientY; } };
    const onDown = (event: PointerEvent) => { drag = true; dragStartX = event.clientX; dragStartY = event.clientY; host.setPointerCapture(event.pointerId); host.classList.add('is-dragging'); };
    const onUp = () => { drag = false; host.classList.remove('is-dragging'); };
    const onLeave = () => { if (!drag) targetPointer.set(0, 0); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { rootMargin: '150px' });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(host); resizeObserver.observe(host);
    host.addEventListener('pointermove', onMove); host.addEventListener('pointerdown', onDown); host.addEventListener('pointerup', onUp); host.addEventListener('pointercancel', onUp); host.addEventListener('pointerleave', onLeave);
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll(); resize();

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      if (!visible) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      pointer.lerp(targetPointer, reducedMotion.matches ? 1 : Math.min(1, dt * 3));
      const motion = reducedMotion.matches ? 0 : 1;
      world.rotation.y = THREE.MathUtils.damp(world.rotation.y, scrollProgress * Math.PI * 1.28 * motion + dragX + pointer.x * 0.24 * motion, 2.6, dt);
      world.rotation.x = THREE.MathUtils.damp(world.rotation.x, -0.24 + scrollProgress * 0.78 * motion + dragY - pointer.y * 0.16 * motion, 2.6, dt);
      world.position.y = THREE.MathUtils.damp(world.position.y, ((0.5 - scrollProgress) * 0.35 - pointer.y * 0.12) * motion, 2, dt);
      core.rotation.y += dt * 0.27 * motion; core.rotation.x += dt * 0.14 * motion;
      heart.scale.setScalar(1 + Math.sin(now * 0.0021) * 0.065 * motion);
      halos.rotation.z = now * 0.000045 * motion; satellites.rotation.y = -now * 0.00011 * motion; particles.rotation.z = now * 0.000014 * motion;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect();
      host.removeEventListener('pointermove', onMove); host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointerup', onUp); host.removeEventListener('pointercancel', onUp); host.removeEventListener('pointerleave', onLeave); window.removeEventListener('scroll', updateScroll);
      scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach((material) => material.dispose()); } });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className={`orbit-scene${fallback ? ' orbit-fallback' : ''}`} role="img" aria-label="Interactive three-dimensional career signal orbit. Drag to rotate; scroll to change perspective.">
    {fallback && <div className="orbit-fallback-art" aria-hidden="true"><span/><span/><span/><b>✦</b></div>}
  </div>;
}
