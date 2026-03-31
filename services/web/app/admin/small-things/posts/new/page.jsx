'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PostEditor = dynamic(() => import('../../../../../components/PostEditor'), {
  ssr: false,
});

export default function NewPostPage() {
  const router = useRouter();
  const [post, setPost] = useState({
    title: '',
    slug: '',
    content: '',
    is_page: false,
    status: 'draft',
    scheduled_at: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-generate slug from title
    if (post.title && !post.slug) {
      const slug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setPost(prev => ({ ...prev, slug }));
    }
  }, [post.title, post.slug]);

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save post');
      }

      const data = await response.json();
      router.push(`/admin/small-things/posts/${data.id}/edit`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>New Post</h1>

      {error && <div className="message message-error mb-3">{error}</div>}

      <PostEditor
        post={post}
        setPost={setPost}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
