import { NextResponse } from 'next/server';

const EMAIL_FORMAT = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

/**
 * Checks an email against Abstract's reputation API.
 *
 * Only a *definitive* negative answer rejects the address (undeliverable,
 * bad format, no MX record, or a disposable inbox). Anything else — "unknown"
 * or "risky" status, a low quality score, a missing key, an exhausted quota,
 * or a network error — lets the address through, so real people with normal
 * addresses (e.g. Gmail) are never blocked by the checker itself.
 */
export async function POST(req: Request) {
  let email = '';
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim() : '';
  } catch {
    return NextResponse.json({ valid: false, reason: 'bad_request' }, { status: 400 });
  }

  if (!EMAIL_FORMAT.test(email)) {
    return NextResponse.json({ valid: false, reason: 'format' });
  }

  const apiKey = process.env.ABSTRACT_API_KEY || process.env.NEXT_PUBLIC_ABSTRACT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ valid: true, reason: 'unchecked' });
  }

  try {
    const res = await fetch(
      `https://emailreputation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(email)}`,
      { signal: AbortSignal.timeout(6000), cache: 'no-store' }
    );
    if (!res.ok) {
      console.warn(`[validate-email] Abstract API responded ${res.status}; allowing address`);
      return NextResponse.json({ valid: true, reason: 'unchecked' });
    }

    const data = await res.json();
    const deliverability = data?.email_deliverability ?? {};
    const quality = data?.email_quality ?? {};

    const rejected =
      deliverability.status === 'undeliverable' ||
      deliverability.is_format_valid === false ||
      deliverability.is_mx_valid === false ||
      quality.is_disposable === true;

    return NextResponse.json({ valid: !rejected, reason: rejected ? 'rejected' : 'ok' });
  } catch (error) {
    console.warn('[validate-email] check failed; allowing address', error);
    return NextResponse.json({ valid: true, reason: 'unchecked' });
  }
}
