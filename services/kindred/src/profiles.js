const pool = require('./db');

async function getMyProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT p.*,
        array_agg(DISTINCT jsonb_build_object(
          'id', pwl.id, 'label', pwl.label, 'url', pwl.url, 'sort_order', pwl.sort_order
        )) FILTER (WHERE pwl.id IS NOT NULL) as wishlist_links,
        array_agg(DISTINCT jsonb_build_object(
          'id', pd.id, 'label', pd.label, 'date', pd.date, 'recurs_annually', pd.recurs_annually
        )) FILTER (WHERE pd.id IS NOT NULL) as dates
      FROM profiles p
      LEFT JOIN profile_wishlist_links pwl ON p.id = pwl.profile_id
      LEFT JOIN profile_dates pd ON p.id = pd.profile_id
      WHERE p.user_id = $1
      GROUP BY p.id`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = result.rows[0];
    res.json({
      profile: {
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        photo_url: profile.photo_url,
        birthday: profile.birthday,
        bio: profile.bio,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      },
      wishlist_links: profile.wishlist_links || [],
      dates: profile.dates || []
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createProfile(req, res) {
  const { name, photo_url, birthday, bio } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO profiles (user_id, name, photo_url, birthday, bio)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, name, photo_url, birthday, bio]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Profile already exists' });
    }
    console.error('Error creating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateProfile(req, res) {
  const { name, photo_url, birthday, bio } = req.body;

  const updates = [];
  const values = [];
  let valueIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${valueIndex++}`);
    values.push(name);
  }
  if (photo_url !== undefined) {
    updates.push(`photo_url = $${valueIndex++}`);
    values.push(photo_url);
  }
  if (birthday !== undefined) {
    updates.push(`birthday = $${valueIndex++}`);
    values.push(birthday);
  }
  if (bio !== undefined) {
    updates.push(`bio = $${valueIndex++}`);
    values.push(bio);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push(`updated_at = NOW()`);
  values.push(req.user.id);

  try {
    const result = await pool.query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = $${valueIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function addWishlistLink(req, res) {
  const { label, url } = req.body;

  if (!label || !url) {
    return res.status(400).json({ error: 'Label and URL are required' });
  }

  try {
    // Get profile ID
    const profileResult = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileId = profileResult.rows[0].id;

    // Add wishlist link
    const result = await pool.query(
      `INSERT INTO profile_wishlist_links (profile_id, label, url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [profileId, label, url]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding wishlist link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteWishlistLink(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM profile_wishlist_links
       WHERE id = $1 AND profile_id = (
         SELECT id FROM profiles WHERE user_id = $2
       )
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wishlist link not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting wishlist link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function addDate(req, res) {
  const { label, date, recurs_annually = true } = req.body;

  if (!label || !date) {
    return res.status(400).json({ error: 'Label and date are required' });
  }

  try {
    // Get profile ID
    const profileResult = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profileId = profileResult.rows[0].id;

    // Add date
    const result = await pool.query(
      `INSERT INTO profile_dates (profile_id, label, date, recurs_annually)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [profileId, label, date, recurs_annually]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteDate(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM profile_dates
       WHERE id = $1 AND profile_id = (
         SELECT id FROM profiles WHERE user_id = $2
       )
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Date not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting date:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getProfile(req, res) {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT p.*,
        array_agg(DISTINCT jsonb_build_object(
          'id', pwl.id, 'label', pwl.label, 'url', pwl.url, 'sort_order', pwl.sort_order
        )) FILTER (WHERE pwl.id IS NOT NULL) as wishlist_links,
        array_agg(DISTINCT jsonb_build_object(
          'id', pd.id, 'label', pd.label, 'date', pd.date, 'recurs_annually', pd.recurs_annually
        )) FILTER (WHERE pd.id IS NOT NULL) as dates
      FROM profiles p
      LEFT JOIN profile_wishlist_links pwl ON p.id = pwl.profile_id
      LEFT JOIN profile_dates pd ON p.id = pd.profile_id
      WHERE p.user_id = $1
      GROUP BY p.id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = result.rows[0];
    res.json({
      profile: {
        id: profile.id,
        user_id: profile.user_id,
        name: profile.name,
        photo_url: profile.photo_url,
        birthday: profile.birthday,
        bio: profile.bio
      },
      wishlist_links: profile.wishlist_links || [],
      dates: profile.dates || []
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getMyProfile,
  createProfile,
  updateProfile,
  addWishlistLink,
  deleteWishlistLink,
  addDate,
  deleteDate,
  getProfile
};