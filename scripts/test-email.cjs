require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('📧 Testing SMTP Email Configuration...\n');

  // Check if environment variables are set
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('❌ Missing environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    console.log('\n📝 Please add these to your .env.local file');
    console.log('Example:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_SECURE=false');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASS=your-app-password');
    console.log('SMTP_FROM_NAME=Your Name');
    console.log('SMTP_FROM_EMAIL=your-email@gmail.com');
    return;
  }

  console.log('✅ Environment variables found\n');

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Add timeout and debugging
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  console.log('📡 SMTP Configuration:');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Port: ${process.env.SMTP_PORT}`);
  console.log(`   Secure: ${process.env.SMTP_SECURE}`);
  console.log(`   User: ${process.env.SMTP_USER}`);
  console.log(`   From: ${process.env.SMTP_FROM_NAME || 'Jigsaw AI'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>\n`);

  // Test connection by sending a test email
  const testEmail = process.env.SMTP_USER; // Send to yourself

  try {
    console.log(`📤 Sending test email to: ${testEmail}...`);

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Jigsaw AI'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to: testEmail,
      subject: '✅ Jigsaw AI SMTP Test - Connection Working!',
      text: `Hello,

This is a test email from Jigsaw AI to verify your SMTP connection is working correctly.

If you received this email, your email configuration is set up properly! 🎉

Configuration details:
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}
- SMTP User: ${process.env.SMTP_USER}
- From Name: ${process.env.SMTP_FROM_NAME || 'Jigsaw AI'}
- From Email: ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}

This was sent at: ${new Date().toLocaleString()}

— Jigsaw AI System`,
      html: `
        <h2>✅ Jigsaw AI SMTP Test - Connection Working!</h2>
        <p>Hello,</p>
        <p>This is a test email from <strong>Jigsaw AI</strong> to verify your SMTP connection is working correctly.</p>
        <p>If you received this email, your email configuration is set up properly! 🎉</p>
        <hr>
        <h3>Configuration Details:</h3>
        <ul>
          <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
          <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
          <li><strong>SMTP User:</strong> ${process.env.SMTP_USER}</li>
          <li><strong>From Name:</strong> ${process.env.SMTP_FROM_NAME || 'Jigsaw AI'}</li>
          <li><strong>From Email:</strong> ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}</li>
        </ul>
        <p><small>Sent at: ${new Date().toLocaleString()}</small></p>
        <p>— Jigsaw AI System</p>
      `,
    });

    console.log('\n✅ TEST PASSED! Email sent successfully!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info) || 'Not available (sent via real SMTP)'}`);
    console.log(`\n📧 Check your inbox (${testEmail}) for the test email.`);
    console.log('   If you don\'t see it, check your spam folder.');
    console.log('\n🎉 Your email configuration is working correctly!');

  } catch (error) {
    console.log('\n❌ TEST FAILED!');
    console.log(`   Error: ${error.message}`);
    
    // Provide helpful troubleshooting tips
    console.log('\n🔧 Troubleshooting Tips:');
    
    if (error.message.includes('Invalid login') || error.message.includes('Authentication failed')) {
      console.log('   ⚠️ Authentication failed - check your email and password:');
      console.log('      - For Gmail, you need an "App Password", not your regular password');
      console.log('      - Go to Google Account → Security → App Passwords');
      console.log('      - Generate a new app password for "Mail"');
      console.log('      - Update SMTP_PASS in .env.local');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Connection refused')) {
      console.log('   ⚠️ Connection refused - check your SMTP settings:');
      console.log('      - SMTP_HOST: ' + process.env.SMTP_HOST);
      console.log('      - SMTP_PORT: ' + process.env.SMTP_PORT);
      console.log('      - For Gmail: smtp.gmail.com, port 587');
      console.log('      - For Outlook: smtp.office365.com, port 587');
      console.log('      - For SendGrid: smtp.sendgrid.net, port 587');
    } else if (error.message.includes('self-signed certificate')) {
      console.log('   ⚠️ SSL certificate error - try using:');
      console.log('      - Add "SMTP_SECURE=false" to .env.local');
    } else if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      console.log('   ⚠️ Connection timeout - check your internet connection and firewall');
      console.log('      - Try using a different port');
      console.log('      - Check if your ISP blocks SMTP ports');
    }
    
    console.log('\n📝 Common SMTP Providers:');
    console.log('   Gmail:       smtp.gmail.com       587   (App Password Required)');
    console.log('   Outlook:     smtp.office365.com   587');
    console.log('   SendGrid:    smtp.sendgrid.net    587   (API Key Required)');
    console.log('   Mailgun:     smtp.mailgun.org     587');
    console.log('   Zoho:        smtp.zoho.com        587');
    console.log('   Yahoo:       smtp.mail.yahoo.com  587');
  }
}

testEmail();