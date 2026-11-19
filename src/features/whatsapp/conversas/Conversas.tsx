"use client";

// Conversas do WhatsApp no padrão do ERP da Le Ange (inbox-screen.tsx): lista | conversa | ficha.
import { useState } from "react";
import { ChatsCircleIcon, XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { normalizeWhatsAppPhone } from "../client";
import { Notice } from "../components/shared";
import { Conversa } from "./Conversa";
import { ColunaConversa, Raiz, Vazio } from "./estilos";
import { Lista } from "./Lista";
import { useConversas } from "./useConversas";

export function Conversas({ telefoneInicial, telefoneInvalido }: { telefoneInicial?: string; telefoneInvalido?: boolean }) {
  const estado = useConversas(telefoneInicial);
  const { selecionado, setSelecionado, conversaSelecionada, fio, erro, setErro } = estado;
  const [painel, setPainel] = useState(false);
  const [nova, setNova] = useState(false);
  const [telefone, setTelefone] = useState("");
  const normalizado = normalizeWhatsAppPhone(telefone.length && !telefone.replace(/\D/g, "").startsWith("55") && telefone.replace(/\D/g, "").length <= 11 ? `55${telefone.replace(/\D/g, "")}` : telefone);

  return (
    <Raiz data-aberta={selecionado ? "" : undefined}>
      <Lista estado={estado} aoNovaConversa={() => setNova(true)} />
      {selecionado ? (
        <Conversa key={selecionado} estado={estado} phone={selecionado} conversa={conversaSelecionada} fio={fio} painel={painel} setPainel={setPainel} />
      ) : (
        <ColunaConversa data-pane="conversa">
          <Vazio><div><ChatsCircleIcon size={40} weight="duotone" /><strong>Selecione uma conversa</strong>As mensagens do WhatsApp da empresa aparecem aqui. Clique com o botão direito numa conversa para fixar, favoritar ou arquivar.</div></Vazio>
        </ColunaConversa>
      )}
      {(erro || telefoneInvalido) && (
        <div role="alert" style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 60, maxWidth: "min(32rem, 92vw)" }}>
          <Notice $error style={{ display: "flex", gap: 8, alignItems: "center", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}>
            <span style={{ flex: 1 }}>{erro || "O telefone do link não é válido."}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => setErro("")} style={{ border: 0, background: "none", cursor: "pointer", color: "inherit", display: "grid" }}><XIcon size={14} /></button>
          </Notice>
        </div>
      )}
      <Dialog open={nova} onClose={() => setNova(false)} title="Nova conversa" description="Abra a conversa com qualquer número. Se a pessoa não escreveu nas últimas 24 horas, o primeiro envio precisa ser um modelo aprovado." width="26rem"
        footer={<><Button variant="ghost" onClick={() => setNova(false)}>Cancelar</Button><Button disabled={!normalizado} onClick={() => { setSelecionado(normalizado!); setNova(false); setTelefone(""); }}>Abrir conversa</Button></>}>
        <form onSubmit={(e) => { e.preventDefault(); if (normalizado) { setSelecionado(normalizado); setNova(false); setTelefone(""); } }}>
          <TextField label="Telefone com DDD" inputMode="tel" placeholder="(85) 99999-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} hint={normalizado ? `Vai abrir +${normalizado}` : "Com DDD; o +55 entra sozinho."} />
        </form>
      </Dialog>
    </Raiz>
  );
}
