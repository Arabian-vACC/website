function apiBase() {
  const u = process.env.HQ_ROSTER_URL || "https://api.vatsim.me/v1/vaccs/ARB/roster";
  const m = u.match(/^(https?:\/\/[^/]+\/v1)\b/);
  return m ? m[1] : "https://api.vatsim.me/v1";
}

function vaccCode() {
  const u = process.env.HQ_ROSTER_URL || "";
  const m = u.match(/\/vaccs\/([^/]+)\//);
  return (m ? m[1] : "ARB").toUpperCase();
}

export default async function handler(req, res) {
  const key = (process.env.ROSTER_API_KEY || "").trim();
  if (!key) {
    res.status(503).json({ error: "Roster key not configured. Set ROSTER_API_KEY in the Vercel environment." });
    return;
  }

  const url = `${apiBase()}/stats/monthly?limit=1`;
  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "User-Agent": "vatsim-arabian.com stats proxy (+https://vatsim-arabian.com)",
  };

  try {
    const upstream = await fetch(url, { headers });
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `HQ stats request failed (${upstream.status})` });
      return;
    }
    const data = await upstream.json();
    const code = vaccCode();
    const month = (data.months || [])[0] || null;
    const vaccs = month && Array.isArray(month.vaccs) ? month.vaccs : [];
    const mine = vaccs.find((v) => String(v.code).toUpperCase() === code) || null;

    let rank = null;
    const totalVaccs = vaccs.length || null;
    if (vaccs.length) {
      const sorted = [...vaccs].sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0));
      const idx = sorted.findIndex((v) => String(v.code).toUpperCase() === code);
      rank = idx >= 0 ? idx + 1 : null;
    }

    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
    res.status(200).json({
      month: month?.month || null,
      year: month?.year || null,
      code,
      name: mine?.name || "Arabian vACC",
      totalHours: mine?.totalHours ?? 0,
      facilities: Array.isArray(mine?.facilities) ? mine.facilities : [],
      rank,
      totalVaccs,
    });
  } catch {
    res.status(502).json({ error: "Failed to reach HQ stats API." });
  }
}
