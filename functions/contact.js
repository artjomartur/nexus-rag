export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'All fields are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NexusRAG Contact <onboarding@resend.dev>',
        to: ['hi@artjombecker.com'],
        reply_to: email,
        subject: `NexusRAG: Message from ${name}`,
        html: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="font-size: 1.5rem; margin-bottom: 8px;">New message via NexusRAG</h2>
            <p style="color: #666; margin-bottom: 32px; font-size: 0.9rem;">nexus.artjombecker.com</p>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; font-size: 0.875rem; width: 80px;">Name</td><td style="padding: 12px 0; border-bottom: 1px solid #eee;">${name}</td></tr>
              <tr><td style="padding: 12px 0; border-bottom: 1px solid #eee; color: #666; font-size: 0.875rem;">Email</td><td style="padding: 12px 0; border-bottom: 1px solid #eee;"><a href="mailto:${email}">${email}</a></td></tr>
            </table>
            <div style="margin-top: 24px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
              <p style="margin: 0; line-height: 1.7;">${message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
        `,
      }),
    });

    if (resendResponse.ok) {
      return new Response(
        JSON.stringify({ status: 'success', message: 'Thank you! I will get back to you soon.' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      const err = await resendResponse.json();
      console.error('Resend error:', err);
      return new Response(
        JSON.stringify({ status: 'error', message: 'Failed to send. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Contact function error:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: 'An unexpected error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
