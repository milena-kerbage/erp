"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowClockwiseIcon, CheckCircleIcon, PlayIcon, PlugsConnectedIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { Pill } from "@/features/settings/components/ui";
import { errorMessage, normalizeWhatsAppPhone, whatsappRequest } from "@/features/whatsapp/client";
import { ConsentPanel } from "@/features/whatsapp/components/ConsentPanel";
import { SendForm } from "@/features/whatsapp/components/SendForm";
import { Actions, formatWhatsAppDate, Note, Notice, Stack } from "@/features/whatsapp/components/shared";
import type { WhatsAppConversation, WhatsAppStatus } from "@/features/whatsapp/types";
import type { ManagerTestName, ManagerTestResult } from "../types";
import { ManagerCard, ManagerGrid, ProgressBar, TabBody } from "./ui";

const tests: { id: ManagerTestName; title: string; description: string }[] = [
  { id: "database", title: "Banco e persistência", description: "Confere o acesso do servidor e a estrutura necessária no ambiente atual." },
  { id: "webhook", title: "Assinatura do webhook", description: "Verifica a criptografia local sem inserir contatos fictícios no atendimento. Recepção externa deve ser comprovada com uma mensagem real." },
  { id: "public-routes", title: "Páginas públicas de políticas", description: "Confere as seis páginas públicas de políticas deste ambiente, sem sessão. A verificação de callbacks e o recebimento externo são testes separados." },
  { id: "meta", title: "Acesso aos ativos Meta", description: "Consulta o número empresarial e a inscrição da WABA na API oficial." },
  { id: "token", title: "Permissões e validade do token", description: "Inspeciona o token na Meta sem exibir seu valor. Confere aplicativo, validade e permissões disponíveis." },
  { id: "templates", title: "Modelos aprovados", description: "Consulta os modelos reais, seus idiomas e estados. Não cria ou aprova modelos." },
  { id: "retention", title: "Prévia da retenção", description: "Confere o prazo e estima o escopo da manutenção. Este teste não exclui dados automaticamente." },
];

export function ManagerTestsTab({ status, configuredAppId = "", initialResults = [], onChanged }: { status: WhatsAppStatus | null; configuredAppId?: string; initialResults?: ManagerTestResult[]; onChanged: () => Promise<void> }) {
  const [results, setResults] = useState<Partial<Record<ManagerTestName, ManagerTestResult>>>(() => Object.fromEntries([...initialResults].reverse().map((result) => [result.test, result])));
  const [running, setRunning] = useState<ManagerTestName | "all" | null>(null);
  const [currentTest, setCurrentTest] = useState<ManagerTestName | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phone, setPhone] = useState("");
  const [conversation, setConversation] = useState<WhatsAppConversation>();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const [subscriptionResult, setSubscriptionResult] = useState("");
  const [subscriptions, setSubscriptions] = useState<{ id: string; name: string }[] | null>(null);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, []);

  async function execute(test: ManagerTestName): Promise<void> {
    setCurrentTest(test);
    try {
      const data = await whatsappRequest<ManagerTestResult>("management/tests", { body: { test } });
      setResults((current) => ({ ...current, [test]: data }));
    } catch (cause) {
      setResults((current) => ({ ...current, [test]: { test, ok: false, summary: "Solicitação de teste não concluída", details: [errorMessage(cause)], checkedAt: new Date().toISOString() } }));
    }
  }

  async function run(test: ManagerTestName | "all") {
    if (running) return;
    setRunning(test); setDoneCount(0); stop.current = false;
    try {
      const queue = test === "all" ? tests.map((item) => item.id) : [test];
      for (const name of queue) { if (stop.current) break; await execute(name); setDoneCount((count) => count + 1); }
      await onChanged();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setRunning(null); setCurrentTest(null); }
  }

  async function prepare(destination = normalizeWhatsAppPhone(phoneDraft)) {
    if (!destination || preparing) return;
    setPreparing(true); setError("");
    try { const data = await whatsappRequest<{ conversation?: WhatsAppConversation }>(`messages?phone=${encodeURIComponent(destination)}`); setConversation(data.conversation); setPhone(destination); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setPreparing(false); }
  }

  async function subscribe() {
    if (confirmation !== "INSCREVER" || subscribing) return;
    setSubscribing(true); setError(""); setSubscriptionResult(""); setSubscriptions(null);
    try {
      const result = await whatsappRequest<{ subscriptions: { id: string; name: string }[] }>("management/subscribe", { body: { confirmation } });
      setSubscriptions(result.subscriptions);
      setSubscriptionResult("Inscrição solicitada e lista de aplicativos consultada. Confira o App ID desta instalação e confirme a recepção de uma mensagem real para validar o fluxo completo.");
      setSubscriptionOpen(false); setConfirmation(""); await onChanged();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSubscribing(false); }
  }

  return <TabBody>
    <Actions><Button icon={PlayIcon} loading={running === "all"} disabled={running !== null} onClick={() => void run("all")}>Executar todos os testes técnicos</Button>{running === "all" && <Button size="sm" variant="secondary" onClick={() => { stop.current = true; }}>Parar após o teste atual</Button>}<Button size="sm" variant="secondary" icon={PlugsConnectedIcon} disabled={!status?.ready || running !== null} onClick={() => { setSubscriptionOpen(true); setError(""); }}>Inscrever aplicativo na WABA</Button></Actions>
    {running === "all" && <Stack><Note role="status">{doneCount} de {tests.length} verificações concluídas · {tests.find((item) => item.id === currentTest)?.title || "Preparando"}</Note><ProgressBar value={doneCount} max={tests.length} aria-label="Progresso dos testes técnicos" /></Stack>}
    <Note>Estas verificações executam as operações indicadas no servidor e registram resultados reais. A rotina técnica não dispara mensagens a clientes, não simula uma conta Meta conectada e não substitui o teste externo de recebimento e entrega.</Note>
    <ManagerGrid>{tests.map((test) => { const result = results[test.id]; return <ManagerCard key={test.id}><Actions><h4>{test.title}</h4><Pill $tone={currentTest === test.id ? "blue" : result?.ok ? "green" : result ? "rose" : "neutral"}>{currentTest === test.id ? "Executando" : result?.ok ? "Verificado" : result ? "Precisa de atenção" : "Não executado"}</Pill></Actions><Note>{test.description}</Note>{result && <><Note><strong>{result.summary}</strong></Note>{result.details?.map((detail, index) => <Note key={index}>{detail}</Note>)}<Note>Resultado de {formatWhatsAppDate(result.checkedAt)}</Note></>}<Button size="sm" variant="secondary" icon={ArrowClockwiseIcon} disabled={running !== null} loading={currentTest === test.id} onClick={() => void run(test.id)}>Executar verificação</Button></ManagerCard>; })}</ManagerGrid>
    {subscriptionResult && <Notice role="status">{subscriptionResult}</Notice>}
    {subscriptions !== null && <ManagerCard>
      <h4>Aplicativos retornados pela consulta à WABA</h4>
      <Note>App ID configurado no painel: {configuredAppId || "ainda não informado"}.</Note>
      {subscriptions.length > 0 ? <ManagerGrid>{subscriptions.map((application, index) => <ManagerCard key={`${application.id}:${index}`}>
        <h4>{application.name || "Nome não informado pela Meta"}</h4>
        <Note>App ID: {application.id || "não informado"}</Note>
        {configuredAppId && application.id === configuredAppId && <Pill $tone="green">App ID encontrado nesta consulta</Pill>}
      </ManagerCard>)}</ManagerGrid> : <Notice $error>A consulta não retornou aplicativos inscritos nesta WABA.</Notice>}
      {configuredAppId && !subscriptions.some((application) => application.id === configuredAppId) && <Notice $error role="alert">O App ID configurado não aparece na lista retornada. Confira aplicativo, token, conta WABA e inscrição no painel oficial antes de considerar a conexão pronta.</Notice>}
      {!configuredAppId && <Notice>Informe o App ID em Configuração e credenciais para comparar a instalação com a lista retornada.</Notice>}
      <Note>A lista registra o resultado desta consulta. Confira também o campo messages na configuração do webhook e a recepção de um evento real; encontrar o App ID não comprova esse fluxo completo.</Note>
    </ManagerCard>}
    <ManagerCard><h4>Envio e atendimento de teste real</h4><Note>Use um destinatário autorizado. Para o número de teste da Meta, cadastre e valide o destinatário no painel da conta. O envio pode gerar cobrança da plataforma.</Note><TextField label="Número de teste com país e DDD" inputMode="tel" value={phoneDraft} maxLength={24} placeholder="5511999999999" onChange={(event) => setPhoneDraft(event.target.value)} error={phoneDraft && !normalizeWhatsAppPhone(phoneDraft) ? "Informe o telefone internacional com 8 a 15 dígitos." : undefined} /><Actions><Button size="sm" variant="secondary" disabled={!normalizeWhatsAppPhone(phoneDraft) || preparing} loading={preparing} onClick={() => void prepare()}>Preparar contato autorizado</Button></Actions>{phone && <Stack key={phone}><Notice>Destinatário selecionado: +{phone}. Obtenha e registre uma autorização verdadeira antes do envio.</Notice><ConsentPanel phone={phone} consent={conversation?.consent} onSaved={() => void prepare(phone)} /><SendForm phone={phone} conversation={conversation} ready={status?.ready ?? false} onSent={() => void prepare(phone)} /><Button href={`/conversas?phone=${encodeURIComponent(phone)}`} size="sm" variant="secondary" icon={CheckCircleIcon}>Conferir histórico, entrega e leitura</Button></Stack>}</ManagerCard>
    {error && <Notice $error role="alert">{error}</Notice>}
    <Dialog open={subscriptionOpen} onClose={() => { if (!subscribing) setSubscriptionOpen(false); }} title="Inscrever aplicativo na conta WABA" description="O servidor fará uma operação real na Graph API para o aplicativo e a WABA configurados. Depois disso, confira o campo messages e faça um teste de recebimento." footer={<><Button variant="ghost" disabled={subscribing} onClick={() => setSubscriptionOpen(false)}>Cancelar</Button><Button icon={PlugsConnectedIcon} disabled={confirmation !== "INSCREVER"} loading={subscribing} onClick={() => void subscribe()}>Inscrever e verificar</Button></>}><TextField label="Digite INSCREVER para confirmar" value={confirmation} autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} />{error && <Notice $error role="alert">{error}</Notice>}</Dialog>
  </TabBody>;
}
