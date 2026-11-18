// Fotos do próprio ateliê (álbuns do Google Fotos), em public/vitrine/fotos/<nome>.webp (1280 px,
// WebP ~45 KB). Entram onde a loja ainda não tem foto específica: nenhum lugar fica só com ícone.
// A escolha é pelo assunto (o ícone que o lugar usava) e estável pela `semente` (o mesmo lugar mostra
// sempre a mesma foto; lugares vizinhos variam). Sem imports: roda no servidor, no cliente e no node --test.

export type FotoAtelie = { src: string; alt: string };

const FOTOS = {
  "bordado-luca": "Bordado do nome Luca com planetas coloridos",
  "bordado-alicia": "Nome Alícia bordado numa guirlanda de flores",
  "bordado-jade": "Passarinho e o nome Jade bordados em tons de rosa e azul",
  monograma: "Monograma C bordado em guirlanda rosê com laço",
  "tecido-pesponto": "Detalhe do pesponto marinho sobre o tecido branco",
  "tecido-lese": "Babado de lese e pesponto rosê na almofada branca",
  "tecido-xadrez": "Almofada em xadrez rosê com babado",
  embalagem: "Paninhos bordados ao lado da sacola do Ateliê Milena Kerbage",
  "embalagem-paninhos": "Kit de paninhos dobrado com a sacola do ateliê",
  "paninhos-floral": "Cueiro e toalha bordados com monograma floral",
  "paninhos-escada": "Paninhos em xadrez verde pendurados na escada de madeira",
  "paninhos-jade": "Kit de paninhos com bordados de passarinho na escada de madeira",
  "toalha-capuz": "Toalha com capuz bordada pendurada na escada",
  "berco-joao": "Kit berço verde com almofada bordada com o nome João",
  "berco-luca": "Kit berço com almofada bordada com o nome Luca e planetas",
  "berco-lia": "Kit berço com cerejas bordadas e o nome Lia",
  "berco-marina": "Kit berço floral com babados e o nome Marina",
  "berco-conrado": "Kit berço em xadrez sálvia com o nome Conrado",
  "berco-azul": "Kit berço azul-claro com rolos e passamanaria",
  "berco-faixa-verde": "Kit berço off-white com faixas verdes",
  "berco-rose": "Almofadas brancas com babado de lese e pesponto rosê",
  "berco-marinho": "Kit berço branco com pesponto e vivo marinho",
  "berco-helena": "Almofadas lilás com brasão e o nome Helena bordados",
  "berco-miguel": "Kit berço em xadrez verde com o nome Miguel",
  "berco-provence": "Kit berço off-white com babados e galhos bordados",
  "quarto-floral": "Quarto de bebê floral com kit berço e poltrona",
  "quarto-safari": "Quarto safári com kit berço e ninho bordados",
  "ninho-safari": "Ninho com bichinhos do safári bordados",
  "ninho-benjamin": "Ninho com vivo verde e o nome Benjamin bordado",
  "amamentacao-lia": "Almofada de amamentação branca com o nome Lia bordado",
  "amamentacao-marina": "Almofada de amamentação com flores e o nome Marina",
  "moises-isaque": "Kit moisés azul com bichinhos e o nome Isaque bordados",
  trocador: "Trocador em xadrez rosê sobre a cômoda",
  "lencol-sarah": "Lençol de berço com o nome Sarah bordado em lilás",
  "cama-kids": "Cama kids com almofadas coloridas e o nome bordado",
  "cama-alice": "Cama com almofadas rosê, verde e o nome Alice bordado",
  tulipa: "Almofadas redondas com tulipa bordada e babado",
  floresta: "Almofada com estampa de floresta e vivo terracota",
} as const;

export type NomeFotoAtelie = keyof typeof FOTOS;

const BERCOS: NomeFotoAtelie[] = ["berco-joao", "berco-lia", "berco-marina", "berco-conrado", "berco-azul", "berco-faixa-verde", "berco-miguel", "berco-helena"];

// Assunto (nome do ícone que o lugar usava) → fotos possíveis.
const POR_ASSUNTO: Record<string, NomeFotoAtelie[]> = {
  agulha: ["bordado-luca", "bordado-alicia", "bordado-jade", "monograma"],
  novelo: ["tecido-pesponto", "tecido-lese", "tecido-xadrez"],
  regua: ["tecido-pesponto", "tecido-xadrez"],
  caminhao: ["embalagem", "embalagem-paninhos"],
  pacote: ["embalagem", "embalagem-paninhos"],
  presente: ["embalagem", "paninhos-floral", "embalagem-paninhos"],
  bolsa: ["embalagem-paninhos", "paninhos-escada", "paninhos-jade"],
  berco: BERCOS,
  bebe: ["berco-luca", "berco-miguel", "berco-rose", "berco-helena", "moises-isaque", "berco-lia"],
  flor: ["berco-marina", "quarto-floral", "tulipa", "berco-provence"],
  tulipa: ["tulipa", "berco-marina", "cama-alice"],
  nuvem: ["berco-azul", "moises-isaque", "berco-marinho"],
  lua: ["berco-luca", "berco-azul", "berco-provence"],
  estrela: ["berco-luca", "moises-isaque", "berco-azul"],
  folha: ["berco-joao", "floresta", "ninho-safari", "berco-faixa-verde"],
  coracao: ["amamentacao-lia", "amamentacao-marina", "berco-lia"],
  pena: ["berco-conrado", "berco-provence", "ninho-benjamin"],
  borboleta: ["berco-marina", "bordado-jade"],
  medalha: ["monograma", "berco-marinho"],
  brilho: ["berco-luca", "cama-kids"],
  conversa: ["bordado-alicia", "embalagem"],
};

function hash(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
}

export function fotoAtelie(nome: NomeFotoAtelie): FotoAtelie {
  return { src: `/vitrine/fotos/${nome}.webp`, alt: FOTOS[nome] };
}

/** Foto do ateliê para o assunto (ícone) do lugar; a semente fixa a escolha entre as possíveis. */
export function fotoDeEspera(assunto: string | undefined, semente = ""): FotoAtelie {
  const opcoes = POR_ASSUNTO[assunto ?? ""] ?? BERCOS;
  return fotoAtelie(opcoes[hash(`${assunto}|${semente}`) % opcoes.length]);
}

export const NOMES_FOTOS_ATELIE = Object.keys(FOTOS) as NomeFotoAtelie[];
