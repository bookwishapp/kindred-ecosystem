export const runtime = 'nodejs';

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getAuthUser } = require('../../../../lib/auth');
const { randomBytes } = require('crypto');

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(req) {
  try {
    const user = getAuthUser(req);
    const venueToken = req.headers.get('x-venue-token');
    if (!user && !venueToken) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content_type, folder } = await req.json();

    if (!content_type || !content_type.startsWith('image/')) {
      return Response.json({ error: 'content_type must be an image' }, { status: 400 });
    }

    const ext = content_type.split('/')[1].replace('jpeg', 'jpg');
    const key = `${folder || 'uploads'}/${randomBytes(16).toString('hex')}.${ext}`;
    const bucket = process.env.AWS_S3_BUCKET || 'passportr-images';

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: content_type,
    });

    const presigned_url = await getSignedUrl(s3, command, { expiresIn: 300 });
    const public_url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    return Response.json({ presigned_url, public_url, key });
  } catch (error) {
    console.error('Presign error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
