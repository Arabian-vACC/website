export default async function handler(req, res) {
  const key = (process.env.ROSTER_API_KEY || "").trim();
  const url = process.env.HQ_ROSTER_URL || "https://api.vatsim.me/v1/vaccs/ARB/roster";

  if (!key) {
    res.status(503).json({ error: "Roster key not configured. Set ROSTER_API_KEY in the Vercel environment." });
    return;
  }

  try {
    console.log(`[roster] → GET ${url}  (key ${key.slice(0, 12)}…${key.slice(-4)}, len ${key.length})`);
    const upstream = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "User-Agent": "vatsim-arabian.com roster proxy (+https://vatsim-arabian.com)",
      },
    });

    const bodyText = await upstream.text();
    const headers = Object.fromEntries(upstream.headers.entries());
    console.log(`[roster] ← ${upstream.status} ${upstream.statusText}`);
    console.log(`[roster] response headers: ${JSON.stringify(headers)}`);
    console.log(`[roster] response body (first 2000 chars): ${bodyText.slice(0, 2000)}`);

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: `HQ roster request failed (${upstream.status})`,
        debug: {
          url,
          keyPreview: `${key.slice(0, 12)}…${key.slice(-4)}`,
          keyLength: key.length,
          cfMitigated: headers["cf-mitigated"] || null,
          cfRay: headers["cf-ray"] || null,
          server: headers["server"] || null,
          upstreamBody: bodyText.slice(0, 300),
        },
      });
      return;
    }

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      console.error(`[roster] JSON parse failed: ${e.message}`);
      res.status(502).json({ error: "HQ roster API returned non-JSON." });
      return;
    }
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(data);
  } catch (err) {
    console.error(`[roster] fetch threw: ${err?.message || err}`);
    res.status(502).json({ error: "Failed to reach HQ roster API." });
  }
}
