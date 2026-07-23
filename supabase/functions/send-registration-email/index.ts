// Supabase Edge Function: send-registration-email
// Sends a registration-confirmation email (via Resend) to the registrant
// with their personal details. Called from the public registration form.
//
// Required secret:  RESEND_API_KEY
// Optional secret:  REGISTRATION_FROM_EMAIL  (e.g. "אירוע טריאתלון <register@your-domain.com>")
//                   Falls back to Resend's shared test sender for quick testing.

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('REGISTRATION_FROM_EMAIL') || 'onboarding@resend.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  email: string;
  first_name?: string;
  last_name?: string;
  bib_number?: string | number;
  race_name?: string;
  event_name?: string;
  shirt_size?: string;
  category?: string;
}

const CONTACTS = [
  { name: 'בן אהובי', phone: '052-807-3399' },
  { name: 'גלעד רוזמרין', phone: '054-637-0307' },
  { name: 'ליאור זהר פפרמן', phone: '054-317-3312' },
  { name: 'תמר הופמן', phone: '054-642-0020' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY is not configured' }, 500);
    }

    const p = (await req.json()) as Payload;
    if (!p.email) {
      return json({ error: 'Missing recipient email' }, 400);
    }

    const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'משתתף/ת יקר/ה';
    const subject = `אישור הרשמה${p.event_name ? ` — ${p.event_name}` : ''}`;

    const rows: Array<[string, string | undefined]> = [
      ['שם מלא', fullName],
      ['אירוע', p.event_name],
      ['מקצה', p.race_name],
      ['מספר משתתף', p.bib_number != null ? String(p.bib_number) : undefined],
      ['קטגוריה', p.category],
      ['מידת חולצה', p.shirt_size],
    ];
    const detailRows = rows
      .filter(([, v]) => v)
      .map(
        ([label, value]) =>
          `<tr>
            <td style="padding:8px 12px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;">${label}</td>
            <td style="padding:8px 12px;color:#111827;font-size:14px;font-weight:700;border-bottom:1px solid #f3f4f6;">${escapeHtml(String(value))}</td>
          </tr>`,
      )
      .join('');

    const contactRows = CONTACTS.map(
      (c) =>
        `<tr>
          <td style="padding:4px 0;color:#111827;font-size:14px;font-weight:700;">${c.name}</td>
          <td style="padding:4px 0;color:#1d4ed8;font-size:14px;font-family:monospace;direction:ltr;text-align:left;">${c.phone}</td>
        </tr>`,
    ).join('');

    const html = `
    <div dir="rtl" style="font-family:system-ui,-apple-system,Arial,sans-serif;background:#f3f4f6;padding:24px;">
      <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#0ea5e9);padding:28px 24px;text-align:center;">
          <div style="font-size:40px;">🎉</div>
          <div style="color:#ffffff;font-size:22px;font-weight:800;margin-top:6px;">הרשמתך נקלטה בהצלחה!</div>
          <div style="color:#dbeafe;font-size:14px;margin-top:4px;">שיהיה בהצלחה 🏊 🚴 🏃</div>
        </div>
        <div style="padding:24px;">
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">שלום ${escapeHtml(fullName)},<br/>תודה שנרשמת! להלן פרטי ההרשמה שלך:</p>
          <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:12px;overflow:hidden;">
            ${detailRows}
          </table>
          <div style="margin-top:24px;background:#f9fafb;border:1px solid #f3f4f6;border-radius:12px;padding:14px 16px;">
            <div style="color:#6b7280;font-size:14px;text-align:center;margin-bottom:8px;">לבירורים נוספים ניתן לפנות ל:</div>
            <table style="width:100%;border-collapse:collapse;">${contactRows}</table>
          </div>
        </div>
        <div style="background:#f9fafb;padding:14px 24px;text-align:center;color:#9ca3af;font-size:12px;">מייל זה נשלח אוטומטית עם השלמת ההרשמה.</div>
      </div>
    </div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [p.email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: `Email provider error: ${detail}` }, 502);
    }

    return json({ sent: true });
  } catch (err: any) {
    return json({ error: err?.message || 'Unknown error' }, 500);
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}
