function apiBase() {
  const u = process.env.HQ_ROSTER_URL || "https://api.vatsim.me/v1/vaccs/ARB/roster";
  const m = u.match(/^(https?:\/\/[^/]+\/v1)\b/);
  return m ? m[1] : "https://api.vatsim.me/v1";
}

const upper = (x) => String(x || "").trim().toUpperCase();
const isArabianIcao = (c) => /^(OM|OO)/.test(upper(c));

function normalizeMenaEvent(e) {
  const airports = (Array.isArray(e.airports) ? e.airports : [])
    .map((a) => upper(a && a.icao))
    .filter(Boolean);
  const route = (Array.isArray(e.routes) ? e.routes : [])[0] || {};
  const routeDep = upper(route.departure);
  const routeArr = upper(route.arrival);
  const allIcaos = [...new Set([...airports, routeDep, routeArr])].filter(Boolean);

  let departure = routeDep || airports[0] || "";
  let arrival = routeArr || airports.find((a) => a !== departure) || airports[0] || "";

  const arab = allIcaos.find(isArabianIcao);
  if (arab && !isArabianIcao(departure) && !isArabianIcao(arrival)) departure = arab;

  return {
    id: e.id,
    title: e.name || "",
    startIso: e.start_time || null,
    endIso: e.end_time || null,
    imageUrl: e.banner || e.image || null,
    atcPositions: [],
    departure,
    arrival,
  };
}

async function fetchFallbackEvents() {
  const url =
    process.env.HQ_EVENTS_FALLBACK_URL ||
    "https://my.vatsim.net/api/v2/events/view/division/MENA";
  try {
    const r = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "vatsim-arabian.com events proxy (+https://vatsim-arabian.com)",
      },
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    const list = j && Array.isArray(j.data) ? j.data : [];
    const now = Date.now();
    const events = list
      .map(normalizeMenaEvent)
      .filter((e) => {
        const end = e.endIso ? Date.parse(e.endIso) : e.startIso ? Date.parse(e.startIso) : NaN;
        return !Number.isFinite(end) || end >= now;
      });
    return { count: events.length, events };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const key = (process.env.ROSTER_API_KEY || "").trim();
  if (!key) {
    res.status(503).json({ error: "Roster key not configured. Set ROSTER_API_KEY in the Vercel environment." });
    return;
  }

  const url = `${apiBase()}/events?upcoming=true&limit=100`;
  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "User-Agent": "vatsim-arabian.com events proxy (+https://vatsim-arabian.com)",
  };

  try {
    let data = null;
    const upstream = await fetch(url, { headers });
    if (upstream.ok) data = await upstream.json().catch(() => null);

    const hasEvents = data && Array.isArray(data.events) && data.events.length > 0;
    if (!hasEvents) {
      const fb = await fetchFallbackEvents();
      if (fb) data = fb;
    }

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(data || { count: 0, events: [] });
  } catch {
    const fb = await fetchFallbackEvents();
    if (fb) {
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
      res.status(200).json(fb);
      return;
    }
    res.status(502).json({ error: "Failed to reach HQ events API." });
  }
}
