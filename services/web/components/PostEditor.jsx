'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import './editor.css';

export default function PostEditor({
  post,
  setPost,
  onSave,
  saving,
  showSendButton = false,
  onSend,
  onSendTest
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: post.content,
    onUpdate: ({ editor }) => {
      setPost(prev => ({ ...prev, content: editor.getHTML() }));
    },
  });

  const handleSlugChange = (e) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/--+/g, '-');
    setPost(prev => ({ ...prev, slug: value }));
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="post-editor">
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          value={post.title}
          onChange={(e) => setPost(prev => ({ ...prev, title: e.target.value }))}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="slug">Slug</label>
        <input
          type="text"
          id="slug"
          value={post.slug}
          onChange={handleSlugChange}
          required
        />
      </div>

      <div className="form-group">
        <label>Content</label>
        <div className="editor-toolbar">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'active' : ''}
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'active' : ''}
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'active' : ''}
          >
            Bullet List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'active' : ''}
          >
            Ordered List
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'active' : ''}
          >
            Quote
          </button>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('URL:');
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            }}
            className={editor.isActive('link') ? 'active' : ''}
          >
            Link
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={!editor.isActive('link')}
          >
            Remove Link
          </button>
        </div>
        <EditorContent editor={editor} className="editor-content" />
      </div>

      <div className="form-group">
        <div className="checkbox-group">
          <input
            type="checkbox"
            id="is_page"
            checked={post.is_page}
            onChange={(e) => setPost(prev => ({ ...prev, is_page: e.target.checked }))}
          />
          <label htmlFor="is_page">Is Page</label>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select
          id="status"
          value={post.status}
          onChange={(e) => {
            const newStatus = e.target.value;
            setPost(prev => ({
              ...prev,
              status: newStatus,
              // Clear scheduled_at if not scheduling
              scheduled_at: newStatus !== 'scheduled' ? null : prev.scheduled_at
            }));
          }}
        >
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
      </div>

      {post.status === 'scheduled' && (
        <div className="form-group">
          <label htmlFor="scheduled_at">Schedule Date & Time</label>
          <input
            type="datetime-local"
            id="scheduled_at"
            value={post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : ''}
            onChange={(e) => setPost(prev => ({ ...prev, scheduled_at: e.target.value }))}
            required
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="btn"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        {showSendButton && (
          <>
            <button
              type="button"
              onClick={onSend}
              className="btn btn-secondary"
            >
              Send as Newsletter
            </button>
            <button
              type="button"
              onClick={onSendTest}
              className="btn btn-secondary"
            >
              Send Test Email
            </button>
          </>
        )}
      </div>
    </div>
  );
}