import { readDeletionBody } from '@/lib/meta/deletion';
import { signedSubject } from '@/lib/instagram/crypto';
import { removeSubject } from '@/lib/instagram/store';
import { instagramError, instagramHeaders, invalidateInstagramFeed } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    const receipt = await removeSubject(signedSubject(await readDeletionBody(request)), true);
    invalidateInstagramFeed();
    return Response.json(receipt, { headers: instagramHeaders });
  }
  catch (error) { return instagramError(error); }
}
