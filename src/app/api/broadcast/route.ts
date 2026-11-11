import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  // Only signed-in staff with the broadcast permission may send emails
  const guard = await requirePermission('broadcast');
  if (!guard.ok) {
    return NextResponse.json({ success: false, error: guard.error }, { status: guard.status });
  }

  try {
    const { emails, subject, body, driveLink, driveLinkLabel } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ success: false, error: 'No recipients provided' }, { status: 400 });
    }
    if (!subject || !body) {
      return NextResponse.json({ success: false, error: 'Subject and body are required' }, { status: 400 });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
      <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

                <!-- Header -->
                <tr>
                  <td style="background-color:#1b1b1b;padding:36px 40px;border-bottom:3px solid #facc15;">
                    <p style="margin:0;font-size:22px;font-weight:bold;color:#facc15;letter-spacing:1px;">KAMLEWA</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:2px;">Technologies</p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="background-color:#1b1b1b;padding:40px;">
                    <h1 style="margin:0 0 8px;font-size:13px;font-weight:600;color:#facc15;text-transform:uppercase;letter-spacing:2px;">${subject}</h1>
                    <div style="margin-top:24px;font-size:15px;color:#d1d5db;line-height:1.8;white-space:pre-wrap;">${body}</div>

                    ${driveLink ? `
                    <!-- Download Button -->
                    <div style="margin-top:36px;padding-top:28px;border-top:1px solid #2d2d2d;">
                      <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;">📄 Document attached to this announcement:</p>
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background-color:#facc15;padding:14px 32px;">
                            <a href="${driveLink}" style="color:#000000;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                              ⬇ ${driveLinkLabel || 'Download Document'}
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:12px 0 0;font-size:11px;color:#4b5563;">
                        Or copy this link: <a href="${driveLink}" style="color:#facc15;text-decoration:none;word-break:break-all;">${driveLink}</a>
                      </p>
                    </div>` : ''}
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color:#0a0a0a;padding:28px 40px;border-top:1px solid #2d2d2d;">
                    <p style="margin:0 0 6px;font-size:12px;color:#4b5563;">KAMLEWA Technologies · Cyber Safety &amp; Digital Inclusion</p>
                    <p style="margin:0 0 6px;font-size:12px;color:#4b5563;">Douala, Bonaberi — Derrière Immeuble Kottobass</p>
                    <p style="margin:0;font-size:12px;color:#374151;">
                      <a href="https://www.kamlewa.org" style="color:#facc15;text-decoration:none;">kamlewa.org</a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Use batch API — no attachments so it's fast and reliable
    const BATCH_SIZE = 100;
    const chunks: string[][] = [];
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      chunks.push(emails.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    for (const chunk of chunks) {
      const batch = chunk.map((email: string) => ({
        from: 'KAMLEWA Technologies <noreply@kamlewa.org>',
        to: email,
        subject,
        html,
      }));
      await resend.batch.send(batch);
      totalSent += chunk.length;
    }

    return NextResponse.json({ success: true, sent: totalSent });
  } catch (error) {
    console.error('Broadcast email error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send emails' }, { status: 500 });
  }
}