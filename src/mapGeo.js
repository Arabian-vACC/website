export const UAE_VIEW = { latMin: 22.6, latMax: 26.7, lonMin: 51.9, lonMax: 57.7 };

export const VIEW = UAE_VIEW;

const latCenter = (v) => (v.latMin + v.latMax) / 2;
export const KX = Math.cos((latCenter(UAE_VIEW) * Math.PI) / 180);

export const inBounds = (lat, lon, v) =>
  lat >= v.latMin && lat <= v.latMax && lon >= v.lonMin && lon <= v.lonMax;

export const inView = (lat, lon) => inBounds(lat, lon, UAE_VIEW);

export const FETCH_BOUNDS = { latMin: 15.5, latMax: 27.5, lonMin: 50.5, lonMax: 62.5 };
export const inRegion = (lat, lon) => inBounds(lat, lon, FETCH_BOUNDS);

export function makeProjector(w, h, view = UAE_VIEW) {
  const kx = Math.cos((latCenter(view) * Math.PI) / 180);
  const spanX = (view.lonMax - view.lonMin) * kx;
  const spanY = view.latMax - view.latMin;
  const scale = Math.min(w / spanX, h / spanY);
  const offX = (w - spanX * scale) / 2;
  const offY = (h - spanY * scale) / 2;
  return (lat, lon) => [
    offX + (lon - view.lonMin) * kx * scale,
    offY + (view.latMax - lat) * scale
  ];
}

export const MUSCAT_FIR = [
  [26.4, 56.5], [26.0, 57.2], [25.4, 57.8], [24.6, 58.8], [23.6, 59.8],
  [22.4, 60.6], [20.8, 61.2], [19.2, 60.2], [18.0, 58.6], [17.0, 56.6],
  [16.6, 55.2], [16.9, 53.0], [17.8, 52.0], [18.8, 52.0], [19.9, 53.4],
  [21.2, 55.0], [22.6, 55.2], [24.0, 55.3], [24.9, 55.9], [25.6, 56.3],
  [26.4, 56.5]
];

export const RADAR_VIEWS = [
  {
    id: 'uae-radar',
    label: 'UAE Radar',
    caption: 'EMIRATES FIR · OMAE · LIVE TRAFFIC',
    bounds: UAE_VIEW,
    fir: 'emirates',
    detail: true,
    airports: ['OMDB', 'OMAA', 'OMSJ', 'OMDW']
  },
  {
    id: 'omaa-app',
    label: 'Abu Dhabi Approach',
    caption: 'ABU DHABI APPROACH · OMAA · ARRIVALS',
    bounds: { latMin: 23.5, latMax: 25.35, lonMin: 53.5, lonMax: 55.9 },
    fir: 'emirates',
    detail: false,
    stars: true,
    rings: [20, 40],
    airports: ['OMAA', 'OMAL']
  },
  {
    id: 'omdb-app',
    label: 'Dubai Approach',
    caption: 'DUBAI APPROACH · OMDB · ARRIVALS',
    bounds: { latMin: 24.35, latMax: 26.15, lonMin: 54.2, lonMax: 56.7 },
    fir: 'emirates',
    detail: false,
    stars: true,
    rings: [20, 40],
    airports: ['OMDB', 'OMDW', 'OMSJ']
  },
  {
    id: 'muscat-fir',
    label: 'Muscat FIR',
    caption: 'MUSCAT FIR · OOMM · LIVE TRAFFIC',
    bounds: { latMin: 16.5, latMax: 26.6, lonMin: 54.6, lonMax: 61.8 },
    fir: 'muscat',
    detail: false,
    airways: 'muscat',
    airports: ['OOMS', 'OOSA']
  },
  {
    id: 'muscat-app',
    label: 'Muscat Approach',
    caption: 'MUSCAT APPROACH · OOMS · ARRIVALS',
    bounds: { latMin: 22.7, latMax: 24.5, lonMin: 57.3, lonMax: 59.3 },
    fir: null,
    detail: false,
    stars: true,
    rings: [20, 40, 60],
    airports: ['OOMS']
  }
];
