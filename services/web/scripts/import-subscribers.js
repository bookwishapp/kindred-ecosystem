const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let char of lines[i]) {
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

async function importSubscribers() {
  const csvPath = path.join(__dirname, '..', 'data', 'subscribers.csv');

  if (!fs.existsSync(csvPath)) {
    console.log('No subscribers.csv file found in /data directory');
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);

  let totalProcessed = 0;
  let importedActive = 0;
  let importedSuppressed = 0;
  let skippedNoEmail = 0;
  let skippedDuplicate = 0;

  const client = await pool.connect();

  try {
    for (const row of rows) {
      totalProcessed++;

      const email = (row['Email Address'] || '').toLowerCase().trim();
      const firstName = row['First Name'] || '';
      const lastName = row['Last Name'] || '';
      const status = (row['Email Subscription Status'] || '').toLowerCase();

      // Skip if no email
      if (!email || !email.includes('@')) {
        skippedNoEmail++;
        continue;
      }

      try {
        await client.query('BEGIN');

        if (status === 'unsubscribed' || status === 'bounced') {
          // Add to suppressions
          const suppressResult = await client.query(
            `INSERT INTO suppressions (email, reason)
             VALUES ($1, $2)
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [email, status === 'bounced' ? 'bounced' : 'unsubscribed']
          );

          if (suppressResult.rows.length > 0) {
            importedSuppressed++;
          } else {
            skippedDuplicate++;
          }
        } else if (status === 'subscribed' || status === 'unknown' || !status) {
          // Add to active subscribers
          const subResult = await client.query(
            `INSERT INTO subscribers (email, first_name, last_name, status, source)
             VALUES ($1, $2, $3, 'active', 'import')
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [email, firstName, lastName]
          );

          if (subResult.rows.length > 0) {
            importedActive++;
          } else {
            skippedDuplicate++;
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error processing ${email}:`, error.message);
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total rows processed: ${totalProcessed}`);
    console.log(`Imported as active: ${importedActive}`);
    console.log(`Imported as suppressed: ${importedSuppressed}`);
    console.log(`Skipped (no email): ${skippedNoEmail}`);
    console.log(`Skipped (duplicate): ${skippedDuplicate}`);
  } catch (error) {
    console.error('Import error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

importSubscribers();