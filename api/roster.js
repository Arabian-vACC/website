export default async function handler(req, res) {
  const key = (process.env.ROSTER_API_KEY || "").trim();
  const url = process.env.HQ_ROSTER_URL || "https://api.vatsim.me/v1/vaccs/ARB/roster";

  if (!key) {
    res.status(503).json({ error: "Roster key not configured. Set ROSTER_API_KEY in the Vercel environment." });
    return;
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "User-Agent": "vatsim-arabian.com roster proxy (+https://vatsim-arabian.com)",
      },
    });
    if (!upstream.ok) {
      const upstreamBody = await upstream.text().catch(() => "");
      res.status(upstream.status).json({
        error: `HQ roster request failed (${upstream.status})`,
        debug: {
          url,
          keyPreview: `${key.slice(0, 12)}…${key.slice(-4)}`,
          keyLength: key.length,
          upstreamBody: upstreamBody.slice(0, 300),
        },
      });
      return;
    }
    const data = await upstream.json();
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: "Failed to reach HQ roster API." });
  }
}
