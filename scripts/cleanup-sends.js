const db = require('../lib/db');

async function cleanupSends() {
  try {
    // Clean up stuck sends
    const updateResult = await db.query(
      "UPDATE sends SET status = 'failed', completed_at = NOW() WHERE status = 'sending' AND sent_count = 0"
    );

    console.log(`Updated ${updateResult.rowCount} stuck send records to failed status`);
    console.log('');

    // Show current sends table
    const sendsResult = await db.query(
      `SELECT
        s.id,
        p.title as post_title,
        s.subject,
        s.status,
        s.recipient_count,
        s.sent_count,
        s.started_at,
        s.completed_at
       FROM sends s
       LEFT JOIN posts p ON s.post_id = p.id
       ORDER BY s.created_at DESC`
    );

    console.log('Current sends table:');
    console.log('=====================================================');

    if (sendsResult.rows.length === 0) {
      console.log('No sends found');
    } else {
      sendsResult.rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`Post: ${row.post_title}`);
        console.log(`Subject: ${row.subject}`);
        console.log(`Status: ${row.status}`);
        console.log(`Recipients: ${row.recipient_count}`);
        console.log(`Sent: ${row.sent_count}`);
        console.log(`Started: ${row.started_at ? new Date(row.started_at).toLocaleString() : 'N/A'}`);
        console.log(`Completed: ${row.completed_at ? new Date(row.completed_at).toLocaleString() : 'N/A'}`);
        console.log('-----------------------------------------------------');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupSends();