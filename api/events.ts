export const config = {
  runtime: 'nodejs',
};

export default async function handler(_req: unknown, res: any) {
  try {
    const response = await fetch(
      'https://events.vatsim.net/api/events',
      {
        headers: {
          'User-Agent': 'Arabian-vACC/1.0 (https://vatsim-arabian.com)',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({
        error: 'Failed to fetch events',
        status: response.status,
        body: text,
      });
    }

    const data = await response.json();

    // Defensive check (VERY important)
    if (!data || !Array.isArray(data.data)) {
      return res.status(502).json({
        error: 'Unexpected events response format',
        received: data,
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ data: data.data });
  } catch (err: any) {
    res.status(500).json({
      error: 'Internal server error',
      message: err?.message,
    });
  }
}
