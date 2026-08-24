function apiBase() {
  const u = process.env.HQ_ROSTER_URL || "https://api.vatsim.me/v1/vaccs/ARB/roster";
  const m = u.match(/^(https?:\/\/[^/]+\/v1)\b/);
  return m ? m[1] : "https://api.vatsim.me/v1";
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
    const upstream = await fetch(url, { headers });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `HQ events request failed (${upstream.status})` });
      return;
    }
    const data = await upstream.json();
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: "Failed to reach HQ events API." });
  }
}
