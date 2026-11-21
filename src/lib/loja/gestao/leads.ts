import { addNote, createLead, getLead, updateLead } from '../../erp/core.ts';
import type { Actor } from '../../erp/access.ts';
import type { LeadVinculado } from './tipos.ts';
import { resumoDaOrigem, type OrigemLead } from '../../../loja/lib/rastreamento/origem.ts';
import { escaparLike, gestaoDb, json, type Linha, texto } from './esquema.ts';

// Cliente da loja → lead do CRM (erp_core.leads). No cadastro da conta: liga a um lead que já existe com o
// mesmo e-mail ou WhatsApp, ou cria um novo no funil Vendas (etapa "Novo lead") com origem "Loja online".
// A cada pedido: uma nota no lead com o número, as peças e o valor "a partir de".
// Sempre em segundo plano para a loja: falhar aqui nunca impede o cadastro nem o pedido.

export const ORIGEM_LOJA = 'Loja online';
const ATOR_LOJA: Actor = { id: 'loja', name: ORIGEM_LOJA, email: '', permission: 'admin' };
type ClienteLead = { id: string; nome: string; email: string; whatsapp: string };
/** O que a cliente contou na conta da loja e que serve à ficha do lead (bebê e cidade). */
export type DadosDaConta = { bebeNome?: string; bebeData?: string; cidade?: string; uf?: string };

const digitos = (valor: string) => valor.replace(/\D/g, '');
/** WhatsApp da conta (10 ou 11 dígitos, com DDD) no formato do lead (com DDI 55). */
const telefoneDoLead = (whatsapp: string) => `55${digitos(whatsapp)}`;

async function leadExistente(cliente: ClienteLead): Promise<string | null> {
  const database = gestaoDb(), numero = digitos(cliente.whatsapp);
  const candidatos = await database.prepare(`SELECT id, data_json, details_json FROM leads WHERE archived_at IS NULL AND (data_json LIKE ? ESCAPE '\\' OR LOWER(details_json) LIKE ? ESCAPE '\\') ORDER BY updated DESC LIMIT 20`)
    .all(`%${escaparLike(numero)}%`, `%${escaparLike(cliente.email.toLowerCase())}%`);
  for (const linha of candidatos) {
    const telefone = digitos(texto(json<Record<string, unknown>>(linha.data_json, {}).phone));
    const email = texto(json<Record<string, unknown>>(linha.details_json, {}).email).trim().toLowerCase();
    if ((telefone && (telefone === numero || telefone === `55${numero}` || telefone.endsWith(numero))) || (email && email === cliente.email.toLowerCase())) return texto(linha.id);
  }
  return null;
}

/** Lead da cliente: o já ligado, um existente (e-mail/WhatsApp) ou um novo. Devolve o id. */
export async function vincularLeadDaCliente(cliente: ClienteLead, agora = Date.now()): Promise<string> {
  const database = gestaoDb();
  const ligado = await database.prepare('SELECT l.lead_id FROM loja_cliente_leads l JOIN leads d ON d.id = l.lead_id WHERE l.cliente_id = ?').get(cliente.id);
  if (ligado) return texto(ligado.lead_id);
  let leadId = await leadExistente(cliente);
  if (!leadId) {
    const criado = await createLead({ lead: { name: cliente.nome, phone: telefoneDoLead(cliente.whatsapp), funnelId: 'vendas', stage: 'novo', tags: [ORIGEM_LOJA] }, details: { email: cliente.email, source: ORIGEM_LOJA } }, ATOR_LOJA);
    leadId = criado.lead.id;
  }
  await database.prepare('INSERT INTO loja_cliente_leads (cliente_id, lead_id, criado) VALUES (?, ?, ?) ON CONFLICT(cliente_id) DO UPDATE SET lead_id = excluded.lead_id, criado = excluded.criado').run(cliente.id, leadId, agora);
  return leadId;
}

const reais = (centavos: number) => `R$ ${(centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Completa a ficha do lead com o que a cliente informou na conta da loja: nome e nascimento do bebê e a cidade.
 * Só preenche o que está vazio (nunca troca o que a equipe digitou) e a origem vira "Loja online" se não houver.
 */
export async function completarLeadComConta(leadId: string, dados: DadosDaConta) {
  const { lead, details } = await getLead(leadId);
  const patch: Record<string, string> = {};
  if (dados.bebeNome?.trim() && !details.babyName) patch.babyName = dados.bebeNome.trim().slice(0, 60);
  if (dados.bebeData && /^\d{4}-\d{2}-\d{2}$/.test(dados.bebeData) && !details.eventDate) patch.eventDate = dados.bebeData;
  const cidade = [dados.cidade?.trim(), dados.uf?.trim().toUpperCase()].filter(Boolean).join(', ');
  if (cidade && !details.city) patch.city = cidade.slice(0, 150);
  if (!details.source) patch.source = ORIGEM_LOJA;
  if (!Object.keys(patch).length) return false;
  await updateLead(leadId, { revision: lead.revision, details: patch }, ATOR_LOJA);
  return true;
}

// Campos do PRIMEIRO toque (o que trouxe o lead): gravados uma vez e nunca trocados, nem o que a equipe digitou.
const PRIMEIRO_TOQUE = ['channel', 'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm', 'utmId', 'landingPage', 'referrer', 'ad', 'adId', 'device', 'firstVisitAt'] as const;
// Campos do ÚLTIMO toque e os IDs de clique: acompanham a visita mais recente que converteu.
const ULTIMO_TOQUE = ['lastChannel', 'lastSource', 'lastMedium', 'lastCampaign', 'lastLandingPage', 'lastAt', 'touches', 'gclid', 'fbclid', 'clickId'] as const;

/**
 * Rastreamento na ficha do lead (aba Campanha): de onde a pessoa veio. O primeiro toque entra só se a ficha ainda
 * não tem origem; o último toque e os IDs de clique são atualizados a cada conversão (cadastro, pedido, conversa).
 * Devolve true quando gravou algo.
 */
export async function registrarOrigemNoLead(leadId: string, origem: OrigemLead | null | undefined): Promise<boolean> {
  if (!origem || !Object.keys(origem).length) return false;
  const { lead, details } = await getLead(leadId);
  const atual = (details.campaign ?? {}) as Record<string, string | undefined>;
  const nova: Record<string, string | undefined> = { ...atual };
  const semPrimeiro = !PRIMEIRO_TOQUE.some((campo) => atual[campo]);
  if (semPrimeiro) for (const campo of PRIMEIRO_TOQUE) if (origem[campo]) nova[campo] = origem[campo];
  // Mesma visita do primeiro toque: não há "último" diferente; a origem atual vira o último só quando já havia outra.
  const ultimo: OrigemLead = semPrimeiro ? origem : { ...origem, lastChannel: origem.lastChannel ?? origem.channel, lastSource: origem.lastSource ?? origem.utmSource, lastMedium: origem.lastMedium ?? origem.utmMedium, lastCampaign: origem.lastCampaign ?? origem.utmCampaign, lastLandingPage: origem.lastLandingPage ?? origem.landingPage, lastAt: origem.lastAt ?? new Date().toISOString() };
  for (const campo of ULTIMO_TOQUE) if (ultimo[campo]) nova[campo] = ultimo[campo];
  if (JSON.stringify(nova) === JSON.stringify(atual)) return false;
  await updateLead(leadId, { revision: lead.revision, details: { campaign: nova } }, ATOR_LOJA);
  return true;
}

/** Conta da loja atualizada (Minha conta): leva o bebê e a cidade para o lead ligado. */
export async function sincronizarContaNoLead(cliente: ClienteLead, dados: DadosDaConta) {
  const leadId = await vincularLeadDaCliente(cliente);
  await completarLeadComConta(leadId, dados);
  return leadId;
}

/** Nota no lead com o pedido feito na loja (o "atividade" do CRM). */
export async function registrarPedidoNoLead(cliente: ClienteLead, pedido: { numero: string; quantidade: number; totalCentavos: number; itens: Array<{ nome: string; quantidade: number }>; cupom: { codigo: string } | null }, dados: DadosDaConta = {}, origem?: OrigemLead | null) {
  const leadId = await vincularLeadDaCliente(cliente);
  await completarLeadComConta(leadId, dados).catch((erro) => console.error('Lead da loja: não foi possível completar a ficha.', erro));
  await registrarOrigemNoLead(leadId, origem).catch((erro) => console.error('Lead da loja: não foi possível gravar a origem.', erro));
  const pecas = pedido.itens.map((item) => `${item.quantidade}× ${item.nome}`).join('; ');
  const texto = `Pedido ${pedido.numero} feito na loja online e enviado pelo WhatsApp: ${pedido.quantidade} ${pedido.quantidade === 1 ? 'peça' : 'peças'}, a partir de ${reais(pedido.totalCentavos)}${pedido.cupom ? ` (cupom ${pedido.cupom.codigo})` : ''}. ${pecas}${origem ? `\nOrigem: ${resumoDaOrigem(origem)}.` : ''}`.slice(0, 10_000);
  await addNote(leadId, { text: texto }, ATOR_LOJA);
  return leadId;
}

/** Lead ligado às clientes (para as telas de clientes do ERP). */
export async function leadsDasClientes(ids: string[]): Promise<Map<string, LeadVinculado>> {
  const mapa = new Map<string, LeadVinculado>();
  if (!ids.length) return mapa;
  try {
    const linhas = await gestaoDb().prepare(`SELECT l.cliente_id, d.id, d.data_json, d.funnel_id, d.stage, f.data_json AS funil_json FROM loja_cliente_leads l JOIN leads d ON d.id = l.lead_id LEFT JOIN funnels f ON f.id = d.funnel_id WHERE l.cliente_id IN (${ids.map(() => '?').join(', ')})`).all(...ids);
    for (const linha of linhas as Linha[]) {
      const funil = json<{ name?: string; stages?: Array<{ id: string; label: string }> }>(linha.funil_json, {});
      mapa.set(texto(linha.cliente_id), {
        leadId: texto(linha.id), nome: texto(json<Record<string, unknown>>(linha.data_json, {}).name), funil: texto(funil.name) || texto(linha.funnel_id),
        etapa: funil.stages?.find((etapa) => etapa.id === texto(linha.stage))?.label ?? texto(linha.stage), href: `/leads/${texto(linha.id)}`,
      });
    }
  } catch { /* migração 010 ausente: sem lead vinculado */ }
  return mapa;
}
