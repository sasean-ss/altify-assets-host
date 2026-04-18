import { getStore } from '@netlify/blobs';

export default async (request) => {
  const auth = request.headers.get('authorization') || '';
  const expected = Netlify.env.get('UPLOAD_PASSWORD');
  if (!expected) {
    return Response.json({ error: 'UPLOAD_PASSWORD env var not configured' }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const store = getStore({ name: 'assets', consistency: 'strong' });
  const { blobs } = await store.list();

  // Fetch metadata in parallel (bounded — blob counts here will be tiny)
  const files = await Promise.all(
    blobs.map(async (blob) => {
      try {
        const meta = await store.getMetadata(blob.key);
        return {
          filename: blob.key,
          url: `/f/${blob.key}`,
          size: meta?.metadata?.size ?? 0,
          contentType: meta?.metadata?.contentType ?? 'application/octet-stream',
          uploadedAt: meta?.metadata?.uploadedAt ?? null,
          originalName: meta?.metadata?.originalName ?? blob.key,
        };
      } catch {
        return {
          filename: blob.key,
          url: `/f/${blob.key}`,
          size: 0,
          contentType: 'application/octet-stream',
          uploadedAt: null,
          originalName: blob.key,
        };
      }
    })
  );

  // Newest first
  files.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));

  return Response.json({ files, count: files.length });
};

export const config = { path: '/api/list' };
