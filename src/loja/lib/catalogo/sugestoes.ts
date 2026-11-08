// Sugestões da busca enquanto se digita (lululemon-animacoes-edicao.md §4): termos com o trecho
// digitado em negrito, peças sugeridas e categorias. Funções puras e sem imports locais: rodam no
// servidor (rota /api/busca/sugestoes), no navegador (negrito dos termos) e no `node --test`.
// A normalização é a mesma da busca da listagem (slugificar em listagem.ts): sem acento e sem
// caixa, e o que não é letra ou número vira espaço ("Kit berço" ≈ "kit berco").

export const MINIMO_CARACTERES = 2;
export const MAXIMO_TERMOS = 6;
export const MAXIMO_PRODUTOS = 4;

export type FonteTermo = "popular" | "categoria" | "atributo" | "produto" | "projeto";
export type TermoIndice = { texto: string; fonte: FonteTermo };

// Resposta da rota /api/busca/sugestoes (o cliente só lê; quem monta é o servidor).
export type ProdutoSugerido = {
  slug: string;
  href: string;
  nome: string; // completo, para o texto alternativo e o rótulo do link
  base: string; // "Kit berço Jardim rosê"
  variacao?: string; // "9 peças" (em cinza)
  preco: string; // já formatado ("R$ 1.490,00")
  foto?: { src: string; alt: string };
  tom: string; // tom do bloco de espera (TomMidia) enquanto não há foto
};
export type EloSugerido = { rotulo: string; href: string };
export type RespostaSugestoes = {
  q: string;
  termos: string[];
  produtos: ProdutoSugerido[];
  categorias: EloSugerido[];
  projetos: EloSugerido[];
  total: number; // peças encontradas para o termo digitado (o "Ver todos")
};

const SEM_ACENTO = /[̀-ͯ]/g;

// Um caractere normalizado: sem acento, minúsculo; o que não é letra/número vira espaço.
function normalizarCaractere(caractere: string): string {
  const base = caractere.normalize("NFD").replace(SEM_ACENTO, "").toLowerCase();
  return /^[a-z0-9]+$/.test(base) ? base : " ";
}

export function normalizarTexto(texto: string): string {
  return Array.from(texto, normalizarCaractere).join("").replace(/\s+/g, " ").trim();
}

export function palavras(texto: string): string[] {
  const normalizado = normalizarTexto(texto);
  return normalizado ? normalizado.split(" ") : [];
}

const PESO_FONTE: Record<FonteTermo, number> = { popular: 30, categoria: 20, atributo: 12, projeto: 6, produto: 0 };

// Pontua um texto para a consulta; -1 quando não casa. Casa quando CADA palavra digitada é o começo
// de uma palavra diferente do texto ("kit ber" → "kit berço"), em qualquer ordem. Ganha mais o texto
// que começa pela consulta, o que tem menos palavras e o mais curto.
export function pontuar(texto: string, consulta: string): number {
  const doTexto = palavras(texto);
  const daConsulta = palavras(consulta);
  if (daConsulta.length === 0 || doTexto.length === 0) return -1;
  const usadas = new Set<number>();
  for (const palavra of daConsulta) {
    const indice = doTexto.findIndex((candidata, posicao) => !usadas.has(posicao) && candidata.startsWith(palavra));
    if (indice === -1) return -1;
    usadas.add(indice);
  }
  let pontos = 100;
  if (doTexto.join(" ").startsWith(daConsulta.join(" "))) pontos += 50;
  else if (usadas.has(0)) pontos += 20;
  pontos -= doTexto.length * 3;
  pontos -= doTexto.join(" ").length * 0.2;
  return pontos;
}

// Até `limite` termos, sem repetir (pela forma normalizada), do mais relevante para o menos.
export function sugerirTermos(indice: TermoIndice[], consulta: string, limite = MAXIMO_TERMOS): string[] {
  if (normalizarTexto(consulta).length < MINIMO_CARACTERES) return [];
  const vistos = new Set<string>();
  const pontuados: Array<{ texto: string; pontos: number; ordem: number }> = [];
  indice.forEach((termo, ordem) => {
    const chave = normalizarTexto(termo.texto);
    if (!chave || vistos.has(chave)) return;
    const pontos = pontuar(termo.texto, consulta);
    if (pontos < 0) return;
    vistos.add(chave);
    pontuados.push({ texto: termo.texto, pontos: pontos + PESO_FONTE[termo.fonte], ordem });
  });
  return pontuados
    .sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem)
    .slice(0, limite)
    .map((termo) => termo.texto);
}

// Ordena as peças que já casaram com a consulta: nome que casa palavra a palavra primeiro, depois
// os destaques (mais vendidos) e a ordem do catálogo. Uma peça por família de cores (os "irmãos"),
// a não ser que a consulta peça a cor: "verde" mostra o Jardim verde-sálvia, não o rosê.
export function ordenarProdutos<T extends { slug: string; nome: string; familia?: string }>(
  itens: T[],
  consulta: string,
  { destaques = [], limite = MAXIMO_PRODUTOS }: { destaques?: string[]; limite?: number } = {},
): T[] {
  const pontuados = itens.map((item, ordem) => {
    const pontosNome = pontuar(item.nome, consulta);
    const destaque = destaques.indexOf(item.slug);
    return { item, ordem, pontos: (pontosNome < 0 ? 0 : 200 + pontosNome) + (destaque === -1 ? 0 : 40 - destaque) };
  });
  pontuados.sort((a, b) => b.pontos - a.pontos || a.ordem - b.ordem);
  const familias = new Set<string>();
  const saida: T[] = [];
  for (const { item } of pontuados) {
    if (item.familia) {
      if (familias.has(item.familia)) continue;
      familias.add(item.familia);
    }
    saida.push(item);
    if (saida.length === limite) break;
  }
  return saida;
}

export type Trecho = { texto: string; destaque: boolean };

// Divide o texto em trechos com o que foi digitado em destaque (negrito): cada palavra da consulta
// marca o começo de uma palavra do texto, comparando sem acento e sem caixa ("berco" em "kit berço"
// → "kit **berço**"; "ber" → "kit **ber**ço"). O texto original (com acentos) é preservado.
export function destacar(texto: string, consulta: string): Trecho[] {
  const caracteres = Array.from(texto);
  const normalizados = caracteres.map(normalizarCaractere);
  // Posição de cada caractere original na string normalizada (um caractere pode virar vários).
  const inicio: number[] = [];
  let corrido = "";
  for (const parte of normalizados) {
    inicio.push(corrido.length);
    corrido += parte;
  }
  const marcado = new Array<boolean>(caracteres.length).fill(false);
  for (const palavra of palavras(consulta)) {
    let busca = 0;
    while (busca <= corrido.length) {
      const achado = corrido.indexOf(palavra, busca);
      if (achado === -1) break;
      const comecoDePalavra = achado === 0 || corrido[achado - 1] === " ";
      const primeiro = inicio.indexOf(achado);
      if (comecoDePalavra && primeiro !== -1 && !marcado[primeiro]) {
        const fim = achado + palavra.length;
        for (let i = primeiro; i < caracteres.length && inicio[i] < fim; i++) marcado[i] = true;
        break;
      }
      busca = achado + 1;
    }
  }
  const trechos: Trecho[] = [];
  caracteres.forEach((caractere, indice) => {
    const ultimo = trechos.at(-1);
    if (ultimo && ultimo.destaque === marcado[indice]) ultimo.texto += caractere;
    else trechos.push({ texto: caractere, destaque: marcado[indice] });
  });
  return trechos;
}
