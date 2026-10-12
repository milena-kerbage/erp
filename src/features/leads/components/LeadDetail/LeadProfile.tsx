"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "@emotion/react";
import {
  ArchiveIcon,
  ArrowSquareInIcon,
  ArrowSquareOutIcon,
  AtIcon,
  BrowserIcon,
  CalendarBlankIcon,
  CalendarPlusIcon,
  CaretLeftIcon,
  CaretUpDownIcon,
  ChatCircleIcon,
  CheckIcon,
  ClipboardTextIcon,
  CurrencyCircleDollarIcon,
  CursorClickIcon,
  DeviceMobileIcon,
  EnvelopeSimpleIcon,
  HashIcon,
  InstagramLogoIcon,
  LinkIcon,
  LinkSimpleIcon,
  MapPinIcon,
  MegaphoneSimpleIcon,
  PencilSimpleIcon,
  PhoneIcon,
  PlusIcon,
  SignpostIcon,
  SparkleIcon,
  TagIcon,
  TagSimpleIcon,
  UploadSimpleIcon,
  UserCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataGroup, DataItem } from "@/components/ui/DataList";
import { DatePicker } from "@/components/ui/DatePicker";
import { EditableText, FieldTrigger } from "@/components/ui/Editable";
import { FileItem } from "@/components/ui/FileItem";
import { IconButton } from "@/components/ui/IconButton";
import { IconTile } from "@/components/ui/IconTile";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { Select, type SelectTriggerProps } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { Tag, toneFor } from "@/components/ui/Tag";
import { Tooltip } from "@/components/ui/Tooltip";
import { VisuallyHidden } from "@/components/ui/VisuallyHidden";
import { copyText } from "@/lib/clipboard";
import { formatDate, formatDateTime, formatLongDate, formatRelativeDays, parseDateOnly } from "@/lib/format";
import { maskCurrency, maskEmail, maskInstagram, maskPhone, toCurrencyInput } from "@/lib/masks";
import { NarrowOnly, WideOnly } from "@/styles/responsive";
import type { Tone } from "@/styles/theme";
import { formatBudget, formatPhone } from "../../format";
import type { Funnel } from "../../funnels";
import { useFunnels } from "@/features/settings/store";
import {
  defaultTags,
  eventTypes,
  findChoice,
  leadSources,
  parseBudget,
  parsePhone,
  type ChoiceOption,
} from "../../options";
import type { Campaign, Lead, LeadDetails } from "../../types";
import { OwnerSelect as TeamSelect } from "../OwnerSelect";
import { StagePipeline } from "../StagePipeline";
import {
  Dropzone,
  FileList,
  LinkForm,
  LinkList,
  LinkRow,
  LinksFooter,
  LinkTexts,
  Mono,
  Notice,
  OwnerButton,
  Profile,
  ProfileDock,
  ProfileMeta,
  ProfileName,
  ProfileTexts,
  Scroll,
  StageSection,
  TabsArea,
  TagList,
  TopBar,
  TopBarActions,
} from "./styles";

type Tab = "details" | "campaign" | "files";

export type LeadPatch = Partial<Pick<Lead, "name" | "phone" | "budget" | "tags">>;
export type DetailsPatch = Partial<LeadDetails>;

type LeadProfileProps = {
  lead: Lead;
  details: LeadDetails;
  funnel: Funnel;
  /** Etiquetas já usadas em outros leads (sugestões). */
  knownTags: readonly string[];
  onMove: (stage: string) => void;
  onChangeFunnel: (funnelId: string) => void;
  onUpdateLead: (patch: LeadPatch) => void;
  onUpdateDetails: (patch: DetailsPatch) => void;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (id: string) => void;
  onArchive: () => void;
};

/** Ficha da oportunidade: os campos das abas mudam direto no clique. */
export function LeadProfile({
  lead,
  details,
  funnel,
  knownTags,
  onMove,
  onChangeFunnel,
  onUpdateLead,
  onUpdateDetails,
  onAddFiles,
  onRemoveFile,
  onArchive,
}: LeadProfileProps) {
  const [tab, setTab] = useState<Tab>("details");
  const { funnels } = useFunnels();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  /** Copia e confirma no próprio botão de ações por 1,5 s. */
  const copy = async (text: string, what: string) => {
    if (!(await copyText(text))) return;
    setCopied(what);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1500);
  };

  // As abas grudam logo abaixo do cliente fixo: a altura dele vira --profile-dock.
  useLayoutEffect(() => {
    const dock = dockRef.current;
    const scroll = scrollRef.current;
    if (!dock || !scroll) return;
    const observer = new ResizeObserver(() => scroll.style.setProperty("--profile-dock", `${dock.offsetHeight}px`));
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);

  const stage = funnel.stages.find((item) => item.id === lead.stage);
  const phone = formatPhone(lead.phone);

  /** Resumo para colar em qualquer lugar (WhatsApp da equipe, e-mail...). */
  const summary = () =>
    [
      lead.name,
      `Telefone: ${phone}`,
      details.email && `E-mail: ${details.email}`,
      `Funil: ${funnel.name} / Etapa: ${stage?.label ?? lead.stage}`,
      `Orçamento: ${formatBudget(lead.budget)}`,
      `Responsável: ${details.owner.name}`,
      window.location.href,
    ]
      .filter(Boolean)
      .join("\n");

  return (
    <Scroll ref={scrollRef}>
      {/* Voltar, ações e cliente ficam fixos no topo ao rolar a ficha */}
      <ProfileDock ref={dockRef}>
        <TopBar>
          <IconButton
            href={`/leads?funil=${lead.funnelId}`}
            icon={CaretLeftIcon}
            label="Voltar para leads"
            tooltip="bottom"
          />

          <TopBarActions>
            <OwnerSelect
              details={details}
              onUpdateDetails={onUpdateDetails}
              align="end"
              trigger={({ open, ...props }) => (
                <Tooltip label={`Responsável: ${details.owner.name}`} side="bottom" disabled={open}>
                  <OwnerButton type="button" {...props} aria-label={`Responsável: ${details.owner.name}. Trocar`}>
                    <Avatar
                      name={details.owner.name}
                      seed={details.owner.seed}
                      src={details.owner.avatarUrl}
                      size="xs"
                      shape="circle"
                    />
                  </OwnerButton>
                </Tooltip>
              )}
            />

            <Menu
              label="Ações do lead"
              align="end"
              width="15rem"
              trigger={(props) => (
                <IconButton
                  {...props}
                  icon={copied ? CheckIcon : CaretUpDownIcon}
                  label={copied ? `${copied} copiado` : "Ações"}
                  tooltip="bottom"
                />
              )}
            >
              <MenuItem
                icon={EnvelopeSimpleIcon}
                href={details.email ? `mailto:${details.email}` : undefined}
                disabled={!details.email}
              >
                Enviar e-mail
              </MenuItem>
              <MenuSeparator />
              <MenuLabel>Copiar</MenuLabel>
              <MenuItem
                icon={AtIcon}
                disabled={!details.email}
                onSelect={() => details.email && copy(details.email, "E-mail")}
              >
                E-mail
              </MenuItem>
              <MenuItem icon={PhoneIcon} onSelect={() => copy(phone, "Telefone")}>
                Telefone
              </MenuItem>
              <MenuItem icon={ClipboardTextIcon} onSelect={() => copy(summary(), "Resumo")}>
                Resumo da oportunidade
              </MenuItem>
              <MenuItem icon={LinkIcon} onSelect={() => copy(window.location.href, "Link")}>
                Link da oportunidade
              </MenuItem>
              <MenuSeparator />
              <MenuItem icon={ArchiveIcon} muted onSelect={onArchive}>
                Arquivar
              </MenuItem>
            </Menu>
            <VisuallyHidden role="status">{copied ? `${copied} copiado` : ""}</VisuallyHidden>
          </TopBarActions>
        </TopBar>

        <Profile>
          <Avatar name={lead.name} src={lead.photoUrl} seed={lead.id} size="xl" shape="circle" />
          <ProfileTexts>
            <ProfileName>{lead.name}</ProfileName>
            {details.email && <ProfileMeta>{details.email}</ProfileMeta>}
            <ProfileMeta>{phone}</ProfileMeta>
          </ProfileTexts>
        </Profile>
      </ProfileDock>

      <StageSection>
        <StagePipeline
          stages={funnel.stages}
          current={lead.stage}
          onMove={onMove}
          leading={
            <Select
              label="Funil"
              heading="Mover para outro funil"
              align="start"
              width="16.5rem"
              value={funnel.id}
              onChange={(id) => id !== funnel.id && onChangeFunnel(id)}
              options={funnels.map((item) => ({
                value: item.id,
                label: item.name,
                meta: `${item.stages.length} etapas`,
                leading: <IconTile icon={item.icon} tone={item.tone} />,
              }))}
              trigger={({ open: _open, ...props }) => (
                <FieldTrigger type="button" {...props} aria-label={`Funil: ${funnel.name}. Trocar`}>
                  <IconTile icon={funnel.icon} tone={funnel.tone} size="sm" />
                  {funnel.name}
                </FieldTrigger>
              )}
            />
          }
        />
      </StageSection>

      <TabsArea>
        <Tabs
          label="Informações da oportunidade"
          value={tab}
          onChange={setTab}
          items={[
            { value: "details", label: "Detalhes" },
            { value: "campaign", label: "Campanha" },
            { value: "files", label: "Arquivos", count: details.attachments.length },
          ]}
        >
          {tab === "details" && (
            <DetailsTab
              lead={lead}
              details={details}
              knownTags={knownTags}
              onUpdateLead={onUpdateLead}
              onUpdateDetails={onUpdateDetails}
            />
          )}
          {tab === "campaign" && <CampaignTab details={details} onUpdateDetails={onUpdateDetails} />}
          {tab === "files" && <FilesTab details={details} onAddFiles={onAddFiles} onRemoveFile={onRemoveFile} />}
        </Tabs>
      </TabsArea>
    </Scroll>
  );
}

/* ---------- Campos ---------- */

type OwnerSelectProps = {
  details: LeadDetails;
  onUpdateDetails: (patch: DetailsPatch) => void;
  align: "start" | "end";
  trigger: (props: SelectTriggerProps) => ReactNode;
};

function OwnerSelect({ details, onUpdateDetails, align, trigger }: OwnerSelectProps) {
  return (
    <TeamSelect
      value={details.owner}
      align={align}
      onChange={(owner) => onUpdateDetails({ owner })}
      trigger={trigger}
    />
  );
}

/** Escolha entre opções fixas: o valor aparece como selo no tom da opção. */
function ChoiceField({
  label,
  heading,
  value,
  options,
  onChange,
}: {
  label: string;
  /** Pergunta que o dropdown responde (ex.: "Como chegou até nós"). */
  heading: string;
  value: string | undefined;
  options: readonly ChoiceOption[];
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const current = findChoice(options, value);

  return (
    <Select
      label={label}
      heading={heading}
      align="start"
      width="15rem"
      value={value ?? null}
      onChange={onChange}
      options={options.map((option) => ({
        value: option.value,
        label: option.value,
        leading: <option.icon size={18} color={theme.tones[option.tone].fg} />,
      }))}
      trigger={({ open: _open, ...props }) =>
        current ? (
          <FieldTrigger
            type="button"
            {...props}
            $variant="badge"
            $tone={current.tone}
            aria-label={`${label}: ${current.value}. Trocar`}
          >
            <current.icon weight="bold" aria-hidden />
            {current.value}
          </FieldTrigger>
        ) : (
          <FieldTrigger type="button" {...props} $empty aria-label={`${label}: vazio. Escolher`}>
            Vazio
          </FieldTrigger>
        )
      }
    />
  );
}

/** Tom do prazo: passado neutro, próximo (até 30 dias) em destaque. */
function dueTone(date: Date): Tone {
  const days = (date.getTime() - Date.now()) / 86_400_000;
  if (days < -1) return "neutral";
  return days <= 30 ? "rose" : "peach";
}

function PhoneField({ lead, onUpdateLead }: { lead: Lead; onUpdateLead: (patch: LeadPatch) => void }) {
  return (
    <EditableText
      label="Telefone"
      type="tel"
      inputMode="tel"
      placeholder="(00) 00000-0000"
      value={formatPhone(lead.phone)}
      mask={maskPhone}
      onSave={(value) => {
        const digits = parsePhone(value);
        // Ignora números incompletos (mantém o anterior)
        if (digits.length >= 10) onUpdateLead({ phone: digits });
      }}
    />
  );
}

/* ---------- Abas ---------- */

/** Abas da ficha, também usadas no modal do cliente (Clientes). */
export function DetailsTab({
  lead,
  details,
  knownTags,
  onUpdateLead,
  onUpdateDetails,
}: {
  lead: Lead;
  details: LeadDetails;
  knownTags: readonly string[];
  onUpdateLead: (patch: LeadPatch) => void;
  onUpdateDetails: (patch: DetailsPatch) => void;
}) {
  const theme = useTheme();
  const phone = formatPhone(lead.phone);
  const eventDate = details.eventDate ? parseDateOnly(details.eventDate) : null;
  const tagOptions = [...new Set([...defaultTags, ...knownTags, ...lead.tags])].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );

  return (
    <>
      <DataGroup title="Contato">
        <DataItem label="Telefone" icon={PhoneIcon} copy={phone}>
          <PhoneField lead={lead} onUpdateLead={onUpdateLead} />
        </DataItem>
        <DataItem label="E-mail" icon={EnvelopeSimpleIcon} copy={details.email}>
          <EditableText
            label="E-mail"
            inputMode="email"
            placeholder="nome@email.com"
            value={details.email ?? ""}
            mask={maskEmail}
            onSave={(email) => onUpdateDetails({ email: email || undefined })}
          />
        </DataItem>
        <DataItem label="Instagram" icon={InstagramLogoIcon} copy={details.instagram}>
          <EditableText
            label="Instagram"
            placeholder="@usuario"
            value={details.instagram ?? ""}
            mask={maskInstagram}
            onSave={(instagram) => onUpdateDetails({ instagram: instagram || undefined })}
          />
        </DataItem>
        <DataItem label="Cidade" icon={MapPinIcon}>
          <EditableText
            label="Cidade"
            placeholder="Cidade, UF"
            value={details.city ?? ""}
            onSave={(city) => onUpdateDetails({ city: city || undefined })}
          />
        </DataItem>
      </DataGroup>

      <DataGroup title="Evento">
        <DataItem label="Tipo de evento" icon={SparkleIcon}>
          <ChoiceField
            label="Tipo de evento"
            heading="Qual é o evento"
            value={details.eventType}
            options={eventTypes}
            onChange={(eventType) => onUpdateDetails({ eventType })}
          />
        </DataItem>
        <DataItem label="Data do evento" icon={CalendarBlankIcon}>
          <DatePicker
            label="Data do evento"
            value={details.eventDate}
            onChange={(value) => onUpdateDetails({ eventDate: value })}
            trigger={({ open: _open, ...props }) =>
              eventDate ? (
                <FieldTrigger
                  type="button"
                  {...props}
                  aria-label={`Data do evento, ${formatLongDate(eventDate)}, trocar`}
                >
                  {formatLongDate(eventDate)}
                  <Badge tone={dueTone(eventDate)} icon={CalendarBlankIcon}>
                    {formatRelativeDays(eventDate)}
                  </Badge>
                </FieldTrigger>
              ) : (
                <FieldTrigger type="button" {...props} $empty aria-label="Data do evento: vazio. Escolher">
                  Vazio
                </FieldTrigger>
              )
            }
          />
        </DataItem>
      </DataGroup>

      <DataGroup title="Oportunidade">
        <DataItem label="Orçamento" icon={CurrencyCircleDollarIcon}>
          <EditableText
            label="Orçamento"
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={formatBudget(lead.budget)}
            editValue={toCurrencyInput(lead.budget)}
            mask={maskCurrency}
            onSave={(value) => {
              const budget = parseBudget(value);
              if (budget !== null) onUpdateLead({ budget });
            }}
          />
        </DataItem>
        <DataItem label="Origem" icon={SignpostIcon}>
          <ChoiceField
            label="Origem"
            heading="Como chegou até nós"
            value={details.source}
            options={leadSources}
            onChange={(source) => onUpdateDetails({ source })}
          />
        </DataItem>
        <DataItem label="Responsável" icon={UserCircleIcon}>
          <OwnerSelect
            details={details}
            onUpdateDetails={onUpdateDetails}
            align="start"
            trigger={({ open: _open, ...props }) => (
              <FieldTrigger
                type="button"
                {...props}
                $variant="pill"
                aria-label={`Responsável: ${details.owner.name}. Trocar`}
              >
                <Avatar
                  name={details.owner.name}
                  src={details.owner.avatarUrl}
                  seed={details.owner.seed}
                  size="xs"
                  shape="circle"
                />
                {details.owner.name}
              </FieldTrigger>
            )}
          />
        </DataItem>
        <DataItem label="Etiquetas" icon={TagIcon}>
          <Select
            multiple
            searchable
            label="Etiquetas"
            heading="Etiquetas do lead"
            searchPlaceholder="Buscar ou criar etiqueta..."
            align="start"
            width="16rem"
            value={lead.tags}
            onChange={(tags) => onUpdateLead({ tags })}
            onCreate={(tag) => !lead.tags.includes(tag) && onUpdateLead({ tags: [...lead.tags, tag] })}
            createLabel={(tag) => `Criar etiqueta “${tag}”`}
            options={tagOptions.map((tag) => ({
              value: tag,
              label: tag,
              leading: <TagSimpleIcon size={18} color={theme.tones[toneFor(tag)].fg} />,
            }))}
            trigger={({ open: _open, ...props }) => (
              <FieldTrigger
                type="button"
                {...props}
                $empty={lead.tags.length === 0}
                aria-label={`Etiquetas: ${lead.tags.join(", ") || "nenhuma"}. Editar`}
              >
                {lead.tags.length > 0 ? (
                  <TagList>
                    {lead.tags.map((tag) => (
                      <Tag key={tag} tone={toneFor(tag)}>
                        {tag}
                      </Tag>
                    ))}
                  </TagList>
                ) : (
                  "Vazio"
                )}
              </FieldTrigger>
            )}
          />
        </DataItem>
        <DataItem label="Criado em" icon={CalendarPlusIcon}>
          {formatDateTime(lead.createdAt)}
        </DataItem>
        <DataItem label="Último contato" icon={ChatCircleIcon}>
          {details.lastContactAt && formatDateTime(details.lastContactAt)}
        </DataItem>
      </DataGroup>

      <LinksGroup details={details} onUpdateDetails={onUpdateDetails} />
    </>
  );
}

/** Domínio do link (ou o próprio texto, se não for uma URL válida). */
function hostOf(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function LinksGroup({
  details,
  onUpdateDetails,
}: {
  details: LeadDetails;
  onUpdateDetails: (patch: DetailsPatch) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const close = () => {
    setLabel("");
    setUrl("");
    setAdding(false);
  };

  const save = () => {
    const href = url.trim();
    if (!href) return;
    const normalized = /^https?:\/\//i.test(href) ? href : `https://${href}`;
    if (!details.links.some((link) => link.url === normalized)) {
      onUpdateDetails({
        links: [...details.links, { label: label.trim() || hostOf(normalized), url: normalized }],
      });
    }
    close();
  };

  return (
    <DataGroup title="Links" plain>
      {details.links.length > 0 && (
        <LinkList>
          {details.links.map((link) => (
            <li key={link.url}>
              <LinkRow>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <LinkSimpleIcon size={16} aria-hidden />
                  <LinkTexts>
                    {link.label}
                    <small>{hostOf(link.url)}</small>
                  </LinkTexts>
                  <ArrowSquareOutIcon size={14} aria-hidden />
                </a>
                <IconButton
                  icon={XIcon}
                  label={`Remover ${link.label}`}
                  variant="ghost"
                  size="sm"
                  tooltip="left"
                  onClick={() => onUpdateDetails({ links: details.links.filter((item) => item.url !== link.url) })}
                />
              </LinkRow>
            </li>
          ))}
        </LinkList>
      )}

      {adding ? (
        <LinkForm
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
          onKeyDown={(event) => event.key === "Escape" && close()}
        >
          <input
            aria-label="Endereço do link"
            placeholder="Endereço (https://...)"
            inputMode="url"
            value={url}
            autoFocus
            onChange={(event) => setUrl(event.target.value.replace(/\s/g, ""))}
          />
          <input
            aria-label="Nome do link"
            placeholder="Nome (opcional)"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          <div>
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={!url.trim()}>
              Adicionar
            </Button>
          </div>
        </LinkForm>
      ) : (
        <LinksFooter>
          <Button variant="ghost" size="sm" icon={PlusIcon} onClick={() => setAdding(true)}>
            Adicionar link
          </Button>
        </LinksFooter>
      )}
    </DataGroup>
  );
}

const utms: [string, keyof Campaign][] = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_content", "utmContent"],
  ["utm_term", "utmTerm"],
];

/** UTM: minúsculas e sem espaços, como vai na URL. */
const maskUtm = (input: string) => input.toLowerCase().replace(/\s+/g, "-");

export function CampaignTab({
  details,
  onUpdateDetails,
}: {
  details: LeadDetails;
  onUpdateDetails: (patch: DetailsPatch) => void;
}) {
  const campaign = details.campaign;

  if (!campaign) {
    return (
      <Notice>
        Sem dados de campanha. Este lead não veio de um anúncio ou link rastreado.
        <Button variant="secondary" size="sm" icon={PencilSimpleIcon} onClick={() => onUpdateDetails({ campaign: {} })}>
          Preencher manualmente
        </Button>
      </Notice>
    );
  }

  const update = (key: keyof Campaign, value: string) =>
    onUpdateDetails({ campaign: { ...campaign, [key]: value || undefined } });

  const trackedUrl = campaign.landingPage
    ? `${campaign.landingPage}?${utms
        .filter(([, key]) => campaign[key])
        .map(([name, key]) => `${name}=${encodeURIComponent(campaign[key]!)}`)
        .join("&")}`
    : undefined;

  return (
    <>
      <DataGroup title="Origem">
        <DataItem label="Canal" icon={SignpostIcon}>
          <ChoiceField
            label="Canal"
            heading="Como chegou até nós"
            value={details.source}
            options={leadSources}
            onChange={(source) => onUpdateDetails({ source })}
          />
        </DataItem>
        <DataItem label="Anúncio" icon={MegaphoneSimpleIcon} copy={campaign.ad}>
          <EditableText
            label="Anúncio"
            placeholder="Nome do anúncio"
            value={campaign.ad ?? ""}
            onSave={(value) => update("ad", value)}
          />
        </DataItem>
        <DataItem label="Primeiro acesso" icon={CursorClickIcon}>
          {campaign.firstVisitAt && formatDateTime(campaign.firstVisitAt)}
        </DataItem>
        <DataItem label="Dispositivo" icon={DeviceMobileIcon}>
          <EditableText
            label="Dispositivo"
            placeholder="Celular / iOS"
            value={campaign.device ?? ""}
            onSave={(value) => update("device", value)}
          />
        </DataItem>
      </DataGroup>

      <DataGroup title="UTMs">
        {utms.map(([name, key]) => (
          <DataItem key={key} label={name} icon={HashIcon} copy={campaign[key]}>
            <EditableText
              label={name}
              value={campaign[key] ?? ""}
              display={campaign[key] ? <Mono>{campaign[key]}</Mono> : undefined}
              mask={maskUtm}
              onSave={(value) => update(key, value)}
            />
          </DataItem>
        ))}
      </DataGroup>

      <DataGroup title="Rastreamento">
        <DataItem label="Página de entrada" icon={BrowserIcon} copy={trackedUrl}>
          <EditableText
            label="Página de entrada"
            type="url"
            inputMode="url"
            placeholder="https://..."
            value={campaign.landingPage ?? ""}
            display={campaign.landingPage?.replace(/^https?:\/\//, "")}
            mask={(input) => input.replace(/\s/g, "")}
            onSave={(value) => update("landingPage", value)}
          />
        </DataItem>
        <DataItem label="Referenciador" icon={ArrowSquareInIcon} copy={campaign.referrer}>
          <EditableText
            label="Referenciador"
            placeholder="instagram.com"
            value={campaign.referrer ?? ""}
            mask={(input) => input.replace(/\s/g, "").toLowerCase()}
            onSave={(value) => update("referrer", value)}
          />
        </DataItem>
      </DataGroup>
    </>
  );
}

export function FilesTab({
  details,
  onAddFiles,
  onRemoveFile,
}: {
  details: LeadDetails;
  onAddFiles: (files: FileList | File[]) => void;
  onRemoveFile: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <>
      <Dropzone
        type="button"
        $active={dragging}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onAddFiles(event.dataTransfer.files);
        }}
      >
        <UploadSimpleIcon size={20} aria-hidden />
        <span>
          <WideOnly>
            <strong>Clique para enviar</strong> ou arraste arquivos aqui
          </WideOnly>
          <NarrowOnly>
            <strong>Toque para enviar arquivos</strong>
          </NarrowOnly>
        </span>
        <small>Referências, medidas, orçamentos, contratos…</small>
      </Dropzone>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) onAddFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {details.attachments.length > 0 ? (
        <FileList>
          {[...details.attachments].reverse().map((file) => (
            <FileItem
              key={file.id}
              name={file.name}
              size={file.size}
              type={file.type}
              url={file.url}
              meta={formatDate(file.addedAt)}
              onRemove={() => onRemoveFile(file.id)}
            />
          ))}
        </FileList>
      ) : (
        <Notice>Nenhum arquivo ainda.</Notice>
      )}
    </>
  );
}
