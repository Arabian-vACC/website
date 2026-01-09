export const config = {
  runtime: 'nodejs',
};

export default async function handler(_req: unknown, res: any) {
  try {
    const response = await fetch('https://events.vatsim.net/api/events');

    if (!response.ok) {
      return res.status(502).json({ error: 'Failed to fetch events' });
    }

    const data = await response.json();

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
