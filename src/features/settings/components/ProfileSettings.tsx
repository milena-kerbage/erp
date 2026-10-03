"use client";

import { useRef, useState } from "react";
import styled from "@emotion/styled";
import {
  BriefcaseIcon,
  CheckCircleIcon,
  DesktopIcon,
  EnvelopeSimpleIcon,
  KeyIcon,
  LockSimpleIcon,
  ShieldCheckIcon,
  SignOutIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { maskEmail, maskPhone } from "@/lib/masks";
import { formatPhone } from "@/features/leads/format";
import { parsePhone } from "@/features/leads/options";
import { permissionLabels, useWorkspace } from "../store";
import { Divider, FieldGrid, Inline, Page, PageHeader, Pill, SaveBar, Section, ToggleRow, usePending } from "./ui";

const MAX_PHOTO = 5 * 1024 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PhotoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
`;

const PhotoActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};

  > div {
    display: flex;
    gap: ${({ theme }) => theme.spacing(2)};
  }

  small {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/** Linha "título + detalhe" com ação à direita (senha, sessões). */
const ActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(4)};

  > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  strong {
    font-size: 0.8125rem;
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  span {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

/** Força da senha: pelo menos 8 caracteres, com letras e números. */
function strength(password: string) {
  if (!password) return null;
  const long = password.length >= 8;
  const mixed = /\d/.test(password) && /[a-z]/i.test(password);
  if (long && mixed && password.length >= 12) return { ok: true, text: "Senha forte" };
  if (long && mixed) return { ok: true, text: "Senha boa" };
  return { ok: false, text: "Use pelo menos 8 caracteres, com letras e números." };
}

/** Perfil da usuária logada: foto, dados e segurança. */
export function ProfileSettings() {
  const { currentUser, updateMember } = useWorkspace();
  const saved = {
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone ?? "",
    role: currentUser.role,
    avatarUrl: currentUser.avatarUrl ?? null,
  };
  const [draft, setDraft] = useState(saved);
  const [saving, runSave] = usePending();
  const [changingPassword, runPassword] = usePending(700);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [twoFactor, setTwoFactor] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const emailInvalid = !EMAIL.test(draft.email);
  const invalid = draft.name.trim().length < 2 || emailInvalid;

  const passwordStrength = strength(passwords.next);
  const mismatch = passwords.confirm.length > 0 && passwords.confirm !== passwords.next;
  const canChangePassword =
    passwords.current.length > 0 && Boolean(passwordStrength?.ok) && passwords.confirm === passwords.next;

  const closePassword = () => {
    setPasswordOpen(false);
    setPasswords({ current: "", next: "", confirm: "" });
  };

  return (
    <Page>
      <PageHeader title="Perfil" description="Seus dados no sistema: como a equipe e as clientes veem você." />

      <div>
        <Section title="Foto" icon={UserIcon} description="Aparece no menu, nas conversas e como responsável dos leads.">
          <PhotoRow>
            <Avatar name={draft.name} seed={currentUser.seed} src={draft.avatarUrl} size="xl" shape="circle" />
            <PhotoActions>
              <div>
                <Button variant="secondary" size="sm" icon={UploadSimpleIcon} onClick={() => fileRef.current?.click()}>
                  Trocar foto
                </Button>
                {draft.avatarUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={TrashIcon}
                    onClick={() => setDraft({ ...draft, avatarUrl: null })}
                  >
                    Remover
                  </Button>
                )}
              </div>
              <small>{photoError ?? "JPG ou PNG, até 5 MB. Sem foto, usamos um avatar ilustrado."}</small>
            </PhotoActions>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > MAX_PHOTO) {
                  setPhotoError("A foto passa de 5 MB. Escolha uma menor.");
                  return;
                }
                setPhotoError(null);
                setDraft({ ...draft, avatarUrl: URL.createObjectURL(file) });
              }}
            />
          </PhotoRow>
        </Section>

        <Section
          title="Dados pessoais"
          icon={UserIcon}
          description="Seu nome assina as mensagens (se ativado nas preferências) e aparece para a equipe."
        >
          <TextField
            label="Nome completo"
            icon={UserIcon}
            value={draft.name}
            error={draft.name.trim().length < 2 ? "Informe seu nome." : undefined}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          />
          <FieldGrid>
            <TextField
              label="E-mail de acesso"
              icon={EnvelopeSimpleIcon}
              inputMode="email"
              value={draft.email}
              mask={maskEmail}
              error={emailInvalid ? "E-mail inválido." : undefined}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            />
            <TextField
              label="WhatsApp"
              icon={WhatsappLogoIcon}
              inputMode="tel"
              placeholder="(00) 00000-0000"
              value={formatPhone(draft.phone)}
              mask={maskPhone}
              onChange={(event) => setDraft({ ...draft, phone: parsePhone(event.target.value) })}
            />
          </FieldGrid>
          <FieldGrid>
            <TextField
              label="Função no ateliê"
              icon={BriefcaseIcon}
              value={draft.role}
              onChange={(event) => setDraft({ ...draft, role: event.target.value })}
            />
            <ActionRow>
              <div>
                <strong>Permissão</strong>
                <span>{permissionLabels[currentUser.permission].description}</span>
              </div>
              <Pill $tone="blue">{permissionLabels[currentUser.permission].label}</Pill>
            </ActionRow>
          </FieldGrid>
        </Section>

        <Section title="Segurança" icon={ShieldCheckIcon} description="Senha, verificação em duas etapas e aparelhos conectados.">
          <ActionRow>
            <div>
              <strong>Senha</strong>
              <span>
                {passwordChanged ? (
                  <Inline>
                    <CheckCircleIcon size={13} weight="fill" aria-hidden />
                    Alterada agora
                  </Inline>
                ) : (
                  "Alterada há 3 meses"
                )}
              </span>
            </div>
            <Button variant="secondary" size="sm" icon={KeyIcon} onClick={() => setPasswordOpen(true)}>
              Alterar senha
            </Button>
          </ActionRow>
          <Divider />
          <ToggleRow
            title="Verificação em duas etapas"
            description="Pede um código do celular ao entrar em um aparelho novo."
            checked={twoFactor}
            onChange={setTwoFactor}
          />
          <Divider />
          <ActionRow>
            <div>
              <strong>
                <Inline>
                  <DesktopIcon size={15} aria-hidden />
                  Este navegador
                </Inline>
              </strong>
              <span>{signedOut ? "Só este aparelho está conectado." : "Ativo agora. Mais 1 aparelho conectado."}</span>
            </div>
            <Button variant="ghost" size="sm" icon={SignOutIcon} disabled={signedOut} onClick={() => setSignedOut(true)}>
              Sair dos outros aparelhos
            </Button>
          </ActionRow>
        </Section>
      </div>

      <SaveBar
        visible={dirty}
        disabled={invalid}
        onDiscard={() => {
          setDraft(saved);
          setPhotoError(null);
        }}
        saving={saving}
        onSave={() =>
          runSave(() =>
            updateMember(currentUser.id, {
              name: draft.name.trim(),
              email: draft.email.trim(),
              phone: draft.phone || undefined,
              role: draft.role.trim(),
              avatarUrl: draft.avatarUrl,
            }),
          )
        }
      />

      <Dialog
        open={passwordOpen}
        onClose={closePassword}
        title="Alterar senha"
        description="Depois de salvar, os outros aparelhos pedem a senha nova."
        width="26rem"
        footer={
          <>
            <Button variant="ghost" onClick={closePassword}>
              Cancelar
            </Button>
            <Button
              icon={LockSimpleIcon}
              disabled={!canChangePassword}
              loading={changingPassword}
              onClick={() =>
                // TODO: enviar para a API (a senha nunca fica guardada no navegador)
                runPassword(() => {
                  setPasswordChanged(true);
                  closePassword();
                })
              }
            >
              Salvar senha
            </Button>
          </>
        }
      >
        <TextField
          label="Senha atual"
          type="password"
          icon={LockSimpleIcon}
          autoComplete="current-password"
          value={passwords.current}
          onChange={(event) => setPasswords({ ...passwords, current: event.target.value })}
        />
        <TextField
          label="Nova senha"
          type="password"
          icon={KeyIcon}
          autoComplete="new-password"
          value={passwords.next}
          hint={passwordStrength?.ok ? passwordStrength.text : undefined}
          error={passwordStrength && !passwordStrength.ok ? passwordStrength.text : undefined}
          onChange={(event) => setPasswords({ ...passwords, next: event.target.value })}
        />
        <TextField
          label="Confirmar nova senha"
          type="password"
          icon={KeyIcon}
          autoComplete="new-password"
          value={passwords.confirm}
          error={mismatch ? "As senhas não são iguais." : undefined}
          onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })}
        />
      </Dialog>
    </Page>
  );
}
