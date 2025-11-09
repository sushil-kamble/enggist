import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the Authorization header against INGEST_SECRET
 * Used for protecting admin endpoints like /api/ingest/run and /api/summarize/run
 */
export function validateAuthHeader(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.INGEST_SECRET;

  if (!expectedSecret) {
    console.error('[Auth] INGEST_SECRET not configured');
    return false;
  }

  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === expectedSecret;
}

/**
 * Returns a 401 Unauthorized response
 */
export function unauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
