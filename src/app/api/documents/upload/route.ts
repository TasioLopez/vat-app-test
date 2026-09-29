import { NextResponse } from 'next/server';

/**
 * @deprecated Employee documents upload via signed URL:
 * POST /api/documents/sign-upload then PUT to signedUrl, then POST /api/documents/metadata.
 * Proxying the file body through Vercel hits the 4.5 MB FUNCTION_PAYLOAD_TOO_LARGE limit.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Use /api/documents/sign-upload',
      deprecated: true,
    },
    { status: 410 }
  );
}
