const pool = require('./db');

async function getKin(req, res) {
  try {
    const result = await pool.query(
      `SELECT kr.*,
        array_agg(DISTINCT jsonb_build_object(
          'id', kd.id, 'label', kd.label, 'date', kd.date, 'recurs_annually', kd.recurs_annually
        )) FILTER (WHERE kd.id IS NOT NULL) as dates
      FROM kin_records kr
      LEFT JOIN kin_dates kd ON kr.id = kd.kin_record_id
      WHERE kr.owner_user_id = $1
      GROUP BY kr.id`,
      [req.user.id]
    );

    const kin = result.rows.map(record => {
      const kinData = {
        id: record.id,
        type: record.type,
        position_override: record.position_override,
        created_at: record.created_at,
        updated_at: record.updated_at,
        dates: record.dates || []
      };

      if (record.type === 'linked' && record.linked_profile_id) {
        kinData.linked_profile_id = record.linked_profile_id;
        // Profile data will need to be fetched separately from auth service
      } else if (record.type === 'local') {
        kinData.local_name = record.local_name;
        kinData.local_photo_url = record.local_photo_url;
        kinData.local_birthday = record.local_birthday;
      }

      return kinData;
    });

    res.json(kin);
  } catch (error) {
    console.error('Error fetching kin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function addKinLinked(req, res) {
  const { linked_profile_id } = req.body;

  if (!linked_profile_id) {
    return res.status(400).json({ error: 'linked_profile_id is required' });
  }

  try {
    // Check if already added
    const existingCheck = await pool.query(
      'SELECT id FROM kin_records WHERE owner_user_id = $1 AND linked_profile_id = $2',
      [req.user.id, linked_profile_id]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Already in your kin' });
    }

    // Add to kin
    const result = await pool.query(
      `INSERT INTO kin_records (owner_user_id, type, linked_profile_id)
       VALUES ($1, 'linked', $2)
       RETURNING *`,
      [req.user.id, linked_profile_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding linked kin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function addKinLocal(req, res) {
  const { local_name, local_photo_url, local_birthday } = req.body;

  if (!local_name) {
    return res.status(400).json({ error: 'local_name is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO kin_records (owner_user_id, type, local_name, local_photo_url, local_birthday)
       VALUES ($1, 'local', $2, $3, $4)
       RETURNING *`,
      [req.user.id, local_name, local_photo_url, local_birthday]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding local kin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateKin(req, res) {
  const { id } = req.params;
  const { position_override, local_name, local_photo_url, local_birthday } = req.body;

  const updates = [];
  const values = [];
  let valueIndex = 1;

  if (position_override !== undefined) {
    updates.push(`position_override = $${valueIndex++}`);
    values.push(position_override);
  }
  if (local_name !== undefined) {
    updates.push(`local_name = $${valueIndex++}`);
    values.push(local_name);
  }
  if (local_photo_url !== undefined) {
    updates.push(`local_photo_url = $${valueIndex++}`);
    values.push(local_photo_url);
  }
  if (local_birthday !== undefined) {
    updates.push(`local_birthday = $${valueIndex++}`);
    values.push(local_birthday);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);
  values.push(req.user.id);

  try {
    const result = await pool.query(
      `UPDATE kin_records SET ${updates.join(', ')} WHERE id = $${valueIndex} AND owner_user_id = $${valueIndex + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kin record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating kin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteKin(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM kin_records WHERE id = $1 AND owner_user_id = $2 RETURNING *',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kin record not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting kin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function addKinDate(req, res) {
  const { id } = req.params;
  const { label, date, recurs_annually = true } = req.body;

  if (!label || !date) {
    return res.status(400).json({ error: 'Label and date are required' });
  }

  try {
    // Verify ownership
    const ownerCheck = await pool.query(
      'SELECT id FROM kin_records WHERE id = $1 AND owner_user_id = $2',
      [id, req.user.id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Kin record not found' });
    }

    // Add date
    const result = await pool.query(
      `INSERT INTO kin_dates (kin_record_id, label, date, recurs_annually)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, label, date, recurs_annually]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding kin date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteKinDate(req, res) {
  const { id, dateId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM kin_dates
       WHERE id = $1 AND kin_record_id = $2
       AND EXISTS (
         SELECT 1 FROM kin_records WHERE id = $2 AND owner_user_id = $3
       )
       RETURNING *`,
      [dateId, id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kin date not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting kin date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getKin,
  addKinLinked,
  addKinLocal,
  updateKin,
  deleteKin,
  addKinDate,
  deleteKinDate
};