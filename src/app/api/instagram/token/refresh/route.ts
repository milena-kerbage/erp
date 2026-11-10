import { refreshToken } from '@/lib/instagram/api';
import { instagramApi, invalidateInstagramFeed } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return instagramApi(request, true, async () => {
    const result = await refreshToken();
    invalidateInstagramFeed();
    return result;
  });
}
