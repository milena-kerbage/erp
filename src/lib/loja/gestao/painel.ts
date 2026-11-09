import { ApiError } from '../../erp/access.ts';
import { PREFIXO_CUPOM } from '../../../loja/lib/contas/regras.ts';
import type { PainelLoja, PeriodoPainel } from './tipos.ts';
import { HORAS_ABANDONO_PADRAO } from './carrinhos.ts';
import { gestaoDb, json, texto } from './esquema.ts';

// Painel do e-commerce (GET /api/erp/loja/painel?periodo=7d|30d|90d). Valores "a partir de" (o final é
// combinado pelo WhatsApp); pedidos cancelados ficam fora do valor, do ticket e dos rankings (contam só em
// "por etapa"). Dias no fuso de Fortaleza/São Paulo.

const DIAS: Record<PeriodoPainel, number> = { '7d': 7, '30d': 30, '90d': 90 };
const DIA = 24 * 60 * 60 * 1000;
const FUSO = 'America/Sao_Paulo';
const diaDe = (ms: number) => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));

export function periodoDaUrl(url: URL): PeriodoPainel {
  const periodo = url.searchParams.get('periodo') ?? '30d';
  if (!(periodo in DIAS)) throw new ApiError(400, 'Período: use 7d, 30d ou 90d.', 'INVALID_FILTER');
  return periodo as PeriodoPainel;
}

type ItemPedido = { nome?: string; slug?: string; quantidade?: number; precoCentavos?: number };

export async function painelDaLoja(periodo: PeriodoPainel, agora = Date.now(), horas = HORAS_ABANDONO_PADRAO): Promise<PainelLoja> {
  const dias = DIAS[periodo];
  // Início do dia (no fuso) de `dias - 1` dias atrás: o período inclui hoje.
  const hoje = diaDe(agora);
  const desde = Date.parse(`${diaDe(agora - (dias - 1) * DIA)}T00:00:00-03:00`);
  const database = gestaoDb();
  const pedidos = await database.prepare('SELECT numero, status, itens_json, quantidade, total_centavos, desconto_centavos, cupom_codigo, criado FROM loja_pedidos WHERE criado >= ? ORDER BY criado').all(desde);
  const validos = pedidos.filter((pedido) => texto(pedido.status) !== 'cancelado');
  const valor = validos.reduce((soma, pedido) => soma + Number(pedido.total_centavos), 0);
  const porEtapa: PainelLoja['porEtapa'] = { enviado_whatsapp: 0, pagamento_confirmado: 0, despachado: 0, entregue: 0, cancelado: 0 };
  for (const pedido of pedidos) { const status = texto(pedido.status) as keyof PainelLoja['porEtapa']; if (status in porEtapa) porEtapa[status]++; }

  const novasContas = Number((await database.prepare('SELECT COUNT(*) AS total FROM loja_clientes WHERE criado >= ?').get(desde))?.total ?? 0);
  const limiteAbandono = agora - horas * 3_600_000;
  const abandonados = await database.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(total_centavos), 0) AS valor FROM loja_carrinhos WHERE convertido_em IS NULL AND quantidade > 0 AND atualizado < ? AND atualizado >= ?').get(limiteAbandono, desde);
  const convertidos = Number((await database.prepare('SELECT COUNT(*) AS total FROM loja_carrinhos WHERE convertido_em IS NOT NULL AND convertido_em >= ?').get(desde))?.total ?? 0);
  const quantidadeAbandonados = Number(abandonados?.total ?? 0);

  const cupons = new Map<string, { codigo: string; usos: number; descontoCentavos: number; tipo: 'campanha' | 'boas_vindas' }>();
  for (const pedido of validos) {
    const codigo = texto(pedido.cupom_codigo);
    if (!codigo) continue;
    const atual = cupons.get(codigo) ?? { codigo, usos: 0, descontoCentavos: 0, tipo: codigo.startsWith(PREFIXO_CUPOM) ? 'boas_vindas' as const : 'campanha' as const };
    atual.usos++; atual.descontoCentavos += Number(pedido.desconto_centavos);
    cupons.set(codigo, atual);
  }

  // Produtos e categorias: pelas linhas gravadas no pedido (slug, quantidade e preço "a partir de" do momento).
  const categoriaDoSlug = new Map<string, { caminho: string; nome: string }>();
  try {
    for (const linha of await database.prepare('SELECT p.slug, c.caminho, c.nome FROM loja_produtos p JOIN loja_categorias c ON c.id = p.categoria_id').all())
      categoriaDoSlug.set(texto(linha.slug), { caminho: texto(linha.caminho), nome: texto(linha.nome) });
  } catch { /* sem a migração 010: sem ranking por categoria */ }
  const produtos = new Map<string, { slug: string; nome: string; quantidade: number; valorCentavos: number }>();
  const categorias = new Map<string, { caminho: string; nome: string; quantidade: number; valorCentavos: number }>();
  for (const pedido of validos) {
    for (const item of json<ItemPedido[]>(pedido.itens_json, [])) {
      const quantidade = Number(item.quantidade) || 0, subtotal = quantidade * (Number(item.precoCentavos) || 0);
      const chave = item.slug || item.nome || '?';
      const produto = produtos.get(chave) ?? { slug: item.slug ?? '', nome: item.nome ?? chave, quantidade: 0, valorCentavos: 0 };
      produto.quantidade += quantidade; produto.valorCentavos += subtotal;
      produtos.set(chave, produto);
      const categoria = item.slug ? categoriaDoSlug.get(item.slug) : undefined;
      if (categoria) {
        const atual = categorias.get(categoria.caminho) ?? { ...categoria, quantidade: 0, valorCentavos: 0 };
        atual.quantidade += quantidade; atual.valorCentavos += subtotal;
        categorias.set(categoria.caminho, atual);
      }
    }
  }

  const serie = new Map<string, { dia: string; pedidos: number; valorCentavos: number }>();
  for (let i = dias - 1; i >= 0; i--) { const dia = diaDe(agora - i * DIA); serie.set(dia, { dia, pedidos: 0, valorCentavos: 0 }); }
  for (const pedido of validos) { const ponto = serie.get(diaDe(Number(pedido.criado))); if (ponto) { ponto.pedidos++; ponto.valorCentavos += Number(pedido.total_centavos); } }

  const ranking = <T extends { quantidade: number; valorCentavos: number }>(lista: Iterable<T>) => [...lista].sort((a, b) => b.quantidade - a.quantidade || b.valorCentavos - a.valorCentavos).slice(0, 10);
  return {
    periodo, desde: new Date(desde).toISOString(), ate: new Date(agora).toISOString(),
    pedidos: validos.length, valorCentavos: valor, ticketMedioCentavos: validos.length ? Math.round(valor / validos.length) : 0, porEtapa, novasContas,
    carrinhosAbandonados: { quantidade: quantidadeAbandonados, valorCentavos: Number(abandonados?.valor ?? 0), horas },
    conversaoCarrinho: convertidos + quantidadeAbandonados ? convertidos / (convertidos + quantidadeAbandonados) : null,
    cuponsMaisUsados: [...cupons.values()].sort((a, b) => b.usos - a.usos || b.descontoCentavos - a.descontoCentavos).slice(0, 10),
    produtosMaisPedidos: ranking(produtos.values()), categoriasMaisPedidas: ranking(categorias.values()),
    serieDiaria: [...serie.values()].filter((ponto) => ponto.dia <= hoje),
  };
}
