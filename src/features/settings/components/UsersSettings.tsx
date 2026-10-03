"use client";

import { useState } from "react";
import { useTheme } from "@emotion/react";
import styled from "@emotion/styled";
import {
  CardsIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  CopyIcon,
  DotsThreeIcon,
  EnvelopeSimpleIcon,
  PaperPlaneTiltIcon,
  ShieldCheckIcon,
  TableIcon,
  TrashIcon,
  UserIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { HeaderActions } from "@/components/layout/Header/HeaderActions";
import { useViewMode, ViewSwitch } from "@/components/ui/ViewSwitch";
import { staggerChildren } from "@/styles/animations";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EditableText, FieldTrigger } from "@/components/ui/Editable";
import { IconButton } from "@/components/ui/IconButton";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { FilterBar } from "@/components/ui/FilterBar";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { copyText } from "@/lib/clipboard";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { maskEmail } from "@/lib/masks";
import type { Tone } from "@/styles/theme";
import { permissionLabels, useWorkspace } from "../store";
import type { Member, Permission } from "../types";
import { Inline, Muted, Page, PageHeader, Pill, StatCard, StatGrid, Table, TableCard, usePending } from "./ui";

const permissionTones: Record<Permission, Tone> = { admin: "blue", manager: "lavender", member: "neutral" };
const permissions = Object.keys(permissionLabels) as Permission[];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Toolbar = styled(FilterBar)`
  margin-bottom: ${({ theme }) => theme.spacing(3)};
`;

/** Nome e e-mail empilhados, como na lista da equipe. */
const Person = styled.span`
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  line-height: 1.3;

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const You = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.muted};
`;

const Legend = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
  margin-top: ${({ theme }) => theme.spacing(4)};

  > div {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.spacing(1.5)};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Cards = styled.div`
  ${staggerChildren(12, 30)};
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
`;

const MemberCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  font-size: 0.8125rem;
  transition: border-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`;

const CardTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const CardField = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  min-height: 1.75rem;
  color: ${({ theme }) => theme.colors.text.muted};
`;

const CardFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  padding-top: ${({ theme }) => theme.spacing(3)};
  border-top: 1px dashed ${({ theme }) => theme.colors.border.subtle};
`;

type View = "table" | "cards";
const VIEWS: readonly View[] = ["table", "cards"];

const DAY = 86_400_000;

function PermissionSelect({ member, onChange }: { member: Member; onChange: (permission: Permission) => void }) {
  const theme = useTheme();
  return (
    <Select
      label={`Permissão de ${member.name}`}
      heading="O que pode fazer"
      align="start"
      width="18rem"
      value={member.permission}
      onChange={onChange}
      options={permissions.map((permission) => ({
        value: permission,
        label: permissionLabels[permission].label,
        description: permissionLabels[permission].description,
        leading: <ShieldCheckIcon size={18} color={theme.tones[permissionTones[permission]].fg} />,
      }))}
      trigger={({ open: _open, ...props }) => (
        <FieldTrigger
          type="button"
          {...props}
          $variant="badge"
          $tone={permissionTones[member.permission]}
          aria-label={`Permissão: ${permissionLabels[member.permission].label}. Trocar`}
        >
          {permissionLabels[member.permission].label}
        </FieldTrigger>
      )}
    />
  );
}

/** Equipe do ateliê: quem acessa, o que pode fazer e convites. */
export function UsersSettings() {
  const theme = useTheme();
  const { members, currentUser, inviteMember, updateMember, removeMember } = useWorkspace();
  const [query, setQuery] = useState("");
  const [permissionFilter, setPermissionFilter] = useState<Permission[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | Member["status"]>("all");
  const [inviting, setInviting] = useState(false);
  const [sending, runInvite] = usePending(650);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [draft, setDraft] = useState({ name: "", email: "", role: "", permission: "member" as Permission });
  const [view, setView] = useViewMode<View>("usuarios", "table", VIEWS, "cards");

  const active = members.filter((member) => member.status === "active");
  const invited = members.filter((member) => member.status === "invited");
  const admins = active.filter((member) => member.permission === "admin");
  const recent = active.filter(
    (member) => member.lastSeenAt && Date.now() - new Date(member.lastSeenAt).getTime() < 7 * DAY,
  );

  const search = query.trim().toLowerCase();
  const visible = members
    .filter((member) => permissionFilter.length === 0 || permissionFilter.includes(member.permission))
    .filter((member) => statusFilter === "all" || member.status === statusFilter)
    .filter((member) => !search || `${member.name} ${member.email} ${member.role}`.toLowerCase().includes(search));

  const validInvite = draft.name.trim().length > 1 && EMAIL.test(draft.email);
  const emailTaken = members.some((member) => member.email === draft.email.trim());

  const closeInvite = () => {
    setInviting(false);
    setDraft({ name: "", email: "", role: "", permission: "member" });
  };

  const permissionCell = (member: Member, self: boolean) =>
    self ? (
      <Pill $tone={permissionTones[member.permission]} title="Você não pode mudar a própria permissão">
        {permissionLabels[member.permission].label}
      </Pill>
    ) : (
      <PermissionSelect member={member} onChange={(permission) => updateMember(member.id, { permission })} />
    );

  const statusPill = (member: Member) =>
    member.status === "active" ? (
      <Pill $tone="green">
        <CheckCircleIcon size={12} weight="bold" aria-hidden />
        Ativa
      </Pill>
    ) : (
      <Pill $tone="peach" $outline>
        <PaperPlaneTiltIcon size={12} weight="bold" aria-hidden />
        Convite pendente
      </Pill>
    );

  const lastSeen = (member: Member) =>
    member.lastSeenAt ? (
      <Inline>
        <ClockCounterClockwiseIcon size={14} aria-hidden />
        <Muted>{formatRelativeTime(member.lastSeenAt)}</Muted>
      </Inline>
    ) : (
      <Muted>Nunca entrou</Muted>
    );

  const roleField = (member: Member) => (
    <EditableText
      label={`Função de ${member.name}`}
      placeholder="Definir função"
      value={member.role}
      onSave={(role) => updateMember(member.id, { role })}
    />
  );

  const memberMenu = (member: Member, self: boolean) => (
    <Menu
      label={`Ações de ${member.name}`}
      align="end"
      width="14rem"
      trigger={(props) => (
        <IconButton {...props} icon={DotsThreeIcon} label="Ações" variant="ghost" size="sm" tooltip={false} />
      )}
    >
      {member.status === "invited" && <MenuItem icon={EnvelopeSimpleIcon}>Reenviar convite</MenuItem>}
      <MenuItem icon={CopyIcon} onSelect={() => void copyText(member.email)}>
        Copiar e-mail
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={TrashIcon} muted disabled={self} onSelect={() => setRemoving(member)}>
        {member.status === "invited" ? "Cancelar convite" : "Remover da equipe"}
      </MenuItem>
    </Menu>
  );

  return (
    <Page>
      <HeaderActions>
        <ViewSwitch
          label="Visualização da equipe"
          value={view}
          onChange={setView}
          options={[
            { value: "table", label: "Tabela", icon: TableIcon },
            { value: "cards", label: "Cards", icon: CardsIcon },
          ]}
        />
        <Button icon={UserPlusIcon} onClick={() => setInviting(true)}>
          Convidar pessoa
        </Button>
      </HeaderActions>

      <PageHeader
        title="Usuários"
        description="Quem acessa o sistema, a função de cada pessoa no ateliê e o que ela pode fazer."
      />

      <StatGrid>
        <StatCard
          label="Pessoas na equipe"
          value={String(active.length)}
          note="Com acesso ativo"
          icon={UsersThreeIcon}
        />
        <StatCard label="Admins" value={String(admins.length)} note="Acesso total ao sistema" icon={ShieldCheckIcon} />
        <StatCard
          label="Ativas na semana"
          value={String(recent.length)}
          note="Entraram nos últimos 7 dias"
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Convites pendentes"
          value={String(invited.length)}
          note={invited.length > 0 ? "Aguardando o primeiro acesso" : "Nenhum convite aberto"}
          icon={PaperPlaneTiltIcon}
        />
      </StatGrid>

      <div>
        <Toolbar
          search={{
            label: "Buscar pessoa",
            placeholder: "Buscar por nome, e-mail ou função",
            shortPlaceholder: "Buscar pessoas",
            value: query,
            onChange: setQuery,
          }}
          sections={[
            {
              kind: "multi",
              id: "permission",
              label: "Permissão",
              value: permissionFilter,
              onChange: (next) => setPermissionFilter(next as Permission[]),
              options: permissions.map((permission) => ({
                value: permission,
                label: permissionLabels[permission].label,
                leading: <ShieldCheckIcon size={16} color={theme.tones[permissionTones[permission]].fg} />,
                count: members.filter((member) => member.permission === permission).length,
              })),
            },
            {
              kind: "single",
              id: "status",
              label: "Situação",
              value: statusFilter,
              defaultValue: "all",
              onChange: (value) => setStatusFilter(value as typeof statusFilter),
              options: [
                { value: "active", label: "Ativas", leading: <CheckCircleIcon size={16} />, count: active.length },
                {
                  value: "invited",
                  label: "Convite pendente",
                  leading: <PaperPlaneTiltIcon size={16} />,
                  count: invited.length,
                },
                { value: "all", label: "Todas", leading: <UsersThreeIcon size={16} />, count: members.length },
              ],
            },
          ]}
        />

        {view === "cards" ? (
          visible.length === 0 ? (
            <Muted>Ninguém encontrado com essa busca.</Muted>
          ) : (
            <Cards>
              {visible.map((member) => {
                const self = member.id === currentUser.id;
                return (
                  <MemberCard key={member.id} aria-label={member.name}>
                    <CardTop>
                      <Inline>
                        <Avatar name={member.name} seed={member.seed} src={member.avatarUrl} size="lg" shape="circle" />
                        <Person>
                          <span>
                            {member.name} {self && <You>(você)</You>}
                          </span>
                          <small>{member.email}</small>
                        </Person>
                      </Inline>
                      {memberMenu(member, self)}
                    </CardTop>
                    <CardField>
                      Função
                      {roleField(member)}
                    </CardField>
                    <CardField>
                      Permissão
                      {permissionCell(member, self)}
                    </CardField>
                    <CardFoot>
                      {statusPill(member)}
                      {lastSeen(member)}
                    </CardFoot>
                  </MemberCard>
                );
              })}
            </Cards>
          )
        ) : (
          <TableCard>
            <Table>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Função</th>
                  <th>Permissão</th>
                  <th>Status</th>
                  <th>Entrou em</th>
                  <th>Último acesso</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {visible.map((member) => {
                  const self = member.id === currentUser.id;
                  return (
                    <tr key={member.id}>
                      <td>
                        <Inline>
                          <Avatar
                            name={member.name}
                            seed={member.seed}
                            src={member.avatarUrl}
                            size="sm"
                            shape="circle"
                          />
                          <Person>
                            <span>
                              {member.name} {self && <You>(você)</You>}
                            </span>
                            <small>{member.email}</small>
                          </Person>
                        </Inline>
                      </td>
                      <td>{roleField(member)}</td>
                      <td>{permissionCell(member, self)}</td>
                      <td>{statusPill(member)}</td>
                      <td>
                        <Muted>{formatDate(`${member.joinedAt}T12:00:00`)}</Muted>
                      </td>
                      <td>{lastSeen(member)}</td>
                      <td>{memberMenu(member, self)}</td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <Muted>Ninguém encontrado com essa busca.</Muted>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableCard>
        )}

        <Legend aria-label="O que cada permissão pode fazer">
          {permissions.map((permission) => (
            <div key={permission}>
              <Pill $tone={permissionTones[permission]}>{permissionLabels[permission].label}</Pill>
              {permissionLabels[permission].description}
            </div>
          ))}
        </Legend>
      </div>

      <Dialog
        open={inviting}
        onClose={closeInvite}
        title="Convidar pessoa"
        description="Ela recebe um e-mail para criar a senha e entrar no sistema."
        footer={
          <>
            <Button variant="ghost" onClick={closeInvite}>
              Cancelar
            </Button>
            <Button
              icon={PaperPlaneTiltIcon}
              disabled={!validInvite || emailTaken}
              loading={sending}
              onClick={() =>
                runInvite(() => {
                  inviteMember({
                    name: draft.name.trim(),
                    email: draft.email.trim(),
                    role: draft.role.trim(),
                    permission: draft.permission,
                  });
                  closeInvite();
                })
              }
            >
              Enviar convite
            </Button>
          </>
        }
      >
        <TextField
          label="Nome"
          icon={UserIcon}
          placeholder="Nome completo"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <TextField
          label="E-mail"
          icon={EnvelopeSimpleIcon}
          inputMode="email"
          placeholder="nome@email.com"
          value={draft.email}
          mask={maskEmail}
          error={emailTaken ? "Já existe alguém com esse e-mail na equipe." : undefined}
          onChange={(event) => setDraft({ ...draft, email: event.target.value })}
        />
        <TextField
          label="Função no ateliê"
          placeholder="Ex.: Modelista, Atendimento"
          hint="Opcional. Aparece para a equipe ao escolher o responsável."
          value={draft.role}
          onChange={(event) => setDraft({ ...draft, role: event.target.value })}
        />
        <Select
          label="Permissão"
          heading="O que pode fazer"
          width="trigger"
          value={draft.permission}
          onChange={(permission) => setDraft({ ...draft, permission })}
          options={permissions.map((permission) => ({
            value: permission,
            label: permissionLabels[permission].label,
            description: permissionLabels[permission].description,
          }))}
        />
      </Dialog>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={removing?.status === "invited" ? "Cancelar convite?" : "Remover da equipe?"}
        description={
          removing?.status === "invited"
            ? `O convite de ${removing?.name} deixa de valer.`
            : `${removing?.name} perde o acesso na hora. Os leads dela continuam no sistema.`
        }
        width="24rem"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Voltar
            </Button>
            <Button
              variant="danger"
              icon={TrashIcon}
              onClick={() => {
                if (removing) removeMember(removing.id);
                setRemoving(null);
              }}
            >
              {removing?.status === "invited" ? "Cancelar convite" : "Remover"}
            </Button>
          </>
        }
      />
    </Page>
  );
}
