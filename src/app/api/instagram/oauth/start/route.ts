import { cookies } from 'next/headers';
import { COOKIE_NAME } from '@/lib/auth/cookies';
import { InstagramError, requireOAuthConfig } from '@/lib/instagram/config';
import { encryptionReady } from '@/lib/instagram/crypto';
import { authorizationUrl } from '@/lib/instagram/api';
import { createState } from '@/lib/instagram/store';
import { instagramApi } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  return instagramApi(request, true, async user => {
    const session = (await cookies()).get(COOKIE_NAME)?.value;
    if (!session || user.development) throw new InstagramError(401, 'Entre com uma conta real de administração para conectar o Instagram.', 'REAL_SESSION_REQUIRED');
    requireOAuthConfig();
    if (!encryptionReady()) throw new InstagramError(503, 'Configure INTEGRATION_ENCRYPTION_KEY antes de conectar.', 'ENCRYPTION_NOT_CONFIGURED');
    return { authorizationUrl: authorizationUrl(await createState(user.id, session)) };
  });
}
