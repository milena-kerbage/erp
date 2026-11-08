import "server-only";
import { condicoesDePagamento, listarProdutos, PRONTA_ENTREGA, type Produto } from "@/loja/lib/catalogo/exemplos";
import { type Foto, fotoPrincipal, segundaFoto } from "@/loja/lib/catalogo/fotos";

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
  opcoes?: { rotulo: string; disponivel: boolean }[]; // tamanhos do berço etc. (painel "Editar" da sacola)
  cor?: string; // cor desta peça (linha de atributos do item)
  cores?: { rotulo: string; slug: string }[]; // a mesma peça em outras cores (irmãos), para trocar no "Editar"
  precisaEscolher: boolean;
  complementos: string[];
  semelhantes: string[];
};

export function catalogoParaCarrinho(): ProdutoCarrinho[] {
  return listarProdutos().map((produto) => ({
    slug: produto.slug,
    sku: produto.sku,
    nome: produto.nome,
    marca: produto.marca,
    foto: fotoPrincipal(produto),
    segunda: segundaFoto(produto),
    unidade: produto.unidade,
    preco: produto.preco,
    pix: condicoesDePagamento(produto.preco)?.pix ?? produto.preco,
    // [CONFIRMAR] com o ateliê: toda peça pode ser retirada lá; a sob encomenda, quando a produção terminar.
    retirada: true,
    prontaEntrega: produto.atributos.entrega?.includes(PRONTA_ENTREGA) ?? false,
    personalizacao: produto.personalizacao,
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
