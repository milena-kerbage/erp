"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { errorMessage, whatsappRequest } from "../client";
import { templateKey, templatePreview, templateSupport } from "../templates";
import type { WhatsAppMessage, WhatsAppTemplate } from "../types";
import { Notice, Note, Stack } from "../components/shared";

let cache: WhatsAppTemplate[] | null = null;

/** Envio de modelo aprovado (janela de 24 h fechada ou conversa nova), com prévia, como o TemplateDialog da Le Ange. */
export function ModeloDialog({ phone, aberto, aoFechar, aoEnviado }: { phone: string; aberto: boolean; aoFechar: () => void; aoEnviado: (m: WhatsAppMessage) => void }) {
  const [modelos, setModelos] = useState<WhatsAppTemplate[]>(cache ?? []);
  const [carregando, setCarregando] = useState(false);
  const [escolha, setEscolha] = useState("");
  const [valores, setValores] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    setCarregando(true); setErro("");
    try { cache = (await whatsappRequest<{ templates: WhatsAppTemplate[] }>("templates")).templates.filter((t) => t.status.toUpperCase() === "APPROVED"); setModelos(cache); }
    catch (falha) { setErro(errorMessage(falha)); }
    finally { setCarregando(false); }
  };
  useEffect(() => { if (aberto && !cache) void carregar(); }, [aberto]);
  useEffect(() => { if (!aberto) { setEscolha(""); setValores([]); setErro(""); } }, [aberto]);

  const modelo = modelos.find((t) => templateKey(t) === escolha);
  const suporte = useMemo(() => (modelo ? templateSupport(modelo) : null), [modelo]);
  const pronto = Boolean(modelo && suporte?.supported && valores.length === suporte.parameters && valores.every((v) => v.trim()));

  const enviar = async () => {
    if (!modelo || !pronto) return;
    setEnviando(true); setErro("");
    try {
      const { message } = await whatsappRequest<{ message: WhatsAppMessage }>("messages", { body: { phone, type: "template", clientRequestId: crypto.randomUUID(), template: { name: modelo.name, language: modelo.language, ...(valores.length ? { components: [{ type: "body", parameters: valores.map((v) => ({ type: "text", text: v.trim() })) }] } : {}) } } });
      aoEnviado(message);
      aoFechar();
    } catch (falha) { setErro(errorMessage(falha)); }
    finally { setEnviando(false); }
  };

  return (
    <Dialog open={aberto} onClose={aoFechar} title="Enviar modelo aprovado" description="Fora da janela de 24 horas, o WhatsApp só permite mensagens de modelos aprovados pela Meta." width="32rem"
      footer={<><Button variant="ghost" onClick={aoFechar}>Cancelar</Button><Button loading={enviando} disabled={!pronto} onClick={() => void enviar()}>Enviar modelo</Button></>}>
      <Stack>
        <Select label="Modelo" value={escolha || undefined} placeholder={carregando ? "Consultando a Meta…" : "Escolha um modelo"} onChange={(valor) => { setEscolha(valor); const t = modelos.find((m) => templateKey(m) === valor); setValores(Array(t ? templateSupport(t).parameters : 0).fill("")); }}
          options={modelos.map((t) => ({ value: templateKey(t), label: t.name.replace(/_/g, " "), meta: t.language, description: templateSupport(t).supported ? t.category : templateSupport(t).reason, disabled: !templateSupport(t).supported }))}
          emptyMessage="Nenhum modelo aprovado. Crie um no WhatsApp Manager." />
        <Button size="sm" variant="ghost" icon={ArrowClockwiseIcon} loading={carregando} onClick={() => void carregar()}>Atualizar modelos</Button>
        {suporte?.supported && valores.map((valor, i) => <TextField key={i} label={`Variável {{${i + 1}}}`} value={valor} maxLength={1024} onChange={(e) => setValores((atual) => atual.map((v, j) => (j === i ? e.target.value : v)))} />)}
        {suporte?.body && <Notice aria-label="Prévia">{templatePreview(suporte.body, valores)}</Notice>}
        {!modelos.length && !carregando && !erro && <Note>Nenhum modelo aprovado nesta conta.</Note>}
        {erro && <Notice $error role="alert">{erro}</Notice>}
      </Stack>
    </Dialog>
  );
}
