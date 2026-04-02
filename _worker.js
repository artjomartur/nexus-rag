export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle contact form POST
    if (url.pathname === '/contact' && request.method === 'POST') {
      return handleContact(request, env);
    }

    // All other requests → serve static assets
    return env.ASSETS.fetch(request);
  }
};

async function handleContact(request, env) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return Response.json(
        { status: 'error', message: 'All fields are required.' },
        { status: 400 }
      );
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NexusRAG <onboarding@resend.dev>',
        to: ['hi@artjombecker.com'],
        reply_to: email,
        subject: `NexusRAG: Message from ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px 20px">
            <h2 style="margin-bottom:4px">New message via NexusRAG</h2>
            <p style="color:#666;font-size:13px;margin-bottom:24px">nexus.artjombecker.com</p>
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px;width:70px">Name</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee">${name}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eee;color:#666;font-size:13px">Email</td>
                <td style="padding:10px 0;border-bottom:1px solid #eee">
                  <a href="mailto:${email}" style="color:#2563eb">${email}</a>
                </td>
              </tr>
            </table>
            <div style="margin-top:24px;padding:20px;background:#f9f9f9;border-radius:8px;line-height:1.7">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
        `,
      }),
    });

    if (res.ok) {
      return Response.json({ status: 'success', message: 'Thank you! I will get back to you soon.' });
    }

    const err = await res.text();
    console.error('Resend error:', err);
    return Response.json({ status: 'error', message: 'Failed to send. Please try again.' }, { status: 500 });

  } catch (err) {
    console.error('Worker error:', err);
    return Response.json({ status: 'error', message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
