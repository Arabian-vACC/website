import { put } from "@vercel/blob";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const BLOB_PATH = "arb-roster.json";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const expected = (process.env.ROSTER_API_KEY || "").trim();
  const provided = String(req.headers["x-api-key"] || "").trim();
  if (!expected || provided !== expected) {
    return res.status(403).json({ error: "Invalid key" });
  }

  try {
    const body = req.body;
    if (!body || typeof body !== "object" || !Array.isArray(body.home)) {
      return res.status(400).json({ error: "Invalid roster payload" });
    }

    const blob = await put(BLOB_PATH, JSON.stringify(body), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return res.status(200).json({ ok: true, url: blob.url, storedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: "Failed to store roster", details: String(e?.message || e) });
  }
}
