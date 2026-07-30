import { head } from "@vercel/blob";

const BLOB_PATH = "arb-roster.json";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET", "OPTIONS"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const blob = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const upstream = await fetch(blob.downloadUrl || blob.url, { cache: "no-store" });
    if (!upstream.ok) {
      return res.status(502).json({ error: "Roster store unavailable" });
    }
    const data = await upstream.json();
    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch {

    return res.status(503).json({ error: "Roster not published yet. Please try again shortly." });
  }
}
