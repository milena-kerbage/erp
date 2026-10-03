"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import styled from "@emotion/styled";
import { NarrowOnly, WideOnly } from "@/styles/responsive";
import { DOCK_SPACE } from "@/styles/sheet";
import { BellIcon, BellSlashIcon, GearSixIcon, PaperclipIcon, SparkleIcon } from "@phosphor-icons/react";
import { startNavigationProgress } from "@/components/layout/NavigationProgress";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Surface } from "@/components/ui/Popover/styles";
import { usePopover } from "@/components/ui/Popover/usePopover";
import { transientOptions } from "@/lib/emotion/transient";
import { formatRelativeTime } from "@/lib/format";
import { staggerChildren } from "@/styles/animations";
import { useLeads } from "@/features/leads/store";
import { useWorkspace } from "@/features/settings/store";
import { mockNotifications, type AppNotification, type NotificationActor } from "../mock";

type Tab = "inbox" | "general" | "archived";

/* ---------- Estilos ---------- */

const Panel = styled(Surface)`
  gap: 0;
  max-height: min(36rem, calc(100dvh - 5rem));
  padding: 0;
  overflow: hidden;

  /* Celular: folha de baixo; alça no topo e a lista vai até embaixo (passa por baixo do dock) */
  ${({ theme }) => theme.media.md} {
    max-height: min(82dvh, 44rem);
    padding: ${({ theme }) => theme.spacing(5)} 0 0;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4, 4, 2)};

  ${({ theme }) => theme.media.md} {
    padding: ${({ theme }) => theme.spacing(2, 4, 2)};
  }

  h2 {
    font-size: ${({ theme }) => theme.fontSizes.md};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const TextButton = styled.button`
  flex-shrink: 0;
  font-size: 0.8125rem;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.text.muted};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const Tabs = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(0, 2, 0, 4)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};

  /* Celular: abas mais juntas numa linha só (o que não couber rola para o lado) */
  ${({ theme }) => theme.media.md} {
    gap: ${({ theme }) => theme.spacing(3)};
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

const TabButton = styled("button", transientOptions)<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  flex-shrink: 0;
  height: 2.5rem;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme, $active }) => ($active ? theme.fontWeights.semibold : theme.fontWeights.regular)};
  /* O rótulo nunca quebra em duas linhas */
  white-space: nowrap;
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.muted)};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }

  /* Sublinhado da aba ativa, colado na linha de baixo (dentro da aba, que pode rolar) */
  &::after {
    content: "";
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 2px;
    border-radius: 2px;
    background-color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : "transparent")};
  }
`;

/** Contador da aba: cheio na ativa, vazado nas outras. */
const Count = styled("span", transientOptions)<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: ${({ theme }) => theme.spacing(0, 1.5)};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.border.default)};
  border-radius: ${({ theme }) => theme.radii.full};
  background-color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : "transparent")};
  color: ${({ theme, $active }) => ($active ? theme.palette.neutral[0] : theme.colors.text.muted)};
  font-size: 0.6875rem;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const TabDivider = styled.span`
  flex-shrink: 0;
  width: 1px;
  height: 1.125rem;
  background-color: ${({ theme }) => theme.colors.border.subtle};
`;

const TabsEnd = styled.span`
  flex-shrink: 0;
  margin-left: auto;
`;

const List = styled.ul`
  ${staggerChildren(8, 35)};
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;

  &::-webkit-scrollbar-track {
    margin-block: 8px;
  }
`;

const Item = styled("li", transientOptions)<{ $unread: boolean }>`
  position: relative;
  display: flex;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(3.5, 8, 3.5, 4)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  overflow-wrap: anywhere;
  background-color: ${({ theme, $unread }) =>
    $unread ? `color-mix(in srgb, ${theme.palette.sage[500]} 7%, ${theme.palette.neutral[0]})` : "transparent"};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:last-of-type {
    border-bottom: 0;
  }

  &:hover {
    background-color: ${({ theme, $unread }) =>
      $unread
        ? `color-mix(in srgb, ${theme.palette.sage[500]} 10%, ${theme.palette.neutral[0]})`
        : theme.colors.interactive.hover};
  }
`;

/** Avatar com o ponto de "online" para quem é da equipe. */
const AvatarWrap = styled.span`
  position: relative;
  flex-shrink: 0;
  height: fit-content;
`;

const Online = styled.span`
  position: absolute;
  right: 0;
  bottom: 0;
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid ${({ theme }) => theme.palette.neutral[0]};
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.success};
`;

const SystemAvatar = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.palette.sage[100]};
  color: ${({ theme }) => theme.palette.sage[700]};
`;

const Body = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  min-width: 0;
`;

const Sentence = styled.button`
  text-align: left;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.text.muted};

  b {
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Meta = styled.span`
  overflow: hidden;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  margin-top: ${({ theme }) => theme.spacing(1.5)};
`;

const File = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1.5)};
  margin-top: ${({ theme }) => theme.spacing(1.5)};
  min-width: 0;
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

const UnreadDot = styled.span`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.spacing(4)};
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary.main};
  transform: translateY(-50%);
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(10, 4)};
  font-size: 0.8125rem;
  color: ${({ theme }) => theme.colors.text.muted};

  ${({ theme }) => theme.media.md} {
    padding-bottom: ${DOCK_SPACE};
  }
`;

/* ---------- Componente ---------- */

/** Sino do header com o painel de notificações (caixa de entrada, geral, arquivadas). */
export function NotificationsMenu() {
  const router = useRouter();
  const popover = usePopover({ side: "bottom", align: "end", offset: 8, role: "dialog" });
  const { open, position, contentRef, close } = popover;
  const { leads, updateDetails } = useLeads();
  const { members, currentUser } = useWorkspace();
  const [items, setItems] = useState<AppNotification[]>(() => mockNotifications());
  const [tab, setTab] = useState<Tab>("inbox");

  const unreadInbox = items.filter((item) => item.tab === "inbox" && !item.archived && !item.read).length;
  const unreadGeneral = items.filter((item) => item.tab === "general" && !item.archived && !item.read).length;
  const unread = unreadInbox + unreadGeneral;

  const visible = useMemo(
    () => items.filter((item) => (tab === "archived" ? item.archived : !item.archived && item.tab === tab)),
    [items, tab],
  );

  const patch = (id: string, change: Partial<AppNotification>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)));

  const markAllRead = () => setItems((current) => current.map((item) => ({ ...item, read: true })));

  const openItem = (item: AppNotification) => {
    patch(item.id, { read: true });
    if (!item.href) return;
    close();
    startNavigationProgress();
    router.push(item.href);
  };

  const avatar = (actor: NotificationActor, who: string) => {
    if (actor.kind === "system")
      return (
        <SystemAvatar aria-hidden>
          <SparkleIcon size={18} weight="fill" />
        </SystemAvatar>
      );
    if (actor.kind === "lead") {
      const lead = leads.find((item) => item.id === actor.leadId);
      return <Avatar name={who} seed={actor.leadId} src={lead?.photoUrl} size="md" shape="circle" />;
    }
    const member = members.find((item) => item.seed === actor.seed);
    // "Online": entrou nas últimas 2 horas
    const online = member?.lastSeenAt && Date.now() - new Date(member.lastSeenAt).getTime() < 2 * 3_600_000;
    return (
      <>
        <Avatar name={who} seed={actor.seed} src={member?.avatarUrl} size="md" shape="circle" />
        {online && <Online aria-label="online" />}
      </>
    );
  };

  return (
    <>
      <IconButton
        {...popover.triggerProps}
        icon={BellIcon}
        label="Notificações"
        indicator={unread > 0}
        indicatorLabel={`${unread} ${unread === 1 ? "notificação não lida" : "notificações não lidas"}`}
        tooltip={open ? false : "bottom"}
      />
      {open &&
        createPortal(
          <Panel
            ref={contentRef}
            id={popover.contentId}
            role="dialog"
            aria-label="Notificações"
            $side={position?.side ?? "bottom"}
            $width="26rem"
            $ready={position !== null}
            style={position ? { top: position.top, left: position.left } : { top: 0, left: 0 }}
            onKeyDown={(event) => event.key === "Escape" && close(true)}
          >
            <Head>
              <h2>Notificações</h2>
              <TextButton type="button" disabled={unread === 0} onClick={markAllRead}>
                Marcar todas como lidas
              </TextButton>
            </Head>

            <Tabs role="tablist" aria-label="Tipo de notificação">
              <TabButton
                type="button"
                role="tab"
                aria-selected={tab === "inbox"}
                $active={tab === "inbox"}
                onClick={() => setTab("inbox")}
              >
                <WideOnly>Caixa de entrada</WideOnly>
                <NarrowOnly>Entrada</NarrowOnly>
                {unreadInbox > 0 && <Count $active={tab === "inbox"}>{unreadInbox}</Count>}
              </TabButton>
              <TabButton
                type="button"
                role="tab"
                aria-selected={tab === "general"}
                $active={tab === "general"}
                onClick={() => setTab("general")}
              >
                Geral
                {unreadGeneral > 0 && <Count $active={tab === "general"}>{unreadGeneral}</Count>}
              </TabButton>
              <TabDivider aria-hidden />
              <TabButton
                type="button"
                role="tab"
                aria-selected={tab === "archived"}
                $active={tab === "archived"}
                onClick={() => setTab("archived")}
              >
                Arquivadas
              </TabButton>
              <TabsEnd>
                <IconButton
                  href="/configuracoes/preferencias"
                  icon={GearSixIcon}
                  label="Configurar notificações"
                  variant="ghost"
                  size="sm"
                  tooltip="left"
                  onClick={() => close()}
                />
              </TabsEnd>
            </Tabs>

            {visible.length === 0 ? (
              <Empty>
                <BellSlashIcon size={22} aria-hidden />
                {tab === "archived" ? "Nada arquivado." : "Tudo em dia por aqui."}
              </Empty>
            ) : (
              <List key={tab} role="tabpanel" data-sheet-scroll="">
                {visible.map((item) => (
                  <Item
                    key={item.id}
                    $unread={!item.read}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button, a")) return;
                      openItem(item);
                    }}
                  >
                    <AvatarWrap>{avatar(item.actor, item.who)}</AvatarWrap>
                    <Body>
                      <Sentence type="button" onClick={() => openItem(item)}>
                        <b>{item.who}</b> {item.verb} {item.target && <b>{item.target}</b>} {item.suffix}
                      </Sentence>
                      <Meta>
                        {formatRelativeTime(item.at)} / {item.context}
                      </Meta>

                      {item.file && (
                        <File>
                          <PaperclipIcon size={15} aria-hidden />
                          <span>{item.file}</span>
                        </File>
                      )}

                      {item.claimLeadId && !item.archived && (
                        <Actions>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => patch(item.id, { read: true, archived: true, claimLeadId: undefined })}
                          >
                            Ignorar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              updateDetails(item.claimLeadId!, { owner: currentUser }, currentUser.name);
                              patch(item.id, {
                                read: true,
                                claimLeadId: undefined,
                                verb: "agora está com",
                                target: "você",
                                suffix: undefined,
                              });
                            }}
                          >
                            Assumir
                          </Button>
                        </Actions>
                      )}
                    </Body>
                    {!item.read && <UnreadDot aria-label="não lida" />}
                  </Item>
                ))}
              </List>
            )}
          </Panel>,
          document.body,
        )}
    </>
  );
}
