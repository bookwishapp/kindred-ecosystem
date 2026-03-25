'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const PostEditor = dynamic(() => import('../../../../../components/PostEditor'), {
  ssr: false,
});

const SendModal = dynamic(() => import('../../../../../components/SendModal'), {
  ssr: false,
});

const TestEmailModal = dynamic(() => import('../../../../../components/TestEmailModal'), {
  ssr: false,
});

export default function EditPostPage({ params }) {
  const router = useRouter();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/admin/posts/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }
      const data = await response.json();
      setPost(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/posts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save post');
      }

      const data = await response.json();
      setPost(data);
      // Show success message
      setError(''); // Clear any existing errors
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNewsletter = () => {
    if (post.status !== 'published') {
      setError('Post must be published before sending as newsletter');
      return;
    }
    setShowSendModal(true);
  };

  const handleSendTest = () => {
    if (post.status !== 'published') {
      setError('Post must be published before sending test email');
      return;
    }
    setShowTestModal(true);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div>
      <h1>Edit Post</h1>

      {error && <div className="message message-error mb-3">{error}</div>}

      <PostEditor
        post={post}
        setPost={setPost}
        onSave={handleSave}
        saving={saving}
        showSendButton={post.status === 'published' && !post.is_page}
        onSend={handleSendNewsletter}
        onSendTest={handleSendTest}
      />

      {showSendModal && (
        <SendModal
          post={post}
          onClose={() => setShowSendModal(false)}
          onSuccess={() => {
            setShowSendModal(false);
            router.push('/admin/sends');
          }}
        />
      )}

      {showTestModal && (
        <TestEmailModal
          post={post}
          onClose={() => setShowTestModal(false)}
        />
      )}
    </div>
  );
}