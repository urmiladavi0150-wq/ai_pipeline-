import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateApiKey } from './lib/auth';

export async function middleware(request: NextRequest) {
  // Allow health check, docs, and key generation without API key
  if (
    request.nextUrl.pathname === '/api/health' ||
    request.nextUrl.pathname.startsWith('/docs') ||
    request.nextUrl.pathname === '/api/generate-key'
  ) {
    return NextResponse.next();
  }

  // Check for API key in Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid API key' }, { status: 401 });
  }

  const apiKey = authHeader.substring(7); // Remove 'Bearer '

  const { valid } = await validateApiKey(apiKey);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};