"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOutIcon, CheckCircleIcon, CopyIcon, FloppyDiskIcon, KeyIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { FieldGrid, Pill } from "@/features/settings/components/ui";
import { errorMessage, whatsappRequest } from "@/features/whatsapp/client";
import { Actions, formatWhatsAppDate, Note, Notice, Stack } from "@/features/whatsapp/components/shared";
import type { ManagerConfiguration, ManagerOverview, ManagerSecretKey, ManagerValues } from "../types";
import { ManagerCard, ManagerGrid, TabBody } from "./ui";
import { LocalBootstrapButton } from "./LocalBootstrapButton";

const credentials: { key: ManagerSecretKey; label: string; hint: string }[] = [
  { key: "accessToken", label: "Token de acesso da Meta", hint: "Credencial emitida e autorizada pela Meta. O ERP armazena o token; não inventa uma credencial de acesso." },
  { key: "appSecret", label: "App Secret da Meta", hint: "Copie o segredo do aplicativo correto no Meta Developers. Valida notificações e protocolos assinados." },
  { key: "verifyToken", label: "Token de verificação do webhook", hint: "Segredo definido para confirmar o callback. Informe o mesmo valor na configuração do webhook na Meta." },
  { key: "suppressionSecret", label: "Chave de proteção da supressão", hint: "Protege a lista de contatos excluídos ou descadastrados. Deve permanecer estável para reconhecer os registros existentes." },
];
const emptySecrets = (): Record<ManagerSecretKey, string> => ({ accessToken: "", appSecret: "", verifyToken: "", suppressionSecret: "" });
type TokenInspection = { valid: boolean; appMatches: boolean; type: string; scopes: string[]; missingScopes: string[]; expiresAt: string | null; dataAccessExpiresAt: string | null };

export function ManagerConfigTab({ configuration, overview, onSaved }: { configuration: ManagerConfiguration; overview: ManagerOverview | null; onSaved: () => Promise<void> }) {
  const [values, setValues] = useState(configuration.values);
  const [secrets, setSecrets] = useState(emptySecrets);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [generation, setGeneration] = useState<"verifyToken" | "suppressionSecret" | null>(null);
  const [generating, setGenerating] = useState(false);
  const [oneTime, setOneTime] = useState<{ kind: string; value: string } | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [disabling, setDisabling] = useState<ManagerSecretKey | null>(null);
  const [disablingNow, setDisablingNow] = useState(false);
  const [tokenInspection, setTokenInspection] = useState<TokenInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [renewalConfirmation, setRenewalConfirmation] = useState("");
  const dirty = JSON.stringify(values) !== JSON.stringify(configuration.values) || Object.values(secrets).some(Boolean);
  const editable = configuration.editable && configuration.storageReady && configuration.encryptionReady;
  useEffect(() => { setValues(configuration.values); }, [configuration.values]);
  useEffect(() => { setTokenInspection(null); }, [configuration.secrets.accessToken.updatedAt, configuration.secrets.appSecret.updatedAt, configuration.values.appId, configuration.values.graphVersion]);

  function change<K extends keyof ManagerValues>(key: K, value: ManagerValues[K]) { setValues((current) => ({ ...current, [key]: value })); setSuccess(""); }

  async function save() {
    if (!editable || saving || !dirty) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const changedValues = Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== configuration.values[key as keyof ManagerValues]));
      const changedSecrets = Object.fromEntries(Object.entries(secrets).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
      await whatsappRequest("management/config", { method: "PUT", body: { values: changedValues, secrets: changedSecrets } });
      setSecrets(emptySecrets());
      setSuccess("Configuração gravada no servidor. As credenciais informadas foram armazenadas com criptografia; valide os acessos e atualize o webhook na Meta quando necessário.");
      await onSaved();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  }

  async function generate() {
    if (!generation || !editable || generating) return;
    setGenerating(true); setError("");
    try {
      const data = await whatsappRequest<{ kind: string; secret: string; stored: boolean }>("management/secrets", { body: { kind: generation } });
      if (!data.stored || !data.secret) throw new Error("O servidor não confirmou o armazenamento da chave.");
      setOneTime({ kind: data.kind, value: data.secret });
      setGeneration(null);
      await onSaved();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setGenerating(false); }
  }

  async function authorizeMeta() {
    if (!overview?.oauth?.available || authorizing) return;
    setAuthorizing(true); setError("");
    try {
      const data = await whatsappRequest<{ authorizationUrl: string }>("management/oauth/start", { body: { confirmation: "AUTORIZAR_META" } });
      const url = new URL(data.authorizationUrl);
      if (url.protocol !== "https:" || !["facebook.com", "www.facebook.com"].includes(url.hostname)) throw new Error("O servidor retornou um endereço de autorização inválido.");
      window.location.assign(url.toString());
    } catch (cause) { setError(errorMessage(cause)); setAuthorizing(false); }
  }

  async function disableSecret() {
    if (!disabling || disablingNow) return;
    setDisablingNow(true); setError(""); setSuccess("");
    try {
      await whatsappRequest("management/config", { method: "PUT", body: { removeSecrets: [disabling] } });
      setDisabling(null); setSuccess("Credencial desativada no servidor. Para voltar a utilizá-la, informe uma credencial válida e salve a configuração.");
      await onSaved();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setDisablingNow(false); }
  }

  async function inspectToken() {
    if (inspecting) return;
    setInspecting(true); setError("");
    try {
      const result = await whatsappRequest<{ token: TokenInspection; checkedAt: string }>("management/token", { body: { action: "inspect" } });
      setTokenInspection(result.token);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setInspecting(false); }
  }

  async function renewToken() {
    if (renewing || renewalConfirmation !== "RENOVAR") return;
    setRenewing(true); setError(""); setSuccess("");
    try {
      const result = await whatsappRequest<{ stored: boolean; expiresAt: string | null; expiresIn: number | null }>("management/token", { body: { action: "extend", confirmation: renewalConfirmation } });
      if (!result.stored) throw new Error("O servidor não confirmou o armazenamento do token renovado.");
      setRenewalOpen(false); setRenewalConfirmation("");
      setSuccess(`A Meta confirmou a troca de duração do token de usuário, armazenado criptografado no servidor. ${result.expiresAt ? `Expiração informada: ${formatWhatsAppDate(result.expiresAt)}.` : "Não foi informado prazo de expiração; isso não garante validade permanente."}`);
      await onSaved();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setRenewing(false); }
  }

  return <TabBody>
    {!editable && <Notice $error>O painel precisa de banco persistente, chave de criptografia e permissão de gestor antes de gravar configurações. As variáveis iniciais são preparadas uma vez na Vercel.</Notice>}
    {overview?.environment?.localBootstrapAvailable && <LocalBootstrapButton configured={configuration.encryptionReady} onPrepared={onSaved} />}
    <Actions><Button href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" icon={ArrowSquareOutIcon}>Meta Developers</Button><Button href="https://business.facebook.com/wa/manage/home/" target="_blank" rel="noopener noreferrer" variant="secondary" size="sm" icon={ArrowSquareOutIcon}>WhatsApp Manager</Button>{overview?.oauth?.available && <Button size="sm" loading={authorizing} disabled={!editable || saving} onClick={() => void authorizeMeta()}>Autorizar acesso na Meta</Button>}</Actions>
    {overview?.oauth && <Note>{overview.oauth.available ? "A autorização abre o fluxo oficial da Meta. O token autorizado é recebido e armazenado pelo servidor, sem ser devolvido ao navegador." : overview.oauth.reason || "O fluxo de autorização opcional ainda não foi habilitado para o aplicativo. Obtenha o token pela conta autorizada da Meta e use o campo seguro abaixo."}</Note>}
    <Note>O banco, a chave de criptografia e os e-mails autorizados dos gestores são o bootstrap privado da hospedagem. Depois disso, os campos e credenciais abaixo podem ser administrados neste painel. Campos de segredo vazios preservam a credencial atual.</Note>
    <ManagerCard><h4>Aplicativo e conta WhatsApp</h4><FieldGrid>
      <TextField label="App ID da Meta" value={values.appId} maxLength={30} inputMode="numeric" disabled={!editable || saving} onChange={(event) => change("appId", event.target.value)} />
      <TextField label="Versão da Graph API" placeholder="Versão suportada no painel da Meta" value={values.graphVersion} maxLength={10} disabled={!editable || saving} onChange={(event) => change("graphVersion", event.target.value)} hint="Formato vNN.0. Confira a versão vigente na conta antes de selecionar." />
      <TextField label="Phone Number ID" value={values.phoneNumberId} maxLength={30} inputMode="numeric" disabled={!editable || saving} onChange={(event) => change("phoneNumberId", event.target.value)} hint="ID do número empresarial, não o telefone com DDD." />
      <TextField label="WhatsApp Business Account ID (WABA)" value={values.businessAccountId} maxLength={30} inputMode="numeric" disabled={!editable || saving} onChange={(event) => change("businessAccountId", event.target.value)} />
    </FieldGrid></ManagerCard>
    <ManagerCard><h4>Ambiente e retenção</h4><FieldGrid>
      <TextField label="Origem pública HTTPS" value={values.publicBaseUrl} type="url" placeholder="https://app.ateliemilenakerbage.com.br" disabled={!editable || saving} onChange={(event) => change("publicBaseUrl", event.target.value)} hint="Use a origem sem caminho, credenciais, query ou fragmento. Os callbacks e políticas são montados com esta origem." />
      <TextField label="Retenção de mensagens, em dias" value={values.retentionDays} type="number" min={1} max={3650} disabled={!editable || saving} onChange={(event) => change("retentionDays", Number(event.target.value))} hint="Escolha um prazo coerente com a política de privacidade e a necessidade do atendimento." />
    </FieldGrid></ManagerCard>
    <ManagerCard><h4>Identificação e canais públicos de contato</h4><FieldGrid>
      <TextField label="Responsável jurídico / razão social" value={values.legalEntityName} maxLength={200} disabled={!editable || saving} onChange={(event) => change("legalEntityName", event.target.value)} />
      <TextField label="CNPJ" value={values.legalCnpj} maxLength={30} disabled={!editable || saving} onChange={(event) => change("legalCnpj", event.target.value)} />
      <TextField label="Endereço" value={values.legalAddress} maxLength={500} disabled={!editable || saving} onChange={(event) => change("legalAddress", event.target.value)} />
      <TextField label="E-mail de privacidade" type="email" value={values.legalPrivacyEmail} maxLength={254} disabled={!editable || saving} onChange={(event) => change("legalPrivacyEmail", event.target.value)} />
      <TextField label="E-mail de suporte" type="email" value={values.legalSupportEmail} maxLength={254} disabled={!editable || saving} onChange={(event) => change("legalSupportEmail", event.target.value)} />
      <TextField label="Telefone público do WhatsApp com país e DDD" value={values.legalWhatsAppPhone} maxLength={24} inputMode="tel" disabled={!editable || saving} onChange={(event) => change("legalWhatsAppPhone", event.target.value)} />
    </FieldGrid><Note>Confira como estes dados aparecem nas políticas públicas depois de salvar. Informe canais reais acompanhados pela empresa.</Note></ManagerCard>
    <ManagerGrid>{credentials.map((credential) => {
      const metadata = configuration.secrets[credential.key];
      const canGenerate = credential.key === "verifyToken" || credential.key === "suppressionSecret";
      return <ManagerCard key={credential.key}><Actions><h4>{credential.label}</h4><Pill $tone={metadata.configured ? "green" : "neutral"}>{metadata.configured ? "Armazenado" : "Pendente"}</Pill></Actions><Note>{credential.hint}</Note><Note>Origem atual: {metadata.source === "database" ? "banco criptografado" : metadata.source === "environment" ? "ambiente privado do servidor" : "nenhuma credencial"}.</Note>
        <TextField label={metadata.configured ? "Substituir credencial" : "Informar credencial"} type="password" autoComplete="off" spellCheck={false} maxLength={4096} value={secrets[credential.key]} disabled={!editable || saving || (credential.key === "suppressionSecret" && metadata.configured)} onChange={(event) => { setSecrets((current) => ({ ...current, [credential.key]: event.target.value })); setSuccess(""); }} hint="O valor atual nunca é retornado ao navegador. Deixe vazio para preservar." />
        {canGenerate && <Button size="sm" variant="secondary" icon={KeyIcon} disabled={!editable || saving || (credential.key === "suppressionSecret" && metadata.configured)} onClick={() => setGeneration(credential.key as "verifyToken" | "suppressionSecret")}>{metadata.configured ? "Gerar novo token de verificação" : "Gerar e armazenar no servidor"}</Button>}
        {metadata.configured && credential.key !== "suppressionSecret" && <Button size="sm" variant="ghost" disabled={!editable || saving} onClick={() => { setDisabling(credential.key); setError(""); }}>Desativar esta credencial</Button>}
      </ManagerCard>;
    })}</ManagerGrid>
    <ManagerCard><h4>Inspeção e duração do token Meta</h4><Note>Consulte os metadados do token armazenado. A troca de duração só se aplica a um token de usuário válido do aplicativo. Tokens de sistema seguem a emissão e as condições da Meta Business; nenhuma destas ações garante validade permanente.</Note><Actions><Button size="sm" variant="secondary" loading={inspecting} disabled={!editable || !configuration.secrets.accessToken.configured || saving || renewing} onClick={() => void inspectToken()}>Inspecionar token armazenado</Button><Button size="sm" variant="secondary" disabled={!editable || !tokenInspection?.valid || !tokenInspection.appMatches || tokenInspection.type !== "USER" || saving || inspecting} onClick={() => { setRenewalOpen(true); setRenewalConfirmation(""); setError(""); }}>Solicitar troca de duração na Meta</Button></Actions>{tokenInspection && <Stack><Actions><Pill $tone={tokenInspection.valid && tokenInspection.appMatches && tokenInspection.missingScopes.length === 0 ? "green" : "peach"}>{tokenInspection.valid && tokenInspection.appMatches ? "Token válido do aplicativo" : "Revisar token e aplicativo"}</Pill><Note>Tipo: {tokenInspection.type}</Note></Actions><Note>Permissões: {tokenInspection.scopes.join(", ") || "Nenhuma informada"}</Note>{tokenInspection.missingScopes.length > 0 && <Note>Permissões ausentes: {tokenInspection.missingScopes.join(", ")}</Note>}<Note>Expiração: {tokenInspection.expiresAt ? formatWhatsAppDate(tokenInspection.expiresAt) : "Não informada pelo endpoint; isso não significa validade permanente."}</Note><Note>Expiração de acesso aos dados: {tokenInspection.dataAccessExpiresAt ? formatWhatsAppDate(tokenInspection.dataAccessExpiresAt) : "Não informada"}</Note></Stack>}</ManagerCard>
    <Actions><Button icon={FloppyDiskIcon} loading={saving} disabled={!editable || !dirty || renewing || generating || authorizing || disablingNow} onClick={() => void save()}>Salvar configuração e credenciais</Button><Button variant="ghost" disabled={saving || renewing || generating || disablingNow || !dirty} onClick={() => { setValues(configuration.values); setSecrets(emptySecrets()); setError(""); }}>Descartar alterações</Button>{dirty && <Note>Há alterações ainda não salvas.</Note>}</Actions>
    {error && <Notice $error role="alert">{error}</Notice>}{success && <Notice role="status">{success}</Notice>}
    <Dialog open={generation !== null} onClose={() => { if (!generating) setGeneration(null); }} title="Gerar chave local da integração" description={generation === "verifyToken" ? "O servidor gera e armazena um token aleatório para validar o callback. Se já existe um webhook na Meta, atualize seu Verify Token depois desta alteração." : "O servidor gera e armazena a chave estável que protege a lista de supressão. A chave não poderá ser girada pelo painel depois de configurada."} footer={<><Button variant="ghost" disabled={generating} onClick={() => setGeneration(null)}>Cancelar</Button><Button icon={KeyIcon} loading={generating} onClick={() => void generate()}>Gerar e armazenar</Button></>}><Note>Esta ação cria um segredo do ERP. O App Secret e o token de acesso só podem ser obtidos no fluxo autorizado da Meta.</Note></Dialog>
    <Dialog open={oneTime !== null} onClose={() => setOneTime(null)} title="Chave gerada e armazenada" description="Copie para o local autorizado agora. Depois de fechar, o valor não será exibido novamente pelo painel." footer={<Button icon={CheckCircleIcon} onClick={() => setOneTime(null)}>Já guardei a chave</Button>}>
      {oneTime && <TextField label={oneTime.kind === "verifyToken" ? "Verify Token para informar na Meta" : "Chave de proteção da supressão"} readOnly value={oneTime.value} trailing={<CopyButton icon={CopyIcon} label="Copiar chave gerada" text={oneTime.value} variant="ghost" size="sm" />} />}
      <Note>A confirmação de armazenamento veio do servidor. Guarde a cópia em um cofre autorizado. O painel não salva segredos no armazenamento local do navegador.</Note>
    </Dialog>
    <Dialog open={disabling !== null} onClose={() => { if (!disablingNow) setDisabling(null); }} title="Desativar credencial da integração" description={`Credencial: ${credentials.find((item) => item.key === disabling)?.label || ""}. A desativação pode interromper recebimento, envio ou verificação de callbacks até que uma credencial válida seja informada.`} footer={<><Button variant="ghost" disabled={disablingNow} onClick={() => setDisabling(null)}>Cancelar</Button><Button variant="danger" loading={disablingNow} onClick={() => void disableSecret()}>Confirmar desativação</Button></>}><Note>O servidor registra a desativação e impede que um valor anterior das variáveis do ambiente volte a ser usado automaticamente. A chave de supressão permanece protegida contra alterações.</Note>{error && <Notice $error role="alert">{error}</Notice>}</Dialog>
    <Dialog open={renewalOpen} onClose={() => { if (!renewing) setRenewalOpen(false); }} title="Solicitar troca de duração do token de usuário" description="O servidor enviará o token armazenado à Meta no fluxo oficial e guardará o novo valor criptografado. O token não é exposto ao navegador, e suas permissões continuam sujeitas à conta e às condições da Meta." footer={<><Button variant="ghost" disabled={renewing} onClick={() => setRenewalOpen(false)}>Cancelar</Button><Button disabled={renewalConfirmation !== "RENOVAR"} loading={renewing} onClick={() => void renewToken()}>Solicitar e armazenar novo token</Button></>}><TextField label="Digite RENOVAR para confirmar" value={renewalConfirmation} autoComplete="off" onChange={(event) => setRenewalConfirmation(event.target.value)} />{error && <Notice $error role="alert">{error}</Notice>}</Dialog>
  </TabBody>;
}
