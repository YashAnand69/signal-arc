import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/** A quiet evidence graph: individual experiences align into a possible next step. */
export function OrbitScene({ mode, hasProfile }: { mode: string; hasProfile: boolean }) {
  const contextRef = useRef({ mode, hasProfile });
  const requestRenderRef = useRef<() => void>(() => {});
  useEffect(() => { contextRef.current = { mode, hasProfile }; requestRenderRef.current(); }, [mode, hasProfile]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;
    const host: HTMLDivElement = element;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch { setFallback(true); return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    renderer.setClearColor(0x000000, 0);
    host.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 0, 10);
    scene.add(new THREE.AmbientLight('#b1bbb5', 1.7));
    const light = new THREE.DirectionalLight('#c3cbc5', 1.2);
    light.position.set(-2, 4, 5);scene.add(light);
    const graph = new THREE.Group();scene.add(graph);
    const nodeMaterial = new THREE.MeshStandardMaterial({ color: '#819487', roughness: 1, metalness: 0 });
    const coreMaterial = new THREE.MeshStandardMaterial({ color: '#a3b19e', roughness: 1, metalness: 0 });
    const geometry = new THREE.SphereGeometry(0.032, 8, 6);
    const nodes: { mesh: THREE.Mesh; initial: THREE.Vector3; aligned: THREE.Vector3 }[] = [];
    // Three loose evidence columns become a lightly structured progression.
    for(let column=0;column<3;column++)for(let row=0;row<5;row++){
      const index=column*5+row;
      const initial=new THREE.Vector3((column-1)*1.65+Math.sin(index*1.7)*0.24,(2-row)*0.7+Math.cos(index*1.3)*0.16,Math.sin(index*0.9)*0.45);
      const aligned=new THREE.Vector3((column-1)*1.35,(2-row)*0.6,(column-1)*0.16);
      const mesh=new THREE.Mesh(geometry,column===2&&row===2?coreMaterial:nodeMaterial);
      if(column===2&&row===2)mesh.scale.setScalar(1.65);
      graph.add(mesh);nodes.push({mesh,initial,aligned});
    }
    const edges: [number,number][]=[];
    for(let column=0;column<3;column++)for(let row=0;row<4;row++)edges.push([column*5+row,column*5+row+1]);
    for(let row=0;row<5;row++){edges.push([row,5+row],[5+row,10+row]);}
    edges.push([1,7],[7,13],[3,6],[6,12]);
    const pathsGeometry=new THREE.BufferGeometry();
    const coordinates=new Float32Array(edges.length*6);
    pathsGeometry.setAttribute('position',new THREE.BufferAttribute(coordinates,3));
    const pathsMaterial=new THREE.LineBasicMaterial({color:'#7c9182',transparent:true,opacity:0.22,depthWrite:false});
    graph.add(new THREE.LineSegments(pathsGeometry,pathsMaterial));
    let frame=0,last=performance.now(),active=!document.hidden,disposed=false,scroll=0,targetScroll=0;
    const pointer=new THREE.Vector2(),targetPointer=new THREE.Vector2();
    const requestRender=()=>{if(active&&!disposed&&!frame)frame=requestAnimationFrame(animate);};
    requestRenderRef.current=requestRender;
    const updateScroll=()=>{
      const section=document.querySelector('.hero')||host;
      const rect=section.getBoundingClientRect();
      targetScroll=THREE.MathUtils.clamp(-rect.top/Math.max(1,rect.height-window.innerHeight+150),0,1);
      requestRender();
    };
    const resize=()=>{
      const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
      renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestRender();
    };
    const onMove=(event:PointerEvent)=>{
      if(reduced.matches)return;
      targetPointer.set((event.clientX/window.innerWidth-0.5)*2,(event.clientY/window.innerHeight-0.5)*2);requestRender();
    };
    function animate(now:number){
      frame=0;if(!active||disposed)return;
      if(!reduced.matches&&now-last<1000/30){frame=requestAnimationFrame(animate);return;}
      const dt=Math.min((now-last)/1000,0.08);last=now;
      scroll=reduced.matches?targetScroll:THREE.MathUtils.damp(scroll,targetScroll,3,dt);
      pointer.lerp(targetPointer,Math.min(1,dt*3));
      const alignment=reduced.matches?1:THREE.MathUtils.smoothstep(scroll,0.05,0.85);
      const workspace=THREE.MathUtils.smoothstep(scroll,0.7,1);
      nodes.forEach(({mesh,initial,aligned})=>mesh.position.lerpVectors(initial,aligned,alignment));
      edges.forEach(([a,b],index)=>{nodes[a].mesh.position.toArray(coordinates,index*6);nodes[b].mesh.position.toArray(coordinates,index*6+3);});
      pathsGeometry.attributes.position.needsUpdate=true;
      pathsMaterial.opacity=contextRef.current.hasProfile?0.25:0.17;
      // Context changes remain intentionally restrained: the graph is background texture.
      graph.rotation.set(reduced.matches?0.02:0.02-pointer.y*0.018,reduced.matches?-0.08:-0.08+pointer.x*0.025+scroll*0.06,-0.025);
      graph.scale.setScalar(1-workspace*0.12);
      graph.position.y=workspace*0.12;
      host.style.opacity=String(1-workspace*0.35);
      renderer.render(scene,camera);
      if(!reduced.matches&&(Math.abs(scroll-targetScroll)>0.0001||pointer.distanceToSquared(targetPointer)>0.00001))frame=requestAnimationFrame(animate);
    }
    const onVisibility=()=>{active=!document.hidden;if(active){last=performance.now();requestRender();}};
    const onMotionChange=()=>{last=performance.now();requestRender();};
    const resizer=new ResizeObserver(resize);resizer.observe(host);
    window.addEventListener('scroll',updateScroll,{passive:true});window.addEventListener('pointermove',onMove,{passive:true});
    document.addEventListener('visibilitychange',onVisibility);reduced.addEventListener('change',onMotionChange);
    updateScroll();resize();requestRender();
    return()=>{
      disposed=true;requestRenderRef.current=()=>{};cancelAnimationFrame(frame);resizer.disconnect();
      window.removeEventListener('scroll',updateScroll);window.removeEventListener('pointermove',onMove);document.removeEventListener('visibilitychange',onVisibility);reduced.removeEventListener('change',onMotionChange);
      geometry.dispose();pathsGeometry.dispose();nodeMaterial.dispose();coreMaterial.dispose();pathsMaterial.dispose();renderer.dispose();renderer.domElement.remove();
    };
  }, []);
  return <div ref={hostRef} className={`orbit-scene${fallback ? ' orbit-fallback' : ''}`} aria-hidden="true" />;
}
