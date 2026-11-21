// Depois do webhook: leva a origem detectada na conversa (anúncio Click to WhatsApp ou botão do site) para a ficha
// do lead no CRM. Sem lead com aquele telefone, cria um em Vendas › Novo lead: quem chegou por campanha não se perde.
import { createLead } from '../erp/core.ts';
import type { Actor } from '../erp/access.ts';
import { registrarOrigemNoLead } from '../loja/gestao/leads.ts';
import { leadDoTelefone } from './ficha.ts';
import type { OrigemDetectada } from './origem.ts';

const ATOR: Actor = { id: 'rastreamento', name: 'Rastreamento', email: '', permission: 'admin' };

/** Canal de entrada do lead (as opções de "Como chegou até nós"). */
function fonteDoLead(item: OrigemDetectada): string {
  if (item.tipo === 'anuncio') return item.origem.utmSource === 'instagram' ? 'Instagram' : 'Facebook';
  const canal = (item.origem.lastChannel ?? item.origem.channel ?? '').toLowerCase();
  if (canal.includes('google')) return 'Google';
  if (canal.includes('instagram')) return 'Instagram';
  if (canal.includes('facebook') || canal.includes('meta ads')) return 'Facebook';
  return 'Site';
}

export async function aplicarOrigensNoCRM(origens: OrigemDetectada[]) {
  for (const item of origens) {
    try {
      let leadId = (await leadDoTelefone(item.phone))?.id;
      if (!leadId) {
        const nome = item.nome.trim().length >= 2 ? item.nome.trim().slice(0, 150) : `WhatsApp +${item.phone}`;
        const criado = await createLead({ lead: { name: nome, phone: item.phone, funnelId: 'vendas', stage: 'novo', tags: [item.tipo === 'anuncio' ? 'Anúncio' : 'Site'] }, details: { source: fonteDoLead(item) } }, ATOR);
        leadId = criado.lead.id;
      }
      await registrarOrigemNoLead(leadId, item.origem);
    } catch (erro) {
      console.error('WhatsApp: não foi possível levar a origem da conversa para o CRM.', erro instanceof Error ? erro.message : erro);
    }
  }
}
