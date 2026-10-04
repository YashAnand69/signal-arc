import { useEffect, useRef } from 'react';

/** A continuous path from experience to opportunity, drawn as a dimensional ribbon. */
export function OrbitScene({ mode, hasProfile }: { mode: string; hasProfile: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, progress = 0, target = 0, distance = window.scrollY, targetDistance = distance, last = performance.now();
    const paths = Array.from(host.querySelectorAll<SVGPathElement>('path'));
    const flows = Array.from(host.querySelectorAll<SVGPathElement>('.ribbon-flow'));
    const markers = host.querySelector<SVGPathElement>('.ribbon-markers');
    const paint = (now: number) => {
      frame = 0;
      const dt = Math.min((now - last) / 1000, .08); last = now;
      distance = reduced.matches ? targetDistance : distance + (targetDistance - distance) * (1 - Math.exp(-7 * dt));
      progress = reduced.matches ? target : progress + (target - progress) * (1 - Math.exp(-5 * dt));
      const phase = reduced.matches ? 0 : distance * .0024;
      const bend = (offset:number) => Math.sin(phase + offset) * 52;
      const shape = `M ${490+bend(0)} -100 C ${180+bend(.4)} 25 ${150+bend(.8)} 135 ${365+bend(1.2)} 205 C ${640+bend(1.6)} 295 ${705+bend(2)} 420 ${440+bend(2.4)} 490 C ${175+bend(2.8)} 560 ${60+bend(3.2)} 685 ${330+bend(3.6)} 780 C ${610+bend(4)} 880 ${705+bend(4.4)} 1020 ${450+bend(4.8)} 1140 C ${320+bend(5.2)} 1200 ${315+bend(5.6)} 1320 ${510+bend(6)} 1390`;
      paths.forEach(path => path.setAttribute('d',shape));
      flows.forEach((path,index) => path.setAttribute('stroke-dashoffset',String(-(reduced.matches ? 0 : distance * .5) + index * 340)));
      markers?.setAttribute('stroke-dashoffset',String(reduced.matches ? 0 : -distance * .08));
      host.style.setProperty('--ribbon-scroll', String(progress));
      host.style.setProperty('--ribbon-y', `${-progress * 175}px`);
      host.style.setProperty('--ribbon-angle', `${-9 + progress * 16}deg`);
      host.style.setProperty('--ribbon-reveal', String(.7 + progress * .3));
      if (!reduced.matches && (Math.abs(target - progress) > .0001 || Math.abs(targetDistance - distance) > .05)) frame = requestAnimationFrame(paint);
    };
    const update = () => {
      targetDistance = window.scrollY;
      const hero = document.querySelector('.hero');
      target = Math.min(1, Math.max(0, window.scrollY / Math.max(1, (hero?.clientHeight || 1400) - window.innerHeight / 2)));
      if (!frame && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(paint); }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update); window.removeEventListener('resize', update); document.removeEventListener('visibilitychange', update); reduced.removeEventListener('change', update); };
  }, []);
  const path = 'M 490 -100 C 180 25 150 135 365 205 C 640 295 705 420 440 490 C 175 560 60 685 330 780 C 610 880 705 1020 450 1140 C 320 1200 315 1320 510 1390';
  return <div ref={hostRef} className={`orbit-scene signal-ribbon ribbon-${mode}${hasProfile ? ' ribbon-connected' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 800 1300" fill="none" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="ribbon-copper" x1="100" y1="0" x2="640" y2="1200" gradientUnits="userSpaceOnUse"><stop stopColor="#b47a53"/><stop offset=".24" stopColor="#f0c89c"/><stop offset=".43" stopColor="#a16849"/><stop offset=".64" stopColor="#e9b581"/><stop offset=".83" stopColor="#846650"/><stop offset="1" stopColor="#bbaa8a"/></linearGradient>
        <linearGradient id="ribbon-edge" x1="150" y1="0" x2="650" y2="1100" gradientUnits="userSpaceOnUse"><stop stopColor="#ecd7b6"/><stop offset=".5" stopColor="#a47b61"/><stop offset="1" stopColor="#d4c6a9"/></linearGradient>
      </defs>
      <path d={path} stroke="#000" strokeWidth="88" strokeLinecap="round" transform="translate(9 14)" opacity=".45"/>
      <path d={path} stroke="#42332b" strokeWidth="72" strokeLinecap="round"/>
      <path d={path} stroke="url(#ribbon-copper)" strokeWidth="60" strokeLinecap="round"/>
      <path d={path} stroke="url(#ribbon-edge)" strokeWidth="2" strokeLinecap="round" transform="translate(-18 -8)" opacity=".65"/>
      <path className="ribbon-flow" pathLength="1000" d={path} stroke="#ead1b0" strokeWidth="44" strokeDasharray="85 595" strokeLinecap="round" opacity=".38"/>
      <path className="ribbon-flow" pathLength="1000" d={path} stroke="#f2ddc0" strokeWidth="2" strokeDasharray="110 570" strokeLinecap="round" transform="translate(-18 -8)" opacity=".8"/>
      <path className="ribbon-markers" d={path} stroke="#f0d8b5" strokeWidth="1" strokeDasharray="1 13" strokeLinecap="round" opacity=".32"/>
    </svg>
    <span className="ribbon-caption">EXPERIENCE <span>→</span> OPPORTUNITY</span>
  </div>;
}
