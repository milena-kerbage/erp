// Regras das avaliações de produto da loja, sem dependências: o formulário (navegador), a API da
// loja, o ERP (moderação) e os testes usam a mesma validação e os mesmos limites.
// A loja é um catálogo com pedido pelo WhatsApp (não há conta de cliente nem compra no site): a
// avaliação não é "compra verificada", por isso tudo entra como "pendente" e só aparece depois da
// moderação do ateliê.

export const LIMITES_AVALIACAO = {
  titulo: 80,
  textoMinimo: 20,
  textoMaximo: 2000,
  nome: 40,
  cidade: 60,
  fotos: 4,
  /** Por foto, antes da recompressão (3 MiB, o mesmo limite dos anexos do ERP). */
  fotoBytes: 3 * 1024 * 1024,
  /** Requisição inteira (4 fotos de 3 MiB + campos), em bytes. */
  requisicaoBytes: 13 * 1024 * 1024,
  /** Lado maior da foto publicada e da miniatura, em pixels. */
  ladoGrande: 1600,
  ladoMini: 400,
  motivo: 500,
  resposta: 1000,
  busca: 80,
  /** Preenchimento mais rápido que isto é tratado como robô. */
  tempoMinimoMs: 4000,
  /** Avaliações aceitas por IP na janela. */
  porIp: 3,
  janelaIpMs: 60 * 60 * 1000,
  porPagina: 6,
} as const;

export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"] as const;
export type TipoFoto = (typeof TIPOS_FOTO)[number];

export const PARA_QUEM = { menina: "Menina", menino: "Menino", surpresa: "Surpresa" } as const;
export type ParaQuem = keyof typeof PARA_QUEM;

export const ORDENS_AVALIACAO = {
  recentes: "Mais recentes",
  maior: "Maior nota",
  menor: "Menor nota",
  fotos: "Com fotos primeiro",
} as const;
export type OrdemAvaliacao = keyof typeof ORDENS_AVALIACAO;

export const STATUS_AVALIACAO = { pendente: "Pendente", aprovada: "Aprovada", recusada: "Recusada" } as const;
export type StatusAvaliacao = keyof typeof STATUS_AVALIACAO;

export const MENSAGEM_ENVIADA = "Obrigado! Sua avaliação será publicada depois de uma revisão do ateliê.";

export type CampoAvaliacao = "produto" | "nota" | "titulo" | "texto" | "nome" | "cidade" | "paraQuem" | "consentimento" | "fotos";
export type ErrosAvaliacao = Partial<Record<CampoAvaliacao, string>>;

export type DadosAvaliacao = {
  produto: string;
  nota: number;
  titulo: string;
  texto: string;
  nome: string;
  cidade: string;
  paraQuem: ParaQuem | "";
};

// Foto publicada: as duas versões saem da mesma rota, por tamanho.
export type FotoAvaliacao = { id: string; largura: number; altura: number };

export type AvaliacaoPublica = {
  id: string;
  nota: number;
  titulo: string;
  texto: string;
  nome: string;
  cidade: string;
  paraQuem: ParaQuem | "";
  criadaEm: string;
  fotos: FotoAvaliacao[];
  resposta: { texto: string; em: string } | null;
};

export type ResumoAvaliacoes = {
  total: number;
  media: number;
  porNota: Record<"1" | "2" | "3" | "4" | "5", number>;
  comFotos: number;
  paraQuem: Record<ParaQuem, number>;
};

export type RespostaAvaliacoes = {
  avaliacoes: AvaliacaoPublica[];
  /** Total com os filtros aplicados (o resumo é sempre do produto inteiro). */
  total: number;
  pagina: { offset: number; limite: number; temMais: boolean };
  resumo: ResumoAvaliacoes;
};

export type FiltrosAvaliacao = {
  ordem: OrdemAvaliacao;
  notas: number[];
  comFotos: boolean;
  paraQuem: ParaQuem[];
  busca: string;
  offset: number;
  limite: number;
};

export const RESUMO_VAZIO: ResumoAvaliacoes = {
  total: 0,
  media: 0,
  porNota: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
  comFotos: 0,
  paraQuem: { menina: 0, menino: 0, surpresa: 0 },
};

// Controle (exceto quebra de linha e tabulação), caracteres invisíveis de direção e o "zero width".
const INVISIVEIS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g;
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|xyz|info|shop|store|link|site|online)\b)/i;
const CIDADE = /^[\p{L}\p{M}' .,()-]+(\/[A-Za-z]{2})?$/u;

/** Texto de uma linha: sem controles, espaços colapsados. */
export function limparLinha(valor: unknown): string {
  return typeof valor === "string" ? valor.replace(INVISIVEIS, "").replace(/\s+/g, " ").trim() : "";
}

/** Texto longo: preserva parágrafos (no máximo uma linha em branco seguida). */
export function limparTexto(valor: unknown): string {
  if (typeof valor !== "string") return "";
  return valor
    .replace(/\r\n?/g, "\n")
    .replace(INVISIVEIS, "")
    .split("\n")
    .map((linha) => linha.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Minúsculas e sem acentos: a busca encontra "bebe" em "bebê" no SQLite e no PostgreSQL. */
export function normalizarBusca(valor: string): string {
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Slug do catálogo (a existência é conferida por quem chama). */
export function slugValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.length <= 160 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(valor);
}

const comprimento = (texto: string) => [...texto].length;

/**
 * Valida os campos do formulário. Devolve os dados limpos ou os erros por campo, com mensagens
 * prontas para mostrar ao lado de cada campo.
 */
export function validarAvaliacao(
  campos: Record<string, unknown>,
): { ok: true; dados: DadosAvaliacao } | { ok: false; erros: ErrosAvaliacao } {
  const erros: ErrosAvaliacao = {};
  const produto = typeof campos.produto === "string" ? campos.produto.trim() : "";
  if (!slugValido(produto)) erros.produto = "Produto inválido.";

  const nota = Number(campos.nota);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) erros.nota = "Escolha uma nota de 1 a 5 estrelas.";

  const titulo = limparLinha(campos.titulo);
  if (!titulo) erros.titulo = "Dê um título para a sua avaliação.";
  else if (comprimento(titulo) > LIMITES_AVALIACAO.titulo) erros.titulo = `Use no máximo ${LIMITES_AVALIACAO.titulo} caracteres.`;
  else if (LINK.test(titulo)) erros.titulo = "Não inclua links na avaliação.";

  const texto = limparTexto(campos.texto);
  const tamanhoTexto = comprimento(texto);
  if (tamanhoTexto < LIMITES_AVALIACAO.textoMinimo) erros.texto = `Conte um pouco mais: escreva pelo menos ${LIMITES_AVALIACAO.textoMinimo} caracteres.`;
  else if (tamanhoTexto > LIMITES_AVALIACAO.textoMaximo) erros.texto = `Use no máximo ${LIMITES_AVALIACAO.textoMaximo} caracteres.`;
  else if (LINK.test(texto)) erros.texto = "Não inclua links na avaliação.";

  const nome = limparLinha(campos.nome);
  if (!nome) erros.nome = "Informe o nome que vai aparecer na avaliação.";
  else if (comprimento(nome) > LIMITES_AVALIACAO.nome) erros.nome = `Use no máximo ${LIMITES_AVALIACAO.nome} caracteres.`;
  else if (LINK.test(nome) || /[@<>]/.test(nome)) erros.nome = "Use só o seu nome, sem e-mail ou link.";

  const cidade = limparLinha(campos.cidade);
  if (cidade && (comprimento(cidade) > LIMITES_AVALIACAO.cidade || !CIDADE.test(cidade))) erros.cidade = "Informe a cidade e a UF, como Fortaleza/CE.";

  const paraQuemBruto = typeof campos.paraQuem === "string" ? campos.paraQuem.trim() : "";
  if (paraQuemBruto && !(paraQuemBruto in PARA_QUEM)) erros.paraQuem = "Escolha menina, menino ou surpresa.";

  const consentimento = campos.consentimento === true || campos.consentimento === "true" || campos.consentimento === "sim" || campos.consentimento === "on";
  if (!consentimento) erros.consentimento = "Para enviar, autorize a publicação da avaliação.";

  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, dados: { produto, nota, titulo, texto, nome, cidade, paraQuem: paraQuemBruto as ParaQuem | "" } };
}

/** Confere o arquivo escolhido no navegador (o servidor confere de novo pelos bytes). */
export function problemaDaFoto(arquivo: { size: number; type: string; name?: string }): string | null {
  const nome = arquivo.name ? `“${arquivo.name}”` : "A foto";
  if (!TIPOS_FOTO.includes(arquivo.type as TipoFoto)) return `${nome} não é JPEG, PNG ou WebP.`;
  if (arquivo.size > LIMITES_AVALIACAO.fotoBytes) return `${nome} tem mais de 3 MB. Escolha uma foto menor.`;
  if (arquivo.size === 0) return `${nome} está vazia.`;
  return null;
}

/** Filtros vindos da URL (?ordem=&nota=5,4&fotos=1&para=menina&busca=&offset=&limite=). */
export function filtrosDaUrl(parametros: URLSearchParams): FiltrosAvaliacao {
  const ordem = parametros.get("ordem") ?? "recentes";
  const notas = (parametros.get("nota") ?? "")
    .split(",")
    .map(Number)
    .filter((nota) => Number.isInteger(nota) && nota >= 1 && nota <= 5);
  const paraQuem = (parametros.get("para") ?? "").split(",").filter((valor): valor is ParaQuem => valor in PARA_QUEM);
  const offset = Number(parametros.get("offset") ?? 0);
  const limite = Number(parametros.get("limite") ?? LIMITES_AVALIACAO.porPagina);
  return {
    ordem: ordem in ORDENS_AVALIACAO ? (ordem as OrdemAvaliacao) : "recentes",
    notas: [...new Set(notas)],
    comFotos: parametros.get("fotos") === "1",
    paraQuem: [...new Set(paraQuem)],
    busca: limparLinha(parametros.get("busca")).slice(0, LIMITES_AVALIACAO.busca),
    offset: Number.isSafeInteger(offset) && offset >= 0 && offset <= 100_000 ? offset : 0,
    limite: Number.isSafeInteger(limite) && limite >= 1 && limite <= 24 ? limite : LIMITES_AVALIACAO.porPagina,
  };
}

/** Parâmetros de URL dos filtros (o inverso de filtrosDaUrl), só com o que difere do padrão. */
export function parametrosDosFiltros(produto: string, filtros: Partial<FiltrosAvaliacao>): URLSearchParams {
  const parametros = new URLSearchParams({ produto });
  if (filtros.ordem && filtros.ordem !== "recentes") parametros.set("ordem", filtros.ordem);
  if (filtros.notas?.length) parametros.set("nota", filtros.notas.join(","));
  if (filtros.comFotos) parametros.set("fotos", "1");
  if (filtros.paraQuem?.length) parametros.set("para", filtros.paraQuem.join(","));
  if (filtros.busca?.trim()) parametros.set("busca", filtros.busca.trim());
  if (filtros.offset) parametros.set("offset", String(filtros.offset));
  if (filtros.limite && filtros.limite !== LIMITES_AVALIACAO.porPagina) parametros.set("limite", String(filtros.limite));
  return parametros;
}

/** "4,7" */
export function formatarNota(nota: number): string {
  return nota.toFixed(1).replace(".", ",");
}

/** URL pública da foto (host da loja: /api/* é reescrito para /loja/api/*). */
export function urlFotoAvaliacao(id: string, tamanho: "mini" | "grande"): string {
  return `/api/avaliacoes/foto/${encodeURIComponent(id)}?tamanho=${tamanho}`;
}
