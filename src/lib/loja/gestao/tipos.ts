// Contrato das APIs de gestão do e-commerce (src/app/api/erp/loja/**), compartilhado com as telas do ERP
// (src/features/ecommerce/types.ts reexporta). Só tipos: sem imports de runtime.
// Convenções: valores em centavos (inteiros); datas em ISO 8601; `revisao` é a versão otimista do registro
// (mande a atual no PATCH/DELETE; versão antiga responde 409 REVISION_CONFLICT). Erros seguem o padrão do
// ERP: { error: string, code: string } com o status HTTP.

export type Pagina = { limit: number; offset: number; total: number; hasMore: boolean };

// ---------------------------------------------------------------- Categorias

export type CategoriaGestao = {
  id: string;
  paiId: string | null;
  slug: string;
  /** Chave do motor de URLs, sem barra inicial ("kit-berco/kits"); a página é /<caminho>. */
  caminho: string;
  nome: string;
  descricao: string;
  imagem: string;
  ordem: number;
  ativa: boolean;
  seoTitulo: string;
  seoDescricao: string;
  /** Produtos com esta categoria como principal (qualquer situação). */
  produtos: number;
  revisao: number;
  criadoEm: string;
  atualizadoEm: string;
};
export type NoCategoriaGestao = CategoriaGestao & { filhos: NoCategoriaGestao[] };
export type RespostaCategorias = { categorias: CategoriaGestao[]; arvore: NoCategoriaGestao[] };
export type EntradaCategoria = {
  paiId?: string | null;
  slug?: string;
  nome?: string;
  descricao?: string;
  imagem?: string;
  ordem?: number;
  ativa?: boolean;
  seoTitulo?: string;
  seoDescricao?: string;
};
/** PUT /categorias/ordem: os irmãos de `paiId` (null = raiz) na nova ordem, todos uma vez. */
export type EntradaOrdemCategorias = { paiId: string | null; ids: string[] };

// ---------------------------------------------------------------- Produtos

export type StatusProduto = "rascunho" | "ativo" | "arquivado";
export type Disponibilidade = "pronta_entrega" | "sob_encomenda";
export type GrupoFichaGestao = { titulo: string; itens: Array<[string, string]> };
export type TipoImagemProduto = "principal" | "detalhe" | "aplicacao";

export type ImagemProdutoGestao = {
  id: string;
  posicao: number;
  alt: string;
  cor: string;
  tipo: TipoImagemProduto;
  largura: number;
  altura: number;
  tamanho: number;
  /** Prévia no ERP (autenticada): ?tamanho=mini|grande. */
  url: string;
  urlMini: string;
  criadaEm: string;
};

export type ReferenciaProduto = { id: string; slug: string; nome: string };

export type ProdutoResumoGestao = {
  id: string;
  slug: string;
  sku: string;
  nome: string;
  precoCentavos: number;
  precoDeCentavos: number | null;
  status: StatusProduto;
  disponibilidade: Disponibilidade;
  destaque: boolean;
  selo: string;
  categoriaId: string;
  categoriaNome: string;
  caminho: string;
  ordem: number;
  /** Miniatura da 1ª foto (prévia do ERP) ou null. */
  imagem: string | null;
  revisao: number;
  atualizadoEm: string;
};

export type ProdutoGestao = ProdutoResumoGestao & {
  marca: string;
  resumo: string;
  descricao: string[];
  unidade: string;
  pecas: string[];
  personalizacao: string;
  ficha: GrupoFichaGestao[];
  /** Facetas da listagem ({ cor: ["Rosê"], tecido: ["Percal 200 fios"] }). `entrega` vem da disponibilidade. */
  atributos: Record<string, string[]>;
  prazoMinDias: number | null;
  prazoMaxDias: number | null;
  /** Mesma peça em outras cores: produtos com a mesma `linhaCores`; `cor` é o rótulo desta. */
  linhaCores: string;
  cor: string;
  categoriasExtras: string[];
  complementos: ReferenciaProduto[];
  semelhantes: ReferenciaProduto[];
  grupos: Array<{ grupoId: string; nome: string; tipo: TipoGrupoOpcoes; ordem: number }>;
  imagens: ImagemProdutoGestao[];
  seoTitulo: string;
  seoDescricao: string;
  criadoEm: string;
  /** Endereço público na loja (só abre com status ativo). */
  urlLoja: string;
};

export type FiltrosProdutos = {
  status?: StatusProduto | "todos";
  categoria?: string; // id (inclui as subcategorias)
  disponibilidade?: Disponibilidade;
  busca?: string; // nome, SKU ou slug
  limit?: number;
  offset?: number;
};
export type RespostaProdutos = { produtos: ProdutoResumoGestao[]; contagem: Record<StatusProduto, number>; pagination: Pagina };

export type EntradaProduto = {
  slug?: string;
  sku?: string;
  nome?: string;
  marca?: string;
  resumo?: string;
  descricao?: string[];
  precoCentavos?: number;
  precoDeCentavos?: number | null;
  unidade?: string;
  selo?: string;
  pecas?: string[];
  personalizacao?: string;
  ficha?: GrupoFichaGestao[];
  atributos?: Record<string, string[]>;
  disponibilidade?: Disponibilidade;
  prazoMinDias?: number | null;
  prazoMaxDias?: number | null;
  status?: StatusProduto;
  destaque?: boolean;
  categoriaId?: string;
  categoriasExtras?: string[];
  linhaCores?: string;
  cor?: string;
  ordem?: number;
  complementos?: string[]; // ids, em ordem
  semelhantes?: string[]; // ids, em ordem (vazio: a loja calcula pela categoria)
  grupos?: string[]; // ids dos grupos de opções, em ordem
  seoTitulo?: string;
  seoDescricao?: string;
};
/** POST /produtos/:id/duplicar: cópia em rascunho com slug/SKU novos (opcionais; padrão "-copia"). */
export type EntradaDuplicar = { slug?: string; sku?: string; nome?: string };
/** PATCH /produtos/:id/imagens/:imagemId */
export type EntradaImagem = { alt?: string; cor?: string; tipo?: TipoImagemProduto };

// ---------------------------------------------------------------- Opções

export type TipoGrupoOpcoes = "escolha" | "personalizacao";
export type OpcaoGestao = { id: string; rotulo: string; acrescimoCentavos: number; disponivel: boolean; ordem: number };
export type GrupoOpcoesGestao = {
  id: string;
  chave: string;
  nome: string;
  descricao: string;
  /** escolha: seletor (ex.: tamanho do berço); personalizacao: "com/sem" bordado, com o acréscimo da 1ª opção. */
  tipo: TipoGrupoOpcoes;
  minimo: number; // 1 = obrigatório
  maximo: number;
  opcoes: OpcaoGestao[];
  produtos: number;
  revisao: number;
  criadoEm: string;
  atualizadoEm: string;
};
/** `opcoes` substitui a lista inteira (sem id = nova; com id = mantém/edita; ausente = removida). */
export type EntradaGrupoOpcoes = {
  chave?: string;
  nome?: string;
  descricao?: string;
  tipo?: TipoGrupoOpcoes;
  minimo?: number;
  maximo?: number;
  opcoes?: Array<{ id?: string; rotulo: string; acrescimoCentavos?: number; disponivel?: boolean }>;
};

// ---------------------------------------------------------------- Coleções

export type OndeColecao = "home" | "listagem" | "ambos";
export type ColecaoGestao = {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  onde: OndeColecao;
  ordem: number;
  ativa: boolean;
  produtos: ReferenciaProduto[];
  revisao: number;
  criadoEm: string;
  atualizadoEm: string;
};
export type EntradaColecao = { slug?: string; nome?: string; descricao?: string; onde?: OndeColecao; ordem?: number; ativa?: boolean; produtos?: string[] };

// ---------------------------------------------------------------- Menu do cabeçalho

/**
 * item: 1º nível do menu (painel "colunas" ou "cards"); dentro dele: destaque (links grandes), secundario,
 * coluna (título + links "link"), card (5:6 com tom/ícone/imagem) e promo (bloco editorial 16:9, 1 por item).
 */
export type SecaoMenu = "item" | "destaque" | "secundario" | "coluna" | "link" | "card" | "promo";
export type ItemMenuGestao = {
  id: string;
  paiId: string | null;
  secao: SecaoMenu;
  rotulo: string;
  href: string;
  descricao: string;
  imagem: string;
  tom: string;
  icone: string;
  painel: "" | "colunas" | "cards";
  externo: boolean;
  destaque: boolean;
  soBotao: boolean;
  ordem: number;
  ativo: boolean;
  revisao: number;
  filhos: ItemMenuGestao[];
};
export type RespostaMenu = { menu: ItemMenuGestao[]; tons: string[]; icones: string[] };
export type EntradaItemMenu = Partial<Omit<ItemMenuGestao, "id" | "revisao" | "filhos">>;
export type EntradaOrdemMenu = { paiId: string | null; ids: string[] };

// ---------------------------------------------------------------- Cupons

export type TipoCupom = "percentual" | "valor";
export type SituacaoCupom = "ativo" | "inativo" | "agendado" | "expirado" | "esgotado";
export type CupomGestao = {
  id: string;
  codigo: string;
  descricao: string;
  tipo: TipoCupom;
  /** percentual: 1 a 50 (%); valor: centavos. */
  valor: number;
  minimoCentavos: number;
  inicio: string | null;
  fim: string | null;
  limiteTotal: number | null;
  limitePorCliente: number | null;
  primeiraCompra: boolean;
  /** Aparece como sugestão no seletor de cupom da sacola. */
  exibir: boolean;
  ativo: boolean;
  situacao: SituacaoCupom;
  usos: number;
  descontoTotalCentavos: number;
  revisao: number;
  criadoEm: string;
  atualizadoEm: string;
};
export type EntradaCupom = {
  codigo?: string;
  descricao?: string;
  tipo?: TipoCupom;
  valor?: number;
  minimoCentavos?: number;
  inicio?: string | null;
  fim?: string | null;
  limiteTotal?: number | null;
  limitePorCliente?: number | null;
  primeiraCompra?: boolean;
  exibir?: boolean;
  ativo?: boolean;
};
export type UsoCupomGestao = { id: string; pedidoNumero: string; clienteId: string | null; clienteNome: string; descontoCentavos: number; criadoEm: string };
export type RespostaUsosCupom = { cupom: CupomGestao; usos: UsoCupomGestao[]; pagination: Pagina };

// ---------------------------------------------------------------- Carrinhos abandonados

export type ItemCarrinhoGestao = { nome: string; quantidade: number; precoCentavos: number; detalhes: string[]; href?: string; disponivel: boolean };
export type CarrinhoAbandonadoGestao = {
  clienteId: string;
  nome: string;
  email: string;
  whatsapp: string;
  whatsappFormatado: string;
  itens: ItemCarrinhoGestao[];
  quantidade: number;
  totalCentavos: number;
  criadoEm: string;
  atualizadoEm: string;
  horasParado: number;
  lembreteEm: string | null;
};
export type FiltrosCarrinhos = { horas?: number; busca?: string; minimoCentavos?: number; lembrete?: "todos" | "sem" | "com"; limit?: number; offset?: number };
export type RespostaCarrinhos = { carrinhos: CarrinhoAbandonadoGestao[]; horas: number; totalCentavos: number; pagination: Pagina };
/** POST /carrinhos/:clienteId/mensagem: só monta o link (wa.me); nada é enviado automaticamente. */
export type RespostaMensagemCarrinho = { mensagem: string; link: string; lembreteEm: string };

// ---------------------------------------------------------------- Painel

export type PeriodoPainel = "7d" | "30d" | "90d";
export type PainelLoja = {
  periodo: PeriodoPainel;
  desde: string;
  ate: string;
  pedidos: number;
  /** Soma dos totais "a partir de" (sem os cancelados); o valor final é combinado pelo WhatsApp. */
  valorCentavos: number;
  ticketMedioCentavos: number;
  porEtapa: Record<"enviado_whatsapp" | "pagamento_confirmado" | "despachado" | "entregue" | "cancelado", number>;
  novasContas: number;
  carrinhosAbandonados: { quantidade: number; valorCentavos: number; horas: number };
  /** Carrinhos convertidos no período ÷ (convertidos + abandonados), 0 a 1; null sem carrinhos. */
  conversaoCarrinho: number | null;
  cuponsMaisUsados: Array<{ codigo: string; usos: number; descontoCentavos: number; tipo: "campanha" | "boas_vindas" }>;
  produtosMaisPedidos: Array<{ slug: string; nome: string; quantidade: number; valorCentavos: number }>;
  categoriasMaisPedidas: Array<{ caminho: string; nome: string; quantidade: number; valorCentavos: number }>;
  serieDiaria: Array<{ dia: string; pedidos: number; valorCentavos: number }>;
};

// ---------------------------------------------------------------- Clientes (acréscimo ao contrato existente)

export type LeadVinculado = { leadId: string; nome: string; funil: string; etapa: string; href: string } | null;

// ---------------------------------------------------------------- Telas do catálogo no ERP (acréscimos)

/** ?ordenar= da lista de produtos (padrão: ordem da loja). */
export type OrdenacaoProdutos = "ordem" | "nome" | "preco" | "-preco" | "recentes" | "sku";
/** Filtros extras da lista de produtos: coleção (id) e ordenação. */
export type FiltrosProdutosCatalogo = FiltrosProdutos & { colecao?: string; ordenar?: OrdenacaoProdutos };
/** Respostas das rotas de fotos: a lista e a revisão nova do produto (mexer nas fotos conta como edição). */
export type RespostaImagensProduto = { imagens: ImagemProdutoGestao[]; revisao: number };
/** Grupo de opções com os produtos que o usam (GET /opcoes e /opcoes/:id). */
export type GrupoOpcoesComUso = GrupoOpcoesGestao & { usadoEm: ReferenciaProduto[] };
/** GET /categorias/imagens: arquivos da loja (/vitrine/…) aceitos como imagem de categoria e do menu. */
export type RespostaImagensLoja = { imagens: Array<{ caminho: string; emUso: boolean }> };

// ---------------------------------------------------------------- Vendas (acréscimos das telas de pedidos, clientes e cupons)

/** GET /clientes/:id → `carrinho`: a sacola aberta da cliente (ainda não virou pedido) ou null. */
export type CarrinhoDaCliente = CarrinhoAbandonadoGestao | null;
/** GET /cupons → `primeiraCompra`: o cupom automático de 5% de cada conta (BEMVINDA-…) e o BEMVINDO5, só leitura. */
export type ResumoCupomPrimeiraCompra = { percentual: number; prefixo: string; generico: string; emitidos: number; usados: number; descontoCentavos: number };
export type RespostaCupons = { cupons: CupomGestao[]; primeiraCompra: ResumoCupomPrimeiraCompra };
