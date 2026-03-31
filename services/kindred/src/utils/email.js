const nodemailer = require('nodemailer');

// Create reusable transporter using SES SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: parseInt(process.env.SES_SMTP_PORT || '587', 10),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SES_SMTP_USER,
    pass: process.env.SES_SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  const info = await transporter.sendMail({
    from: process.env.SES_FROM_EMAIL,
    to,
    subject,
    html,
  });
  return info;
}

module.exports = { sendEmail };
