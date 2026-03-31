const nodemailer = require('nodemailer');
const { getUnsubscribeUrl } = require('./unsubscribe');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const port = parseInt(process.env.SES_SMTP_PORT || '587');
    transporter = nodemailer.createTransport({
      host: process.env.SES_SMTP_HOST,
      port: port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user: process.env.SES_SMTP_USER,
        pass: process.env.SES_SMTP_PASS,
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });
  }
  return transporter;
}

function getEmailTemplate(content, unsubscribeUrl) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Small Things</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #222;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            font-size: 24px;
            margin-bottom: 20px;
        }
        h2 {
            font-size: 20px;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        h3 {
            font-size: 18px;
            margin-top: 25px;
            margin-bottom: 10px;
        }
        p {
            margin-bottom: 15px;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        ul, ol {
            margin-bottom: 15px;
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        blockquote {
            border-left: 3px solid #ddd;
            padding-left: 15px;
            margin: 20px 0;
            color: #555;
            font-style: italic;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            font-size: 14px;
            color: #666;
        }
        .footer a {
            color: #666;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    ${content}

    <div class="footer">
        <p>
            Small Things · <a href="https://terryheath.com">terryheath.com</a>
        </p>
        <p>
            You're receiving this because you subscribed or were a customer at Sinclair Inlet Book Co.
        </p>
        <p>
            <a href="${unsubscribeUrl}">Unsubscribe</a> ·
            <a href="https://terryheath.com/support">Support Small Things</a>
        </p>
    </div>
</body>
</html>
  `;
}

async function sendEmail({ to, subject, content, isNewsletter = false }) {
  const transport = getTransporter();
  const fromEmail = process.env.SES_FROM_EMAIL || 'terry@terryheath.com';

  const unsubscribeUrl = isNewsletter ? getUnsubscribeUrl(to) : null;
  const htmlContent = isNewsletter ? getEmailTemplate(content, unsubscribeUrl) : content;

  const mailOptions = {
    from: `Terry @ Sinclair Inlet Book Co. <${fromEmail}>`,
    to,
    subject,
    html: htmlContent,
  };

  // Add unsubscribe headers for newsletters
  if (isNewsletter && unsubscribeUrl) {
    mailOptions.headers = {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  return transport.sendMail(mailOptions);
}

async function sendNewsletterToSubscribers(postId, subject, content) {
  const db = require('./db');

  // Get active subscribers
  const subscribersResult = await db.query(
    `SELECT email, first_name, last_name
     FROM subscribers
     WHERE status = 'active'
       AND email NOT IN (
         SELECT email FROM suppressions
       )`
  );

  const subscribers = subscribersResult.rows;
  const totalCount = subscribers.length;
  let sentCount = 0;
  const errors = [];

  // Send emails with rate limiting (one every 100ms)
  for (const subscriber of subscribers) {
    try {
      await sendEmail({
        to: subscriber.email,
        subject,
        content,
        isNewsletter: true,
      });
      sentCount++;
    } catch (error) {
      console.error(`Failed to send to ${subscriber.email}:`, error);
      errors.push({ email: subscriber.email, error: error.message });
    }

    // Rate limit: wait 100ms between sends
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { totalCount, sentCount, errors };
}

module.exports = {
  sendEmail,
  sendNewsletterToSubscribers,
  getEmailTemplate,
};