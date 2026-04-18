import { getStore } from '@netlify/blobs';

const MAX_FILE_SIZE = 6 * 1024 * 1024; // 6 MB — Netlify sync function payload limit

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/x-icon',
]);

function sanitiseFilename(name) {
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : '';
  const cleanBase = base
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const cleanExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
  return cleanBase + cleanExt;
}

function checkAuth(request) {
  const auth = request.headers.get('authorization') || '';
  const expected = Netlify.env.get('UPLOAD_PASSWORD');
  if (!expected) {
    return { ok: false, status: 500, error: 'UPLOAD_PASSWORD env var not configured on this site' };
  }
  if (auth !== `Bearer ${expected}`) {
    return { ok: false, status: 401, error: 'Unauthorised' };
  }
  return { ok: true };
}

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = checkAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const files = formData.getAll('files').filter((f) => f instanceof File);
  if (!files.length) {
    return Response.json({ error: 'No files provided' }, { status: 400 });
  }

  const store = getStore({ name: 'assets', consistency: 'strong' });
  const results = [];

  for (const file of files) {
    const original = file.name;

    if (!ALLOWED_TYPES.has(file.type)) {
      results.push({ originalName: original, success: false, error: `Unsupported type: ${file.type || 'unknown'}` });
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      results.push({ originalName: original, success: false, error: `Too large (${mb} MB, max 6 MB)` });
      continue;
    }

    const safeName = sanitiseFilename(original);
    if (!safeName || safeName.startsWith('.')) {
      results.push({ originalName: original, success: false, error: 'Invalid filename after sanitising' });
      continue;
    }

    try {
      const buffer = await file.arrayBuffer();
      await store.set(safeName, buffer, {
        metadata: {
          contentType: file.type,
          size: file.size,
          originalName: original,
          uploadedAt: new Date().toISOString(),
        },
      });
      results.push({
        filename: safeName,
        originalName: original,
        size: file.size,
        contentType: file.type,
        url: `/f/${safeName}`,
        success: true,
      });
    } catch (err) {
      results.push({ originalName: original, success: false, error: err.message || 'Upload failed' });
    }
  }

  return Response.json({ results });
};

export const config = { path: '/api/upload' };
