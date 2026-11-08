// Atribuição de marketing e identificação de visitante/sessão.
// Sem dependências: roda no proxy do Next (Node) e direto no `node --test`.
// Regras e fontes em rastreamento.md. Mudou o formato do cookie? Suba VERSAO_ATRIBUICAO.

export const VERSAO_ATRIBUICAO = 1;
export const DOMINIO_RAIZ = "ateliemilenakerbage.com.br";

export const COOKIE = {
  consentimento: "mk_consentimento", // gravado pelo banner de cookies (e registrado no backend)
  atribuicao: "mk_atrib",
  visitante: "mk_vid",
  sessao: "mk_sid",
  metaClique: "_fbc",
  metaNavegador: "_fbp",
} as const;

const DIA = 86_400;
export const VALIDADE = {
  atribuicao: 90 * DIA, // janela de conversão das plataformas (Google/Meta: 90 dias)
  visitante: 400 * DIA, // teto do Chrome para cookies
  sessao: 30 * 60, // 30 min sem atividade encerra a sessão (mesma regra do GA4)
  meta: 90 * DIA, // _fbc/_fbp: 90 dias (doc oficial da Meta)
} as const;

// Campanha: identifica a campanha, não a pessoa.
export const PARAMETROS_CAMPANHA = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",
  "gad_source",
  "gad_campaignid",
  "mc_cid",
] as const;

// IDs de clique: identificam o clique/pessoa na plataforma de anúncio → só com consentimento de marketing.
// Valor = tamanho máximo aceito (ttclid pode ter até 1.000 caracteres e não pode ser truncado).
export const IDS_DE_CLIQUE: Record<string, number> = {
  gclid: 500,
  gbraid: 500,
  wbraid: 500,
  dclid: 500, // Google Ads / CM360
  fbclid: 500, // Meta
  msclkid: 100, // Microsoft Ads
  ttclid: 1000, // TikTok
  li_fat_id: 200, // LinkedIn
  epik: 500, // Pinterest
  twclid: 200, // X
  ScCid: 200, // Snapchat
  rdt_cid: 200, // Reddit
  mc_eid: 100, // Mailchimp (ID do contato)
};

const MAX_CAMPANHA = 200;
const LIMITE_COOKIE = 3000; // bytes do valor; navegadores aceitam ~4.096 por cookie com o nome

// Origem/meio quando só há o ID de clique (sem UTM). UTM, quando existe, sempre vence.
const ORIGEM_POR_ID: Record<string, [string, string]> = {
  gclid: ["google", "cpc"],
  gbraid: ["google", "cpc"],
  wbraid: ["google", "cpc"],
  dclid: ["google", "display"],
  msclkid: ["bing", "cpc"],
  ttclid: ["tiktok", "cpc"],
  li_fat_id: ["linkedin", "cpc"],
  epik: ["pinterest", "cpc"],
  twclid: ["x", "cpc"],
  ScCid: ["snapchat", "cpc"],
  rdt_cid: ["reddit", "cpc"],
  fbclid: ["facebook", "social"], // fbclid também aparece em links orgânicos do Facebook
  mc_eid: ["mailchimp", "email"],
};

const BUSCADORES = [
  "google.",
  "bing.com",
  "duckduckgo.com",
  "search.yahoo.",
  "yahoo.com",
  "ecosia.org",
  "yandex.",
  "search.brave.com",
  "baidu.com",
];
const REDES_SOCIAIS = [
  "facebook.com",
  "instagram.com",
  "t.co",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "lnkd.in",
  "pinterest.",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "whatsapp.com",
  "wa.me",
  "threads.net",
  "reddit.com",
  "kwai.",
];
const ASSISTENTES_IA = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "meta.ai",
  "deepseek.com",
  "grok.com",
];
// Voltar do pagamento ou do login não é "nova visita": não pode roubar a atribuição.
const REFERRERS_IGNORADOS = [
  "mercadopago.",
  "mercadolivre.",
  "pagar.me",
  "stripe.com",
  "paypal.com",
  "pagseguro.",
  "pagbank.",
  "cielo.com.br",
  "getnet.com.br",
  "adyen.com",
  "accounts.google.com",
  "appleid.apple.com",
];

const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pagespeed|monitor/i;

export type Toque = {
  em: number; // epoch em segundos
  origem: string;
  meio: string;
  parametros: Record<string, string>; // utm_*, gad_*, mc_cid

  ids: Record<string, string>;
  pagina: string; // só o caminho: query pode carregar dado pessoal
  referrer?: string; // só o hostname
};

export type Atribuicao = { v: number; primeiro: Toque; ultimo: Toque; toques: number };

export type Consentimento = { decidido: boolean; analitico: boolean; marketing: boolean };

export type DefinicaoCookie = { nome: string; valor: string; maxAge?: number; httpOnly: boolean };

export type EntradaRequisicao = {
  url: string;
  referer: string | null;
  userAgent: string;
  cookies: Record<string, string | undefined>;
  agoraMs: number;
  gerarId: () => string;
};

// ---------- consentimento ----------

// Formato gravado pelo banner: "v1.a1.m0" (a = analítico, m = marketing). Ausente = ainda não decidiu.
export function lerConsentimento(valor: string | undefined): Consentimento {
  const partes = new Set((valor ?? "").split("."));
  if (!partes.has("v1")) return { decidido: false, analitico: false, marketing: false };
  return { decidido: true, analitico: partes.has("a1"), marketing: partes.has("m1") };
}

export function escreverConsentimento(c: { analitico: boolean; marketing: boolean }): string {
  return `v1.a${c.analitico ? 1 : 0}.m${c.marketing ? 1 : 0}`;
}

// ---------- toque de atribuição ----------

export function extrairToque(url: URL, referer: string | null, agoraSeg: number): Toque | null {
  const parametros: Record<string, string> = {};
  for (const chave of PARAMETROS_CAMPANHA) {
    const valor = limpar(url.searchParams.get(chave), MAX_CAMPANHA);
    if (valor) parametros[chave] = valor;
  }
  const ids: Record<string, string> = {};
  for (const [chave, maximo] of Object.entries(IDS_DE_CLIQUE)) {
    const bruto = url.searchParams.get(chave) ?? url.searchParams.get(chave.toLowerCase());
    if (bruto && bruto.length <= maximo) {
      const valor = limpar(bruto, maximo); // nunca altera maiúsculas: gclid/fbclid diferenciam
      if (valor) ids[chave] = valor;
    }
  }
  const hostReferrer = hostnameExterno(referer, url.hostname);
  const temCampanha = Object.keys(parametros).length > 0 || Object.keys(ids).length > 0;
  const freeListing = url.searchParams.has("srsltid"); // Merchant Center: orgânico do Google

  if (!temCampanha && !freeListing && !hostReferrer) return null; // direto ou navegação interna

  let [origem, meio] = ["(direct)", "(none)"];
  if (parametros.utm_source) {
    [origem, meio] = [parametros.utm_source.toLowerCase(), (parametros.utm_medium ?? "(not set)").toLowerCase()];
  } else if (Object.keys(ids).length > 0) {
    [origem, meio] = ORIGEM_POR_ID[Object.keys(ids)[0]] ?? ["(not set)", "(not set)"];
  } else if (parametros.gad_source) {
    [origem, meio] = ["google", "cpc"];
  } else if (parametros.mc_cid) {
    [origem, meio] = ["mailchimp", "email"];
  } else if (freeListing) {
    [origem, meio] = ["google", "organic"];
  } else if (hostReferrer) {
    [origem, meio] = [hostReferrer, classificarReferrer(hostReferrer)];
  }

  return {
    em: agoraSeg,
    origem,
    meio,
    parametros,
    ids,
    pagina: url.pathname.slice(0, 300),
    ...(hostReferrer ? { referrer: hostReferrer } : {}),
  };
}

export function classificarReferrer(host: string): string {
  if (ASSISTENTES_IA.some((d) => contem(host, d))) return "ai-assistant";
  if (BUSCADORES.some((d) => contem(host, d))) return "organic";
  if (REDES_SOCIAIS.some((d) => contem(host, d))) return "social";
  return "referral";
}

// Primeiro toque nunca muda; último toque = último não-direto (mesma convenção do GA4).
export function mesclar(atual: Atribuicao | null, toque: Toque): Atribuicao {
  if (!atual) return { v: VERSAO_ATRIBUICAO, primeiro: toque, ultimo: toque, toques: 1 };
  return { v: VERSAO_ATRIBUICAO, primeiro: atual.primeiro, ultimo: toque, toques: atual.toques + 1 };
}

export function semIdsDeClique(a: Atribuicao): Atribuicao {
  return { ...a, primeiro: { ...a.primeiro, ids: {} }, ultimo: { ...a.ultimo, ids: {} } };
}

export function serializar(a: Atribuicao): string {
  let atual = a;
  // Redutores em ordem de menor perda até caber no cookie.
  const redutores: Array<(x: Atribuicao) => Atribuicao> = [
    (x) => ({ ...x, primeiro: { ...x.primeiro, ids: {} } }),
    (x) => ({ ...x, primeiro: { ...x.primeiro, parametros: manter(x.primeiro.parametros, ["utm_source", "utm_medium", "utm_campaign"]) } }),
    (x) => ({
      ...x,
      ultimo: {
        ...x.ultimo,
        parametros: manter(x.ultimo.parametros, ["utm_source", "utm_medium", "utm_campaign", "utm_id", "gad_campaignid"]),
      },
    }),
    (x) => ({ ...x, ultimo: { ...x.ultimo, ids: manter(x.ultimo.ids, ["gclid", "gbraid", "wbraid", "fbclid", "msclkid"]) } }),
  ];
  let codificado = codificar(atual);
  for (const reduzir of redutores) {
    if (codificado.length <= LIMITE_COOKIE) break;
    atual = reduzir(atual);
    codificado = codificar(atual);
  }
  if (codificado.length <= LIMITE_COOKIE) return codificado;
  // Último recurso (valores absurdamente longos): compacta tudo. Cabe com folga: ~2.000 bytes no pior caso.
  return codificar({ ...atual, primeiro: compactar(atual.primeiro, false), ultimo: compactar(atual.ultimo, true) });
}

function compactar(t: Toque, manterIds: boolean): Toque {
  const curto = (s: string) => s.slice(0, 80);
  const parametros = Object.fromEntries(
    Object.entries(manter(t.parametros, ["utm_source", "utm_medium", "utm_campaign"])).map(([k, v]) => [k, curto(v)]),
  );
  const ids = manterIds ? manter(t.ids, ["gclid", "fbclid"]) : {};
  return { em: t.em, origem: curto(t.origem), meio: curto(t.meio), parametros, ids, pagina: curto(t.pagina) };
}

export function desserializar(valor: string | undefined): Atribuicao | null {
  if (!valor) return null;
  try {
    const dados = JSON.parse(Buffer.from(valor, "base64url").toString("utf8")) as Atribuicao;
    if (dados?.v !== VERSAO_ATRIBUICAO || !dados.primeiro || !dados.ultimo) return null;
    return dados;
  } catch {
    return null; // cookie adulterado ou de versão antiga: recomeça
  }
}

// ---------- sessão ----------

// mk_sid = "<id>.<inicio_seg>.<ultimo_seg>"
export function renovarSessao(valor: string | undefined, agoraSeg: number, novaCampanha: boolean, gerarId: () => string): string {
  const [id, inicio, ultimo] = (valor ?? "").split(".");
  const expirou = !id || !Number(ultimo) || agoraSeg - Number(ultimo) > VALIDADE.sessao;
  if (expirou || novaCampanha) return `${gerarId()}.${agoraSeg}.${agoraSeg}`;
  return `${id}.${inicio}.${agoraSeg}`;
}

// ---------- plano de cookies da requisição ----------

export function planejarCookies(entrada: EntradaRequisicao): { definir: DefinicaoCookie[]; apagar: string[] } {
  const definir: DefinicaoCookie[] = [];
  const apagar: string[] = [];
  if (BOTS.test(entrada.userAgent)) return { definir, apagar };

  const url = new URL(entrada.url);
  const agoraSeg = Math.floor(entrada.agoraMs / 1000);
  const consentimento = lerConsentimento(entrada.cookies[COOKIE.consentimento]);
  const recusouMarketing = consentimento.decidido && !consentimento.marketing;
  const persistente = consentimento.analitico || consentimento.marketing;

  // Atribuição. Antes da decisão: só na sessão do navegador (o clique não se perde enquanto o
  // visitante decide). Recusou marketing: IDs de clique são descartados.
  let toque = extrairToque(url, entrada.referer, agoraSeg);
  let atribuicao = desserializar(entrada.cookies[COOKIE.atribuicao]);
  if (recusouMarketing) {
    if (toque) toque = { ...toque, ids: {} };
    if (atribuicao) atribuicao = semIdsDeClique(atribuicao);
  }
  if (!atribuicao && !toque) {
    toque = { em: agoraSeg, origem: "(direct)", meio: "(none)", parametros: {}, ids: {}, pagina: url.pathname.slice(0, 300) };
  }
  if (toque) atribuicao = mesclar(atribuicao, toque);
  if (atribuicao) {
    definir.push({
      nome: COOKIE.atribuicao,
      valor: serializar(atribuicao),
      httpOnly: true,
      ...(persistente ? { maxAge: VALIDADE.atribuicao } : {}),
    });
  }

  // Visitante e sessão: só com consentimento analítico.
  if (consentimento.analitico) {
    definir.push({
      nome: COOKIE.visitante,
      valor: entrada.cookies[COOKIE.visitante] || entrada.gerarId(),
      httpOnly: true,
      maxAge: VALIDADE.visitante,
    });
    const novaCampanha = Boolean(toque && toque.meio !== "(none)");
    definir.push({
      nome: COOKIE.sessao,
      valor: renovarSessao(entrada.cookies[COOKIE.sessao], agoraSeg, novaCampanha, entrada.gerarId),
      httpOnly: true,
      maxAge: VALIDADE.sessao,
    });
  } else if (consentimento.decidido) {
    for (const nome of [COOKIE.visitante, COOKIE.sessao]) if (entrada.cookies[nome]) apagar.push(nome);
  }

  // Meta: _fbc/_fbp gravados pelo servidor (escapam do limite de 7 dias do Safari para cookies JS).
  // Legíveis por JS (o Pixel lê). Formato oficial: fb.1.<ms>.<fbclid> / fb.1.<ms>.<aleatório>.
  if (consentimento.marketing) {
    const fbclid = toque?.ids.fbclid;
    const fbcAtual = entrada.cookies[COOKIE.metaClique];
    if (fbclid && !fbcAtual?.endsWith(`.${fbclid}`)) {
      definir.push({ nome: COOKIE.metaClique, valor: `fb.1.${entrada.agoraMs}.${fbclid}`, httpOnly: false, maxAge: VALIDADE.meta });
    }
    if (!entrada.cookies[COOKIE.metaNavegador]) {
      const aleatorio = Math.floor(1e9 + Math.random() * 9e9);
      definir.push({ nome: COOKIE.metaNavegador, valor: `fb.1.${entrada.agoraMs}.${aleatorio}`, httpOnly: false, maxAge: VALIDADE.meta });
    }
  } else if (recusouMarketing) {
    for (const nome of [COOKIE.metaClique, COOKIE.metaNavegador]) if (entrada.cookies[nome]) apagar.push(nome);
  }

  return { definir, apagar };
}

// ---------- utilitários ----------

function limpar(valor: string | null, maximo: number): string | undefined {
  if (!valor) return undefined;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: remover caracteres de controle é o objetivo
  const limpo = valor.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return limpo ? limpo.slice(0, maximo) : undefined;
}

function hostnameExterno(referer: string | null, hostAtual: string): string | undefined {
  if (!referer) return undefined;
  let host: string;
  try {
    host = new URL(referer).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  if (!host || host === hostAtual || host === DOMINIO_RAIZ || host.endsWith(`.${DOMINIO_RAIZ}`)) return undefined;
  if (REFERRERS_IGNORADOS.some((d) => contem(host, d))) return undefined;
  return host;
}

function contem(host: string, dominio: string): boolean {
  if (dominio.endsWith(".")) return host.startsWith(dominio) || host.includes(`.${dominio}`);
  return host === dominio || host.endsWith(`.${dominio}`);
}

function manter(registro: Record<string, string>, chaves: string[]): Record<string, string> {
  return Object.fromEntries(Object.entries(registro).filter(([chave]) => chaves.includes(chave)));
}

function codificar(a: Atribuicao): string {
  return Buffer.from(JSON.stringify(a), "utf8").toString("base64url");
}
