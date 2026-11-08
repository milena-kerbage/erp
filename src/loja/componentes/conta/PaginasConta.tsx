"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { botaoContorno, botaoEscuro, largo, linkAcao, tituloBloco, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { Dialogo } from "@/loja/componentes/carrinho/Dialogo";
import { AreaTexto, Campo, Marcacao, Selecao } from "@/loja/componentes/checkout/Campo";
import { CheckCircle, WhatsappLogo } from "@/loja/componentes/icones";
import { linkWhatsApp } from "@/loja/lib/checkout/pedido";
import { mascararCpf, mascararTelefone } from "@/loja/lib/checkout/validacao";
import { COMO_CONHECEU, erroSenha, LIMITES_CONTA, TIPO_DATA_BEBE, UFS } from "@/loja/lib/contas/regras";
import { EMPRESA } from "@/loja/lib/empresa";
import { AcessoConta, type Modo } from "./AcessoConta";
import { EsqueletoConta } from "./comum";
import { ConviteCupom } from "./ConviteCupom";
import { apagarHistorico } from "./historico";
import { chamarConta, type ContaCliente, definirConta, ErroApiConta, type RespostaConta, sairDaConta, useConta } from "./estadoConta";

// Páginas da conta que dependem da sessão: entrar/cadastro, dados pessoais, segurança e a redefinição
// de senha pelo link que a vendedora manda no WhatsApp. Tudo é conferido de novo no servidor.

/** Destino seguro depois de entrar (?voltar=/carrinho): só caminho interno da loja. */
function destinoDepois(padrao = "/conta"): string {
  const voltar = new URLSearchParams(window.location.search).get("voltar") ?? "";
  return /^\/(?!\/)[\w\-/?=&.%]*$/.test(voltar) ? voltar : padrao;
}

export function PaginaAcesso({ inicial }: { inicial: Modo }) {
  const conta = useConta();
  const roteador = useRouter();
  if (conta.situacao === "carregando") return <EsqueletoConta blocos={1} />;
  if (conta.situacao === "pronta" && conta.cliente) {
    return (
      <div className={css({ maxW: "leitura" })}>
        <h1 className={tituloPagina}>Você já está na sua conta</h1>
        <p className={css({ mt: "4", fontSize: "md", color: "texto" })}>Entrou como {conta.cliente.email}.</p>
        <Link href="/conta" className={cx(botaoEscuro, css({ mt: "6" }))}>
          Ir para Minha conta
        </Link>
      </div>
    );
  }
  return (
    <div className={css({ display: "grid", gap: { base: "8", desktop: "16" }, gridTemplateColumns: { base: "minmax(0, 1fr)", desktop: "[minmax(0, 6fr) minmax(0, 5fr)]" }, alignItems: "start" })}>
      <section aria-labelledby="titulo-acesso">
        <h1 id="titulo-acesso" className={tituloPagina}>
          {inicial === "criar" ? "Criar conta" : "Entrar"}
        </h1>
        <p className={css({ mt: "3", mb: "8", maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "textoSuave" })}>
          Com a conta você faz pedidos pelo site e acompanha tudo em qualquer aparelho. O pedido continua sendo fechado com a vendedora,
          pelo WhatsApp.
        </p>
        {conta.situacao === "indisponivel" ? (
          <p role="alert" className={alerta}>
            {conta.mensagem}
          </p>
        ) : (
          <AcessoConta inicial={inicial} aoConcluir={() => roteador.push(destinoDepois())} />
        )}
      </section>
      <ConviteCupom>O cupom é exclusivo da sua conta, de uso único, e entra sozinho na sacola. Não acumula com outros cupons.</ConviteCupom>
    </div>
  );
}

/** Conteúdo só para a cliente logada; deslogada, o convite para entrar. */
function SoLogada({ children }: { children: (cliente: ContaCliente) => ReactNode }) {
  const conta = useConta();
  if (conta.situacao === "carregando") return <EsqueletoConta blocos={1} />;
  if (conta.situacao === "indisponivel")
    return (
      <p role="alert" className={alerta}>
        {conta.mensagem}
      </p>
    );
  if (!conta.cliente)
    return (
      <div className={css({ maxW: "leitura" })}>
        <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>Entre na sua conta para ver esta página.</p>
        <Link href={`/conta/entrar?voltar=${encodeURIComponent(typeof window === "undefined" ? "/conta" : window.location.pathname)}`} className={cx(botaoEscuro, css({ mt: "6" }))}>
          Entrar
        </Link>
      </div>
    );
  return <>{children(conta.cliente)}</>;
}

// ---------------------------------------------------------------- Dados pessoais

type Formulario = Record<"nome" | "whatsapp" | "cpf" | "cep" | "endereco" | "cidade" | "uf" | "bebeNome" | "bebeData" | "bebeDataTipo" | "comoConheceu" | "preferencias", string>;

function valoresDe(cliente: ContaCliente): Formulario {
  const { perfil } = cliente;
  return {
    nome: cliente.nome,
    whatsapp: cliente.whatsappFormatado,
    cpf: perfil.cpf ? mascararCpf(perfil.cpf) : "",
    cep: perfil.cep ? perfil.cep.replace(/(\d{5})(\d{3})/, "$1-$2") : "",
    endereco: perfil.endereco,
    cidade: perfil.cidade,
    uf: perfil.uf,
    bebeNome: perfil.bebeNome,
    bebeData: perfil.bebeData,
    bebeDataTipo: perfil.bebeDataTipo,
    comoConheceu: perfil.comoConheceu,
    preferencias: perfil.preferencias,
  };
}

export function DadosPessoais() {
  return (
    <div className={css({ mt: { base: "8", desktop: "12" } })}>
      <h1 className={tituloPagina}>Dados pessoais</h1>
      <p className={css({ mt: "3", mb: "8", maxW: "leitura", fontSize: "md", lineHeight: "relaxed", color: "textoSuave" })}>
        Só nome e WhatsApp são obrigatórios. O resto é opcional e ajuda a vendedora a agilizar o pedido; deixe em branco para apagar.
      </p>
      <SoLogada>{(cliente) => <FormularioDados key={cliente.revisao} cliente={cliente} />}</SoLogada>
    </div>
  );
}

function FormularioDados({ cliente }: { cliente: ContaCliente }) {
  const [valores, setValores] = useState<Formulario>(() => valoresDe(cliente));
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  function mudar(campo: keyof Formulario, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: "" }));
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensagem(null);
    try {
      const resposta = await chamarConta<RespostaConta>("conta/perfil", { metodo: "PATCH", corpo: { revisao: cliente.revisao, ...valores } });
      definirConta(resposta);
      setMensagem({ tipo: "ok", texto: "Dados salvos." });
    } catch (erro) {
      if (erro instanceof ErroApiConta) {
        setErros(erro.campos);
        setMensagem({ tipo: "erro", texto: erro.message });
        const primeiro = Object.keys(erro.campos)[0];
        if (primeiro) document.getElementById(`dados-${primeiro}`)?.focus();
      } else setMensagem({ tipo: "erro", texto: "Não foi possível salvar agora." });
    } finally {
      setEnviando(false);
    }
  }

  const grupo = css({ display: "grid", gap: "5", gridTemplateColumns: { base: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" } });
  return (
    <form noValidate onSubmit={salvar} className={css({ display: "grid", gap: "10", maxW: "[720px]" })}>
      <fieldset className={css({ display: "grid", gap: "5" })}>
        <legend className={cx(tituloBloco, css({ mb: "5" }))}>Contato</legend>
        <div className={grupo}>
          <Campo id="dados-nome" rotulo="Nome completo" required autoComplete="name" maxLength={LIMITES_CONTA.nome} value={valores.nome} onChange={(e) => mudar("nome", e.target.value)} erro={erros.nome} />
          <Campo id="dados-whatsapp" rotulo="WhatsApp com DDD" required type="tel" inputMode="tel" autoComplete="tel-national" value={valores.whatsapp} onChange={(e) => mudar("whatsapp", mascararTelefone(e.target.value))} erro={erros.whatsapp} />
        </div>
        <Campo id="dados-email" rotulo="E-mail" required readOnly disabled value={cliente.email} dica="Para trocar o e-mail da conta, fale com o ateliê pelo WhatsApp." />
      </fieldset>
      <fieldset className={css({ display: "grid", gap: "5" })}>
        <legend className={cx(tituloBloco, css({ mb: "5" }))}>Entrega</legend>
        <div className={grupo}>
          <Campo id="dados-cpf" rotulo="CPF" inputMode="numeric" autoComplete="off" value={valores.cpf} onChange={(e) => mudar("cpf", mascararCpf(e.target.value))} erro={erros.cpf} dica="Para a nota e o envio." />
          <Campo id="dados-cep" rotulo="CEP" inputMode="numeric" autoComplete="postal-code" maxLength={9} value={valores.cep} onChange={(e) => mudar("cep", e.target.value.replace(/\D/g, "").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 9))} erro={erros.cep} />
        </div>
        <Campo id="dados-endereco" rotulo="Endereço (rua, número e complemento)" autoComplete="street-address" maxLength={LIMITES_CONTA.endereco} value={valores.endereco} onChange={(e) => mudar("endereco", e.target.value)} erro={erros.endereco} />
        <div className={grupo}>
          <Campo id="dados-cidade" rotulo="Cidade" autoComplete="address-level2" maxLength={LIMITES_CONTA.cidade} value={valores.cidade} onChange={(e) => mudar("cidade", e.target.value)} erro={erros.cidade} />
          <Selecao id="dados-uf" rotulo="UF (opcional)" value={valores.uf} onChange={(e) => mudar("uf", e.target.value)} erro={erros.uf}>
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </Selecao>
        </div>
      </fieldset>
      <fieldset className={css({ display: "grid", gap: "5" })}>
        <legend className={cx(tituloBloco, css({ mb: "5" }))}>O bebê</legend>
        <div className={grupo}>
          <Selecao id="dados-bebeDataTipo" rotulo="Qual data? (opcional)" value={valores.bebeDataTipo} onChange={(e) => mudar("bebeDataTipo", e.target.value)} erro={erros.bebeDataTipo}>
            <option value="">—</option>
            {Object.entries(TIPO_DATA_BEBE).map(([chave, rotulo]) => (
              <option key={chave} value={chave}>
                {rotulo}
              </option>
            ))}
          </Selecao>
          <Campo id="dados-bebeData" rotulo="Data" type="date" value={valores.bebeData} onChange={(e) => mudar("bebeData", e.target.value)} erro={erros.bebeData} />
        </div>
        <Campo id="dados-bebeNome" rotulo="Nome do bebê" autoComplete="off" maxLength={LIMITES_CONTA.bebeNome} value={valores.bebeNome} onChange={(e) => mudar("bebeNome", e.target.value)} erro={erros.bebeNome} dica="Se já tiver escolhido: ajuda no bordado." />
      </fieldset>
      <fieldset className={css({ display: "grid", gap: "5" })}>
        <legend className={cx(tituloBloco, css({ mb: "5" }))}>Preferências</legend>
        <Selecao id="dados-comoConheceu" rotulo="Como conheceu o ateliê? (opcional)" value={valores.comoConheceu} onChange={(e) => mudar("comoConheceu", e.target.value)} erro={erros.comoConheceu}>
          <option value="">—</option>
          {Object.entries(COMO_CONHECEU).map(([chave, rotulo]) => (
            <option key={chave} value={chave}>
              {rotulo}
            </option>
          ))}
        </Selecao>
        <AreaTexto id="dados-preferencias" rotulo="Cores, temas e tecidos preferidos" rows={3} maxLength={LIMITES_CONTA.preferencias} value={valores.preferencias} onChange={(e) => mudar("preferencias", e.target.value)} erro={erros.preferencias} />
      </fieldset>
      <div className={css({ display: "grid", gap: "3", maxW: "formularioConta" })}>
        {mensagem && (
          <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={mensagem.tipo === "erro" ? alerta : sucesso}>
            {mensagem.texto}
          </p>
        )}
        <button type="submit" disabled={enviando} aria-busy={enviando} className={cx(botaoEscuro, largo)}>
          {enviando ? "Salvando…" : "Salvar dados"}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Segurança

export function Seguranca() {
  return (
    <div className={css({ mt: { base: "8", desktop: "12" } })}>
      <h1 className={tituloPagina}>Segurança</h1>
      <SoLogada>{(cliente) => <BlocosSeguranca cliente={cliente} />}</SoLogada>
    </div>
  );
}

function BlocosSeguranca({ cliente }: { cliente: ContaCliente }) {
  const roteador = useRouter();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [excluir, setExcluir] = useState(false);
  const [senhaExclusao, setSenhaExclusao] = useState("");
  const [entendi, setEntendi] = useState(false);
  const [erroExclusao, setErroExclusao] = useState("");
  const [excluindo, setExcluindo] = useState(false);

  async function trocar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fraca = erroSenha(nova, { email: cliente.email });
    if (!atual || fraca) {
      setErros({ ...(atual ? {} : { atual: "Informe a senha atual." }), ...(fraca ? { nova: fraca } : {}) });
      return;
    }
    setEnviando(true);
    setMensagem(null);
    try {
      await chamarConta("conta/senha", { corpo: { atual, nova } });
      setAtual("");
      setNova("");
      setErros({});
      setMensagem({ tipo: "ok", texto: "Senha alterada. Os outros aparelhos saíram da conta." });
    } catch (erro) {
      if (erro instanceof ErroApiConta) {
        setErros(erro.campos);
        setMensagem({ tipo: "erro", texto: erro.message });
      } else setMensagem({ tipo: "erro", texto: "Não foi possível alterar agora." });
    } finally {
      setEnviando(false);
    }
  }

  async function confirmarExclusao() {
    if (!entendi || !senhaExclusao) {
      setErroExclusao("Marque a confirmação e informe a sua senha.");
      return;
    }
    setExcluindo(true);
    setErroExclusao("");
    try {
      await chamarConta("conta/excluir", { corpo: { senha: senhaExclusao, confirmacao: "EXCLUIR" } });
      apagarHistorico();
      definirConta({ cliente: null, cupom: null });
      roteador.push("/conta?excluida=1");
    } catch (erro) {
      setErroExclusao(erro instanceof Error ? erro.message : "Não foi possível excluir agora.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className={css({ display: "grid", gap: "14", mt: "8", maxW: "formularioConta" })}>
      <section aria-labelledby="titulo-senha">
        <h2 id="titulo-senha" className={tituloBloco}>
          Trocar a senha
        </h2>
        <form noValidate onSubmit={trocar} className={css({ display: "grid", gap: "5", mt: "6" })}>
          <input type="email" autoComplete="username" value={cliente.email} readOnly hidden />
          <Campo id="seguranca-atual" rotulo="Senha atual" required type="password" autoComplete="current-password" maxLength={LIMITES_CONTA.senhaMax} value={atual} onChange={(e) => setAtual(e.target.value)} erro={erros.atual} />
          <Campo id="seguranca-nova" rotulo="Nova senha" required type="password" autoComplete="new-password" maxLength={LIMITES_CONTA.senhaMax} value={nova} onChange={(e) => setNova(e.target.value)} erro={erros.nova} dica={`Pelo menos ${LIMITES_CONTA.senhaMin} caracteres, com letras e números.`} />
          {mensagem && (
            <p role={mensagem.tipo === "erro" ? "alert" : "status"} className={mensagem.tipo === "erro" ? alerta : sucesso}>
              {mensagem.texto}
            </p>
          )}
          <button type="submit" disabled={enviando} aria-busy={enviando} className={cx(botaoEscuro, largo)}>
            {enviando ? "Alterando…" : "Alterar senha"}
          </button>
        </form>
      </section>

      <section aria-labelledby="titulo-sair">
        <h2 id="titulo-sair" className={tituloBloco}>
          Sair
        </h2>
        <p className={css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>Encerra a sessão neste aparelho.</p>
        <button
          type="button"
          onClick={async () => {
            await sairDaConta();
            roteador.push("/conta");
          }}
          className={cx(botaoContorno, css({ mt: "4" }))}
        >
          Sair da conta
        </button>
      </section>

      <section aria-labelledby="titulo-excluir" className={css({ pt: "8", borderTopWidth: "1px", borderColor: "borda" })}>
        <h2 id="titulo-excluir" className={tituloBloco}>
          Excluir minha conta
        </h2>
        <p className={css({ mt: "3", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
          Apaga a conta, os dados pessoais e o cupom. Os pedidos ficam no ateliê sem os seus dados (só as peças e os valores). Não dá para
          desfazer.
        </p>
        <button type="button" onClick={() => setExcluir(true)} className={cx(linkAcao, css({ mt: "4", color: "erro" }))}>
          Excluir minha conta
        </button>
      </section>

      <Dialogo aberto={excluir} aoFechar={() => setExcluir(false)} titulo="Excluir a conta?">
        <div className={css({ display: "grid", gap: "5" })}>
          <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
            A conta de {cliente.email} será apagada agora. Conversas no WhatsApp com o ateliê não são afetadas.
          </p>
          <Campo id="excluir-senha" rotulo="Sua senha" required type="password" autoComplete="current-password" value={senhaExclusao} onChange={(e) => setSenhaExclusao(e.target.value)} />
          <Marcacao id="excluir-entendi" checked={entendi} onChange={(e) => setEntendi(e.target.checked)}>
            Entendo que a exclusão não pode ser desfeita.
          </Marcacao>
          {erroExclusao && (
            <p role="alert" className={alerta}>
              {erroExclusao}
            </p>
          )}
          <div className={css({ display: "flex", flexWrap: "wrap", gap: "3" })}>
            <button type="button" disabled={excluindo} onClick={() => void confirmarExclusao()} className={botaoEscuro}>
              {excluindo ? "Excluindo…" : "Excluir definitivamente"}
            </button>
            <button type="button" onClick={() => setExcluir(false)} className={linkAcao}>
              Cancelar
            </button>
          </div>
        </div>
      </Dialogo>
    </div>
  );
}

// ---------------------------------------------------------------- Redefinir a senha (link do ateliê)

export function RedefinirSenha() {
  const [token, setToken] = useState<string | null>(null);
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [geral, setGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  // O token vem no fragmento (#): sai da barra na hora e só vai ao servidor no POST.
  useEffect(() => {
    const valor = window.location.hash.slice(1);
    setToken(/^[a-f0-9]{64}$/.test(valor) ? valor : "");
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const fraca = erroSenha(nova);
    const novos: Record<string, string> = {};
    if (fraca) novos.nova = fraca;
    if (nova !== confirmacao) novos.confirmacao = "As senhas não são iguais.";
    setErros(novos);
    if (Object.keys(novos).length) return;
    setEnviando(true);
    setGeral("");
    try {
      const resposta = await chamarConta<RespostaConta>("conta/redefinir", { corpo: { token, nova } });
      definirConta(resposta);
      setPronto(true);
      window.requestAnimationFrame(() => titulo.current?.focus());
    } catch (erro) {
      if (erro instanceof ErroApiConta) {
        setErros(erro.campos);
        setGeral(Object.keys(erro.campos).length ? "" : erro.message);
      } else setGeral("Não foi possível redefinir agora.");
    } finally {
      setEnviando(false);
    }
  }

  const pedirOutro = (
    <a href={linkWhatsApp(EMPRESA.whatsapp.numero, "Olá, Ateliê Milena Kerbage! Meu link para criar uma nova senha da loja não funcionou. Pode me mandar outro?")} target="_blank" rel="noopener noreferrer" className={cx(linkAcao, css({ display: "inline-flex", alignItems: "center", gap: "1.5" }))}>
      <WhatsappLogo size={16} aria-hidden /> Pedir outro link no WhatsApp
    </a>
  );

  if (token === null) return <EsqueletoConta blocos={1} />;
  if (pronto)
    return (
      <div className={css({ maxW: "leitura", mt: { base: "8", desktop: "12" } })}>
        <CheckCircle size={40} aria-hidden className={css({ color: "sucesso" })} />
        <h1 ref={titulo} tabIndex={-1} className={cx(tituloPagina, css({ mt: "4" }))}>
          Senha nova criada
        </h1>
        <p className={css({ mt: "4", fontSize: "md", color: "texto" })}>Você já entrou na sua conta. Os outros aparelhos saíram por segurança.</p>
        <Link href="/conta" className={cx(botaoEscuro, css({ mt: "6" }))}>
          Ir para Minha conta
        </Link>
      </div>
    );
  return (
    <div className={css({ maxW: "formularioConta", mt: { base: "8", desktop: "12" } })}>
      <h1 className={tituloPagina}>Criar uma senha nova</h1>
      {!token ? (
        <div className={css({ mt: "4", display: "grid", gap: "4" })}>
          <p className={css({ fontSize: "md", lineHeight: "relaxed", color: "texto" })}>
            Este endereço precisa do link completo que a vendedora mandou no WhatsApp. O link vale por 2 horas e funciona uma vez.
          </p>
          {pedirOutro}
        </div>
      ) : (
        <form noValidate onSubmit={enviar} className={css({ display: "grid", gap: "5", mt: "6" })}>
          <Campo id="redefinir-nova" rotulo="Nova senha" required type="password" autoComplete="new-password" maxLength={LIMITES_CONTA.senhaMax} value={nova} onChange={(e) => setNova(e.target.value)} erro={erros.nova} dica={`Pelo menos ${LIMITES_CONTA.senhaMin} caracteres, com letras e números.`} />
          <Campo id="redefinir-confirmacao" rotulo="Repita a nova senha" required type="password" autoComplete="new-password" maxLength={LIMITES_CONTA.senhaMax} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} erro={erros.confirmacao} />
          {geral && (
            <div role="alert" className={alerta}>
              <p>{geral}</p>
              <p className={css({ mt: "2" })}>{pedirOutro}</p>
            </div>
          )}
          <button type="submit" disabled={enviando} aria-busy={enviando} className={cx(botaoEscuro, largo)}>
            {enviando ? "Salvando…" : "Salvar a senha nova"}
          </button>
        </form>
      )}
    </div>
  );
}

const alerta = css({ p: "3", borderRadius: "md", bg: "alertaSuave", fontSize: "sm", lineHeight: "texto", color: "erro" });
const sucesso = css({ p: "3", borderRadius: "md", bg: "sucessoSuave", fontSize: "sm", lineHeight: "texto", color: "sucesso" });
