import { subscribeAccount } from '@/lib/instagram/api';
import { instagramApi } from '@/lib/instagram/server';
export const runtime = 'nodejs';
export async function POST(request: Request) { return instagramApi(request, true, async () => subscribeAccount()); }
