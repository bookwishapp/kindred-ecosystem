const nodemailer = require('nodemailer');

// Create transporter with SES SMTP config
const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: parseInt(process.env.SES_SMTP_PORT, 10),
  secure: process.env.SES_SMTP_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASS
  }
});

// Send magic link email
async function sendMagicLink(email, token, redirectUri, appName) {
  // Build the verification URL with redirect_uri if provided
  let magicLinkUrl = `${process.env.AUTH_BASE_URL}/auth/verify?token=${token}`;
  if (redirectUri) {
    magicLinkUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  // Use provided app_name or fall back to environment variable
  const displayAppName = appName || process.env.APP_NAME;

  const mailOptions = {
    from: process.env.SES_FROM_EMAIL,
    to: email,
    subject: `Sign in to ${displayAppName}`,
    text: `Click this link to sign in to ${displayAppName}:\n\n${magicLinkUrl}\n\nThis link will expire in 15 minutes. If you didn't request this email, you can safely ignore it.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Magic link sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send magic link email');
  }
}

module.exports = {
  sendMagicLink
};