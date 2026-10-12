"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellIcon,
  ChatCircleDotsIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  GlobeHemisphereWestIcon,
  MapPinIcon,
  StorefrontIcon,
  UserFocusIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { maskEmail, maskPhone } from "@/lib/masks";
import { formatPhone } from "@/features/leads/format";
import { parsePhone } from "@/features/leads/options";
import { useWorkspace } from "../store";
import type { Preferences } from "../types";
import { Divider, FieldGrid, Page, PageHeader, SaveBar, Section, ToggleRow, usePending } from "./ui";

const timeZones = [
  { value: "America/Sao_Paulo", label: "Brasília", meta: "GMT-3" },
  { value: "America/Manaus", label: "Manaus", meta: "GMT-4" },
  { value: "America/Rio_Branco", label: "Rio Branco", meta: "GMT-5" },
  { value: "America/Noronha", label: "Fernando de Noronha", meta: "GMT-2" },
];

const staleOptions = [1, 2, 3, 5, 7, 15].map((days) => ({
  value: String(days),
  label: days === 1 ? "1 dia" : `${days} dias`,
}));

/** Preferências do ateliê: dados de contato, horário, conversas, leads e avisos. */
export function PreferencesSettings() {
  const { preferences, updatePreferences, currentUser, loading } = useWorkspace();
  const [draft, setDraft] = useState<Preferences>(preferences);
  const [saving, save] = usePending();
  const initialized = useRef(false);
  useEffect(() => { if (!loading && !initialized.current) { setDraft(preferences); initialized.current = true; } }, [loading, preferences]);

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);
  const invalid = !draft.workspaceName.trim() || draft.openingTime >= draft.closingTime;

  return (
    <Page>
      <PageHeader
        title="Preferências"
        description="Como o ateliê funciona no sistema: contato, horário de atendimento, conversas e avisos."
      />

      <fieldset disabled={loading || currentUser.permission !== "admin"} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <Section
          title="Ateliê"
          icon={StorefrontIcon}
          description="Nome e contatos que aparecem para a equipe e nas mensagens automáticas."
        >
          <TextField
            label="Nome do ateliê"
            icon={StorefrontIcon}
            value={draft.workspaceName}
            error={draft.workspaceName.trim() ? undefined : "Informe o nome do ateliê."}
            onChange={(event) => set("workspaceName", event.target.value)}
          />
          <FieldGrid>
            <TextField
              label="WhatsApp comercial"
              icon={WhatsappLogoIcon}
              inputMode="tel"
              value={formatPhone(draft.businessPhone)}
              mask={maskPhone}
              onChange={(event) => set("businessPhone", parsePhone(event.target.value))}
            />
            <TextField
              label="E-mail de contato"
              icon={EnvelopeSimpleIcon}
              inputMode="email"
              value={draft.businessEmail}
              mask={maskEmail}
              onChange={(event) => set("businessEmail", event.target.value)}
            />
          </FieldGrid>
          <TextField
            label="Cidade"
            icon={MapPinIcon}
            value={draft.city}
            onChange={(event) => set("city", event.target.value)}
          />
        </Section>

        <Section
          title="Região e horário"
          icon={ClockIcon}
          description="Fuso usado nas datas e o horário em que a equipe responde."
        >
          <FieldGrid>
            <Select
              label="Fuso horário"
              heading="Fuso horário"
              value={draft.timeZone}
              onChange={(value) => set("timeZone", value)}
              options={timeZones.map((zone) => ({
                ...zone,
                leading: <GlobeHemisphereWestIcon size={18} />,
              }))}
            />
            <Select
              label="A semana começa no"
              heading="Primeiro dia da semana"
              value={draft.weekStart}
              onChange={(value) => set("weekStart", value)}
              options={[
                { value: "sunday", label: "Domingo" },
                { value: "monday", label: "Segunda-feira" },
              ]}
            />
          </FieldGrid>
          <FieldGrid>
            <TextField
              label="Abre às"
              type="time"
              value={draft.openingTime}
              onChange={(event) => set("openingTime", event.target.value)}
            />
            <TextField
              label="Fecha às"
              type="time"
              value={draft.closingTime}
              error={draft.openingTime >= draft.closingTime ? "Precisa ser depois da abertura." : undefined}
              onChange={(event) => set("closingTime", event.target.value)}
            />
          </FieldGrid>
          <ToggleRow
            title="Atende aos sábados"
            description="No mesmo horário dos dias de semana."
            checked={draft.saturday}
            onChange={(value) => set("saturday", value)}
          />
        </Section>

        <Section
          title="Conversas"
          icon={ChatCircleDotsIcon}
          description="Como as mensagens são escritas e o que responder fora do horário."
        >
          <ToggleRow
            title="Enter envia a mensagem"
            description="Desligado, o Enter quebra a linha e o envio é pelo botão."
            checked={draft.enterSends}
            onChange={(value) => set("enterSends", value)}
          />
          <Divider />
          <ToggleRow
            title="Assinar mensagens com o nome de quem enviou"
            description="A cliente vê quem da equipe está falando com ela."
            checked={draft.signMessages}
            onChange={(value) => set("signMessages", value)}
          />
          <Divider />
          <ToggleRow
            title="Mensagem de ausência"
            description="Preferência reservada para a futura automação de ausência. O envio automático ainda não está ativo."
            disabled
            checked={draft.awayMessage}
            onChange={(value) => set("awayMessage", value)}
          />
          {draft.awayMessage && (
            <TextField
              multiline
              label="Texto da mensagem de ausência"
              value={draft.awayText}
              hint={`${draft.awayText.length}/500 caracteres`}
              maxLength={500}
              onChange={(event) => set("awayText", event.target.value)}
            />
          )}
        </Section>

        <Section
          title="Leads"
          icon={UserFocusIcon}
          description="Regras para nenhum lead ficar esquecido no quadro."
        >
          <Select
            label="Considerar parado depois de"
            heading="Lead sem resposta há"
            value={String(draft.staleLeadDays)}
            onChange={(value) => set("staleLeadDays", Number(value))}
            options={staleOptions}
            hint="sem resposta"
          />
          <Divider />
          <ToggleRow
            title="Distribuir novos leads automaticamente"
            description="Distribuição automática aguarda o executor de regras. Por enquanto, defina a pessoa responsável na oportunidade."
            disabled
            checked={draft.autoAssign}
            onChange={(value) => set("autoAssign", value)}
          />
        </Section>

        <Section title="Notificações" icon={BellIcon} description="Preferências de avisos da equipe. O envio por e-mail aguarda o serviço de e-mail.">
          <ToggleRow
            title="Novo lead"
            description="Quando alguém entra por qualquer canal."
            checked={draft.notifyNewLead}
            onChange={(value) => set("notifyNewLead", value)}
          />
          <Divider />
          <ToggleRow
            title="Nova mensagem"
            description="Só das conversas em que você é responsável."
            checked={draft.notifyNewMessage}
            onChange={(value) => set("notifyNewMessage", value)}
          />
          <Divider />
          <ToggleRow
            title="Lead parado"
            description={`Quando um lead passa de ${draft.staleLeadDays} ${draft.staleLeadDays === 1 ? "dia" : "dias"} sem resposta.`}
            checked={draft.notifyStaleLead}
            onChange={(value) => set("notifyStaleLead", value)}
          />
          <Divider />
          <ToggleRow
            title="Resumo diário por e-mail"
            description="Envio de resumo por e-mail aguarda a configuração do serviço de e-mail e agendamento."
            disabled
            checked={draft.dailySummary}
            onChange={(value) => set("dailySummary", value)}
          />
        </Section>
      </fieldset>

      <SaveBar
        visible={dirty}
        disabled={invalid || loading || currentUser.permission !== "admin"}
        onDiscard={() => setDraft(preferences)}
        saving={saving}
        onSave={() => save(() => updatePreferences(draft))}
      />
    </Page>
  );
}
