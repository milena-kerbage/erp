"use client";

import { useState } from "react";
import { staggerChildren } from "@/styles/animations";
import styled from "@emotion/styled";
import {
  CalendarBlankIcon,
  CardsIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  DotsThreeIcon,
  EnvelopeSimpleIcon,
  InstagramLogoIcon,
  LinkBreakIcon,
  MetaLogoIcon,
  PlugsConnectedIcon,
  TableIcon,
  type Icon,
} from "@phosphor-icons/react";
import { HeaderActions } from "@/components/layout/Header/HeaderActions";
import { Button } from "@/components/ui/Button";
import { useViewMode, ViewSwitch } from "@/components/ui/ViewSwitch";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { IconTile } from "@/components/ui/IconTile";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { TextField } from "@/components/ui/TextField";
import { formatDate } from "@/lib/format";
import { maskEmail, maskInstagram } from "@/lib/masks";
import { IntegrationManagerPanel } from "@/features/integrations/components/IntegrationManagerPanel";
import { Notice } from "@/features/whatsapp/components/shared";
import type { Tone } from "@/styles/theme";
import { useWorkspace } from "../store";
import type { IntegrationId } from "../types";
import { Inline, Muted, Page, PageHeader, Pill, Table, TableCard, usePending } from "./ui";

type CatalogItem = {
  id: IntegrationId;
  group: string;
  name: string;
  description: string;
  icon: Icon;
  tone: Tone;
  accountLabel: string;
  placeholder: string;
  mask?: (value: string) => string;
};

const catalog: CatalogItem[] = [
  {
    id: "instagram",
    group: "Mensagens",
    name: "Instagram Direct",
    description: "Mensagens do Direct viram conversas, e quem chama vira lead automaticamente.",
    icon: InstagramLogoIcon,
    tone: "rose",
    accountLabel: "Perfil do Instagram",
    placeholder: "@perfil",
    mask: maskInstagram,
  },
  {
    id: "meta-ads",
    group: "Anúncios e origem",
    name: "Meta Lead Ads",
    description: "Formulários dos anúncios do Facebook e do Instagram entram como lead, com a campanha.",
    icon: MetaLogoIcon,
    tone: "blue",
    accountLabel: "Conta de anúncios",
    placeholder: "Nome ou ID da conta",
  },
  {
    id: "google-analytics",
    group: "Anúncios e origem",
    name: "Google Analytics",
    description: "Leva a origem das visitas do site para a aba Campanha de cada lead.",
    icon: ChartLineUpIcon,
    tone: "yellow",
    accountLabel: "ID da propriedade",
    placeholder: "G-XXXXXXXXXX",
  },
  {
    id: "google-calendar",
    group: "Agenda e e-mail",
    name: "Google Agenda",
    description: "Provas e visitas marcadas no sistema aparecem no seu Google Agenda.",
    icon: CalendarBlankIcon,
    tone: "blue",
    accountLabel: "Conta Google",
    placeholder: "nome@gmail.com",
    mask: maskEmail,
  },
  {
    id: "gmail",
    group: "Agenda e e-mail",
    name: "Gmail",
    description: "Envie orçamentos e contratos por e-mail sem sair da oportunidade.",
    icon: EnvelopeSimpleIcon,
    tone: "rose",
    accountLabel: "E-mail",
    placeholder: "nome@gmail.com",
    mask: maskEmail,
  },
];

const groups = [...new Set(catalog.map((item) => item.group))];

type View = "cards" | "table";
const VIEWS: readonly View[] = ["cards", "table"];

/** Nome + descrição curta na célula da tabela. */
const NameCell = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  white-space: normal;

  strong {
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  small {
    max-width: 28rem;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Groups = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(6)};
`;

const GroupTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing(3)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Grid = styled.div`
  ${staggerChildren(6, 45)};
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
`;

const IntegrationCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const Texts = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};

  h4 {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    font-size: 0.8125rem;
    line-height: 1.5;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 2.25rem;
  padding-top: ${({ theme }) => theme.spacing(3)};
  border-top: 1px dashed ${({ theme }) => theme.colors.border.subtle};

  span {
    overflow: hidden;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  b {
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

/** Integrações com os canais e ferramentas do ateliê. */
export function IntegrationsSettings() {
  const { integrations } = useWorkspace();
  const [connecting, setConnecting] = useState<CatalogItem | null>(null);
  const [account, setAccount] = useState("");
  const [connectingNow, runConnect] = usePending(900);

  const connectedCount = catalog.filter((item) => integrations[item.id].connected).length;
  const [view, setView] = useViewMode<View>("integracoes", "cards", VIEWS, "cards");

  const status = (connected: boolean) =>
    connected ? (
      <Pill $tone="green">
        <CheckCircleIcon size={12} weight="bold" aria-hidden />
        Conectado
      </Pill>
    ) : (
      <Pill $tone="neutral" $outline>
        Não conectado
      </Pill>
    );

  const action = (item: CatalogItem) =>
    integrations[item.id].connected ? (
      <Menu
        label={`Opções de ${item.name}`}
        align="end"
        width="13rem"
        trigger={(props) => (
          <IconButton {...props} icon={DotsThreeIcon} label="Opções" variant="ghost" size="sm" tooltip={false} />
        )}
      >
        <MenuItem icon={LinkBreakIcon} muted onSelect={() => setConnecting(item)}>
          Desconectar
        </MenuItem>
      </Menu>
    ) : (
      <Button variant="secondary" size="sm" icon={PlugsConnectedIcon} disabled={item.id !== "whatsapp"} href={item.id === "whatsapp" ? "/configuracoes/whatsapp" : undefined}>
        {item.id === "whatsapp" ? "Configurar" : "Pendente"}
      </Button>
    );

  const close = () => {
    setConnecting(null);
    setAccount("");
  };

  return (
    <Page>
      <HeaderActions>
        <ViewSwitch
          label="Visualização das integrações"
          value={view}
          onChange={setView}
          options={[
            { value: "cards", label: "Cards", icon: CardsIcon },
            { value: "table", label: "Tabela", icon: TableIcon },
          ]}
        />
      </HeaderActions>

      <PageHeader
        title="Integrações"
        description="Gerencie a configuração, credenciais, etapas e testes reais da integração WhatsApp."
      />

      <IntegrationManagerPanel />

      <Notice>O WhatsApp é configurado no painel acima. As outras integrações aguardam seus respectivos conectores oficiais.</Notice>

      {view === "table" ? (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <th>Integração</th>
                <th>Grupo</th>
                <th>Status</th>
                <th>Conta</th>
                <th>Desde</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => {
                const state = integrations[item.id];
                return (
                  <tr key={item.id}>
                    <td>
                      <Inline>
                        <IconTile icon={item.icon} tone={item.tone} size="md" />
                        <NameCell>
                          <strong>{item.name}</strong>
                          <small>{item.description}</small>
                        </NameCell>
                      </Inline>
                    </td>
                    <td>
                      <Muted>{item.group}</Muted>
                    </td>
                    <td>{status(state.connected)}</td>
                    <td>{state.account ?? <Muted>Nenhuma</Muted>}</td>
                    <td>
                      <Muted>{state.connectedAt ? formatDate(state.connectedAt) : "Não conectado"}</Muted>
                    </td>
                    <td>{action(item)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableCard>
      ) : (
        <Groups>
          {groups.map((group) => (
            <section key={group} aria-label={group}>
              <GroupTitle>{group}</GroupTitle>
              <Grid>
                {catalog
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const state = integrations[item.id];
                    return (
                      <IntegrationCard key={item.id} aria-label={item.name}>
                        <Top>
                          <IconTile icon={item.icon} tone={item.tone} size="lg" />
                          {state.connected ? (
                            <Pill $tone="green">
                              <CheckCircleIcon size={12} weight="bold" aria-hidden />
                              Conectado
                            </Pill>
                          ) : (
                            <Pill $tone="neutral" $outline>
                              Não conectado
                            </Pill>
                          )}
                        </Top>
                        <Texts>
                          <h4>{item.name}</h4>
                          <p>{item.description}</p>
                        </Texts>
                        <Foot>
                          {state.connected ? (
                            <>
                              <span>
                                <b>{state.account}</b>
                                {state.connectedAt && ` desde ${formatDate(state.connectedAt)}`}
                              </span>
                              <Menu
                                label={`Opções de ${item.name}`}
                                align="end"
                                width="13rem"
                                trigger={(props) => (
                                  <IconButton
                                    {...props}
                                    icon={DotsThreeIcon}
                                    label="Opções"
                                    variant="ghost"
                                    size="sm"
                                    tooltip={false}
                                  />
                                )}
                              >
                                <MenuItem
                                  icon={LinkBreakIcon}
                                  muted
                                  onSelect={() => setConnecting(item)}
                                >
                                  Desconectar
                                </MenuItem>
                              </Menu>
                            </>
                          ) : (
                            <>
                              <span>Ainda não conectado</span>
                              <Button
                                variant="secondary"
                                size="sm"
                                icon={PlugsConnectedIcon}
                                disabled={item.id !== "whatsapp"} href={item.id === "whatsapp" ? "/configuracoes/whatsapp" : undefined}
                              >
                                {item.id === "whatsapp" ? "Configurar" : "Pendente"}
                              </Button>
                            </>
                          )}
                        </Foot>
                      </IntegrationCard>
                    );
                  })}
              </Grid>
            </section>
          ))}
        </Groups>
      )}

      <Dialog
        open={connecting !== null}
        onClose={close}
        title={`Conectar ${connecting?.name ?? ""}`}
        description={connecting?.description}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button href="/configuracoes/whatsapp">Abrir configuração oficial</Button>
          </>
        }
      >
        {connecting && (
          <TextField
            label={connecting.accountLabel}
            icon={connecting.icon}
            placeholder={connecting.placeholder}
            value={account}
            mask={connecting.mask}
            hint="Este conector ainda aguarda implementação e autorização do provedor."
            onChange={(event) => setAccount(event.target.value)}
          />
        )}
      </Dialog>
    </Page>
  );
}
