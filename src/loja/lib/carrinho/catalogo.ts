import "server-only";
import { PRONTA_ENTREGA } from "@/loja/lib/catalogo/constantes";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { type Foto, fotoPrincipal, segundaFoto } from "@/loja/lib/catalogo/fotos";
import { centavos, DESCONTO_PIX_PERCENTUAL, decimal, type Prazo } from "./totais";

// O essencial de cada produto para o carrinho e o checkout montarem as linhas no navegador
// (os itens vivem no localStorage até o carrinho existir na API).
export type ProdutoCarrinho = {
  slug: string;
  sku: string;
  nome: string;
  marca: string;
  foto?: Foto;
  segunda?: Foto; // 2ª foto, que entra no hover do item da sacola
  unidade: string;
  preco: string;
  pix: string;
  retirada: boolean; // pode retirar no ateliê, em Fortaleza
  prontaEntrega: boolean; // sai em até 2 dias úteis; senão, produção sob encomenda (15 a 25 dias úteis)
  personalizacao?: string; // bordado com o nome do bebê
  variacaoTitulo?: string;
  opcoes?: { rotulo: string; disponivel: boolean; acrescimoCentavos?: number }[]; // tamanhos do berço etc. (painel "Editar" da sacola)
  personalizacaoAcrescimoCentavos?: number; // soma ao preço quando o item vai "com bordado"
  cor?: string; // cor desta peça (linha de atributos do item)
  cores?: { rotulo: string; slug: string }[]; // a mesma peça em outras cores (irmãos), para trocar no "Editar"
  precisaEscolher: boolean;
  complementos: string[];
  semelhantes: string[];
  // Projetos e quartinho personalizado (montados no navegador por lib/carrinho/linhas.ts):
  tipo?: "projeto" | "personalizado";
  href?: string; // link do item (padrão: /produto/<slug>)
  paleta?: string[]; // cores (hex) da miniatura enquanto não há foto
  atributos?: string[]; // linhas de atributos prontas (pacote, opcionais, tema, paleta…)
  modulos?: { nome: string; detalhe?: string; precoCentavos: number }[]; // o que vem, para o pedido
  producao?: Prazo; // prazo de produção próprio
};

// O catálogo vem do servidor (banco do ERP ou o de exemplo, src/lib/loja/catalogo.ts).
export function catalogoParaCarrinho(produtos: Produto[]): ProdutoCarrinho[] {
  return produtos.map((produto) => ({
    slug: produto.slug,
    sku: produto.sku,
    nome: produto.nome,
    marca: produto.marca,
    foto: fotoPrincipal(produto),
    segunda: segundaFoto(produto),
    unidade: produto.unidade,
    preco: produto.preco,
    pix: decimal(Math.round((centavos(produto.preco) * (100 - DESCONTO_PIX_PERCENTUAL)) / 100)),
    // [CONFIRMAR] com o ateliê: toda peça pode ser retirada lá; a sob encomenda, quando a produção terminar.
    retirada: true,
    prontaEntrega: produto.atributos.entrega?.includes(PRONTA_ENTREGA) ?? false,
    personalizacao: produto.personalizacao,
    ...(produto.personalizacaoAcrescimoCentavos ? { personalizacaoAcrescimoCentavos: produto.personalizacaoAcrescimoCentavos } : {}),
    ...(produto.prazo ? { producao: produto.prazo } : {}),
    variacaoTitulo: produto.variacao?.titulo,
    opcoes: produto.variacao?.opcoes,
    cor: corDe(produto),
    cores: produto.irmaos?.titulo === "Cor" ? produto.irmaos.itens.map(({ rotulo, slug }) => ({ rotulo, slug })) : undefined,
    precisaEscolher: Boolean(produto.variacao),
    complementos: produto.complementos,
    semelhantes: produto.semelhantes,
  }));
}

// Cor da peça: a do irmão atual (quando a peça existe em outras cores) ou a primeira da faceta "cor".
function corDe(produto: Produto): string | undefined {
  if (produto.irmaos?.titulo === "Cor") return produto.irmaos.itens.find((irmao) => irmao.slug === produto.slug)?.rotulo;
  return produto.atributos.cor?.[0];
}
