# Passportr — Hop Banner and Logo Uploads

## Ground Rules

- Read every file before touching it.
- No scope creep. Only change what is specified.
- Verify after changes before declaring done.
- No TODOs, no placeholders. Everything must work.

## Prerequisites

- Migration `002_venue_invitations.sql` must have already run (`banner_url` and `logo_url` columns exist on `hops` table)
- `/api/upload/presign` route must exist and be working
- AWS env vars must be set on the Railway service

---

## Task A — Manage Hop Page: Banner and Logo Uploads

Read `services/passportr/app/organize/[hopSlug]/page.jsx`.

**Change 1:** Add upload state and refs. In the component, alongside existing state declarations add:

```js
const [uploadingBanner, setUploadingBanner] = useState(false);
const [uploadingLogo, setUploadingLogo] = useState(false);
const bannerInputRef = useRef(null);
const logoInputRef = useRef(null);
```

Add `useRef` to the React import if not already present.

**Change 2:** Add the upload handler function alongside the other handler functions (`saveHop`, `deleteHop`, etc.):

```js
async function uploadHopImage(file, field, setUploading) {
  if (!file) return;
  setUploading(true);
  try {
    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        content_type: file.type,
        folder: field === 'banner_url' ? 'hop-banners' : 'hop-logos',
      }),
    });
    const { presigned_url, public_url } = await presignRes.json();

    await fetch(presigned_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    const updateRes = await fetch(`/api/hops/${hopSlug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ [field]: public_url }),
    });

    if (updateRes.ok) {
      const d = await updateRes.json();
      setHop(d.hop);
    } else {
      alert('Failed to save image');
    }
  } catch {
    alert('Upload failed');
  }
  setUploading(false);
}
```

**Change 3:** Add the image upload UI to the hop info card (the non-editing view, not the edit form). Add it after the existing hop details grid inside the `!editingHop` card:

```jsx
<div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
  <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Images</h3>

  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
    {/* Banner */}
    <div>
      <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Banner</p>
      {hop.banner_url && (
        <img
          src={hop.banner_url}
          alt="Hop banner"
          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
        />
      )}
      <input
        type="file"
        accept="image/*"
        ref={bannerInputRef}
        style={{ display: 'none' }}
        onChange={e => uploadHopImage(e.target.files[0], 'banner_url', setUploadingBanner)}
      />
      <button
        onClick={() => bannerInputRef.current.click()}
        disabled={uploadingBanner}
        style={{ fontSize: '13px', padding: '6px 14px', backgroundColor: 'var(--text-secondary)' }}
      >
        {uploadingBanner ? 'Uploading...' : hop.banner_url ? 'Change Banner' : 'Upload Banner'}
      </button>
    </div>

    {/* Logo */}
    <div>
      <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Logo</p>
      {hop.logo_url && (
        <img
          src={hop.logo_url}
          alt="Hop logo"
          style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px', display: 'block' }}
        />
      )}
      <input
        type="file"
        accept="image/*"
        ref={logoInputRef}
        style={{ display: 'none' }}
        onChange={e => uploadHopImage(e.target.files[0], 'logo_url', setUploadingLogo)}
      />
      <button
        onClick={() => logoInputRef.current.click()}
        disabled={uploadingLogo}
        style={{ fontSize: '13px', padding: '6px 14px', backgroundColor: 'var(--text-secondary)' }}
      >
        {uploadingLogo ? 'Uploading...' : hop.logo_url ? 'Change Logo' : 'Upload Logo'}
      </button>
    </div>
  </div>
</div>
```

---

## Task B — Hop Landing Page: Display Banner and Logo

Read `services/passportr/app/hop/[hopSlug]/page.jsx`.

**Change 1:** Add banner display at the very top of the returned JSX, before the container div's inner content. If `hop.banner_url` is present, show it as a full-width header image:

Add as the first element inside the outer container div:

```jsx
{hop.banner_url && (
  <div style={{ margin: '-60px -24px 40px', overflow: 'hidden', borderRadius: '0 0 16px 16px' }}>
    <img
      src={hop.banner_url}
      alt={hop.name}
      style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block' }}
    />
  </div>
)}
```

**Change 2:** Add logo display in the hop header section alongside the hop name. Wrap the existing `<h1>` and date paragraph in a flex row with the logo:

Find:
```jsx
<div style={{ textAlign: 'center', marginBottom: '48px' }}>
  <h1 style={{ fontSize: '40px', marginBottom: '16px' }}>{hop.name}</h1>
```

Replace with:
```jsx
<div style={{ textAlign: 'center', marginBottom: '48px' }}>
  {hop.logo_url && (
    <img
      src={hop.logo_url}
      alt={`${hop.name} logo`}
      style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }}
    />
  )}
  <h1 style={{ fontSize: '40px', marginBottom: '16px' }}>{hop.name}</h1>
```

---

## Verification Checklist

- [ ] Manage hop page has working banner upload — uploads to S3, saves URL to hop record, displays preview
- [ ] Manage hop page has working logo upload — uploads to S3, saves URL to hop record, displays preview
- [ ] Upload uses `/api/upload/presign` presigned URL pattern — never uploads through the server
- [ ] Hop landing page displays banner as full-width header image when present
- [ ] Hop landing page displays logo above hop name when present
- [ ] No other files modified
