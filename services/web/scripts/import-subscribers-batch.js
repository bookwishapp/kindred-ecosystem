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

  const activeSubscribers = [];
  const suppressions = [];
  let skippedNoEmail = 0;

  // Process rows into batches
  for (const row of rows) {
    const email = (row['Email Address'] || '').toLowerCase().trim();
    const firstName = row['First Name'] || '';
    const lastName = row['Last Name'] || '';
    const status = (row['Email Subscription Status'] || '').toLowerCase();

    if (!email || !email.includes('@')) {
      skippedNoEmail++;
      continue;
    }

    if (status === 'unsubscribed' || status === 'bounced') {
      suppressions.push({
        email,
        reason: status === 'bounced' ? 'bounced' : 'unsubscribed'
      });
    } else if (status === 'subscribed' || status === 'unknown' || !status) {
      activeSubscribers.push({
        email,
        first_name: firstName,
        last_name: lastName
      });
    }
  }

  console.log(`Processing ${rows.length} total rows...`);
  console.log(`- Active subscribers to import: ${activeSubscribers.length}`);
  console.log(`- Suppressions to import: ${suppressions.length}`);
  console.log(`- Skipped (no email): ${skippedNoEmail}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Batch insert active subscribers
    if (activeSubscribers.length > 0) {
      console.log('Inserting active subscribers...');
      const values = activeSubscribers.map((sub, i) => {
        const offset = i * 5;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
      }).join(', ');

      const params = activeSubscribers.flatMap(sub => [
        sub.email,
        sub.first_name,
        sub.last_name,
        'active',
        'import'
      ]);

      const insertQuery = `
        INSERT INTO subscribers (email, first_name, last_name, status, source)
        VALUES ${values}
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;

      const result = await client.query(insertQuery, params);
      console.log(`✓ Imported ${result.rowCount} active subscribers`);
    }

    // Batch insert suppressions
    if (suppressions.length > 0) {
      console.log('Inserting suppressions...');
      const values = suppressions.map((sup, i) => {
        const offset = i * 2;
        return `($${offset + 1}, $${offset + 2})`;
      }).join(', ');

      const params = suppressions.flatMap(sup => [sup.email, sup.reason]);

      const insertQuery = `
        INSERT INTO suppressions (email, reason)
        VALUES ${values}
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `;

      const result = await client.query(insertQuery, params);
      console.log(`✓ Imported ${result.rowCount} suppressions`);

      // Also update subscriber status for suppressed emails
      const suppressedEmails = suppressions.map(s => s.email);
      if (suppressedEmails.length > 0) {
        await client.query(
          `UPDATE subscribers
           SET status = 'suppressed'
           WHERE email = ANY($1)`,
          [suppressedEmails]
        );
      }
    }

    await client.query('COMMIT');

    console.log('\n=== Import Complete ===');
    console.log('Successfully imported subscriber data');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

importSubscribers().catch(console.error);