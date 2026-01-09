export const config = {
  runtime: 'nodejs',
};

export default async function handler(_req: unknown, res: any) {
  try {
    const response = await fetch('https://data.vatsim.net/v3/vatsim-data.json');

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch VATSIM data' });
    }

    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    res.status(200).json({
      controllers: data.controllers || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
