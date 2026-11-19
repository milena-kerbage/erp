"use client";

import { useState } from "react";
import { CopyIcon, FileTextIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { IconButton } from "@/components/ui/IconButton";
import { DeleteContactDialog } from "../components/DeleteContactDialog";
import type { WhatsAppConversation, WhatsAppMessage } from "../types";
import { urlDaMidia } from "./Bolha";
import { BlocoPainel, Etiqueta, GradeMidia, Painel } from "./estilos";
import { janelaAberta, nomeDaConversa, tamanhoArquivo, telefoneFormatado } from "./formato";

/** Ficha lateral do contato (como o contact-panel da Le Ange): dados, etiquetas, mídia, documentos e exclusão. */
export function PainelContato({ conversa, mensagens, etiquetasSugeridas, aoEtiquetar, aoFechar, aoAbrirFoto, aoExcluido }: {
  conversa: WhatsAppConversation; mensagens: WhatsAppMessage[]; etiquetasSugeridas: string[];
  aoEtiquetar: (etiquetas: string[]) => void; aoFechar: () => void; aoAbrirFoto: (m: WhatsAppMessage) => void; aoExcluido: () => void;
}) {
  const [nova, setNova] = useState("");
  const [excluir, setExcluir] = useState(false);
  const etiquetas = conversa.labels ?? [];
  const adicionar = (valor: string) => { const limpo = valor.trim().slice(0, 40); if (limpo && !etiquetas.includes(limpo)) aoEtiquetar([...etiquetas, limpo]); setNova(""); };
  const fotos = mensagens.filter((m) => (m.type === "image" || m.type === "video") && m.hasMedia && !m.id.startsWith("temp-")).slice(-30).reverse();
  const documentos = mensagens.filter((m) => m.type === "document" && m.hasMedia && !m.id.startsWith("temp-")).slice(-10).reverse();
  const sugestoes = etiquetasSugeridas.filter((e) => !etiquetas.includes(e) && (!nova || e.toLowerCase().includes(nova.toLowerCase()))).slice(0, 6);

  return (
    <Painel aria-label="Ficha do contato">
      <BlocoPainel style={{ justifyItems: "center", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 8, right: 8 }}><IconButton icon={XIcon} label="Fechar a ficha" variant="ghost" size="sm" onClick={aoFechar} /></div>
        <Avatar name={nomeDaConversa(conversa)} seed={conversa.phone} size="xl" shape="circle" />
        <strong style={{ fontSize: "1.0625rem" }}>{nomeDaConversa(conversa)}</strong>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.875rem", opacity: 0.75 }}>{telefoneFormatado(conversa.phone)}<CopyButton text={conversa.phone} label="Copiar telefone" icon={CopyIcon} size="sm" variant="ghost" /></span>
        <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{conversa.optedOut ? "Pediu para não receber mensagens" : janelaAberta(conversa) ? "Janela de 24 horas aberta" : "Janela de 24 horas fechada"}</span>
      </BlocoPainel>
      <BlocoPainel>
        <h3>Etiquetas</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {etiquetas.map((e) => <Etiqueta key={e} style={{ height: "1.5rem", fontSize: "0.75rem" }}>{e}<button type="button" aria-label={`Tirar ${e}`} onClick={() => aoEtiquetar(etiquetas.filter((x) => x !== e))} style={{ marginLeft: 4, border: 0, background: "none", color: "inherit", cursor: "pointer", display: "grid" }}><XIcon size={10} weight="bold" /></button></Etiqueta>)}
          {!etiquetas.length && <span style={{ fontSize: "0.8125rem", opacity: 0.6 }}>Sem etiquetas</span>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); adicionar(nova); }} style={{ display: "flex", gap: 6 }}>
          <input value={nova} onChange={(e) => setNova(e.target.value)} placeholder="Nova etiqueta (ex.: Orçamento)" maxLength={40} aria-label="Nova etiqueta" style={{ flex: 1, minWidth: 0, height: 32, padding: "0 10px", borderRadius: 8, border: "1px solid rgba(0,0,0,.12)", font: "inherit", fontSize: "0.8125rem", background: "transparent", color: "inherit" }} />
          <Button size="sm" type="submit" disabled={!nova.trim()}>Adicionar</Button>
        </form>
        {sugestoes.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{sugestoes.map((e) => <button key={e} type="button" onClick={() => adicionar(e)} style={{ border: "1px dashed rgba(0,0,0,.2)", borderRadius: 6, background: "none", padding: "2px 8px", fontSize: "0.75rem", cursor: "pointer", color: "inherit" }}>+ {e}</button>)}</div>}
      </BlocoPainel>
      <BlocoPainel>
        <h3>Fotos e vídeos</h3>
        {fotos.length ? (
          <GradeMidia>{fotos.map((m) => <button key={m.id} type="button" onClick={() => aoAbrirFoto(m)} aria-label="Abrir">{m.type === "video" ? <video src={urlDaMidia(m)} preload="metadata" muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src={urlDaMidia(m)} alt="" loading="lazy" />}</button>)}</GradeMidia>
        ) : <span style={{ fontSize: "0.8125rem", opacity: 0.6 }}>Nenhuma foto ou vídeo carregado nesta conversa.</span>}
      </BlocoPainel>
      {documentos.length > 0 && (
        <BlocoPainel>
          <h3>Documentos</h3>
          {documentos.map((m) => <a key={m.id} href={urlDaMidia(m, true)} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.8125rem", color: "inherit" }}><FileTextIcon size={20} /><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.filename || "Documento"}</span><span style={{ opacity: 0.6 }}>{tamanhoArquivo(m.size)}</span></a>)}
        </BlocoPainel>
      )}
      <BlocoPainel>
        <Button variant="danger" size="sm" icon={TrashIcon} onClick={() => setExcluir(true)}>Excluir contato e conversa</Button>
      </BlocoPainel>
      <DeleteContactDialog phone={conversa.phone} open={excluir} onClose={() => setExcluir(false)} onDeleted={() => { setExcluir(false); aoExcluido(); }} />
    </Painel>
  );
}
