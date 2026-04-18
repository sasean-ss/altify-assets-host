import { getStore } from '@netlify/blobs';

export default async (request) => {
  if (request.method !== 'DELETE' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const auth = request.headers.get('authorization') || '';
  const expected = Netlify.env.get('UPLOAD_PASSWORD');
  if (!expected) {
    return Response.json({ error: 'UPLOAD_PASSWORD env var not configured' }, { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const url = new URL(request.url);
  const filename = url.searchParams.get('filename');
  if (!filename) {
    return Response.json({ error: 'filename query param required' }, { status: 400 });
  }

  const store = getStore({ name: 'assets', consistency: 'strong' });

  try {
    await store.delete(filename);
    return Response.json({ success: true, filename });
  } catch (err) {
    return Response.json({ error: err.message || 'Delete failed' }, { status: 500 });
  }
};

export const config = { path: '/api/delete' };
