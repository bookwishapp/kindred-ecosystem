const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// POST /api/upload-url - Generate presigned S3 upload URL
async function getUploadUrl(req, res) {
  try {
    const { fileName, contentType = 'image/jpeg' } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }

    // Extract file extension
    const extension = fileName.split('.').pop();
    if (!extension) {
      return res.status(400).json({ error: 'File must have an extension' });
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    // Generate unique key with user ID prefix for organization
    const key = `profiles/${req.user.id}/${randomUUID()}.${extension}`;

    // Create presigned URL for PUT request
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || 'kindred-image',
      Key: key,
      ContentType: contentType,
    });

    // Generate presigned URL (expires in 5 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300, // 5 minutes
    });

    // Construct public URL (assuming bucket is public-read)
    const publicUrl = `https://${process.env.AWS_S3_BUCKET || 'kindred-image'}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    res.json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}

module.exports = {
  getUploadUrl,
};