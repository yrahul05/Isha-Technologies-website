import { NextResponse } from 'next/server';
import { getViewer } from '@/server/auth/viewer';
import { searchEverything } from '@/server/queries/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/portal/search?q= — permission-aware global search (see src/server/queries/search.ts). */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const q = new URL(request.url).searchParams.get('q') ?? '';
  const results = await searchEverything(viewer, q);
  return NextResponse.json({ results }, { headers: { 'Cache-Control': 'private, no-store' } });
}
