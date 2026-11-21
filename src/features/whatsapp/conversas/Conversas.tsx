"use client";

// Conversas do WhatsApp no padrão do ERP da Le Ange (inbox-screen.tsx), ocupando o painel do ERP de ponta a ponta:
// lista | conversa | ficha da oportunidade.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatsCircleIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Lightbox } from "@/components/ui/Lightbox";
import { TextField } from "@/components/ui/TextField";
import { useLeads } from "@/features/leads/store";
import { useFunnels, useTeam, useWorkspace } from "@/features/settings/store";
import { normalizeWhatsAppPhone } from "../client";
import { Notice } from "../components/shared";
import type { WhatsAppMessage } from "../types";
import { urlDaMidia } from "./Bolha";
import { Conversa } from "./Conversa";
import { ColunaConversa, Raiz } from "./estilos";
import { Ficha } from "./Ficha";
import { textoDaMensagem } from "./formato";
import { Lista } from "./Lista";
import { useConversas, type Aba } from "./useConversas";

const CHAVE_FICHA = "erp:whatsapp:ficha", CHAVE_LISTA = "erp:whatsapp:lista";
const ler = (chave: string) => { try { return localStorage.getItem(chave); } catch { return null; } };
const gravar = (chave: string, valor: string) => { try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ } };

export function Conversas({ telefoneInicial, telefoneInvalido, abaInicial }: { telefoneInicial?: string; telefoneInvalido?: boolean; abaInicial?: Aba }) {
  const estado = useConversas(telefoneInicial, { aba: abaInicial });
  const { selecionado, setSelecionado, conversaSelecionada, fio, erro, setErro, leadId } = estado;
  const equipe = useTeam();
  const { currentUser: eu } = useWorkspace();
  const { funnels: funis, findFunnel } = useFunnels();
  const { leads, details, hydrate, moveLead } = useLeads();
  const [painel, setPainel] = useState(false);
  const [listaFechada, setListaFechada] = useState(false);
  const [nova, setNova] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [fotoFicha, setFotoFicha] = useState<WhatsAppMessage | null>(null);
  const digitos = telefone.replace(/\D/g, "");
  const normalizado = normalizeWhatsAppPhone(digitos.length && !digitos.startsWith("55") && digitos.length <= 11 ? `55${digitos}` : telefone);

  // A ficha abre sozinha nas telas largas (como na Le Ange) e lembra a última escolha; a lista recolhida também.
  // Abaixo de 1280px a ficha cobre a conversa: lá ela só abre a pedido, e fecha ao trocar de conversa.
  const larga = () => window.innerWidth > 1280;
  useEffect(() => {
    setPainel(larga() && ler(CHAVE_FICHA) !== "0");
    setListaFechada(ler(CHAVE_LISTA) === "1");
  }, []);
  useEffect(() => { if (!larga()) setPainel(false); }, [selecionado]);
  const alternarPainel = useCallback(() => setPainel((aberto) => { if (larga()) gravar(CHAVE_FICHA, aberto ? "0" : "1"); return !aberto; }), []);
  const alternarLista = useCallback(() => setListaFechada((fechada) => { gravar(CHAVE_LISTA, fechada ? "0" : "1"); return !fechada; }), []);

  // A oportunidade do CRM com o telefone da conversa: a ficha ao lado e a etapa presa no topo da conversa.
  useEffect(() => { if (leadId) void hydrate(leadId); }, [leadId, hydrate]);
  const lead = useMemo(() => (leadId ? leads.find((item) => item.id === leadId) : undefined), [leadId, leads]);
  const detalhes = lead ? details[lead.id] : undefined;
  const funil = lead ? findFunnel(lead.funnelId) : undefined;

  const abrir = () => { if (normalizado) { setSelecionado(normalizado); setNova(false); setTelefone(""); } };
  const mostrarFicha = painel && Boolean(selecionado && conversaSelecionada);

  return (
    <Raiz data-flush data-open={selecionado ? "" : undefined} data-panel={mostrarFicha || undefined} data-list={listaFechada && selecionado ? "closed" : undefined}>
      <Lista estado={estado} equipe={equipe} eu={eu.id} aoNovaConversa={() => setNova(true)} trilho={listaFechada && Boolean(selecionado)} aoExpandir={alternarLista} />
      {selecionado ? (
        <Conversa key={selecionado} estado={estado} phone={selecionado} conversa={conversaSelecionada} fio={fio} equipe={equipe} eu={eu}
          lead={lead} funil={funil} aoMoverEtapa={(etapa) => lead && etapa !== lead.stage && void moveLead(lead.id, etapa, eu.name)}
          painel={painel} aoAlternarPainel={alternarPainel} listaFechada={listaFechada} aoAlternarLista={alternarLista} />
      ) : (
        <ColunaConversa data-pane="conversa" aria-label="Conversa">
          <div className="threadEmpty"><EmptyState icon={<ChatsCircleIcon size={24} />} title="Selecione uma conversa" description="As mensagens do WhatsApp do ateliê aparecem aqui. Com o botão direito numa conversa você fixa, favorita, assume ou resolve." /></div>
        </ColunaConversa>
      )}
      {mostrarFicha && conversaSelecionada && (
        <Ficha key={`ficha-${selecionado}`} estado={estado} conversa={conversaSelecionada} mensagens={fio?.messages ?? []} equipe={equipe} eu={eu}
          lead={lead} detalhes={detalhes} funil={funil} funis={funis} aoFechar={alternarPainel} aoAbrirFoto={setFotoFicha} />
      )}
      <Lightbox images={fotoFicha ? [{ url: urlDaMidia(fotoFicha), name: textoDaMensagem(fotoFicha) || "Foto" }] : []} index={fotoFicha ? 0 : null} onClose={() => setFotoFicha(null)} />
      {(erro || telefoneInvalido) && (
        <div role="alert" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 60, maxWidth: "min(32rem, 92vw)" }}>
          <Notice $error style={{ display: "flex", gap: 8, alignItems: "center", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}>
            <span style={{ flex: 1 }}>{erro || "O telefone do link não é válido."}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => setErro("")} style={{ border: 0, background: "none", cursor: "pointer", color: "inherit", display: "grid" }}><XIcon size={14} /></button>
          </Notice>
        </div>
      )}
      <Dialog open={nova} onClose={() => setNova(false)} title="Nova conversa" description="Abra a conversa com qualquer número. Se a pessoa não escreveu nas últimas 24 horas, o primeiro envio precisa ser um modelo aprovado." width="26rem"
        footer={<><Button variant="ghost" onClick={() => setNova(false)}>Cancelar</Button><Button disabled={!normalizado} onClick={abrir}>Abrir conversa</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); abrir(); }}>
          <TextField label="Telefone com DDD" inputMode="tel" placeholder="(85) 99999-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} hint={normalizado ? `Vai abrir +${normalizado}` : "Com DDD; o +55 entra sozinho."} />
        </form>
      </Dialog>
    </Raiz>
  );
}
