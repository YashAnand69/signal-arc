import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function OrbitScene({ intensity = 1 }: { intensity?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.4, 8.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    const orbit = new THREE.Group();
    scene.add(orbit);
    const palette = [0xd5ff55, 0xff8d66, 0x9b8cff, 0x65d8ff];
    for (let i = 0; i < 4; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.35 + i * 0.48, 0.008, 8, 160),
        new THREE.MeshBasicMaterial({ color: palette[i], transparent: true, opacity: 0.34 }),
      );
      ring.rotation.set(i * 0.31, i * 0.48, i * 0.22);
      orbit.add(ring);
    }
    const points = new THREE.Group();
    for (let i = 0; i < 22; i += 1) {
      const angle = (i / 22) * Math.PI * 2;
      const radius = 1.3 + (i % 5) * 0.33;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(i % 5 === 0 ? 0.105 : 0.045, 12, 12),
        new THREE.MeshBasicMaterial({ color: palette[i % palette.length], transparent: true, opacity: i % 5 === 0 ? 0.95 : 0.7 }),
      );
      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.7) * 0.72, Math.sin(angle) * radius * 0.72);
      points.add(mesh);
    }
    orbit.add(points);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 2), new THREE.MeshBasicMaterial({ color: 0xd5ff55, wireframe: true, transparent: true, opacity: 0.7 }));
    orbit.add(core);
    const resize = () => { const { width, height } = host.getBoundingClientRect(); renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix(); };
    resize();
    const onScroll = () => { orbit.userData.scroll = window.scrollY * 0.00045; };
    window.addEventListener('resize', resize); window.addEventListener('scroll', onScroll, { passive: true });
    let frame = 0;
    const tick = () => { const scroll = orbit.userData.scroll || 0; orbit.rotation.y += 0.0024 * intensity; orbit.rotation.x = Math.sin(scroll * 4) * 0.14; points.rotation.z -= 0.004 * intensity; core.rotation.x += 0.006; core.rotation.y -= 0.004; renderer.render(scene, camera); frame = requestAnimationFrame(tick); };
    tick();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('scroll', onScroll); renderer.dispose(); host.removeChild(renderer.domElement); };
  }, [intensity]);
  return <div ref={ref} className="orbit-scene" aria-label="A three-dimensional orbit of career signals" role="img" />;
}
