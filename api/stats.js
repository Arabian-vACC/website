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

const FACILITY_LABELS = { 1: "DEL", 2: "GND", 3: "TWR", 4: "APP", 5: "CTR" };

function canonVaccName(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/\bvacc\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export default async function handler(req, res) {
  const key = (process.env.ROSTER_API_KEY || "").trim();
  if (!key) {
    res.status(503).json({ error: "Roster key not configured. Set ROSTER_API_KEY in the Vercel environment." });
    return;
  }

  const url = `${apiBase()}/stats/monthly`;
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

    const rows = Array.isArray(data.stats) ? data.stats : [];
    const byVacc = new Map();
    for (const row of rows) {
      const name = String(row.vacc || "").trim();
      if (!name) continue;
      if (!byVacc.has(name)) byVacc.set(name, { name, totalHours: 0, facilities: {} });
      const entry = byVacc.get(name);
      const hours = Number(row.totalHours) || 0;
      entry.totalHours += hours;
      const label = FACILITY_LABELS[Number(row.facility)];
      if (label) entry.facilities[label] = (entry.facilities[label] || 0) + hours;
    }

    const all = [...byVacc.values()];
    const totalVaccs = all.length || null;
    const wantName = process.env.HQ_VACC_NAME || "Arabian vACC";
    const mine =
      all.find((v) => canonVaccName(v.name) === canonVaccName(wantName)) || null;

    let rank = null;
    if (mine) {
      const sorted = [...all].sort((a, b) => b.totalHours - a.totalHours);
      const idx = sorted.indexOf(mine);
      rank = idx >= 0 ? idx + 1 : null;
    }

    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
    res.status(200).json({
      month: data.month || null,
      year: data.month ? Number(String(data.month).slice(0, 4)) : null,
      code,
      name: mine?.name || "Arabian vACC",
      totalHours: mine?.totalHours ?? 0,
      facilities: mine
        ? Object.entries(mine.facilities).map(([name, hours]) => ({ name, hours }))
        : [],
      rank,
      totalVaccs,
    });
  } catch {
    res.status(502).json({ error: "Failed to reach HQ stats API." });
  }
}
