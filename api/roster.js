export default async function handler(req, res) {
  const key = (process.env.ROSTER_API_KEY || "").trim();
  const url = process.env.HQ_ROSTER_URL || "https://api.vatsim.me/v1/vaccs/ARB/roster";

  if (!key) {
    res.status(503).json({ error: "Roster key not configured. Set ROSTER_API_KEY in the Vercel environment." });
    return;
  }

  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "User-Agent": "vatsim-arabian.com roster proxy (+https://vatsim-arabian.com)",
  };

  const solosUrl = url.replace(/\/roster(\?|$)/, "/solos$1");

  try {
    const [rosterRes, solosRes] = await Promise.all([
      fetch(url, { headers }),
      fetch(solosUrl, { headers }).catch(() => null),
    ]);

    if (!rosterRes.ok) {
      res.status(rosterRes.status).json({ error: `HQ roster request failed (${rosterRes.status})` });
      return;
    }

    const roster = await rosterRes.json();
    const solosData = solosRes && solosRes.ok ? await solosRes.json().catch(() => null) : null;
    if (solosData) {
      const soloByCid = {};
      for (const s of solosData.solos || []) {
        const cid = String(s.cid || "").trim();
        if (!cid) continue;
        const pos = String(s.position || "").split("_").pop() || "Solo";
        (soloByCid[cid] ||= []).push(pos);
      }
      const applySolo = (arr) =>
        Array.isArray(arr)
          ? arr.map((c) => (soloByCid[String(c.cid)] ? { ...c, solo: soloByCid[String(c.cid)] } : c))
          : arr;
      roster.home = applySolo(roster.home);
      roster.visiting = applySolo(roster.visiting);
    }

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(roster);
  } catch {
    res.status(502).json({ error: "Failed to reach HQ roster API." });
  }
}
