export default async function handler(req, res) {
  const rawKey = process.env.ROSTER_API_KEY || "";
  const key = rawKey.trim();
  const url = process.env.HQ_ROSTER_URL || "https://hq.vatsim.me/api/public/roster";

  const keyInfo = {
    present: !!key,
    length: key.length,
    stored: key,
    startsWithMena: key.startsWith("mena_"),
    hadWhitespace: rawKey !== key,
  };

  if (!key) {
    res.status(503).json({ error: "Roster key not configured. Set ROSTER_API_KEY in the Vercel environment.", keyInfo });
    return;
  }

  try {
    const upstream = await fetch(url, { headers: { "X-API-Key": key } });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `HQ roster request failed (${upstream.status})`, keyInfo });
      return;
    }
    const data = await upstream.json();
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: "Failed to reach HQ roster API." });
  }
}
