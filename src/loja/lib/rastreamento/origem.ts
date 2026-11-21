// Da atribuição do visitante (cookie mk_atrib, src/loja/lib/rastreamento/nucleo.ts) para a ficha do lead no ERP:
// de onde a pessoa veio na PRIMEIRA visita (o que trouxe o lead) e no ÚLTIMO toque antes de converter (o que
// fechou), com o canal em português, a campanha, a página de entrada, o dispositivo e os IDs de clique dos anúncios
// (para subir conversões offline no Google Ads e na Meta). Puro: roda no `node --test`.
import { COOKIE, desserializar, type Atribuicao, type Toque } from "./nucleo.ts";

/** O que vai para `details.campaign` do lead (src/lib/erp/core.ts valida campo a campo). */
export type OrigemLead = {
  channel?: string; // "Google Ads", "Busca orgânica (google)", "Direto"…
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  utmId?: string;
  landingPage?: string; // URL da primeira página
  referrer?: string; // https://<site que indicou>
  ad?: string; // título do anúncio (Click to WhatsApp)
  adId?: string;
  device?: string;
  firstVisitAt?: string; // ISO
  // Último toque antes de converter
  lastChannel?: string;
  lastSource?: string;
  lastMedium?: string;
  lastCampaign?: string;
  lastLandingPage?: string;
  lastAt?: string; // ISO
  touches?: string; // quantas visitas com origem identificada
  // IDs de clique (só existem com consentimento de marketing)
  gclid?: string;
  fbclid?: string;
  clickId?: string; // os demais: "msclkid=…; ttclid=…"
  /** Página em que o botão de WhatsApp foi clicado (só no evento da conversa; não vai para a ficha). */
  clickedPage?: string;
};

const PAGOS = new Set(["cpc", "ppc", "paid", "paidsearch", "paid_search", "paid-search", "paidsocial", "paid_social", "paid-social", "ads", "ad", "display", "cpm", "remarketing", "retargeting", "pmax", "shopping"]);
const META = ["facebook", "instagram", "meta", "fb", "ig", "messenger", "audience_network"];
const nomeDoSite = (host: string) => host.replace(/^www\./, "").replace(/^(l|lm|m)\.(facebook|instagram)\./, "$2.").replace(/\.(com|net|org|gov|edu)(\.[a-z]{2})?$|\.[a-z]{2,6}$/, "") || host;

/** Canal em português, para a equipe ler de relance. */
export function canalDoToque(toque: Pick<Toque, "origem" | "meio" | "ids">): string {
  const origem = toque.origem.toLowerCase(), meio = toque.meio.toLowerCase(), ids = toque.ids ?? {};
  const pago = PAGOS.has(meio);
  if (ids.gclid || ids.gbraid || ids.wbraid || ids.dclid || (origem.includes("google") && pago)) return "Google Ads";
  if (META.some((nome) => origem === nome || origem.startsWith(`${nome}.`) || origem.endsWith(`.${nome}.com`)) && (pago || meio === "ctwa")) return "Meta Ads (Instagram/Facebook)";
  if (ids.msclkid || (origem.includes("bing") && pago)) return "Microsoft Ads";
  if (ids.ttclid || (origem.includes("tiktok") && pago)) return "TikTok Ads";
  if (pago) return `Anúncio (${origem})`;
  if (meio === "organic") return `Busca orgânica (${nomeDoSite(origem)})`;
  if (meio === "social") return `Redes sociais (${nomeDoSite(origem)})`;
  if (meio === "ai-assistant") return `Assistente de IA (${nomeDoSite(origem)})`;
  if (meio === "email" || meio === "e-mail" || meio === "newsletter") return "E-mail";
  if (meio === "whatsapp" || origem === "whatsapp") return "WhatsApp";
  if (meio === "referral") return `Outro site (${nomeDoSite(origem)})`;
  if (meio === "(none)" || origem === "(direct)") return "Direto";
  return `${origem} / ${meio}`;
}

/** "Celular / iOS", "Computador / macOS"… a partir do User-Agent (sem guardar o User-Agent inteiro). */
export function dispositivoDe(userAgent: string | null | undefined): string | undefined {
  const ua = userAgent ?? "";
  if (!ua) return undefined;
  const sistema = /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const tipo = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "Tablet" : /Mobi|iPhone|iPod|Android/.test(ua) ? "Celular" : "Computador";
  return sistema ? `${tipo} / ${sistema}` : tipo;
}

const iso = (segundos: number) => new Date(segundos * 1000).toISOString();
const curto = (valor: string | undefined, maximo = 280) => (valor ? valor.slice(0, maximo) : undefined);
const semVazios = <T extends Record<string, unknown>>(objeto: T): T => Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined && valor !== "")) as T;

/** A atribuição do visitante no formato da ficha do lead. `origemSite`: https://www.… (para montar as URLs). */
export function origemDaAtribuicao(atribuicao: Atribuicao | null, opcoes: { origemSite: string; userAgent?: string | null }): OrigemLead | null {
  if (!atribuicao) return null;
  const { primeiro, ultimo } = atribuicao;
  const pagina = (toque: Toque) => `${opcoes.origemSite}${toque.pagina.startsWith("/") ? toque.pagina : `/${toque.pagina}`}`;
  const ids = { ...primeiro.ids, ...ultimo.ids };
  const outros = Object.entries(ids).filter(([chave]) => chave !== "gclid" && chave !== "fbclid").map(([chave, valor]) => `${chave}=${valor}`).join("; ");
  const diferente = ultimo.em !== primeiro.em;
  return semVazios({
    channel: canalDoToque(primeiro),
    utmSource: curto(primeiro.parametros.utm_source ?? (primeiro.origem !== "(direct)" ? primeiro.origem : undefined)),
    utmMedium: curto(primeiro.parametros.utm_medium ?? (primeiro.meio !== "(none)" ? primeiro.meio : undefined)),
    utmCampaign: curto(primeiro.parametros.utm_campaign ?? primeiro.parametros.gad_campaignid),
    utmContent: curto(primeiro.parametros.utm_content),
    utmTerm: curto(primeiro.parametros.utm_term),
    utmId: curto(primeiro.parametros.utm_id),
    landingPage: pagina(primeiro),
    referrer: primeiro.referrer ? `https://${primeiro.referrer}` : undefined,
    device: dispositivoDe(opcoes.userAgent),
    firstVisitAt: iso(primeiro.em),
    lastChannel: diferente ? canalDoToque(ultimo) : undefined,
    lastSource: diferente ? curto(ultimo.parametros.utm_source ?? ultimo.origem) : undefined,
    lastMedium: diferente ? curto(ultimo.parametros.utm_medium ?? ultimo.meio) : undefined,
    lastCampaign: diferente ? curto(ultimo.parametros.utm_campaign ?? ultimo.parametros.gad_campaignid) : undefined,
    lastLandingPage: diferente ? pagina(ultimo) : undefined,
    lastAt: diferente ? iso(ultimo.em) : undefined,
    touches: String(atribuicao.toques),
    gclid: curto(ids.gclid, 500),
    fbclid: curto(ids.fbclid, 500),
    clickId: curto(outros, 500),
  });
}

/** Lê o cookie de atribuição do cabeçalho Cookie da requisição. */
export function origemDaRequisicao(cabecalhos: { get(nome: string): string | null }, origemSite: string): OrigemLead | null {
  const cookies = cabecalhos.get("cookie") ?? "";
  const valor = cookies.split(/;\s*/).map((par) => par.split("=")).find(([nome]) => nome === COOKIE.atribuicao)?.slice(1).join("=");
  return origemDaAtribuicao(desserializar(valor ? decodeURIComponent(valor) : undefined), { origemSite, userAgent: cabecalhos.get("user-agent") });
}

/** Uma linha para notas e eventos: "Google Ads · campanha natal-2026 · entrou por /kit-berco". */
export function resumoDaOrigem(origem: OrigemLead): string {
  const canal = origem.lastChannel ?? origem.channel ?? "Origem não identificada";
  const campanha = origem.lastCampaign ?? origem.utmCampaign;
  const entrada = origem.lastLandingPage ?? origem.landingPage;
  const caminhoDe = (endereco: string | undefined) => { try { return endereco ? new URL(endereco).pathname : ""; } catch { return ""; } };
  const caminho = caminhoDe(entrada), clicou = caminhoDe(origem.clickedPage);
  return [canal, campanha && `campanha ${campanha}`, origem.ad && `anúncio "${origem.ad}"`, caminho && caminho !== "/" && `entrou por ${caminho}`, clicou && clicou !== caminho && `chamou em ${clicou}`].filter(Boolean).join(" · ");
}
