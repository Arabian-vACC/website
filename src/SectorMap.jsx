import { useEffect, useRef } from 'react';
import { makeProjector, RADAR_VIEWS, MUSCAT_FIR } from './mapGeo.js';
import sector from './sectorData.json';
import geo from './geoBase.json';
import aerodromes from './aerodromes.json';
import stars from './stars.json';
import muscatAirways from './muscatAirways.json';

const AMBER = '250, 176, 30';

export default function SectorMap({ aircraft = [], view = RADAR_VIEWS[0] }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const acRef = useRef(aircraft);
  const viewRef = useRef(view);
  const baseRef = useRef(null);
  const projRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const renderBaseRef = useRef(null);

  useEffect(() => { acRef.current = aircraft; }, [aircraft]);

  useEffect(() => {
    viewRef.current = view;
    if (renderBaseRef.current) renderBaseRef.current();
  }, [view]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    let dpr = 1;
    const font = (px) => `${px}px "Ubuntu", "Segoe UI", sans-serif`;

    const drawRing = (b, ring, project) => {
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
    };

    const renderBase = () => {
      const { w, h } = sizeRef.current;
      if (!w || !h) return;
      const activeView = viewRef.current;
      const project = makeProjector(w, h, activeView.bounds);
      projRef.current = project;

      const base = document.createElement('canvas');
      base.width = w * dpr;
      base.height = h * dpr;
      const b = base.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (activeView.fir === 'emirates' && geo.fir) {
        geo.fir.forEach((ring) => drawRing(b, ring, project));
      } else if (activeView.fir === 'muscat') {
        drawRing(b, MUSCAT_FIR, project);
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

      if (activeView.detail) {
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
      }

      if (activeView.airways === 'muscat') {
        b.strokeStyle = `rgba(${AMBER}, 0.16)`;
        b.lineWidth = 0.7;
        b.beginPath();
        muscatAirways.forEach(([a, c]) => {
          const [x1, y1] = project(a[0], a[1]);
          const [x2, y2] = project(c[0], c[1]);
          b.moveTo(x1, y1);
          b.lineTo(x2, y2);
        });
        b.stroke();
      }

      if (activeView.stars) {
        b.strokeStyle = 'rgba(96, 205, 224, 0.5)';
        b.lineWidth = 0.9;
        (activeView.airports || []).forEach((code) => {
          const polys = stars[code];
          if (!polys) return;
          polys.forEach((line) => {
            b.beginPath();
            line.forEach(([lat, lon], i) => {
              const [x, y] = project(lat, lon);
              if (i === 0) b.moveTo(x, y); else b.lineTo(x, y);
            });
            b.stroke();
          });
        });
      }

      const airportList = (activeView.airports || [])
        .map((code) => ({ code, data: aerodromes[code] }))
        .filter((a) => a.data && a.data.ref);

      if (activeView.rings && airportList[0]) {
        const [clat, clon] = airportList[0].data.ref;
        const [cx, cy] = project(clat, clon);
        b.strokeStyle = `rgba(${AMBER}, 0.16)`;
        b.setLineDash([3, 4]);
        b.lineWidth = 0.8;
        activeView.rings.forEach((nm) => {
          const [, ry] = project(clat + nm / 60, clon);
          const r = Math.abs(cy - ry);
          b.beginPath();
          b.arc(cx, cy, r, 0, Math.PI * 2);
          b.stroke();
        });
        b.setLineDash([]);
      }

      airportList.forEach(({ code, data }) => {
        const [rlat, rlon] = data.ref;
        const [x, y] = project(rlat, rlon);
        if (x < -12 || x > w + 12 || y < -12 || y > h + 12) return;

        let maxRwyPx = 0;
        (data.runways || []).forEach(([[la1, lo1], [la2, lo2]]) => {
          const [x1, y1] = project(la1, lo1);
          const [x2, y2] = project(la2, lo2);
          maxRwyPx = Math.max(maxRwyPx, Math.hypot(x2 - x1, y2 - y1));
        });

        if (maxRwyPx >= 7) {
          b.strokeStyle = `rgba(${AMBER}, 0.92)`;
          b.lineWidth = 2;
          b.lineCap = 'round';
          (data.runways || []).forEach(([[la1, lo1], [la2, lo2]]) => {
            const [x1, y1] = project(la1, lo1);
            const [x2, y2] = project(la2, lo2);
            b.beginPath();
            b.moveTo(x1, y1);
            b.lineTo(x2, y2);
            b.stroke();
          });
          b.lineCap = 'butt';
        } else {
          b.save();
          b.translate(x, y);
          b.strokeStyle = `rgba(${AMBER}, 0.85)`;
          b.lineWidth = 1.2;
          b.strokeRect(-3, -3, 6, 6);
          b.fillStyle = `rgba(${AMBER}, 0.9)`;
          b.beginPath();
          b.arc(0, 0, 1.4, 0, Math.PI * 2);
          b.fill();
          b.restore();
        }

        b.font = font(9.5);
        b.fillStyle = 'rgba(255, 232, 176, 0.95)';
        b.fillText(code, x + 6, y - 5);
      });

      baseRef.current = base;
    };
    renderBaseRef.current = renderBase;

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
      if (!project) { if (running) raf = requestAnimationFrame(draw); return; }
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
      renderBaseRef.current = null;
    };
  }, []);

  return (
    <div className="sectormap-wrap" ref={wrapRef}>
      <canvas ref={canvasRef} className="sectormap-canvas" />
    </div>
  );
}
