"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { PageTitle } from "@/components/layout/Header/HeaderActions";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import type { ComposerHandle } from "@/components/ui/Chat/Composer";
import { useDockActionsRegistration, type DockActions } from "@/lib/dock";
import { useIsMobile } from "@/lib/useMediaQuery";
import { useFunnels, useWorkspace } from "@/features/settings/store";
import { composerAttachments, filesToAttachments, useLeads } from "../../store";
import { LeadChat } from "./LeadChat";
import { LeadProfile } from "./LeadProfile";
import { Aside, Card, PaneSwitch, PaneSwitchItem, PaneThumb, Root } from "./styles";

type Pane = "info" | "chat";

/**
 * Tela da oportunidade: ficha completa à esquerda e chat (área principal) à
 * direita. No celular é um painel por vez, com o seletor "Informações |
 * Conversa" flutuando no topo e as ações de cada um no dock de baixo.
 */
export function LeadDetail({ leadId }: { leadId: string }) {
  const router = useRouter();
  const mobile = useIsMobile();
  const [pane, setPane] = useState<Pane>("info");
  const {
    leads,
    details,
    messages,
    unread,
    moveLead,
    changeFunnel,
    updateLead,
    updateDetails,
    sendMessage,
    addAttachments,
    removeAttachment,
    markRead,
  } = useLeads();
  const composerRef = useRef<ComposerHandle>(null);
  const switchRef = useRef<HTMLDivElement>(null);
  const { findFunnel } = useFunnels();
  const { currentUser: teamMember } = useWorkspace();

  // Abrir a oportunidade mostra o chat: a conversa fica lida.
  useEffect(() => {
    markRead(leadId);
  }, [leadId, markRead]);

  // Etiquetas já usadas nos outros leads viram sugestão
  const knownTags = useMemo(() => [...new Set(leads.flatMap((item) => item.tags))], [leads]);

  const lead = leads.find((item) => item.id === leadId);
  const leadDetails = details[leadId];
  const funnel = findFunnel(lead?.funnelId);
  const stageIndex = lead ? funnel.stages.findIndex((stage) => stage.id === lead.stage) : -1;
  const nextStage = funnel.stages[stageIndex + 1];

  const close = useCallback(() => {
    startNavigationProgress();
    router.push(`/leads?funil=${funnel.id}`);
  }, [router, funnel.id]);

  /* Celular, aba de informações: avançar etapa no dock */
  const infoActions = useMemo<DockActions | null>(() => {
    if (!mobile || pane !== "info" || !lead) return null;
    return {
      items: [
        {
          id: nextStage ? `advance-${nextStage.id}` : "advance-end",
          icon: ArrowRightIcon,
          label: nextStage ? `Avançar para ${nextStage.label}` : "Já está na última etapa",
          text: nextStage ? "Avançar" : "Última etapa",
          primary: true,
          disabled: !nextStage,
          onClick: () => nextStage && moveLead(lead.id, nextStage.id, teamMember.name),
        },
      ],
      onClose: close,
      closeLabel: "Voltar aos leads",
    };
  }, [mobile, pane, lead, nextStage, moveLead, teamMember.name, close]);
  useDockActionsRegistration(infoActions);

  const pendingMessages = lead ? (unread[lead.id] ?? 0) : 0;

  // Fundo do seletor: posição e largura da opção escolhida (as opções têm o tamanho do texto)
  useLayoutEffect(() => {
    const element = switchRef.current;
    if (!element) return;
    const place = () => {
      const active = element.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active || active.offsetWidth === 0) return;
      element.style.setProperty("--thumb-x", `${active.offsetLeft}px`);
      element.style.setProperty("--thumb-width", `${active.offsetWidth}px`);
      element.style.setProperty("--thumb-opacity", "1");
      // Só anima depois da primeira posição (não desliza ao abrir a tela)
      requestAnimationFrame(() => element.setAttribute("data-ready", ""));
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(element);
    return () => observer.disconnect();
  }, [pane, pendingMessages]);

  if (!lead || !leadDetails) notFound();

  return (
    <Root data-flush data-pane={pane}>
      <PageTitle>{lead.name}</PageTitle>

      <PaneSwitch ref={switchRef} role="tablist" aria-label="Ver">
        <PaneThumb aria-hidden />
        <PaneSwitchItem
          type="button"
          role="tab"
          aria-selected={pane === "info"}
          $active={pane === "info"}
          onClick={() => setPane("info")}
        >
          Informações
        </PaneSwitchItem>
        <PaneSwitchItem
          type="button"
          role="tab"
          aria-selected={pane === "chat"}
          $active={pane === "chat"}
          onClick={() => setPane("chat")}
        >
          Conversa
          {pendingMessages > 0 && <span>{pendingMessages}</span>}
        </PaneSwitchItem>
      </PaneSwitch>

      <Aside aria-label="Dados da oportunidade" data-pane-id="info">
        <LeadProfile
          lead={lead}
          details={leadDetails}
          funnel={funnel}
          knownTags={knownTags}
          onMove={(stage) => stage !== lead.stage && moveLead(lead.id, stage, teamMember.name)}
          onChangeFunnel={(funnelId) => changeFunnel(lead.id, funnelId, teamMember.name)}
          onUpdateLead={(patch) => updateLead(lead.id, patch)}
          onUpdateDetails={(patch) => updateDetails(lead.id, patch, teamMember.name)}
          onAddFiles={(files) => addAttachments(lead.id, filesToAttachments(files), teamMember.name)}
          onRemoveFile={(id) => removeAttachment(lead.id, id)}
        />
      </Aside>

      <Card aria-label={`Conversa com ${lead.name}`} data-pane-id="chat">
        <LeadChat
          lead={lead}
          messages={messages[lead.id] ?? []}
          composerRef={composerRef}
          hideHeaderOnMobile
          dock={pane === "chat"}
          onDockClose={close}
          dockCloseLabel="Voltar aos leads"
          onSend={(payload) =>
            sendMessage(lead.id, {
              kind: "message",
              text: payload.text,
              attachments: composerAttachments(payload),
              author: teamMember,
            })
          }
        />
      </Card>
    </Root>
  );
}
