"use client";

// A conversa REAL do WhatsApp dentro da tela da oportunidade: o mesmo componente da tela de conversas (mensagens,
// mídia, reações, notas internas, modelos), sem a lista e sem a ficha, que já está ao lado.
import { useMemo } from "react";
import { XIcon } from "@phosphor-icons/react";
import type { Funnel } from "@/features/leads/funnels";
import type { Lead } from "@/features/leads/types";
import { useTeam, useWorkspace } from "@/features/settings/store";
import { normalizeWhatsAppPhone } from "../client";
import { Notice } from "../components/shared";
import { Conversa } from "./Conversa";
import { Raiz } from "./estilos";
import { useConversas } from "./useConversas";

/** Telefone do lead no formato do WhatsApp (com o 55 quando vem só DDD + número); null se não der para usar. */
export function telefoneWhatsAppDoLead(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, "");
  if (!digitos) return null;
  return normalizeWhatsAppPhone(!digitos.startsWith("55") && digitos.length <= 11 ? `55${digitos}` : digitos);
}

const nada = () => {};

export function ConversaDaOportunidade({ telefone, lead, funil, aoMoverEtapa }: { telefone: string; lead: Lead; funil?: Funnel; aoMoverEtapa: (etapa: string) => void }) {
  const estado = useConversas(telefone, { semUrl: true });
  const equipe = useTeam();
  const { currentUser: eu } = useWorkspace();
  const { conversaSelecionada, fio, erro, setErro } = estado;
  const estilo = useMemo(() => ({ flex: "1 1 0" }), []);
  return (
    <Raiz data-embutida="" data-open="" style={estilo}>
      <Conversa key={telefone} embutida estado={estado} phone={telefone} conversa={conversaSelecionada} fio={fio} equipe={equipe} eu={eu}
        lead={lead} funil={funil} aoMoverEtapa={aoMoverEtapa} painel={false} aoAlternarPainel={nada} listaFechada aoAlternarLista={nada} />
      {erro && (
        <div role="alert" style={{ position: "absolute", left: "50%", bottom: 96, transform: "translateX(-50%)", zIndex: 6, maxWidth: "min(30rem, 92%)" }}>
          <Notice $error style={{ display: "flex", gap: 8, alignItems: "center", boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}>
            <span style={{ flex: 1 }}>{erro}</span>
            <button type="button" aria-label="Fechar aviso" onClick={() => setErro("")} style={{ border: 0, background: "none", cursor: "pointer", color: "inherit", display: "grid" }}><XIcon size={14} /></button>
          </Notice>
        </div>
      )}
    </Raiz>
  );
}
