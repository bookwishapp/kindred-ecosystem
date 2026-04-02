const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function sendEmail({ to, from, senderName, subject, html, replyTo }) {
  const command = new SendEmailCommand({
    Source: `${senderName} <${from}>`,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
      },
    },
    ...(replyTo ? { ReplyToAddresses: [replyTo] } : {}),
  });

  const result = await ses.send(command);
  return result.MessageId;
}

module.exports = { sendEmail };
