import nodemailer from 'nodemailer';

export async function POST(req) {
  try {
    const { to, subject, message, leadId, channel } = await req.json();

    // Validate required fields
    if (!to || !subject || !message) {
      return Response.json({ error: 'Missing required fields: to, subject, message' }, { status: 400 });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Jigsaw AI'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: to,
      subject: subject,
      text: message,
      html: message.replace(/\n/g, '<br>'),
    });

    console.log('Email sent:', info.messageId);

    return Response.json({ 
      success: true, 
      messageId: info.messageId,
      sent: true 
    });

  } catch (error) {
    console.error('Email send error:', error);
    return Response.json({ 
      error: error.message || 'Failed to send email',
      details: error.response?.body || 'No additional details'
    }, { status: 500 });
  }
}