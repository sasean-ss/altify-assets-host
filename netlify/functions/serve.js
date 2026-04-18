import { getStore } from '@netlify/blobs';

export default async (request) => {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/f\/(.+)$/);
  if (!match) return new Response('Not found', { status: 404 });

  const filename = decodeURIComponent(match[1]);
  const store = getStore({ name: 'assets' });

  let result;
  try {
    result = await store.getWithMetadata(filename, { type: 'arrayBuffer' });
  } catch (err) {
    return new Response('Error', { status: 500 });
  }
  if (!result) return new Response('Not found', { status: 404 });

  const { data, metadata } = result;
  const contentType = metadata?.contentType || 'application/octet-stream';

  return new Response(data, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(data.byteLength),
      // 1 year CDN + browser cache — URLs are effectively immutable
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const config = { path: '/f/*' };
