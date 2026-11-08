// Calculadora do enxoval e do berço (guia de medidas da home).
// 1) A partir do colchão do berço, diz a medida do lençol com elástico, do protetor e da saia.
// 2) A partir da estação e de quantas vezes a família lava roupa por semana, diz quantas peças ter.
// Sem imports locais: roda no navegador, no servidor e no `node --test`. É ORIENTAÇÃO para montar o
// enxoval; a equipe do ateliê confere as medidas antes de costurar. [CONFIRMAR] consumos e folgas com o ateliê.

export type ModeloBerco = "americano" | "nacional" | "mini" | "minicama" | "moises";

// Colchões mais comuns no Brasil (comprimento × largura × altura, em cm).
export const COLCHOES: Record<ModeloBerco, { rotulo: string; comprimento: number; largura: number; altura: number }> = {
  americano: { rotulo: "Berço americano", comprimento: 130, largura: 70, altura: 12 },
  nacional: { rotulo: "Berço nacional", comprimento: 130, largura: 60, altura: 12 },
  mini: { rotulo: "Mini berço", comprimento: 90, largura: 50, altura: 10 },
  minicama: { rotulo: "Mini cama", comprimento: 150, largura: 70, altura: 12 },
  moises: { rotulo: "Moisés", comprimento: 75, largura: 35, altura: 5 },
};

export type EntradaBerco = {
  comprimento: number; // cm do colchão
  largura: number; // cm do colchão
  altura: number; // cm do colchão
  alturaEstrado?: number; // cm do estrado até o chão (saia); padrão 30
};

export type MedidasBerco = {
  colchao: string; // "130 × 70 × 12 cm"
  lencol: { comprimento: number; largura: number; texto: string }; // tecido cortado, já com a dobra do elástico
  protetor: { contorno: number; altura: number; partes: Array<{ nome: string; cm: number }>; texto: string };
  saia: { contorno: number; altura: number; texto: string };
  avisos: string[];
};

export type ResultadoBerco = MedidasBerco | { erro: string };

const DOBRA_ELASTICO = 8; // cm que o lençol entra por baixo do colchão em cada lado
const ALTURA_PROTETOR = 35; // cm, a altura padrão do ateliê
const ALTURA_ESTRADO_PADRAO = 30;

const cm = (valor: number) => `${String(valor).replace(".", ",")} cm`;

export function calcularBerco(entrada: EntradaBerco): ResultadoBerco {
  const { comprimento, largura, altura } = entrada;
  const alturaEstrado = entrada.alturaEstrado ?? ALTURA_ESTRADO_PADRAO;
  if (!(comprimento >= 50 && comprimento <= 200)) return { erro: "Informe o comprimento do colchão em cm (entre 50 e 200)." };
  if (!(largura >= 30 && largura <= 120)) return { erro: "Informe a largura do colchão em cm (entre 30 e 120)." };
  if (largura > comprimento) return { erro: "A largura do colchão não pode ser maior que o comprimento. Confira as medidas." };
  if (!(altura >= 3 && altura <= 25)) return { erro: "Informe a altura do colchão em cm (entre 3 e 25)." };
  if (!(alturaEstrado >= 10 && alturaEstrado <= 60)) return { erro: "A altura do estrado ao chão fica entre 10 e 60 cm." };

  // O lençol cobre a altura do colchão dos dois lados e ainda dobra por baixo para o elástico.
  const sobra = 2 * (altura + DOBRA_ELASTICO);
  const lencol = { comprimento: comprimento + sobra, largura: largura + sobra };
  // O protetor contorna o colchão por dentro do berço: cabeceira, pé e as duas laterais.
  const partes = [
    { nome: "Cabeceira", cm: largura },
    { nome: "Pé", cm: largura },
    { nome: "Lateral esquerda", cm: comprimento },
    { nome: "Lateral direita", cm: comprimento },
  ];
  const contornoProtetor = 2 * (comprimento + largura);
  // A saia cobre três lados (o quarto fica na parede); da altura do estrado até o chão.
  const contornoSaia = comprimento + 2 * largura;

  return {
    colchao: `${comprimento} × ${largura} × ${cm(altura)}`,
    lencol: { ...lencol, texto: `Lençol com elástico para colchão de ${comprimento} × ${largura} cm (tecido de ${lencol.comprimento} × ${cm(lencol.largura)})` },
    protetor: {
      contorno: contornoProtetor,
      altura: ALTURA_PROTETOR,
      partes,
      texto: `Protetor com ${cm(contornoProtetor)} de contorno e ${cm(ALTURA_PROTETOR)} de altura`,
    },
    saia: { contorno: contornoSaia, altura: alturaEstrado, texto: `Saia com ${cm(contornoSaia)} de contorno (3 lados) e ${cm(alturaEstrado)} de altura` },
    avisos: [
      "Para o sono seguro, a Sociedade Brasileira de Pediatria orienta deixar o berço livre de protetores, travesseiros e mantas soltas enquanto o bebê dorme.",
    ],
  };
}

export type Estacao = "verao" | "meia-estacao" | "inverno";

export type EntradaEnxoval = { estacao: Estacao; lavagensPorSemana: number };

export type ItemEnxoval = { chave: string; nome: string; quantidade: number; href: string; motivo: string };

export type ResultadoEnxoval = { itens: ItemEnxoval[] } | { erro: string };

// Uso por dia e reserva de cada peça; mantas dependem da estação, não da lavagem.
const PECAS = [
  { chave: "fraldasDeBoca", nome: "Fraldas de boca", href: "/enxoval/paninhos/fraldas-de-boca", porDia: 4, reserva: 2, minimo: 6 },
  { chave: "cueiros", nome: "Cueiros", href: "/enxoval/paninhos/cueiros", porDia: 2, reserva: 1, minimo: 4 },
  { chave: "lencois", nome: "Lençóis com elástico", href: "/kit-berco/lencois", porDia: 0.5, reserva: 1, minimo: 3 },
  { chave: "toalhas", nome: "Toalhas com capuz", href: "/enxoval/toalhas", porDia: 0.5, reserva: 1, minimo: 2 },
] as const;

const MANTAS: Record<Estacao, number> = { verao: 2, "meia-estacao": 3, inverno: 4 };

export function calcularEnxoval(entrada: EntradaEnxoval): ResultadoEnxoval {
  const { estacao, lavagensPorSemana } = entrada;
  if (!(estacao in MANTAS)) return { erro: "Escolha a estação em que o bebê nasce." };
  if (!(Number.isInteger(lavagensPorSemana) && lavagensPorSemana >= 1 && lavagensPorSemana <= 7)) {
    return { erro: "Informe quantas vezes por semana a roupa do bebê é lavada (de 1 a 7)." };
  }
  const diasEntreLavagens = 7 / lavagensPorSemana;
  const itens: ItemEnxoval[] = PECAS.map((peca) => ({
    chave: peca.chave,
    nome: peca.nome,
    href: peca.href,
    // Entre uma lavagem e outra (mais o dia de secar) + a reserva; nunca abaixo do mínimo.
    quantidade: Math.max(peca.minimo, Math.ceil(peca.porDia * (diasEntreLavagens + 1)) + peca.reserva),
    motivo: `${String(peca.porDia).replace(".", ",")} por dia, lavando ${lavagensPorSemana}× por semana`,
  }));
  itens.push({
    chave: "mantas",
    nome: "Mantas",
    href: "/enxoval/mantas",
    quantidade: MANTAS[estacao],
    motivo: estacao === "inverno" ? "mais camadas no frio" : estacao === "verao" ? "tecidos leves no calor" : "para dias frescos e quentes",
  });
  return { itens };
}

// Estação do nascimento pelo mês (hemisfério sul).
export function estacaoDoMes(mes: number): Estacao {
  if (mes === 12 || mes <= 2) return "verao";
  if (mes >= 6 && mes <= 8) return "inverno";
  return "meia-estacao";
}

// Texto para mandar no WhatsApp ("Quero montar este enxoval").
export function listaParaMensagem(medidas: MedidasBerco | null, itens: ItemEnxoval[]): string {
  return [
    "Olá! Fiz a calculadora do enxoval no site do ateliê.",
    ...(medidas ? [`Colchão: ${medidas.colchao}.`, medidas.lencol.texto, medidas.protetor.texto, medidas.saia.texto] : []),
    ...(itens.length ? ["", "Quero montar:", ...itens.map((item) => `• ${item.quantidade} ${item.nome.toLowerCase()}`)] : []),
  ].join("\n");
}
