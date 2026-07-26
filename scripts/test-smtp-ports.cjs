require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testPorts() {
  console.log('🔍 Testing SMTP ports...\n');
  
  const configs = [
    { host: 'cp25.pixellohost.com', port: 465, secure: true },
    { host: 'cp25.pixellohost.com', port: 587, secure: false },
    { host: 'cp25.pixellohost.com', port: 25, secure: false },
    { host: 'mail.jigsaw-studios.co.za', port: 587, secure: false },
    { host: 'mail.jigsaw-studios.co.za', port: 465, secure: true },
  ];
  
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  
  for (const config of configs) {
    console.log(`Testing: ${config.host}:${config.port} (secure: ${config.secure})...`);
    
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      
      // Just test the connection
      await transporter.verify();
      console.log(`   ✅ SUCCESS! ${config.host}:${config.port} works!\n`);
      console.log('📝 Add these to .env.local:');
      console.log(`SMTP_HOST=${config.host}`);
      console.log(`SMTP_PORT=${config.port}`);
      console.log(`SMTP_SECURE=${config.secure}`);
      return;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n❌ All port tests failed.');
  console.log('💡 Try contacting your hosting provider for correct SMTP settings.');
}

testPorts();