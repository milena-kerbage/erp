"use client";

// A ficha ao lado da conversa, como o contact-panel da Le Ange: é a mesma ficha da oportunidade do CRM (a que já existe na
// tela de Leads: etapa do funil, contato, evento, orçamento, origem, etiquetas, links, campanha e arquivos), com uma aba a
// mais para o que é do WhatsApp (atendimento, etiquetas da conversa, mídia, documentos). Sem oportunidade com este
// telefone, a ficha mostra o contato e cria a oportunidade num clique.
import { useMemo, useState } from "react";
import { ArrowSquareOutIcon, CaretLeftIcon, CopyIcon, ExportIcon, FileTextIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { LeadProfile } from "@/features/leads/components/LeadDetail/LeadProfile";
import type { Funnel } from "@/features/leads/funnels";
import { useLeads } from "@/features/leads/store";
import type { Lead, LeadDetails } from "@/features/leads/types";
import type { Member } from "@/features/settings/types";
import { DeleteContactDialog } from "../components/DeleteContactDialog";
import type { WhatsAppConversation, WhatsAppMessage } from "../types";
import { interna, urlDaMidia } from "./Bolha";
import { ColunaFicha } from "./estilos";
import { horaDaLista, janelaAberta, nomeDaConversa, tamanhoArquivo, telefoneFormatado } from "./formato";
import { ROTULO_SITUACAO } from "./Lista";
import type { useConversas } from "./useConversas";

type Estado = ReturnType<typeof useConversas>;

/** O que é do WhatsApp nesta conversa: atendimento, etiquetas, mídia, documentos e a exclusão do contato. */
function AbaWhatsApp({ estado, conversa, mensagens, equipe, aoAbrirFoto }: { estado: Estado; conversa: WhatsAppConversation; mensagens: WhatsAppMessage[]; equipe: readonly Member[]; aoAbrirFoto: (m: WhatsAppMessage) => void }) {
  const { organizar, etiquetas: sugeridas, removerDaLista } = estado;
  const [nova, setNova] = useState("");
  const [excluir, setExcluir] = useState(false);
  const etiquetas = conversa.labels ?? [];
  const adicionar = (valor: string) => { const limpo = valor.trim().slice(0, 40); if (limpo && !etiquetas.includes(limpo)) void organizar(conversa.phone, { etiquetas: [...etiquetas, limpo] }); setNova(""); };
  const { fotos, documentos, recebidas, enviadas, notas } = useMemo(() => {
    const reais = mensagens.filter((m) => !m.id.startsWith("temp-"));
    return {
      fotos: reais.filter((m) => (m.type === "image" || m.type === "video") && m.hasMedia).slice(-32).reverse(),
      documentos: reais.filter((m) => m.type === "document" && m.hasMedia).slice(-12).reverse(),
      recebidas: reais.filter((m) => m.direction === "inbound").length,
      enviadas: reais.filter((m) => m.direction === "outbound" && !interna(m)).length,
      notas: reais.filter((m) => m.type === "note").length,
    };
  }, [mensagens]);
  const sugestoes = sugeridas.filter((e) => !etiquetas.includes(e) && (!nova || e.toLowerCase().includes(nova.toLowerCase()))).slice(0, 8);
  const dono = conversa.assignee ? equipe.find((membro) => membro.id === conversa.assignee) : undefined;
  const aberta = janelaAberta(conversa);
  const situacao = conversa.status ?? "aberta";

  return (
    <>
      <section className="grupo">
        <h3>Atendimento</h3>
        <div className="linha"><span>Situação</span><span>{ROTULO_SITUACAO[situacao]}{conversa.waitingSince ? " · cliente aguardando" : ""}</span></div>
        <div className="linha"><span>Responsável</span><span>{dono?.name ?? "Sem responsável"}</span></div>
        <div className="linha"><span>Janela de 24h</span><span>{conversa.optedOut ? "Bloqueada: pediu para parar" : aberta ? `Aberta até ${new Date(conversa.serviceWindowExpiresAt!).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Fechada: só modelo aprovado"}</span></div>
        <div className="linha"><span>Última mensagem</span><span>{horaDaLista(conversa.lastMessageAt) || "Sem mensagens"}</span></div>
        <div className="linha">
          <span>WhatsApp</span>
          <button type="button" className="valor" title="Copiar o telefone" onClick={() => void navigator.clipboard?.writeText(telefoneFormatado(conversa.phone))}>{telefoneFormatado(conversa.phone)} <CopyIcon aria-hidden /></button>
        </div>
        <div className="numeros" aria-label="Mensagens carregadas nesta conversa">
          <div><strong>{recebidas}</strong><small>Recebidas</small></div>
          <div><strong>{enviadas}</strong><small>Enviadas</small></div>
          <div><strong>{notas}</strong><small>Notas internas</small></div>
        </div>
      </section>

      <section className="grupo">
        <h3>Etiquetas da conversa</h3>
        <div className="etiquetas">
          {etiquetas.map((e) => <span key={e} className="etiqueta">{e}<button type="button" aria-label={`Tirar a etiqueta ${e}`} onClick={() => void organizar(conversa.phone, { etiquetas: etiquetas.filter((x) => x !== e) })}><XIcon size={10} weight="bold" /></button></span>)}
          {!etiquetas.length && <span className="vazio">Sem etiquetas. Elas aparecem na lista e viram filtro.</span>}
        </div>
        <form className="novaEtiqueta" onSubmit={(e) => { e.preventDefault(); adicionar(nova); }}>
          <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova etiqueta (ex.: Orçamento)" maxLength={40} aria-label="Nova etiqueta" />
          <Button size="sm" variant="secondary" type="submit" disabled={!nova.trim()}>Adicionar</Button>
        </form>
        {sugestoes.length > 0 && <div className="sugestoes">{sugestoes.map((e) => <button key={e} type="button" onClick={() => adicionar(e)}>+ {e}</button>)}</div>}
      </section>

      <section className="grupo">
        <h3>Fotos e vídeos</h3>
        {fotos.length ? (
          <div className="midias">
            {fotos.map((m) => (
              <button key={m.id} type="button" aria-label={m.type === "video" ? "Abrir o vídeo" : "Ampliar a foto"} onClick={() => (m.type === "video" ? window.open(urlDaMidia(m), "_blank", "noopener") : aoAbrirFoto(m))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.type === "video" ? <video src={urlDaMidia(m)} preload="metadata" muted /> : <img src={urlDaMidia(m)} alt="" loading="lazy" decoding="async" />}
              </button>
            ))}
          </div>
        ) : <span className="vazio">Nenhuma foto ou vídeo nas mensagens carregadas.</span>}
      </section>

      <section className="grupo">
        <h3>Documentos</h3>
        {documentos.length ? (
          <div className="docs">{documentos.map((m) => <a key={m.id} href={urlDaMidia(m, true)}><FileTextIcon aria-hidden /><span style={{ flex: 1 }}>{m.filename || "Documento"}</span><small>{tamanhoArquivo(m.size)}</small></a>)}</div>
        ) : <span className="vazio">Nenhum documento nas mensagens carregadas.</span>}
      </section>

      <section className="grupo">
        <h3>Conversa</h3>
        <a className="valor" href={`/api/whatsapp/exportar?phone=${encodeURIComponent(conversa.phone)}`} style={{ display: "inline-flex", gap: "0.375rem", alignItems: "center", fontSize: "0.8125rem", fontWeight: 500, color: "inherit", textDecoration: "none" }}><ExportIcon size={15} aria-hidden /> Exportar a conversa em texto</a>
        <button type="button" className="perigo" onClick={() => setExcluir(true)}>Excluir contato e conversa</button>
      </section>
      <DeleteContactDialog phone={conversa.phone} open={excluir} onClose={() => setExcluir(false)} onDeleted={() => { setExcluir(false); removerDaLista(conversa.phone); }} />
    </>
  );
}

export function Ficha({ estado, conversa, mensagens, equipe, eu, lead, detalhes, funil, funis, aoFechar, aoAbrirFoto }: {
  estado: Estado; conversa: WhatsAppConversation; mensagens: WhatsAppMessage[]; equipe: readonly Member[]; eu: Member;
  lead?: Lead; detalhes?: LeadDetails; funil?: Funnel; funis: readonly Funnel[]; aoFechar: () => void; aoAbrirFoto: (m: WhatsAppMessage) => void;
}) {
  const { leadId, definirLead } = estado;
  const { leads, createLead, hydrate, moveLead, changeFunnel, updateLead, updateDetails, addAttachments, removeAttachment, archiveLead } = useLeads();
  const [criando, setCriando] = useState(false);
  const [arquivar, setArquivar] = useState(false);
  const nome = nomeDaConversa(conversa), telefone = telefoneFormatado(conversa.phone);
  const etiquetasConhecidas = useMemo(() => [...new Set(leads.flatMap((item) => item.tags))], [leads]);
  const aba = <AbaWhatsApp estado={estado} conversa={conversa} mensagens={mensagens} equipe={equipe} aoAbrirFoto={aoAbrirFoto} />;

  const criar = async () => {
    const primeiro = funis[0];
    if (!primeiro?.stages.length) return;
    setCriando(true);
    // O CRM guarda o telefone só com o DDD (sem o 55); o nome é o do WhatsApp quando há um.
    const digitos = conversa.phone.replace(/\D/g, ""), local = digitos.startsWith("55") && digitos.length >= 12 ? digitos.slice(2) : digitos;
    const novo = await createLead({ funnelId: primeiro.id, stage: primeiro.stages[0].id, name: nome === telefone ? `Contato ${telefone}` : nome, phone: local, budget: 0, tags: conversa.labels ?? [] }, { source: "WhatsApp" });
    setCriando(false);
    if (novo) { definirLead(conversa.phone, novo.id); void hydrate(novo.id); }
  };

  if (lead && detalhes && funil) {
    return (
      <ColunaFicha data-pane="ficha" aria-label={`Ficha de ${lead.name}`}>
        {/* Celular e tablet: a ficha da oportunidade esconde o próprio "voltar" (na tela de Leads ele mora no dock); aqui ele fica no alto. */}
        <div className="fichaVoltar"><button type="button" onClick={aoFechar}><CaretLeftIcon size={16} aria-hidden /> Voltar à conversa</button></div>
        <LeadProfile
          key={lead.id}
          lead={lead}
          details={detalhes}
          funnel={funil}
          knownTags={etiquetasConhecidas}
          onMove={(etapa) => etapa !== lead.stage && moveLead(lead.id, etapa, eu.name)}
          onChangeFunnel={(id) => changeFunnel(lead.id, id, eu.name)}
          onUpdateLead={(parte) => updateLead(lead.id, parte)}
          onUpdateDetails={(parte) => updateDetails(lead.id, parte, eu.name)}
          onAddFiles={(arquivos) => addAttachments(lead.id, arquivos, eu.name)}
          onRemoveFile={(id) => removeAttachment(lead.id, id)}
          onArchive={() => setArquivar(true)}
          onClose={aoFechar}
          menuItems={<><MenuItem icon={ArrowSquareOutIcon} href={`/leads/${lead.id}`}>Abrir oportunidade</MenuItem><MenuSeparator /></>}
          extraTabs={[{ value: "whatsapp", label: "WhatsApp", content: aba }]}
        />
        <Dialog open={arquivar} onClose={() => setArquivar(false)} title="Arquivar oportunidade?" width="26rem"
          description="A oportunidade sai do funil e esta conversa fica sem ficha. O histórico continua guardado e a conversa do WhatsApp não muda."
          footer={<><Button variant="ghost" onClick={() => setArquivar(false)}>Cancelar</Button><Button variant="danger" onClick={() => { setArquivar(false); void archiveLead(lead.id).then((ok) => { if (ok) definirLead(conversa.phone, null); }); }}>Arquivar</Button></>} />
      </ColunaFicha>
    );
  }

  return (
    <ColunaFicha data-pane="ficha" aria-label={`Ficha de ${nome}`}>
      <div className="fichaScroll">
        <div className="fichaTop">
          <IconButton icon={CaretLeftIcon} label="Fechar a ficha" tooltip="bottom" onClick={aoFechar} />
          <IconButton icon={CopyIcon} label="Copiar telefone" tooltip="bottom" onClick={() => void navigator.clipboard?.writeText(telefone)} />
        </div>
        <div className="fichaPerson">
          <Avatar name={nome} seed={conversa.phone} size="xl" shape="circle" />
          <span><strong>{nome}</strong><small>{telefone}</small><small>WhatsApp Business</small></span>
        </div>
        {leadId === undefined || (leadId && !(lead && detalhes)) ? (
          <div className="fichaCall" aria-busy="true"><span>Procurando a oportunidade deste telefone no CRM…</span></div>
        ) : (
          <div className="fichaCall">
            <strong>Sem oportunidade no CRM</strong>
            <span>Crie a oportunidade para acompanhar este contato no funil: etapa, orçamento, evento, origem, arquivos e responsável ficam aqui ao lado da conversa.</span>
            <Button size="sm" icon={PlusIcon} loading={criando} disabled={!funis.length} onClick={() => void criar()}>Criar oportunidade</Button>
          </div>
        )}
        <div className="fichaBody">{aba}</div>
      </div>
    </ColunaFicha>
  );
}
