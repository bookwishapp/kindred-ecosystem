const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function getUploadUrl(req, res) {
  const { contentType = 'image/jpeg' } = req.body;
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(contentType)) {
    return res.status(400).json({ error: 'Invalid content type' });
  }

  const ext = contentType.split('/')[1];
  const key = `profiles/${req.user.id}/${randomUUID()}.${ext}`;
  const bucket = process.env.AWS_S3_BUCKET || 'kindle-upload';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  const publicUrl = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

  res.json({ uploadUrl, publicUrl });
}

module.exports = { getUploadUrl };