import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';


export function OrbitScene({ mode, hasProfile }: { mode: string; hasProfile: boolean }) {
  const contextRef = useRef({ mode, hasProfile });
  useEffect(() => { contextRef.current = { mode, hasProfile }; }, [mode, hasProfile]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { setFallback(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    host.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    renderer.setClearColor(0x000000, 0);
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
    camera.position.set(0, 0.2, 9.6);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.04);
    scene.environment = environment.texture;
    room.dispose();
    pmrem.dispose();
    const light = new THREE.DirectionalLight('#dce8e2', 1.2);
    light.position.set(3, 5, 4); scene.add(light);
    const violetLight = new THREE.PointLight('#a7b6bd', 4, 15);
    violetLight.position.set(-3, -1, 3); scene.add(violetLight);
    const limeLight = new THREE.PointLight('#aabdaa', 4, 12);
    limeLight.position.set(2, 2, -2); scene.add(limeLight);

    const sculpture = new THREE.Group(); scene.add(sculpture);
    const chrome = new THREE.MeshPhysicalMaterial({ color: '#76877e', metalness: 0.65, roughness: 0.52, envMapIntensity: 0.65, clearcoat: 0.1, side: THREE.DoubleSide });
    const darkChrome = new THREE.MeshPhysicalMaterial({ color: '#31443c', metalness: 0.55, roughness: 0.6, envMapIntensity: 0.6, side: THREE.DoubleSide });
    const emissive = new THREE.MeshStandardMaterial({ color: '#a7ba99', emissive: '#7e9572', emissiveIntensity: 0.08, metalness: 0.5, roughness: 0.6 });
    const heart = new THREE.Group(); sculpture.add(heart);
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.65, 0.19, 180, 24, 2, 3), chrome);
    knot.rotation.set(0.6, 0.4, 0.2); heart.add(knot);
    const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), emissive); heart.add(inner);
    const cage = new THREE.Group(); sculpture.add(cage);
    const pieces: { mesh: THREE.Mesh; normal: THREE.Vector3; center: THREE.Vector3 }[] = [];
    const shell = new THREE.IcosahedronGeometry(1.3, 1);
    const vertices = shell.getAttribute('position');
    for (let i = 0; i < vertices.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(vertices, i);
      const b = new THREE.Vector3().fromBufferAttribute(vertices, i + 1);
      const c = new THREE.Vector3().fromBufferAttribute(vertices, i + 2);
      const center = a.clone().add(b).add(c).divideScalar(3);
      const normal = center.clone().normalize();
      const geometry = new THREE.BufferGeometry();
      const coords: number[] = [];
      for (const point of [a, b, c]) coords.push(...point.sub(center).multiplyScalar(0.78).toArray());
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
      geometry.computeVertexNormals();
      const material = i % 36 === 0 ? emissive : (i % 6 === 0 ? chrome : darkChrome);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      cage.add(mesh); pieces.push({ mesh, normal, center });
    }
    shell.dispose();
    const rings: THREE.Group[] = [];
    [1.8, 2.25, 2.7].forEach((radius, index) => {
      const group = new THREE.Group();
      group.rotation.set(0.7 + index * 0.7, index * 0.9, index * 0.3);
      const metalRing = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.024 - index * 0.005, 12, 180, Math.PI * 1.72), chrome);
      group.add(metalRing);
      const signalArc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 8, 100, Math.PI * 0.32), index === 1 ? new THREE.MeshStandardMaterial({ color: '#8d9eaa', emissive: '#8d9eaa', emissiveIntensity: 0.05 }) : emissive);
      signalArc.rotation.z = Math.PI * 1.72;
      group.add(signalArc);
      for (let n = 0; n < 24; n++) {
        const angle = n / 24 * Math.PI * 2;
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.11, 0.018), darkChrome);
        tick.position.set(Math.cos(angle) * (radius + 0.12), Math.sin(angle) * (radius + 0.12), 0);
        tick.rotation.z = angle - Math.PI / 2; group.add(tick);
      }
      sculpture.add(group); rings.push(group);
    });
    const dustGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i++) {
      const angle = i * 2.399963;
      const radius = 3 + (i % 41) / 41 * 3;
      positions.set([Math.cos(angle) * radius, Math.sin(angle * 1.7) * radius, -2 - (i % 13) / 13 * 4], i * 3);
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#95b3a8', size: 0.016, transparent: true, opacity: 0.12, depthWrite: false })); scene.add(dust);
    const pointer = new THREE.Vector2(), targetPointer = new THREE.Vector2();
    let scroll = 0, targetScroll = 0, dragX = 0, dragY = 0, down = false, x = 0, y = 0;
    let frame = 0, last = performance.now(), elapsed = 0, active = true, disposed = false;
    const updateScroll = () => {
      const section = document.querySelector('.hero') || host;
      const rect = section.getBoundingClientRect();
      targetScroll = THREE.MathUtils.clamp(-rect.top / Math.max(1, rect.height - window.innerHeight + 150), 0, 1);
    };
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const onMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      targetPointer.set((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
      if (down) { dragX += (event.clientX - x) * 0.006; dragY += (event.clientY - y) * 0.006; x = event.clientX; y = event.clientY; }
    };
    const onDown = (event: PointerEvent) => { if ((event.target as HTMLElement).closest('button')) return; down = true; x = event.clientX; y = event.clientY; host.setPointerCapture(event.pointerId); host.classList.add('is-dragging'); };
    const onUp = () => { down = false; host.classList.remove('is-dragging'); };
    const onLeave = () => { if (!down) targetPointer.set(0, 0); };
    const animate = (now: number) => {
      frame = 0;
      if (!active || disposed) return;
      const dt = Math.min((now - last) / 1000, 0.04); last = now;
      const motion = reduced.matches ? 0 : 1;
      elapsed += dt * motion;
      scroll = THREE.MathUtils.damp(scroll, targetScroll, 4, dt);
      pointer.lerp(targetPointer, Math.min(1, dt * 4));
      const workspaceMode = contextRef.current.mode;
      const expansion = Math.sin(scroll * Math.PI) * 0.45 * motion;
      const workspaceProgress = THREE.MathUtils.smoothstep(scroll, 0.7, 1);
      host.style.opacity = String(1 - workspaceProgress * 0.55);
      sculpture.scale.setScalar(1 - workspaceProgress * 0.38);
      sculpture.position.y = workspaceProgress * 0.65;
      cage.visible = workspaceProgress < 0.98 || workspaceMode === 'signal';
      heart.visible = workspaceProgress < 0.98 || workspaceMode !== 'api';
      emissive.emissiveIntensity = contextRef.current.hasProfile ? 0.14 : 0.04;
      host.style.setProperty('--scene-progress', String(scroll));
      sculpture.rotation.y = -0.35 + scroll * Math.PI * 0.65 * motion + dragX + pointer.x * 0.22 * motion;
      sculpture.rotation.x = -0.18 + Math.sin(scroll * Math.PI * 2) * 0.38 * motion + dragY - pointer.y * 0.15 * motion;
      sculpture.rotation.z = -0.18 + scroll * 0.3 * motion;
      heart.rotation.y = elapsed * 0.055;
      heart.rotation.z = elapsed * 0.025;
      heart.scale.setScalar(0.95 + expansion * 0.25);
      pieces.forEach(({ mesh, normal, center }, index) => {
        mesh.position.copy(center).addScaledVector(normal, expansion * (0.85 + index % 3 * 0.1));
        mesh.rotation.set(expansion * normal.y * 0.9, expansion * normal.x * 0.9, expansion * normal.z * 0.6);
      });
      rings.forEach((ring, index) => {
        ring.rotation.x = THREE.MathUtils.lerp(0.7 + index * 0.7, 0.25 + index * 0.1, scroll) + Math.sin(elapsed * 0.16 + index) * 0.08;
        ring.rotation.y = index * 0.9 * (1 - scroll) + expansion * 0.6;
        ring.rotation.z = index * 0.3 + elapsed * (index % 2 ? -0.055 : 0.045);
        ring.scale.setScalar(1 + expansion * 0.11);
      });
      const narrow = camera.aspect < 0.8;
      camera.position.set(pointer.x * 0.22 * motion, 0.3 + expansion * 0.6, (narrow ? 13 : 11.8) - expansion * 0.6);
      camera.lookAt(0, 0.1, 0);
      dust.rotation.z = elapsed * 0.009;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    const observer = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting && !document.hidden;
      if (active && !frame) { last = performance.now(); frame = requestAnimationFrame(animate); }
    }, { rootMargin: '100px' });
    const onVisibility = () => { active = !document.hidden && host.getBoundingClientRect().bottom > 0; if (active && !frame) { last = performance.now(); frame = requestAnimationFrame(animate); } };
    const resizer = new ResizeObserver(resize);
    observer.observe(host); resizer.observe(host);
    window.addEventListener('scroll', updateScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pointermove', onMove); host.addEventListener('pointerdown', onDown); host.addEventListener('pointerup', onUp); host.addEventListener('pointercancel', onUp); host.addEventListener('pointerleave', onLeave);
    updateScroll(); resize(); frame = requestAnimationFrame(animate);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); resizer.disconnect();
      window.removeEventListener('scroll', updateScroll); document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onMove); host.removeEventListener('pointerdown', onDown); host.removeEventListener('pointerup', onUp); host.removeEventListener('pointercancel', onUp); host.removeEventListener('pointerleave', onLeave);
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => { if (object instanceof THREE.Mesh || object instanceof THREE.Points) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material)); } });
      materials.forEach((material) => material.dispose()); environment.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={hostRef} className={`orbit-scene${fallback ? ' orbit-fallback' : ''}`} aria-label="Ambient signal geometry follows scroll progress and the active workspace." role="img">
    {fallback && <div className="orbit-fallback-art" aria-hidden="true"><span/><span/><span/><b>✦</b></div>}

  </div>;
}
