export const VIEW = { latMin: 22.6, latMax: 26.7, lonMin: 51.9, lonMax: 57.7 };

const latC = (VIEW.latMin + VIEW.latMax) / 2;
export const KX = Math.cos((latC * Math.PI) / 180);

export const inView = (lat, lon) =>
  lat >= VIEW.latMin && lat <= VIEW.latMax && lon >= VIEW.lonMin && lon <= VIEW.lonMax;

export function makeProjector(w, h) {
  const spanX = (VIEW.lonMax - VIEW.lonMin) * KX;
  const spanY = VIEW.latMax - VIEW.latMin;
  const scale = Math.min(w / spanX, h / spanY);
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;
  return (lat, lon) => [
    offX + (lon - VIEW.lonMin) * KX * scale,
    offY + (VIEW.latMax - lat) * scale
  ];
}
