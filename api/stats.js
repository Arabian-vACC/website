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

function addFacility(facilities, label, hours) {
  if (!label) return;
  facilities[label] = (facilities[label] || 0) + (Number(hours) || 0);
}

function normalizeVaccs(data) {
  let month = null;
  let year = null;
  const all = [];

  const months = Array.isArray(data.months) ? data.months : [];
  if (months.length) {
    const m = months[0] || {};
    month = m.month || null;
    year = m.year || (month ? Number(String(month).slice(0, 4)) : null);

    for (const v of Array.isArray(m.vaccs) ? m.vaccs : []) {
      const facilities = {};
      for (const f of Array.isArray(v.facilities) ? v.facilities : []) {
        addFacility(facilities, String(f?.name || "").toUpperCase(), f?.hours);
      }
      all.push({
        name: v.name || v.code || "",
        code: String(v.code || "").toUpperCase(),
        totalHours: Number(v.totalHours) || 0,
        facilities,
      });
    }
    return { month, year, all };
  }

  month = data.month || null;
  year = month ? Number(String(month).slice(0, 4)) : null;

  const byVacc = new Map();
  for (const row of Array.isArray(data.stats) ? data.stats : []) {
    const name = String(row.vacc || "").trim();
    if (!name) continue;
    if (!byVacc.has(name)) byVacc.set(name, { name, code: "", totalHours: 0, facilities: {} });
    const entry = byVacc.get(name);
    const hours = Number(row.totalHours) || 0;
    entry.totalHours += hours;
    addFacility(entry.facilities, FACILITY_LABELS[Number(row.facility)], hours);
  }
  return { month, year, all: [...byVacc.values()] };
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

    if (req.query && (req.query.debug === "1" || req.query.debug === "true")) {
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ _debug: true, url, upstreamStatus: upstream.status, data });
      return;
    }

    const { month, year, all } = normalizeVaccs(data);
    const totalVaccs = all.length || null;
    const wantName = process.env.HQ_VACC_NAME || "Arabian vACC";
    const mine =
      all.find((v) => v.code && v.code === code) ||
      all.find((v) => canonVaccName(v.name) === canonVaccName(wantName)) ||
      null;

    let rank = null;
    if (mine) {
      const sorted = [...all].sort((a, b) => b.totalHours - a.totalHours);
      const idx = sorted.indexOf(mine);
      rank = idx >= 0 ? idx + 1 : null;
    }

    res.setHeader("Cache-Control", "public, s-maxage=900, stale-while-revalidate=1800");
    res.status(200).json({
      month,
      year,
      code,
      name: mine?.name || wantName,
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
