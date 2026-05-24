import { NextResponse } from "next/server";

const WISE_RATES_URL = "https://api.wise.com/v1/rates?source=USD&target=PHP";

/**
 * Proxies the Wise live exchange rate API.
 *
 * The Wise API token lives on the server only — the client calls this
 * route instead, so the token is never shipped to the browser.
 *
 * Wise response: [{ rate: "58.12345", source: "USD", target: "PHP", time: "..." }]
 * Our response:   { phpPerUsd: 58.12345 }
 */
export async function GET() {
  const token = process.env.WISE_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(WISE_RATES_URL, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 3600 }, // cache for 1 hour on server
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Wise API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Array<{
      rate: string;
      source: string;
      target: string;
    }>;

    const rate = Number(data?.[0]?.rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: "No PHP rate in response" }, { status: 502 });
    }

    return NextResponse.json({ phpPerUsd: rate });
  } catch (err) {
    return NextResponse.json(
      { error: `Wise API unreachable: ${String(err)}` },
      { status: 502 }
    );
  }
}
