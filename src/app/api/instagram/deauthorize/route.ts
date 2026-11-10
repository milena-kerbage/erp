import { readDeletionBody } from '@/lib/meta/deletion';
import { signedSubject } from '@/lib/instagram/crypto';
import { removeSubject } from '@/lib/instagram/store';
import { instagramError, instagramHeaders, invalidateInstagramFeed } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    await removeSubject(signedSubject(await readDeletionBody(request)), false);
    invalidateInstagramFeed();
    return Response.json({ success: true }, { headers: instagramHeaders });
  } catch (error) { return instagramError(error); }
}
