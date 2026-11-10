import { currentConnection, removeSubject } from '@/lib/instagram/store';
import { instagramApi, invalidateInstagramFeed } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return instagramApi(request, true, async () => {
    const c = await currentConnection();
    if (c) await removeSubject(c.account_id, false);
    invalidateInstagramFeed();
    return { disconnected: true };
  });
}
