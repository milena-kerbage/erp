import type { NomeIcone, TomMidia } from "@/loja/componentes/inicio/Midia";
import type { Produto } from "@/loja/lib/catalogo/exemplos";
import { AVISO_FICHA, type GrupoFicha } from "@/loja/lib/catalogo/fichas";

// Dados de apresentação da página de produto e do card da listagem (lululemon-pdp.md), calculados no
// servidor a partir do catálogo: nome dividido (variação em cinza), fotos da galeria, cores, textos
// das seções editoriais e abas da gaveta de detalhes. Funções puras, sem estilo.

// "Kit berço Jardim rosê 9 peças" → ["Kit berço Jardim rosê", "9 peças"]: a variação (tamanho do kit,
// quantidade de peças) vai em cinza no mesmo título, como o "Regular" da referência.
const VARIACAO_NOME = /\s(\([^)]+\)|\d+\s(?:peças|partes|folhas|itens))$/i;

export function dividirNome(nome: string): { base: string; variacao?: string } {
  const achado = nome.match(VARIACAO_NOME);
  if (!achado || achado.index === undefined) return { base: nome };
  return { base: nome.slice(0, achado.index), variacao: achado[1] };
}

// Tom da mídia de espera para cada cor de tecido (tokens tecido.*).
const TOM_DA_COR: Record<string, TomMidia> = {
  Rosê: "rose",
  "Azul bebê": "azul",
  "Verde-sálvia": "verde",
  Cru: "cru",
  Cinza: "cinza",
  Branco: "branco",
};

// Foto da galeria: real (src) ou, enquanto não há fotos do ateliê, uma mídia de espera com tom e
// ícone próprios. A primeira é a "principal" (o mesmo bloco de estúdio dos cards da home).
export type FotoGaleria = { src?: string; alt: string; tom: TomMidia; icone: NomeIcone; principal: boolean };

const ICONES_POR_RAIZ: Record<string, NomeIcone[]> = {
  "kit-berco": ["berco", "flor", "agulha", "nuvem", "novelo"],
  enxoval: ["bebe", "agulha", "nuvem", "coracao", "pena"],
  quarto: ["lua", "nuvem", "estrela", "folha", "flor"],
  maternidade: ["bolsa", "presente", "coracao", "agulha", "borboleta"],
};

function hash(texto: string): number {
  let valor = 0;
  for (const letra of texto) valor = (valor * 31 + letra.charCodeAt(0)) >>> 0;
  return valor;
}

export function raizDe(produto: Pick<Produto, "caminho">): string {
  return produto.caminho.split("/").filter(Boolean)[0] ?? "";
}

export function corAtualDe(produto: Pick<Produto, "irmaos" | "slug" | "atributos">): string | undefined {
  return produto.irmaos?.itens.find((irmao) => irmao.slug === produto.slug)?.rotulo ?? produto.atributos.cor?.[0];
}

// De 4 a 6 fotos por produto (estável pelo slug), em tons diferentes, para a navegação fazer sentido.
export function fotosDoProduto(produto: Pick<Produto, "slug" | "nome" | "caminho" | "imagens" | "irmaos" | "atributos">): FotoGaleria[] {
  const cor = corAtualDe(produto);
  const tomCor = (cor && TOM_DA_COR[cor]) || "linho";
  const icones = ICONES_POR_RAIZ[raizDe(produto)] ?? ICONES_POR_RAIZ.enxoval;
  if (produto.imagens?.length) {
    return produto.imagens.map((imagem, indice) => ({
      src: imagem.src,
      alt: imagem.alt,
      tom: tomCor,
      icone: icones[indice % icones.length],
      principal: indice === 0,
    }));
  }
  const total = 4 + (hash(produto.slug) % 3);
  const tons: TomMidia[] = [tomCor, "linho", "areia", "salviaClara", tomCor === "linho" ? "cru" : "branco"];
  const deslocamento = hash(produto.nome) % icones.length;
  return Array.from({ length: total }, (_, indice) => ({
    alt: `${produto.nome}, foto ${indice + 1} de ${total}`,
    tom: indice === 0 ? tomCor : tons[(indice - 1) % tons.length],
    icone: icones[(indice + deslocamento) % icones.length],
    principal: indice === 0,
  }));
}

// Cores para as bolinhas: a mesma peça em outras cores (irmãos, com link) ou, sem irmãos, as cores
// em que a peça é feita (sem link: o carrinho ainda não guarda a cor escolhida).
// `variante`: o que o card precisa para trocar de cor sem sair da página (lululemon-animacoes-edicao.md
// §2): nome, preço, selo e as fotos (ou mídias de espera) do produto-irmão. A página de produto não usa.
export type VarianteCor = { slug: string; nome: string; nomeBase: string; nomeVariacao?: string; preco: string; selo?: string; fotos: FotoGaleria[] };
export type CorProduto = { rotulo: string; slug?: string; atual: boolean; novo?: boolean; variante?: VarianteCor };

const FOTOS_DO_CARD = 4;

export function coresDe(
  produto: Pick<Produto, "irmaos" | "slug" | "atributos" | "caminho">,
  novos: Set<string> = new Set(),
  { variantes = true }: { variantes?: boolean } = {},
): CorProduto[] {
  const irmaos = produto.irmaos;
  if (irmaos && irmaos.titulo === "Cor") {
    return irmaos.itens.map((irmao) => {
      const cor: CorProduto = { rotulo: irmao.rotulo, slug: irmao.slug, atual: irmao.slug === produto.slug, novo: novos.has(irmao.slug) || undefined };
      if (!variantes || !irmao.nome || !irmao.preco) return cor;
      const { base, variacao } = dividirNome(irmao.nome);
      const fotos = fotosDoProduto({ slug: irmao.slug, nome: irmao.nome, caminho: irmao.caminho ?? produto.caminho, imagens: irmao.imagens, irmaos, atributos: {} });
      return {
        ...cor,
        variante: { slug: irmao.slug, nome: irmao.nome, nomeBase: base, nomeVariacao: variacao, preco: irmao.preco, selo: irmao.selo, fotos: fotos.slice(0, FOTOS_DO_CARD) },
      };
    });
  }
  return (produto.atributos.cor ?? []).map((rotulo, indice) => ({ rotulo, atual: indice === 0 }));
}

// Tamanho: o rótulo curto vai no botão ("Berço americano"); a medida, na frase de apoio.
export function partesDaOpcao(rotulo: string): { curto: string; detalhe?: string } {
  const [curto, ...resto] = rotulo.split(" · ");
  return { curto, detalhe: resto.join(" · ") || undefined };
}

// "Pensado para": o momento de uso pela categoria-mãe.
const USO: Record<string, string> = {
  "kit-berco": "Montar e decorar o berço do bebê",
  enxoval: "Banho, colo e os primeiros dias em casa",
  quarto: "Decorar o quarto do bebê",
  maternidade: "A chegada na maternidade",
};

export function usoDe(produto: Pick<Produto, "caminho" | "trilha">): string {
  return USO[raizDe(produto)] ?? produto.trilha.at(-1)?.rotulo ?? "O enxoval do bebê";
}

// Nome da linha (hero editorial): o tema ("Jardim", "Nuvens") ou o tecido ("Tricô", "Linho").
export function linhaDe(produto: Pick<Produto, "atributos" | "trilha">): string {
  return produto.atributos.tema?.[0] ?? produto.atributos.tecido?.[0] ?? produto.trilha.at(-1)?.rotulo ?? "Ateliê";
}

function valorDaFicha(ficha: GrupoFicha[], grupo: string, item: string): string | undefined {
  return ficha.find((g) => g.titulo === grupo)?.itens.find(([nome]) => nome === item)?.[1];
}

// 3 destaques do split (tecido, bordado, entrega), só com o que está na ficha e na descrição.
export type Destaque = { chave: string; titulo: string; texto: string; tom: TomMidia; icone: NomeIcone };

export function destaquesDe(produto: Pick<Produto, "ficha" | "personalizacao" | "atributos">): Destaque[] {
  const composicao = valorDaFicha(produto.ficha, "Tecido e enchimento", "Composição");
  const acabamento = valorDaFicha(produto.ficha, "Tecido e enchimento", "Acabamento");
  const enchimento = valorDaFicha(produto.ficha, "Tecido e enchimento", "Enchimento");
  const disponibilidade = valorDaFicha(produto.ficha, "Prazo e personalização", "Disponibilidade") ?? "Sob encomenda";
  const prazo = valorDaFicha(produto.ficha, "Prazo e personalização", "Prazo de produção");
  const entrega = valorDaFicha(produto.ficha, "Prazo e personalização", "Entrega");
  const tecido = [composicao, acabamento && `Acabamento: ${acabamento.toLowerCase()}`, enchimento && `Enchimento: ${enchimento.toLowerCase()}`]
    .filter(Boolean)
    .join(". ");
  return [
    {
      chave: "tecido",
      titulo: produto.atributos.tecido?.[0] ?? "O tecido",
      texto: tecido ? `${tecido}.` : "A composição completa está em Tecido e cuidados.",
      tom: "linho",
      icone: "novelo",
    },
    produto.personalizacao
      ? {
          chave: "bordado",
          titulo: "Bordado com o nome",
          texto: `${produto.personalizacao}. Antes de bordar, o ateliê confirma pelo WhatsApp o nome, a fonte e a cor da linha.`,
          tom: "salviaClara",
          icone: "agulha",
        }
      : {
          chave: "bordado",
          titulo: "Feito à mão",
          texto: "Peça feita à mão no ateliê: as medidas podem variar até 2 cm e o tom do tecido muda levemente conforme o lote.",
          tom: "salviaClara",
          icone: "agulha",
        },
    {
      chave: "entrega",
      titulo: disponibilidade,
      texto: [prazo, entrega].filter(Boolean).join(". ") + ".",
      tom: "areia",
      icone: "caminhao",
    },
  ];
}

// Abas da gaveta: "Detalhes" (kit, medidas, prazo, identificação, venda) e "Tecido e cuidados".
export type AbaDetalhes = { chave: "detalhes" | "tecido"; titulo: string; grupos: GrupoFicha[]; nota?: string };

const GRUPOS_TECIDO = new Set(["Tecido e enchimento", "Cuidados"]);

export function abasDe(produto: Pick<Produto, "ficha" | "pecas">): AbaDetalhes[] {
  return [
    { chave: "detalhes", titulo: "Detalhes", grupos: produto.ficha.filter((grupo) => !GRUPOS_TECIDO.has(grupo.titulo)) },
    { chave: "tecido", titulo: "Tecido e cuidados", grupos: produto.ficha.filter((grupo) => GRUPOS_TECIDO.has(grupo.titulo)), nota: AVISO_FICHA },
  ];
}
