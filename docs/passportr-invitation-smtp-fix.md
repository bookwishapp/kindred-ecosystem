# Passportr — Invitation Route SMTP Fix

## Ground Rules

- Read the file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.

---

## Manual Prerequisite

Add these env vars to the `outstanding-dedication` Railway service before deploying:
- `SES_SMTP_HOST` = `email-smtp.us-east-1.amazonaws.com`
- `SES_SMTP_PORT` = `587`
- `SES_SMTP_USERNAME` — same value used in other ecosystem services
- `SES_SMTP_PASSWORD` — same value used in other ecosystem services
- `SES_FROM_EMAIL` = `noreply@passportr.io`

---

## Task — Replace SES SDK with Nodemailer in Invitation Route

Read `services/passportr/app/api/hops/[hopSlug]/invitations/route.js`.

**Change 1:** Remove the SES SDK import and client at the top of the file.

Find:
```js
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
```

Replace with:
```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SES_SMTP_HOST,
  port: parseInt(process.env.SES_SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SES_SMTP_USERNAME,
    pass: process.env.SES_SMTP_PASSWORD,
  },
});
```

**Change 2:** Replace the SES send call in the POST handler.

Find:
```js
await ses.send(new SendEmailCommand({
  Source: 'noreply@passportr.io',
  Destination: { ToAddresses: [email] },
  Message: {
    Subject: { Data: `You're invited to join ${hop.name} on Passportr` },
    Body: {
      Text: {
        Data: `Hi,\n\nYou've been invited to participate in "${hop.name}" on Passportr as a venue.\n\nVenue name: ${venue_name}\n\nClick the link below to set up your venue:\n${setupUrl}\n\nThis link is unique to your venue — don't share it.\n\nPassportr`
      }
    }
  }
}));
```

Replace with:
```js
await transporter.sendMail({
  from: process.env.SES_FROM_EMAIL,
  to: email,
  subject: `You're invited to join ${hop.name} on Passportr`,
  text: `Hi,\n\nYou've been invited to participate in "${hop.name}" on Passportr as a venue.\n\nVenue name: ${venue_name}\n\nClick the link below to set up your venue:\n${setupUrl}\n\nThis link is unique to your venue — don't share it.\n\nPassportr`,
});
```

**Change 3:** In `services/passportr/package.json`, remove `@aws-sdk/client-ses` from dependencies if it was added. Confirm `nodemailer` is present — if not, run `npm install nodemailer` from `services/passportr/`.

No other changes to any files.

---

## Verification Checklist

- [ ] No SES SDK imports remain in the invitation route
- [ ] Nodemailer transporter uses all four env vars
- [ ] `sendMail` uses `SES_FROM_EMAIL` for from address
- [ ] `nodemailer` is in `package.json` dependencies
- [ ] `@aws-sdk/client-ses` is not in `package.json` dependencies
- [ ] No other files modified
