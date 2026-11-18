import { readFileSync } from 'node:fs';
import type { Actor } from '../../erp/access.ts';
import { atualizarCategoria, criarCategoria } from './categorias.ts';
import { auditarGestao, gestaoDb, json, texto, travarGestao } from './esquema.ts';
import { enviarImagem } from './imagens.ts';
import { criarGrupo } from './opcoes.ts';
import { atualizarProduto, criarProduto, obterProduto } from './produtos.ts';
import { inserirMenuPadrao } from './semente.ts';

// Segmentações da loja (nov/2026) e os produtos das planilhas de orçamento do ateliê
// ("Orçamento Kit Paninhos.xlsx": 400 fios, percal 230, kits maternidade e itens adicionais;
// "Orçamento Kit Cama Kids.xlsx"). IDEMPOTENTE: categoria pelo caminho, grupo pela chave e produto pelo
// slug; nunca sobrescreve um produto que já existe (a equipe edita no ERP). O menu é regravado a partir
// de montarMenu() (o atual vai para o backup que o script devolve).
//
// Regra comercial: o preço é o "a partir de" em percal 230 fios; o 400 fios egípcios entra como
// acréscimo da opção "Tecido". Qualquer item pode ser personalizado ou modificado.

const ATOR: Actor = { id: 'segmentacoes', name: 'Importação de segmentações', email: 'sistema@local', permission: 'admin' as Actor['permission'] };

export const NOTA_PERSONALIZACAO = 'Qualquer item pode ser personalizado ou modificado: cores, tecido, bordado e medidas são combinados com o ateliê pelo WhatsApp.';

const P230 = 'Percal 230 fios';
const P400 = '400 fios egípcios';

/** Novas categorias raiz, na ordem do menu. Kit berço e Personalizado já existem. */
export const CATEGORIAS_NOVAS = [
  { slug: 'kit-cama-kids', nome: 'Kit cama kids', ordem: 1, descricao: 'Almofadões, rolos, almofadas e edredom no mesmo tema, para cama de solteiro ou casal. Qualquer item pode ser personalizado.' },
  { slug: 'kit-maternidade', nome: 'Kit maternidade', ordem: 2, descricao: 'Manta, cueiros, paninhos, embalagens e kit berço maternidade, em percal 230 fios ou 400 fios egípcios.' },
  { slug: 'kit-paninhos', nome: 'Kit paninhos', ordem: 3, descricao: 'Cueiro, fralda, fralda de ombro, pano de boca, toalha com capuz e embalagem especial, bordados.' },
  { slug: 'para-presentear', nome: 'Itens para presentear', ordem: 4, descricao: 'Peças que viram presente: paninhos, toalhas, mantas e embalagem especial.' },
  { slug: 'itens-complementares', nome: 'Itens complementares', ordem: 5, descricao: 'Ninhos, trocadores, almofadas de amamentação, embalagem maternidade e peças avulsas do enxoval.' },
] as const;

/** Árvores antigas sem produto ativo: saem da loja (Milena não vende mala, enfeite, cortina etc.). */
const RAIZES_INATIVAS = ['enxoval', 'quarto', 'maternidade'];

type Foto = { arquivo: string; alt: string };
type ProdutoNovo = {
  slug: string; sku: string; nome: string; categoria: string; extras?: string[]; resumo: string; pecas?: string[]; unidade: string;
  preco: number; status: 'ativo' | 'rascunho'; relevancia: number; atributos: Record<string, string[]>;
  grupo?: { chave: string; nome: string; opcoes: Array<{ rotulo: string; acrescimoCentavos: number }> };
  fotos?: Foto[]; ficha?: Array<[string, string]>;
};

const tecido = (chave: string, p230: number, p400: number) => ({
  chave: `tecido-${chave}`, nome: 'Tecido',
  opcoes: [{ rotulo: P230, acrescimoCentavos: 0 }, { rotulo: P400, acrescimoCentavos: (p400 - p230) * 100 }],
});

/** Peças avulsas dos "Jogos coordenados" (valor unitário: percal 230 / 400 fios egípcios). */
const AVULSAS: Array<[slug: string, nome: string, p230: number, p400: number, resumo: string, presente?: boolean]> = [
  ['lencol-berco-3-pecas', 'Lençol de berço 3 peças', 229, 334, 'Fronha, lençol de cima com virol bordado e lençol de elástico.'],
  ['lencol-berco-2-pecas', 'Lençol de berço 2 peças', 137, 194, 'Fronha e lençol de elástico com bordado.'],
  ['lencol-berco-branco-elastico', 'Lençol de berço branco com elástico', 78, 129, 'Lençol de elástico branco para o colchão do berço.'],
  ['lencol-carrinho', 'Lençol de carrinho', 58, 77, 'Lençol para o carrinho do bebê.'],
  ['lencol-mini-berco', 'Lençol de mini berço', 68, 140, 'Lençol para mini berço.'],
  ['manta', 'Manta', 182, 223, 'Manta para o berço, o carrinho e a saída da maternidade.', true],
  ['cueiro', 'Cueiro', 68, 88, 'Cueiro de algodão com acabamento bordado.', true],
  ['toalha-fralda', 'Toalha fralda', 56, 66, 'Toalha fralda macia para o dia a dia.', true],
  ['toalha-fralda-capuz', 'Toalha fralda com capuz', 74, 79, 'Toalha fralda com capuz, bordada com o nome.', true],
  ['toalha-capuz-dupla', 'Toalha com capuz dupla', 104, 110, 'Toalha com capuz em camada dupla.', true],
  ['toalha-louca', 'Toalha de louça', 42, 45, 'Toalha de louça bordada.'],
  ['fralda-ombro', 'Fralda de ombro', 47, 48, 'Fralda de ombro para o arroto, bordada.', true],
  ['pano-boca-chupeta', 'Pano de boca e chupeta', 32, 33, 'Paninho de boca com prendedor de chupeta.', true],
  ['fralda', 'Fralda', 36, 38, 'Fralda de pano bordada.'],
  ['rolo-segura-bebe', 'Rolo segura-bebê', 150, 182, 'Rolo que apoia o bebê de lado no berço.'],
  ['kit-berco-maternidade', 'Kit berço maternidade', 340, 422, 'Kit para o bercinho da maternidade.'],
];

const FOTOS_AVULSAS: Record<string, Foto[]> = {
  manta: [{ arquivo: 'a3-14.jpg', alt: 'Manta branca com babado e bordado rosê' }],
  'toalha-fralda-capuz': [{ arquivo: 'a3-58.jpg', alt: 'Toalha com capuz bordada com o nome Celina' }, { arquivo: 'a3-56.jpg', alt: 'Toalhas e paninhos bordados na escada' }],
};

export function produtosDasPlanilhas(): ProdutoNovo[] {
  const pecasPaninhos = ['1 cueiro', '1 fralda', '1 fralda de ombro', '1 pano de boca', '1 toalha com capuz', '1 embalagem especial'];
  const lista: ProdutoNovo[] = [
    {
      slug: 'kit-paninhos-maternidade-6-pecas', sku: 'MK-PAN-6', nome: 'Kit paninhos maternidade 6 peças', categoria: 'kit-paninhos', extras: ['para-presentear', 'kit-maternidade'],
      resumo: 'Cueiro, fralda, fralda de ombro, pano de boca, toalha com capuz e embalagem especial, em percal 230 fios ou 400 fios egípcios.',
      pecas: pecasPaninhos, unidade: 'kit com 6 peças', preco: 337, status: 'ativo', relevancia: 5,
      atributos: { tecido: [P230, P400], personalizacao: ['Bordado com nome'] },
      grupo: { chave: 'tecido-kit-paninhos', nome: 'Tecido', opcoes: [{ rotulo: P230, acrescimoCentavos: 0 }, { rotulo: P400, acrescimoCentavos: (398 - 337) * 100 }] },
      fotos: [
        { arquivo: 'a3-55.jpg', alt: 'Kit paninhos bordados com o nome na escada' },
        { arquivo: 'a3-57.jpg', alt: 'Paninhos com bordado verde e nome Celina' },
        { arquivo: 'a3-59.jpg', alt: 'Toalha com capuz bordada com o nome Manoela' },
        { arquivo: 'a3-61.jpg', alt: 'Detalhe do bordado do nome no paninho' },
        { arquivo: 'a3-66.jpg', alt: 'Detalhe do bordado floral rosê com o nome Lia' },
      ],
      ficha: [['Tecido', 'Percal 230 fios ou 400 fios egípcios'], ['Peças', '6']],
    },
    {
      slug: 'kit-maternidade', sku: 'MK-MAT-KIT', nome: 'Kit maternidade', categoria: 'kit-maternidade', extras: ['para-presentear'],
      resumo: 'Manta, 4 cueiros, toalha fralda com capuz, 4 fraldas de ombro, 4 panos de boca, 4 embalagens maternidade e kit berço maternidade com rolo segura-bebê.',
      pecas: ['1 manta', '4 cueiros', '1 toalha fralda com capuz', '4 fraldas de ombro', '4 panos de boca e chupeta', '4 embalagens maternidade', '1 kit berço maternidade com rolo segura-bebê'],
      unidade: 'kit', preco: 1534, status: 'ativo', relevancia: 5,
      atributos: { tecido: [P230, P400], personalizacao: ['Bordado com nome'] },
      grupo: tecido('kit-maternidade', 1534, 1782),
      fotos: [
        { arquivo: 'a3-5.jpg', alt: 'Peças do kit maternidade bordadas em rosê, lado a lado' },
        { arquivo: 'a3-6.jpg', alt: 'Detalhe do bordado rosê do kit maternidade' },
        { arquivo: 'a3-9.jpg', alt: 'Kit maternidade com almofada, manta e lençol bordados' },
        { arquivo: 'a3-10.jpg', alt: 'Detalhe do babado e do bordado floral' },
      ],
      ficha: [['Tecido', 'Percal 230 fios ou 400 fios egípcios']],
    },
    {
      slug: 'kit-cama-kids', sku: 'MK-CAMA-KIDS', nome: 'Kit cama kids', categoria: 'kit-cama-kids',
      resumo: 'Almofadões, rolos, almofadas decorativas e edredom com elástico 400 fios, com bordados e monograma. Para cama de solteiro ou casal.',
      pecas: ['2 almofadões 50 × 70', '2 rolos de cama', '2 almofadas decorativas médias', '1 almofada decorativa pequena', '1 edredom com elástico 400 fios', 'Bordados e monograma central'],
      unidade: 'kit', preco: 2175, status: 'ativo', relevancia: 5,
      atributos: { tecido: [P400], personalizacao: ['Bordado com nome'] },
      grupo: { chave: 'tamanho-cama-kids', nome: 'Tamanho da cama', opcoes: [{ rotulo: 'Solteiro (0,88 × 1,88 m)', acrescimoCentavos: 0 }, { rotulo: 'Casal', acrescimoCentavos: 54375 }] },
      fotos: [
        { arquivo: 'a3-46.jpg', alt: 'Cama kids com almofadas florais e almofada amarela bordada Catarina' },
        { arquivo: 'a3-47.jpg', alt: 'Almofadas do kit cama kids em rosa, xadrez e floral' },
        { arquivo: 'a3-50.jpg', alt: 'Almofada amarela com o nome Catarina bordado' },
        { arquivo: 'a3-52.jpg', alt: 'Almofadas estampadas do kit cama kids' },
        { arquivo: 'cama-1.jpg', alt: 'Cama kids com almofadas azuis de babado e rolo com laço' },
      ],
      ficha: [['Medida de referência', 'Cama de solteiro 0,88 × 1,88 m'], ['Itens opcionais', 'Almofada de tricô, almofada de renascença, nervura, babado e laço com bordado matame']],
    },
    {
      slug: 'ninho', sku: 'MK-NINHO', nome: 'Ninho', categoria: 'itens-complementares', extras: ['kit-maternidade'],
      resumo: 'Ninho redutor para o bebê, com ou sem babados, bordado no tema do kit.',
      unidade: 'peça', preco: 422, status: 'ativo', relevancia: 4,
      atributos: { tecido: [P230, P400], personalizacao: ['Bordado com nome'] },
      grupo: {
        chave: 'ninho-tecido-babado', nome: 'Tecido e acabamento',
        opcoes: [
          { rotulo: `${P230}, sem babados`, acrescimoCentavos: 0 },
          { rotulo: `${P230}, com babados`, acrescimoCentavos: (457 - 422) * 100 },
          { rotulo: `${P400}, sem babados`, acrescimoCentavos: (457 - 422) * 100 },
          { rotulo: `${P400}, com babados`, acrescimoCentavos: (539 - 422) * 100 },
        ],
      },
      fotos: [{ arquivo: 'ninho-0.3.jpg', alt: 'Ninho branco com faixa verde e almofada bordada Benjamin' }],
    },
    {
      slug: 'trocador', sku: 'MK-TROCADOR', nome: 'Trocador', categoria: 'itens-complementares',
      resumo: 'Trocador em percal 230 fios, reto ou anatômico, no tema do quartinho.',
      unidade: 'peça', preco: 340, status: 'ativo', relevancia: 2, atributos: { tecido: [P230] },
      grupo: { chave: 'modelo-trocador', nome: 'Modelo', opcoes: [{ rotulo: 'Reto', acrescimoCentavos: 0 }, { rotulo: 'Anatômico', acrescimoCentavos: 2000 }] },
    },
    {
      slug: 'embalagem-maternidade', sku: 'MK-EMBALAGEM', nome: 'Embalagem maternidade', categoria: 'itens-complementares', extras: ['para-presentear'],
      resumo: 'Embalagem especial para levar as peças à maternidade ou presentear.',
      unidade: 'peça', preco: 50, status: 'ativo', relevancia: 2, atributos: {},
    },
    {
      // Sem valor na planilha: entra como RASCUNHO com R$ 0,00 para a equipe preencher o preço no ERP.
      slug: 'almofada-de-amamentacao-bordada', sku: 'MK-AMAMENTA', nome: 'Almofada de amamentação', categoria: 'itens-complementares', extras: ['kit-maternidade', 'para-presentear'],
      resumo: 'Almofada de amamentação bordada com o nome, no mesmo tema do kit.',
      unidade: 'peça', preco: 0, status: 'rascunho', relevancia: 4, atributos: { personalizacao: ['Bordado com nome'] },
      fotos: [
        { arquivo: 'amamentacao-0.2.jpg', alt: 'Almofada de amamentação branca bordada Benjamin' },
        { arquivo: 'a3-12.jpg', alt: 'Almofada de amamentação branca com almofada de babado' },
        { arquivo: 'a3-29.jpg', alt: 'Almofada de amamentação lilás e amarela bordada' },
      ],
    },
  ];
  for (const [slug, nome, p230, p400, resumo, presente] of AVULSAS) {
    lista.push({
      slug, sku: `MK-AV-${slug.toUpperCase().slice(0, 30)}`, nome, categoria: 'itens-complementares', ...(presente ? { extras: ['para-presentear'] } : {}),
      resumo, unidade: 'peça', preco: p230, status: 'ativo', relevancia: FOTOS_AVULSAS[slug] ? 3 : 1,
      atributos: { tecido: [P230, P400] }, grupo: tecido(slug, p230, p400), fotos: FOTOS_AVULSAS[slug],
    });
  }
  return lista;
}

export type ResumoSegmentacoes = { categoriasCriadas: number; categoriasDesligadas: number; produtosCriados: number; produtosExistentes: number; fotos: number; kitsUnissex: number; menuAntes: unknown[]; menuItens: number };

/** Kits de berço só em tons neutros ganham também "Unissex" (para a página /kit-berco/kits/unissex). */
const NEUTRAS = new Set(['Branco', 'Cru', 'Cinza', 'Bege']);

export async function aplicarSegmentacoes(pastaFotos: string, comFotos = true): Promise<ResumoSegmentacoes> {
  // Antes de gravar qualquer coisa: todas as fotos existem e cabem no limite (um produto nunca fica pela metade).
  if (comFotos) for (const produto of produtosDasPlanilhas()) for (const foto of produto.fotos ?? []) {
    const tamanho = readFileSync(`${pastaFotos}/${foto.arquivo}`).length;
    if (tamanho > 3 * 1024 * 1024) throw new Error(`${foto.arquivo}: acima de 3 MB.`);
  }
  const database = gestaoDb();
  const resumo: ResumoSegmentacoes = { categoriasCriadas: 0, categoriasDesligadas: 0, produtosCriados: 0, produtosExistentes: 0, fotos: 0, kitsUnissex: 0, menuAntes: [], menuItens: 0 };
  const categorias = async () => new Map((await database.prepare('SELECT id, caminho, ativa, revisao FROM loja_categorias').all()).map((linha) => [texto(linha.caminho), linha]));

  // 1. Categorias novas e as antigas desligadas.
  let mapa = await categorias();
  for (const categoria of CATEGORIAS_NOVAS) {
    if (mapa.has(categoria.slug)) continue;
    await criarCategoria({ paiId: null, slug: categoria.slug, nome: categoria.nome, descricao: categoria.descricao, ordem: categoria.ordem, ativa: true }, ATOR);
    resumo.categoriasCriadas++;
  }
  mapa = await categorias();
  const comProdutoAtivo = new Set((await database.prepare("SELECT DISTINCT c.caminho FROM loja_produtos p JOIN loja_categorias c ON c.id = p.categoria_id WHERE p.status = 'ativo'").all()).map((linha) => texto(linha.caminho)));
  for (const [caminho, linha] of mapa) {
    const raiz = caminho.split('/')[0];
    if (!RAIZES_INATIVAS.includes(raiz) || Number(linha.ativa) !== 1) continue;
    if ([...comProdutoAtivo].some((usado) => usado === caminho || usado.startsWith(`${caminho}/`))) continue;
    await atualizarCategoria(texto(linha.id), { revisao: Number(linha.revisao), ativa: false }, ATOR);
    resumo.categoriasDesligadas++;
  }
  // Personalizado depois das linhas novas.
  const personalizado = (await categorias()).get('personalizado');
  if (personalizado) {
    const atual = await database.prepare('SELECT ordem, revisao FROM loja_categorias WHERE id = ?').get(texto(personalizado.id));
    if (Number(atual?.ordem) < 10) await atualizarCategoria(texto(personalizado.id), { revisao: Number(atual?.revisao), ordem: 10 }, ATOR);
  }
  mapa = await categorias();
  const idCategoria = (caminho: string) => {
    const linha = mapa.get(caminho);
    if (!linha) throw new Error(`Categoria ${caminho} não encontrada.`);
    return texto(linha.id);
  };

  // 2. Produtos das planilhas (só os que faltam), com o grupo de opções e as fotos.
  for (const produto of produtosDasPlanilhas()) {
    if (await database.prepare('SELECT id FROM loja_produtos WHERE slug = ?').get(produto.slug)) { resumo.produtosExistentes++; continue; }
    let grupoId: string | undefined;
    if (produto.grupo) {
      const existente = await database.prepare('SELECT id FROM loja_grupos_opcoes WHERE chave = ?').get(produto.grupo.chave);
      grupoId = existente ? texto(existente.id) : (await criarGrupo({ chave: produto.grupo.chave, nome: produto.grupo.nome, tipo: 'escolha', minimo: 1, maximo: 1, opcoes: produto.grupo.opcoes }, ATOR)).grupo.id;
    }
    const descricao = [produto.resumo, NOTA_PERSONALIZACAO];
    if (produto.pecas?.length) descricao.splice(1, 0, 'A composição está na lista de peças inclusas.');
    const { produto: criado } = await criarProduto({
      slug: produto.slug, sku: produto.sku, nome: produto.nome, resumo: produto.resumo, descricao, precoCentavos: produto.preco * 100, unidade: produto.unidade,
      pecas: produto.pecas ?? [], personalizacao: produto.atributos.personalizacao ? 'Bordado com o nome conforme o modelo' : '', atributos: produto.atributos, disponibilidade: 'sob_encomenda', status: 'rascunho',
      categoriaId: idCategoria(produto.categoria), categoriasExtras: (produto.extras ?? []).map(idCategoria), relevancia: produto.relevancia,
      ficha: produto.ficha?.length ? [{ titulo: 'Composição e acabamento', itens: produto.ficha }] : [],
      ...(grupoId ? { grupos: [grupoId] } : {}),
      seoTitulo: `${produto.nome} | Milena Kerbage`.slice(0, 70), seoDescricao: produto.resumo.slice(0, 170),
    }, ATOR);
    let revisao = criado.revisao;
    if (comFotos) {
      for (const foto of produto.fotos ?? []) {
        const resposta = await enviarImagem(criado.id, { conteudo: readFileSync(`${pastaFotos}/${foto.arquivo}`), revisao, alt: foto.alt }, ATOR);
        revisao = resposta.revisao;
        resumo.fotos++;
      }
    }
    if (produto.status === 'ativo') await atualizarProduto(criado.id, { revisao, status: 'ativo' }, ATOR);
    resumo.produtosCriados++;
  }

  // 3. Kits de berço em tons neutros: + "Unissex" (idempotente).
  const kits = await database.prepare("SELECT p.id, p.revisao, p.atributos_json FROM loja_produtos p JOIN loja_categorias c ON c.id = p.categoria_id WHERE c.caminho = 'kit-berco/kits' AND p.status = 'ativo'").all();
  for (const kit of kits) {
    const atributos = json<Record<string, string[]>>(kit.atributos_json, {});
    const cores = atributos.cor ?? [];
    if (!cores.length || !cores.every((cor) => NEUTRAS.has(cor)) || (atributos.para ?? []).includes('Unissex')) continue;
    await atualizarProduto(texto(kit.id), { revisao: Number(kit.revisao), atributos: { ...atributos, para: [...(atributos.para ?? []), 'Unissex'] } }, ATOR);
    resumo.kitsUnissex++;
  }

  // 4. Menu do cabeçalho: backup do atual e o novo a partir de montarMenu().
  await database.transaction(async () => {
    await travarGestao();
    resumo.menuAntes = await database.prepare('SELECT * FROM loja_menu_itens ORDER BY pai_id NULLS FIRST, ordem').all();
    await database.prepare('DELETE FROM loja_menu_itens WHERE pai_id IS NOT NULL').run();
    await database.prepare('DELETE FROM loja_menu_itens').run();
    resumo.menuItens = await inserirMenuPadrao();
    await auditarGestao(ATOR.id, 'updated', 'loja_menu_itens', 'segmentacoes-2026-11');
  });
  return resumo;
}

export { obterProduto };
