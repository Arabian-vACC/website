import { useEffect, useRef } from 'react';
import { makeProjector } from './mapGeo.js';
import sector from './sectorData.json';
import geo from './geoBase.json';

const AMBER = '250, 176, 30';

export default function SectorMap({ aircraft = [] }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const acRef = useRef(aircraft);
  const baseRef = useRef(null);
  const projRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => { acRef.current = aircraft; }, [aircraft]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    let dpr = 1;
    const font = (px) => `${px}px "Ubuntu", "Segoe UI", sans-serif`;

    const renderBase = () => {
      const { w, h } = sizeRef.current;
      const project = makeProjector(w, h);
      projRef.current = project;

      const base = document.createElement('canvas');
      base.width = w * dpr;
      base.height = h * dpr;
      const b = base.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (geo.fir) {
        geo.fir.forEach((ring) => {
          b.beginPath();
          ring.forEach(([lat, lon], i) => {
            const [x, y] = project(lat, lon);
            if (i === 0) b.moveTo(x, y); else b.lineTo(x, y);
          });
          b.closePath();
          b.fillStyle = `rgba(${AMBER}, 0.05)`;
          b.fill();
          b.strokeStyle = `rgba(${AMBER}, 0.55)`;
          b.lineWidth = 1.5;
          b.stroke();
        });
      }

      b.strokeStyle = 'rgba(132, 164, 205, 0.52)';
      b.lineWidth = 1.1;
      geo.coastlines.forEach((seg) => {
        b.beginPath();
        seg.forEach(([lat, lon], i) => {
          const [x, y] = project(lat, lon);
          if (i === 0) b.moveTo(x, y); else b.lineTo(x, y);
        });
        b.stroke();
      });

      b.strokeStyle = `rgba(${AMBER}, 0.14)`;
      b.lineWidth = 0.7;
      b.beginPath();
      sector.airways.forEach(([a, c]) => {
        const [x1, y1] = project(a[0], a[1]);
        const [x2, y2] = project(c[0], c[1]);
        b.moveTo(x1, y1);
        b.lineTo(x2, y2);
      });
      b.stroke();

      const placed = [];
      const overlaps = (bx) =>
        placed.some((p) => bx.x < p.x + p.w && bx.x + bx.w > p.x && bx.y < p.y + p.h && bx.y + bx.h > p.y);
      b.font = font(9);
      sector.fixes.forEach((f) => {
        const [x, y] = project(f.c[0], f.c[1]);
        if (x < 0 || x > w || y < 0 || y > h) return;
        b.fillStyle = `rgba(${AMBER}, 0.5)`;
        b.beginPath();
        b.arc(x, y, 1.4, 0, Math.PI * 2);
        b.fill();
        const bx = { x: x + 3, y: y - 9, w: f.n.length * 5.4 + 2, h: 10 };
        if (!overlaps(bx)) {
          placed.push(bx);
          b.fillStyle = 'rgba(162, 190, 224, 0.72)';
          b.fillText(f.n, x + 4, y - 1);
        }
      });

      baseRef.current = base;
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(280, rect.width);
      const h = Math.max(220, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w, h };
      renderBase();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    let running = true;

    const draw = (now) => {
      const { w, h } = sizeRef.current;
      const project = projRef.current;
      ctx.clearRect(0, 0, w, h);
      if (baseRef.current) ctx.drawImage(baseRef.current, 0, 0, w, h);

      const pulse = 0.6 + 0.4 * Math.sin(now / 500);
      const placed = [];
      const overlaps = (bx) =>
        placed.some((p) => bx.x < p.x + p.w && bx.x + bx.w > p.x && bx.y < p.y + p.h && bx.y + bx.h > p.y);

      const acs = acRef.current;
      acs.forEach((p) => {
        if (typeof p.lat !== 'number') return;
        const [x, y] = project(p.lat, p.lon);
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) return;

        if (typeof p.hdg === 'number' && p.gs > 40) {
          const hb = (p.hdg * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 13 * Math.sin(hb), y - 13 * Math.cos(hb));
          ctx.strokeStyle = `rgba(255, 214, 120, 0.5)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((p.hdg || 0) * Math.PI) / 180);
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(3, 3);
        ctx.lineTo(0, 1.4);
        ctx.lineTo(-3, 3);
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 218, 130, ${0.85 * pulse + 0.15})`;
        ctx.shadowColor = `rgba(${AMBER}, 0.9)`;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
        ctx.shadowBlur = 0;

        if (p.callsign) {
          const bx = { x: x + 5, y: y - 14, w: p.callsign.length * 5.4 + 4, h: 18 };
          if (!overlaps(bx)) {
            placed.push(bx);
            ctx.fillStyle = 'rgba(255, 232, 176, 0.95)';
            ctx.font = font(9);
            ctx.fillText(p.callsign, x + 6, y - 6);
            ctx.fillStyle = `rgba(${AMBER}, 0.6)`;
            ctx.font = font(8);
            const fl = p.alt ? `FL${String(Math.round(p.alt / 100)).padStart(3, '0')}` : '';
            ctx.fillText(fl, x + 6, y + 2);
          }
        }
      });

      if (running) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; raf = requestAnimationFrame(draw); }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="sectormap-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="sectormap-canvas" />
    </div>
  );
}
