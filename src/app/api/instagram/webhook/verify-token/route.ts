import { InstagramError, instagramConfig } from '@/lib/instagram/config';
import { instagramApi } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return instagramApi(request, true, async () => {
    const { verifyToken } = instagramConfig();
    if (verifyToken.length < 32) throw new InstagramError(503, 'Gere INSTAGRAM_VERIFY_TOKEN com npm run instagram:preparar.');
    return { verifyToken };
  });
}
