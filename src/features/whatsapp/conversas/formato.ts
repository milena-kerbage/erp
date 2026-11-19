// Formatos de data e texto das conversas (padrão do ERP da Le Ange).
import type { WhatsAppConversation, WhatsAppMessage } from "../types";

const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const diaMes = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const diaLongo = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });
const diaLongoAno = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

const inicioDoDia = (data: Date) => new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
const DIA = 86_400_000;

/** Hora da lista: HH:mm hoje, "Ontem", dia da semana nesta semana, dd/mm antes disso. */
export function horaDaLista(iso: string | null | undefined) {
  if (!iso) return "";
  const data = new Date(iso), hoje = inicioDoDia(new Date()), dia = inicioDoDia(data);
  if (dia === hoje) return hora.format(data);
  if (dia === hoje - DIA) return "Ontem";
  if (hoje - dia < 6 * DIA) return diaSemana.format(data).replace(/^./, (letra) => letra.toUpperCase()).replace("-feira", "");
  return diaMes.format(data);
}
export const horaDaMensagem = (iso: string) => hora.format(new Date(iso));
/** Separador de dia: "Hoje", "Ontem", "14 de setembro" (com ano se for outro). */
export function rotuloDoDia(iso: string) {
  const data = new Date(iso), hoje = inicioDoDia(new Date()), dia = inicioDoDia(data);
  if (dia === hoje) return "Hoje";
  if (dia === hoje - DIA) return "Ontem";
  return data.getFullYear() === new Date().getFullYear() ? diaLongo.format(data) : diaLongoAno.format(data);
}
export const mesmoDia = (a: string, b: string) => inicioDoDia(new Date(a)) === inicioDoDia(new Date(b));

/** +55 85 99999-0000 */
export function telefoneFormatado(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return `+55 ${d.slice(2, 4)} ${d.length === 13 ? `${d.slice(4, 9)}-${d.slice(9)}` : `${d.slice(4, 8)}-${d.slice(8)}`}`;
  return `+${d}`;
}
export const nomeDaConversa = (c: Pick<WhatsAppConversation, "name" | "phone">) => (!c.name || c.name === c.phone ? telefoneFormatado(c.phone) : c.name);

export function janelaAberta(c?: Pick<WhatsAppConversation, "serviceWindowExpiresAt"> | null) {
  const fim = Date.parse(c?.serviceWindowExpiresAt ?? "");
  return Number.isFinite(fim) && fim > Date.now();
}

const ROTULOS_TIPO: Record<string, string> = { image: "Foto", video: "Vídeo", audio: "Áudio", document: "Documento", sticker: "Figurinha", location: "Localização", contacts: "Contato", template: "Modelo" };
/** Texto exibível de uma mensagem ([image] vira "Foto"; modelo sem o prefixo técnico). */
export function textoDaMensagem(m: Pick<WhatsAppMessage, "type" | "text" | "filename">) {
  const texto = m.text?.trim() ?? "";
  if (m.type === "template") return texto.replace(/^\[Template: [^\]]+\]\s*/, "") || "Modelo";
  if (/^\[[a-z_]+\]$/.test(texto)) return m.type === "document" && m.filename ? m.filename : ROTULOS_TIPO[m.type] ?? "Mensagem";
  return texto;
}
export const rotuloDoTipo = (tipo: string) => ROTULOS_TIPO[tipo] ?? "";
/** Prévia da lista: sem marcadores de formatação do WhatsApp. */
export const textoSimples = (texto: string) => texto.replace(/[*_~`]/g, "").replace(/\s+/g, " ").trim();

export function tamanhoArquivo(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
export const duracao = (segundos: number) => `${Math.floor(segundos / 60)}:${String(Math.floor(segundos % 60)).padStart(2, "0")}`;

/** Ranking de status: nunca volta (sent → delivered → read). */
const ORDEM: Record<string, number> = { sending: 0, unknown: 0, accepted: 2, sent: 3, failed: 4, delivered: 5, read: 6, received: 0 };
export const statusMaisNovo = (a: string, b: string) => ((ORDEM[b] ?? 0) > (ORDEM[a] ?? 0) ? b : a);
