"use client";

import Link from "next/link";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { css, cx } from "styled-system/css";
import { botaoEscuro, largo, linkAcao } from "@/loja/componentes/carrinho/estilos";
import { Campo, Marcacao } from "@/loja/componentes/checkout/Campo";
import { WhatsappLogo } from "@/loja/componentes/icones";
import { linkWhatsApp } from "@/loja/lib/checkout/pedido";
import { mascararTelefone } from "@/loja/lib/checkout/validacao";
import { emailValido, erroSenha, LIMITES_CONTA, normalizarEmail, PERCENTUAL_BOAS_VINDAS, validarCadastro } from "@/loja/lib/contas/regras";
import { EMPRESA } from "@/loja/lib/empresa";
import { chamarConta, definirConta, ErroApiConta, type RespostaConta } from "./estadoConta";

// Entrar e "Criar conta rápida" (nome, WhatsApp, e-mail, senha e o aceite): na própria página, sem
// sair do fluxo. O servidor valida tudo de novo; aqui só ajuda quem digita.
// `aoIniciar` roda dentro do envio (gesto da cliente), antes da chamada: o pedido usa para abrir a aba
// do WhatsApp sem o bloqueador de pop-up; `aoFalhar` desfaz (fecha a aba) se a conta não deu certo.

export type Modo = "criar" | "entrar";
type Callbacks = {
  rotuloEnviar?: string;
  aoIniciar?: () => void;
  aoConcluir?: (resposta: RespostaConta) => void | Promise<void>;
  aoFalhar?: () => void;
  prefixo?: string;
};

export function AcessoConta({
  inicial = "criar",
  titulo,
  rotuloCriar,
  rotuloEntrar,
  ...callbacks
}: Omit<Callbacks, "rotuloEnviar"> & { inicial?: Modo; titulo?: ReactNode; rotuloCriar?: string; rotuloEntrar?: string }) {
  const [modo, setModo] = useState<Modo>(inicial);
  const id = useId();
  return (
    <div>
      {titulo}
      <div role="tablist" aria-label="Acesso à conta" className={abas}>
        {(["criar", "entrar"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            role="tab"
            id={`${id}-aba-${opcao}`}
            aria-selected={modo === opcao}
            aria-controls={`${id}-painel`}
            onClick={() => setModo(opcao)}
            className={aba}
          >
            {opcao === "criar" ? "Criar conta rápida" : "Já tenho conta"}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${id}-painel`} aria-labelledby={`${id}-aba-${modo}`} className={css({ mt: "6" })}>
        {modo === "criar" ? <FormularioCadastro key="criar" {...callbacks} rotuloEnviar={rotuloCriar} /> : <FormularioEntrar key="entrar" {...callbacks} rotuloEnviar={rotuloEntrar} />}
      </div>
    </div>
  );
}

async function enviarConta(caminho: string, corpo: unknown, callbacks: Callbacks, setErros: (erros: Record<string, string>) => void, setGeral: (texto: string) => void) {
  try {
    const resposta = await chamarConta<RespostaConta>(caminho, { corpo });
    definirConta(resposta);
    await callbacks.aoConcluir?.(resposta);
    return true;
  } catch (erro) {
    callbacks.aoFalhar?.();
    if (erro instanceof ErroApiConta) {
      setErros(erro.campos);
      setGeral(Object.keys(erro.campos).length ? "" : erro.message);
    } else setGeral("Não foi possível concluir agora. Tente de novo.");
    return false;
  }
}

function focarPrimeiro(prefixo: string, ordem: string[], erros: Record<string, string>) {
  const primeiro = ordem.find((campo) => erros[campo]);
  if (primeiro) document.getElementById(`${prefixo}-${primeiro}`)?.focus();
}

export function FormularioCadastro(callbacks: Callbacks) {
  const prefixo = callbacks.prefixo ?? "cadastro";
  const [valores, setValores] = useState({ nome: "", whatsapp: "", email: "", senha: "", termos: false });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [geral, setGeral] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function mudar<K extends keyof typeof valores>(campo: K, valor: (typeof valores)[K]) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: "" }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const validacao = validarCadastro(valores);
    if (!validacao.ok) {
      setErros(validacao.erros);
      setGeral("");
      focarPrimeiro(prefixo, ["nome", "whatsapp", "email", "senha", "termos"], validacao.erros);
      return;
    }
    callbacks.aoIniciar?.();
    setEnviando(true);
    setGeral("");
    const ok = await enviarConta("conta/cadastrar", valores, callbacks, setErros, setGeral);
    setEnviando(false);
    if (ok) setValores((atual) => ({ ...atual, senha: "" }));
  }

  return (
    <form noValidate onSubmit={enviar} className={formulario}>
      <Campo id={`${prefixo}-nome`} rotulo="Nome completo" required autoComplete="name" maxLength={LIMITES_CONTA.nome} value={valores.nome} onChange={(evento) => mudar("nome", evento.target.value)} erro={erros.nome} />
      <Campo
        id={`${prefixo}-whatsapp`}
        rotulo="WhatsApp com DDD"
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="(85) 99999-9999"
        value={valores.whatsapp}
        onChange={(evento) => mudar("whatsapp", mascararTelefone(evento.target.value))}
        erro={erros.whatsapp}
        dica="A vendedora do ateliê fala com você por este número."
      />
      <Campo id={`${prefixo}-email`} rotulo="E-mail" required type="email" inputMode="email" autoComplete="email" maxLength={LIMITES_CONTA.email} value={valores.email} onChange={(evento) => mudar("email", evento.target.value)} erro={erros.email} />
      <div className={css({ display: "grid", gap: "2" })}>
        <Campo
          id={`${prefixo}-senha`}
          rotulo="Crie uma senha"
          required
          type={mostrar ? "text" : "password"}
          autoComplete="new-password"
          maxLength={LIMITES_CONTA.senhaMax}
          value={valores.senha}
          onChange={(evento) => mudar("senha", evento.target.value)}
          erro={erros.senha}
          dica={`Pelo menos ${LIMITES_CONTA.senhaMin} caracteres, com letras e números.`}
        />
        <Marcacao id={`${prefixo}-mostrar`} checked={mostrar} onChange={(evento) => setMostrar(evento.target.checked)}>
          Mostrar senha
        </Marcacao>
      </div>
      <div className={css({ display: "grid", gap: "1.5" })}>
        <Marcacao id={`${prefixo}-termos`} checked={valores.termos} onChange={(evento) => mudar("termos", evento.target.checked)} aria-invalid={erros.termos ? true : undefined} aria-describedby={erros.termos ? `${prefixo}-termos-erro` : undefined}>
          Li e aceito os{" "}
          <Link href="/politicas/termos" target="_blank" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
            Termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/politicas/privacidade" target="_blank" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
            Política de privacidade
          </Link>
          .
        </Marcacao>
        {erros.termos && (
          <p id={`${prefixo}-termos-erro`} className={css({ fontSize: "sm", color: "erro" })}>
            {erros.termos}
          </p>
        )}
      </div>
      {geral && (
        <p role="alert" className={alerta}>
          {geral}
        </p>
      )}
      <button type="submit" disabled={enviando} aria-busy={enviando} className={cx(botaoEscuro, largo)}>
        {enviando ? "Criando a conta…" : (callbacks.rotuloEnviar ?? `Criar conta e ganhar ${PERCENTUAL_BOAS_VINDAS}% OFF`)}
      </button>
      <p className={css({ fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>
        Só o básico agora. CPF, endereço e os dados do bebê você completa depois, se quiser, em Minha conta.
      </p>
    </form>
  );
}

export function FormularioEntrar(callbacks: Callbacks) {
  const prefixo = callbacks.prefixo ?? "entrar";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [geral, setGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [esqueci, setEsqueci] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    const novos: Record<string, string> = {};
    if (!emailValido(normalizarEmail(email))) novos.email = "Informe o seu e-mail.";
    if (!senha) novos.senha = "Informe a senha.";
    setErros(novos);
    if (Object.keys(novos).length) {
      focarPrimeiro(prefixo, ["email", "senha"], novos);
      return;
    }
    callbacks.aoIniciar?.();
    setEnviando(true);
    setGeral("");
    const ok = await enviarConta("conta/entrar", { email, senha }, callbacks, setErros, setGeral);
    setEnviando(false);
    if (ok) setSenha("");
  }

  const pedidoAjuda = `Olá, Ateliê Milena Kerbage! Esqueci a senha da minha conta na loja${emailValido(normalizarEmail(email)) ? ` (e-mail ${normalizarEmail(email)})` : ""}. Pode me mandar um link para criar uma nova?`;

  return (
    <form noValidate onSubmit={enviar} className={formulario}>
      <Campo id={`${prefixo}-email`} rotulo="E-mail" required type="email" inputMode="email" autoComplete="email" value={email} onChange={(evento) => setEmail(evento.target.value)} erro={erros.email} />
      <Campo id={`${prefixo}-senha`} rotulo="Senha" required type="password" autoComplete="current-password" maxLength={LIMITES_CONTA.senhaMax} value={senha} onChange={(evento) => setSenha(evento.target.value)} erro={erros.senha} />
      {geral && (
        <p role="alert" className={alerta}>
          {geral}
        </p>
      )}
      <button type="submit" disabled={enviando} aria-busy={enviando} className={cx(botaoEscuro, largo)}>
        {enviando ? "Entrando…" : (callbacks.rotuloEnviar ?? "Entrar")}
      </button>
      <div>
        <button type="button" aria-expanded={esqueci} onClick={() => setEsqueci(!esqueci)} className={linkAcao}>
          Esqueci a senha
        </button>
        {esqueci && (
          <div className={css({ mt: "3", p: "4", borderRadius: "md", bg: "fundoSutil", fontSize: "sm", lineHeight: "texto", color: "texto" })}>
            <p>
              Fale com o ateliê pelo WhatsApp: a vendedora confere a sua conta e manda um link para você criar uma senha nova (o link vale
              por 2 horas).
            </p>
            <a href={linkWhatsApp(EMPRESA.whatsapp.numero, pedidoAjuda)} target="_blank" rel="noopener noreferrer" className={cx(linkAcao, css({ display: "inline-flex", alignItems: "center", gap: "1.5", mt: "2" }))}>
              <WhatsappLogo size={16} aria-hidden /> Pedir um link no WhatsApp
            </a>
          </div>
        )}
      </div>
    </form>
  );
}

/** Confere a força da senha (para os formulários de troca e redefinição). */
export const problemaDaSenha = (senha: string, email?: string) => erroSenha(senha, { email });

const formulario = css({ display: "grid", gap: "5", maxW: "formularioConta" });

const alerta = css({ p: "3", borderRadius: "md", bg: "alertaSuave", fontSize: "sm", lineHeight: "texto", color: "erro" });

const abas = css({ display: "flex", gap: "1", p: "1", borderRadius: "pilula", bg: "superficieSuave", maxW: "formularioConta" });

const aba = css({
  flex: "1",
  minH: "10",
  px: "4",
  borderRadius: "pilula",
  fontSize: "sm",
  fontWeight: "medium",
  color: "textoSuave",
  cursor: "pointer",
  transitionProperty: "background-color, color",
  transitionDuration: "normal",
  transitionTimingFunction: "assinatura",
  _hover: { color: "escuro" },
  "&[aria-selected=true]": { bg: "superficie", color: "escuro", boxShadow: "suave" },
});
