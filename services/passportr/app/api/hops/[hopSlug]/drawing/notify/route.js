export const runtime = 'nodejs';

const db = require('../../../../../../lib/db');
const { requireOrganizer } = require('../../../../../../lib/auth');
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

export async function POST(req, { params }) {
  try {
    const { user, profile } = await requireOrganizer(req);
    const { hopSlug } = params;

    const hopResult = await db.query('SELECT * FROM hops WHERE slug = $1', [hopSlug]);
    if (hopResult.rows.length === 0) return Response.json({ error: 'Hop not found' }, { status: 404 });
    const hop = hopResult.rows[0];
    if (hop.organizer_user_id !== user.sub) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const winners = await db.query(
      `SELECT dw.id, p.user_id, p.email as winner_email, dp.label as prize_label
       FROM drawing_winners dw
       JOIN participants p ON p.id = dw.participant_id
       LEFT JOIN drawing_prizes dp ON dp.id = dw.prize_id
       WHERE dw.hop_id = $1 AND dw.notified_at IS NULL
       ORDER BY dp.sort_order`,
      [hop.id]
    );

    let notified = 0;
    for (const winner of winners.rows) {
      if (!winner.winner_email) continue;

      const prizeText = winner.prize_label
        ? `You've won: ${winner.prize_label}`
        : `You've been selected as a winner!`;

      await transporter.sendMail({
        from: process.env.SES_FROM_EMAIL,
        to: winner.winner_email,
        subject: `You won the ${hop.name} drawing!`,
        text: [
          `Congratulations!`,
          ``,
          `You've been selected as a winner in the ${hop.name} drawing.`,
          ``,
          prizeText,
          ``,
          `The organizer will be in touch with details. You can reach them at ${user.email}.`,
          ``,
          `Thanks for participating in ${hop.name}!`,
          ``,
          `Passportr`,
        ].join('\n'),
      });

      await db.query(
        'UPDATE drawing_winners SET notified_at = NOW() WHERE id = $1',
        [winner.id]
      );

      notified++;
    }

    return Response.json({ notified });
  } catch (error) {
    if (error.message === 'Unauthorized') return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (error.message === 'Forbidden') return Response.json({ error: 'Forbidden' }, { status: 403 });
    console.error('Drawing notify error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
