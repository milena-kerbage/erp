import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { requireManager } from '@/lib/integrations/manager';
import { errorResponse, noStore } from '@/lib/whatsapp/server';
import { WhatsAppError } from '@/lib/whatsapp/core';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    await requireManager(request);
    const document = new URL(request.url).searchParams.get('document') || 'manager';
    const files = { manager: 'painel-gestor-whatsapp.md', technical: 'whatsapp-meta.md', pending: 'pendencias-implantacao-whatsapp.md' };
    if (!Object.hasOwn(files, document)) throw new WhatsAppError(400, 'Selecione manual do gestor, documentação técnica ou pendências.', 'INVALID_DOCUMENT');
    const content = document === 'manager' ? await readFile(path.join(process.cwd(), 'docs', 'painel-gestor-whatsapp.md'), 'utf8')
      : document === 'technical' ? await readFile(path.join(process.cwd(), 'docs', 'whatsapp-meta.md'), 'utf8')
      : await readFile(path.join(process.cwd(), 'docs', 'pendencias-implantacao-whatsapp.md'), 'utf8');
    return new Response(content, { headers: { ...noStore, 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="${files[document as keyof typeof files]}"` } });
  } catch (error) { return errorResponse(error); }
}
