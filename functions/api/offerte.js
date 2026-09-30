const MAX_FILES = 3;
const MAX_TOTAL_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'webp', 'heic', 'dxf', 'dwg', 'step', 'stp'
]);

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  }
});

const clean = (value, maxLength = 4000) => String(value || '')
  .replace(/\0/g, '')
  .trim()
  .slice(0, maxLength);

const escapeHtml = (value) => clean(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const toBase64 = async (file) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

const resend = async (apiKey, payload) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const details = await response.text();
    console.error('Resend error:', response.status, details);
    throw new Error('E-mailverzending mislukt');
  }

  return response.json();
};

const wantsJson = (request) => (
  request.headers.get('Accept')?.includes('application/json') ||
  request.headers.get('X-Requested-With') === 'XMLHttpRequest'
);

const respond = (request, data, status = 200, location = '/bedankt/') => {
  if (wantsJson(request)) return json(data, status);
  if (status >= 400) {
    const url = new URL('/contact/', request.url);
    url.searchParams.set('fout', '1');
    return Response.redirect(url.toString(), 303);
  }
  return Response.redirect(new URL(location, request.url).toString(), 303);
};

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY || !env.OFFERTES_TO_EMAIL || !env.OFFERTES_FROM_EMAIL) {
    console.error('Missing Resend environment variables');
    return respond(request, {
      ok: false,
      message: 'Het formulier is nog niet volledig geconfigureerd. Stuur uw aanvraag per e-mail.'
    }, 503);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return respond(request, { ok: false, message: 'De formuliergegevens konden niet worden gelezen.' }, 400);
  }

  if (clean(form.get('website'), 200)) {
    return respond(request, { ok: true }, 200);
  }

  const startedAt = Number(form.get('form_started_at'));
  if (Number.isFinite(startedAt) && Date.now() - startedAt < 2500) {
    return respond(request, { ok: false, message: 'Het formulier is te snel verzonden. Probeer het opnieuw.' }, 429);
  }

  const data = {
    naam: clean(form.get('naam'), 100),
    bedrijf: clean(form.get('bedrijf'), 120),
    email: clean(form.get('email'), 160).toLowerCase(),
    telefoon: clean(form.get('telefoon'), 40),
    onderwerp: clean(form.get('onderwerp'), 100),
    product: clean(form.get('product'), 100),
    aantal: clean(form.get('aantal'), 60),
    specificaties: clean(form.get('specificaties'), 4000),
    pagina: clean(form.get('pagina'), 300),
    utm_source: clean(form.get('utm_source'), 150),
    utm_medium: clean(form.get('utm_medium'), 150),
    utm_campaign: clean(form.get('utm_campaign'), 200),
    utm_term: clean(form.get('utm_term'), 200),
    utm_content: clean(form.get('utm_content'), 200),
    gclid: clean(form.get('gclid'), 300),
    gbraid: clean(form.get('gbraid'), 300),
    wbraid: clean(form.get('wbraid'), 300)
  };

  if (!data.naam || !data.email || !data.specificaties) {
    return respond(request, { ok: false, message: 'Vul uw naam, e-mailadres en bericht in.' }, 400);
  }

  if (!isEmail(data.email)) {
    return respond(request, { ok: false, message: 'Vul een geldig e-mailadres in.' }, 400);
  }

  const files = form.getAll('bestanden').filter((item) => item instanceof File && item.size > 0);
  if (files.length > MAX_FILES) {
    return respond(request, { ok: false, message: `Voeg maximaal ${MAX_FILES} bestanden toe.` }, 400);
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_TOTAL_FILE_SIZE) {
    return respond(request, { ok: false, message: 'De bestanden mogen samen maximaal 8 MB zijn.' }, 413);
  }

  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return respond(request, { ok: false, message: `Bestandstype .${extension || '?'} wordt niet geaccepteerd.` }, 400);
    }
  }

  const attachments = await Promise.all(files.map(async (file) => ({
    filename: clean(file.name, 180),
    content: await toBase64(file)
  })));

  const campaignRows = [
    ['UTM-bron', data.utm_source],
    ['UTM-medium', data.utm_medium],
    ['UTM-campagne', data.utm_campaign],
    ['UTM-term', data.utm_term],
    ['UTM-content', data.utm_content],
    ['GCLID', data.gclid],
    ['GBRAID', data.gbraid],
    ['WBRAID', data.wbraid]
  ].filter(([, value]) => value);

  const rows = [
    ['Naam', data.naam],
    ...(data.bedrijf ? [['Bedrijf', data.bedrijf]] : []),
    ['E-mail', data.email],
    ['Telefoon', data.telefoon || 'Niet ingevuld'],
    ...(data.onderwerp ? [['Onderwerp', data.onderwerp]] : []),
    ['Product', data.product || 'Niet gekozen'],
    ['Aantal', data.aantal || 'Niet ingevuld'],
    ['Pagina', data.pagina || 'Onbekend']
  ];

  const subjectProduct = data.product || data.onderwerp || 'kunststof maatwerk';
  const htmlRows = rows.map(([label, value]) => `
    <tr>
      <th style="padding:9px 12px;text-align:left;border-bottom:1px solid #dbe4df;color:#142b33;vertical-align:top">${escapeHtml(label)}</th>
      <td style="padding:9px 12px;border-bottom:1px solid #dbe4df;color:#536369">${escapeHtml(value)}</td>
    </tr>`).join('');

  const campaignHtml = campaignRows.length ? `
    <h2 style="font-size:17px;color:#142b33;margin:26px 0 8px">Campagnegegevens</h2>
    <table style="width:100%;border-collapse:collapse">${campaignRows.map(([label, value]) => `
      <tr><th style="padding:7px 12px;text-align:left;border-bottom:1px solid #dbe4df;color:#142b33">${escapeHtml(label)}</th><td style="padding:7px 12px;border-bottom:1px solid #dbe4df;color:#536369;word-break:break-all">${escapeHtml(value)}</td></tr>`).join('')}
    </table>` : '';

  const internalHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Tahoma,sans-serif;font-size:14px;color:#222;background:#fff">
      <tr>
        <td>
          <table width="680" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:680px;border:1px solid #b8b8b8">
            <tr>
              <td style="padding:10px 12px;background:#e7e7e7;border-bottom:1px solid #b8b8b8;font-weight:bold">
                Nieuwe offerteaanvraag via MaatwerkKunststof.nl
              </td>
            </tr>
            <tr>
              <td style="padding:12px">
                <table width="100%" cellpadding="5" cellspacing="0" border="0" style="border-collapse:collapse">
                  ${rows.map(([label, value]) => `
                    <tr>
                      <td width="120" style="font-weight:bold;border-bottom:1px solid #ddd;vertical-align:top">${escapeHtml(label)}</td>
                      <td style="border-bottom:1px solid #ddd;vertical-align:top">${escapeHtml(value)}</td>
                    </tr>`).join('')}
                  <tr>
                    <td style="font-weight:bold;border-bottom:1px solid #ddd;vertical-align:top">Bijlagen</td>
                    <td style="border-bottom:1px solid #ddd;vertical-align:top">${attachments.length || 'Geen'}</td>
                  </tr>
                </table>

                <p style="margin:18px 0 6px;font-weight:bold">Specificaties / bericht</p>
                <table width="100%" cellpadding="10" cellspacing="0" border="0" style="border-collapse:collapse">
                  <tr>
                    <td style="border:1px solid #cfcfcf;background:#f5f5f5;white-space:pre-wrap;line-height:1.45">${escapeHtml(data.specificaties)}</td>
                  </tr>
                </table>

                ${campaignRows.length ? `
                  <p style="margin:18px 0 6px;font-weight:bold;font-size:12px;color:#666">Campagnegegevens</p>
                  <table width="100%" cellpadding="4" cellspacing="0" border="0" style="border-collapse:collapse;font-size:12px;color:#666">
                    ${campaignRows.map(([label, value]) => `
                      <tr>
                        <td width="120" style="border-bottom:1px solid #e5e5e5">${escapeHtml(label)}</td>
                        <td style="border-bottom:1px solid #e5e5e5;word-break:break-all">${escapeHtml(value)}</td>
                      </tr>`).join('')}
                  </table>` : ''}

                <p style="margin:14px 0 0;font-size:11px;color:#777">
                  Verzonden via het offerteformulier op MaatwerkKunststof.nl
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const internalText = [
    'Nieuwe offerteaanvraag',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    'Specificaties:',
    data.specificaties,
    '',
    `Bijlagen: ${attachments.length}`,
    ...campaignRows.map(([label, value]) => `${label}: ${value}`)
  ].join('\n');

  try {
    await resend(env.RESEND_API_KEY, {
      from: env.OFFERTES_FROM_EMAIL,
      to: [env.OFFERTES_TO_EMAIL],
      reply_to: data.email,
      subject: `Nieuwe offerteaanvraag: ${subjectProduct} – ${data.naam}`,
      html: internalHtml,
      text: internalText,
      attachments
    });

    if (env.SEND_CONFIRMATION === 'true') {
      try {
        await resend(env.RESEND_API_KEY, {
          from: env.OFFERTES_FROM_EMAIL,
          to: [data.email],
          reply_to: env.OFFERTES_TO_EMAIL,
          subject: 'We hebben uw offerteaanvraag ontvangen',
          html: `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Tahoma,sans-serif;font-size:14px;color:#222;background:#fff">
              <tr>
                <td>
                  <table width="620" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;border:1px solid #b8b8b8">
                    <tr>
                      <td style="padding:10px 12px;background:#e7e7e7;border-bottom:1px solid #b8b8b8;font-weight:bold">
                        MaatwerkKunststof.nl
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:14px 12px;line-height:1.5">
                        <p style="margin:0 0 12px">Beste ${escapeHtml(data.naam)},</p>
                        <p style="margin:0 0 12px">Bedankt voor uw aanvraag voor ${escapeHtml(subjectProduct)}. We hebben deze goed ontvangen en bekijken de gegevens zo spoedig mogelijk.</p>

                        <p style="margin:18px 0 6px;font-weight:bold">Uw bericht</p>
                        <table width="100%" cellpadding="10" cellspacing="0" border="0" style="border-collapse:collapse">
                          <tr>
                            <td style="border:1px solid #cfcfcf;background:#f5f5f5;white-space:pre-wrap;line-height:1.45">${escapeHtml(data.specificaties)}</td>
                          </tr>
                        </table>

                        <p style="margin:14px 0 0">Met vriendelijke groet,<br>MaatwerkKunststof.nl</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`,
          text: `Bedankt voor uw aanvraag, ${data.naam}.\n\nWe hebben uw aanvraag voor ${subjectProduct} ontvangen.\n\nUw omschrijving:\n${data.specificaties}`
        });
      } catch (confirmationError) {
        console.error('Confirmation email failed:', confirmationError);
      }
    }

    return respond(request, { ok: true }, 200);
  } catch (error) {
    console.error('Offerte form failed:', error);
    return respond(request, {
      ok: false,
      message: 'De aanvraag kon niet worden verstuurd. Probeer het later opnieuw of stuur een e-mail.'
    }, 502);
  }
}

export function onRequestGet() {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST' }
  });
}
