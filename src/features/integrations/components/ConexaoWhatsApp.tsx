"use client";

import styled from "@emotion/styled";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  CopyIcon,
  KeyIcon,
  LinkBreakIcon,
  PlugsConnectedIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { TextField } from "@/components/ui/TextField";
import { FieldGrid, Pill } from "@/features/settings/components/ui";
import { errorMessage, whatsappRequest, WhatsAppRequestError } from "@/features/whatsapp/client";
import { Actions, formatWhatsAppDate, Note, Notice, Stack } from "@/features/whatsapp/components/shared";
import { carregarSdkFacebook, opcoesCadastro, ouvirCadastro, type AvisoCadastro } from "../facebookSdk";

// Conexão do WhatsApp em poucos cliques (fluxo do ERP da Le Ange): o app da Meta é cadastrado uma vez;
// depois o gestor só clica em "Conectar", entra na Meta e escolhe o número. Conta, número, inscrição do
// webhook e segredos locais são resolvidos pelo servidor (src/lib/whatsapp/conexao.ts).

type Situacao = {
  criptografiaPronta: boolean;
  app: { appId: string; configId: string; versao: string; appSecretSalvo: boolean; cadastroIncorporadoPronto: boolean; faltando: string[]; tokenPossivel: boolean };
  conexao: { conectado: boolean; numero: string; nome: string; modo: string; desde: string; phoneNumberId: string; wabaId: string };
  webhook: { url: string; verifyToken: string; campos: string[]; ultimoEvento: string | null };
  meta: { dominio: string; paginaDoBotao: string; privacidade: string; termos: string; exclusao: string; exclusaoCallback: string };
};
type Preparo = { appId: string; configId: string; versao: string; state: string };
type ResultadoConexao = { numero: string; nome: string; avisos: string[]; situacao: Situacao };
type ResultadoTeste = { numero: string; nome: string; qualidade: string; inscrito: boolean; reinscrito: boolean; ultimoEvento: string | null };
type Escolha = { id: string; numero: string; nome: string };

const MODOS = {
  coexistencia: { titulo: "Usar o número do app WhatsApp Business", texto: "O número continua funcionando no celular e as conversas também chegam ao ERP." },
  novo: { titulo: "Conectar um número novo, só para o ERP", texto: "O número sai de qualquer app de celular e passa a funcionar só pela API oficial." },
} as const;
const NOME_MODO: Record<string, string> = { coexistencia: "Também no app do celular", novo: "Número só da API", token: "Token de usuário do sistema" };
const QUALIDADE: Record<string, string> = { GREEN: "Qualidade alta", YELLOW: "Qualidade média", RED: "Qualidade baixa" };

// Campos de segredo como texto mascarado: o navegador não oferece senha salva (era o que gerava o erro do token).
const semPreenchimento = { autoComplete: "off", spellCheck: false, "data-1p-ignore": true, "data-lpignore": "true", "data-form-type": "other" } as const;

export function ConexaoWhatsApp() {
  const [situacao, setSituacao] = useState<Situacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState("");

  const atualizar = useCallback(async () => {
    try { setSituacao(await whatsappRequest<Situacao>("conexao")); setErroGeral(""); }
    catch (falha) { setErroGeral(errorMessage(falha)); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { void atualizar(); }, [atualizar]);

  if (carregando && !situacao) return <Painel aria-busy="true"><Note>Consultando a conexão do WhatsApp…</Note></Painel>;
  if (!situacao) return <Painel><Notice $error role="alert">{erroGeral || "Não foi possível consultar a conexão."}</Notice></Painel>;

  return (
    <Stack>
      {!situacao.criptografiaPronta && <Notice $error role="alert">A hospedagem ainda não tem a chave INTEGRATION_ENCRYPTION_KEY. Sem ela o ERP não guarda o acesso com segurança. Peça ao responsável técnico para configurá-la uma vez.</Notice>}
      <CartaoConexao situacao={situacao} aoMudar={setSituacao} />
      <CartaoApp situacao={situacao} aoMudar={setSituacao} />
      <CartaoMeta situacao={situacao} />
    </Stack>
  );
}

/* ---------------------------------------------------------------- conexão */

function CartaoConexao({ situacao, aoMudar }: { situacao: Situacao; aoMudar: (s: Situacao) => void }) {
  const { conexao, app } = situacao;
  const [trocando, setTrocando] = useState(false);
  const [teste, setTeste] = useState<ResultadoTeste | null>(null);
  const [ocupado, setOcupado] = useState<"" | "testar" | "desconectar">("");
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const testar = async () => {
    setOcupado("testar"); setErro("");
    try { setTeste(await whatsappRequest<ResultadoTeste>("conexao", { body: { acao: "testar" } })); }
    catch (falha) { setErro(errorMessage(falha)); }
    finally { setOcupado(""); }
  };
  const desconectar = async () => {
    setOcupado("desconectar"); setErro("");
    try { aoMudar(await whatsappRequest<Situacao>("conexao", { body: { acao: "desconectar" } })); setTeste(null); setConfirmarSaida(false); setSucesso(""); }
    catch (falha) { setErro(errorMessage(falha)); }
    finally { setOcupado(""); }
  };
  const conectou = (resultado: ResultadoConexao) => {
    aoMudar(resultado.situacao); setTrocando(false); setTeste(null);
    setSucesso(`WhatsApp conectado: ${resultado.numero}${resultado.nome ? ` (${resultado.nome})` : ""}.${resultado.avisos.length ? ` Atenção: ${resultado.avisos.join(" ")}` : ""}`);
  };

  return (
    <Painel>
      <Cabeca>
        <Titulo><WhatsappLogoIcon size={20} weight="fill" aria-hidden /> WhatsApp da empresa</Titulo>
        <Pill $tone={conexao.conectado ? "green" : "peach"}>{conexao.conectado ? "Conectado" : "Não conectado"}</Pill>
      </Cabeca>

      {conexao.conectado && !trocando ? (
        <Stack>
          <Numero>
            <CheckCircleIcon size={28} weight="fill" aria-hidden />
            <div>
              <strong>{conexao.numero || conexao.phoneNumberId}</strong>
              <span>{[conexao.nome, NOME_MODO[conexao.modo], conexao.desde && `desde ${formatWhatsAppDate(conexao.desde)}`].filter(Boolean).join(" · ")}</span>
            </div>
          </Numero>
          <Note>Última mensagem recebida pelo webhook: {formatWhatsAppDate(situacao.webhook.ultimoEvento)}. Mande um “oi” para o número e confira em Conversas.</Note>
          {teste && (
            <Notice role="status">
              {teste.inscrito ? "Tudo certo: a Meta respondeu pelo número" : "O número respondeu, mas a inscrição do webhook não foi confirmada"} {teste.numero}
              {teste.qualidade ? ` (${QUALIDADE[teste.qualidade] ?? teste.qualidade})` : ""}.{teste.reinscrito ? " A inscrição do webhook tinha caído e foi refeita." : ""}
            </Notice>
          )}
          <Actions>
            <Button size="sm" variant="secondary" icon={ArrowClockwiseIcon} loading={ocupado === "testar"} onClick={() => void testar()}>Testar conexão</Button>
            <Button size="sm" variant="secondary" href="/conversas" icon={WhatsappLogoIcon}>Abrir conversas</Button>
            <Button size="sm" variant="ghost" icon={PlugsConnectedIcon} onClick={() => { setTrocando(true); setSucesso(""); }}>Trocar número</Button>
            {confirmarSaida ? (
              <>
                <Button size="sm" variant="danger" icon={LinkBreakIcon} loading={ocupado === "desconectar"} onClick={() => void desconectar()}>Confirmar desconexão</Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmarSaida(false)}>Cancelar</Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" icon={LinkBreakIcon} onClick={() => setConfirmarSaida(true)}>Desconectar</Button>
            )}
          </Actions>
          {confirmarSaida && <Note>Desconectar apaga só o acesso deste número no ERP. As conversas e as chaves do webhook ficam guardadas.</Note>}
        </Stack>
      ) : (
        <Conectar situacao={situacao} aoConectar={conectou} aoCancelar={conexao.conectado ? () => setTrocando(false) : undefined} />
      )}
      {!app.cadastroIncorporadoPronto && !app.tokenPossivel && <Note>Primeiro cadastre o app da Meta logo abaixo (é uma vez só).</Note>}
      {sucesso && <Notice role="status">{sucesso}</Notice>}
      {erro && <Notice $error role="alert">{erro}</Notice>}
    </Painel>
  );
}

function Conectar({ situacao, aoConectar, aoCancelar }: { situacao: Situacao; aoConectar: (r: ResultadoConexao) => void; aoCancelar?: () => void }) {
  const { app } = situacao;
  const [modo, setModo] = useState<"coexistencia" | "novo">("coexistencia");
  const [preparo, setPreparo] = useState<Preparo | null>(null);
  const [preparadoEm, setPreparadoEm] = useState(0);
  const [sdk, setSdk] = useState<"carregando" | "pronto" | "falhou">("carregando");
  const [conectando, setConectando] = useState(false);
  const [erro, setErro] = useState("");
  const [comToken, setComToken] = useState(!app.cadastroIncorporadoPronto && app.tokenPossivel);
  const ultimoAviso = useRef<AvisoCadastro | null>(null);

  const preparar = useCallback(async () => {
    try { setPreparo(await whatsappRequest<Preparo>("conexao", { body: { acao: "preparar" } })); setPreparadoEm(Date.now()); }
    catch (falha) { setErro(errorMessage(falha)); }
  }, []);

  useEffect(() => {
    if (!app.cadastroIncorporadoPronto) return;
    let vivo = true;
    void preparar();
    carregarSdkFacebook(app.appId, app.versao).then(
      () => vivo && setSdk("pronto"),
      () => { if (!vivo) return; setSdk("falhou"); setErro("A janela da Meta não carregou. Confira se algum bloqueador de anúncios está segurando o facebook.net e recarregue a página."); },
    );
    const parar = ouvirCadastro((aviso) => { ultimoAviso.current = aviso; });
    return () => { vivo = false; parar(); };
  }, [app.cadastroIncorporadoPronto, app.appId, app.versao, preparar]);

  const concluir = async (code: string, atual: Preparo) => {
    // O aviso da janela com conta e número costuma chegar junto do login; se ainda não chegou, espera um pouco.
    for (let i = 0; i < 10 && ultimoAviso.current?.tipo !== "fim"; i += 1) await new Promise((ok) => window.setTimeout(ok, 150));
    const fim = ultimoAviso.current?.tipo === "fim" ? ultimoAviso.current : null;
    try {
      aoConectar(await whatsappRequest<ResultadoConexao>("conexao", { body: { acao: "concluir", state: atual.state, code, modo, wabaId: fim?.wabaId, phoneNumberId: fim?.phoneNumberId } }));
    } catch (falha) {
      setErro(errorMessage(falha));
      void preparar();
    } finally { setConectando(false); }
  };

  // A janela da Meta precisa abrir direto do clique: depois de um await, o navegador a bloqueia como propaganda.
  const abrirMeta = () => {
    if (!preparo || !window.FB) return;
    if (Date.now() - preparadoEm > 9 * 60_000) { setErro("A sessão de conexão expirou. Clique de novo."); void preparar(); return; }
    setErro(""); setConectando(true); ultimoAviso.current = null;
    const atual = preparo;
    window.FB.login((resposta) => {
      const code = resposta.authResponse?.code;
      if (code) { void concluir(code, atual); return; }
      setConectando(false);
      const aviso = ultimoAviso.current;
      setErro(aviso?.tipo === "erro" && aviso.mensagem ? `A Meta avisou: ${aviso.mensagem}` : "A janela da Meta foi fechada antes de terminar. Clique em “Conectar” para tentar de novo.");
      void preparar();
    }, opcoesCadastro(atual.configId, modo === "coexistencia"));
  };

  if (comToken) return <ConectarComToken aoConectar={aoConectar} voltar={app.cadastroIncorporadoPronto ? () => setComToken(false) : undefined} aoCancelar={aoCancelar} />;

  return (
    <Stack>
      {app.cadastroIncorporadoPronto ? (
        <>
          <Modos role="radiogroup" aria-label="Como usar o número">
            {(Object.keys(MODOS) as Array<keyof typeof MODOS>).map((chave) => (
              <Modo key={chave} $ativo={modo === chave}>
                <input type="radio" name="modo-whatsapp" value={chave} checked={modo === chave} onChange={() => setModo(chave)} />
                <span><strong>{MODOS[chave].titulo}</strong><small>{MODOS[chave].texto}</small></span>
              </Modo>
            ))}
          </Modos>
          <Passos>
            <li>Clique em <strong>Conectar com a Meta</strong>: abre a janela oficial.</li>
            <li>Entre com o Facebook de quem administra a empresa e escolha a conta do WhatsApp Business.</li>
            <li>{modo === "coexistencia" ? "Confirme o número do app WhatsApp Business (a Meta mostra um código no celular)." : "Escolha ou cadastre o número e confirme o código recebido por SMS ou ligação."}</li>
          </Passos>
          <Actions>
            <Button icon={WhatsappLogoIcon} loading={conectando} disabled={!preparo || sdk !== "pronto"} onClick={abrirMeta}>
              {sdk === "carregando" || !preparo ? "Preparando a Meta…" : "Conectar com a Meta"}
            </Button>
            {app.tokenPossivel && <Button variant="ghost" size="sm" icon={KeyIcon} onClick={() => setComToken(true)}>Prefiro colar um token</Button>}
            {aoCancelar && <Button variant="ghost" size="sm" onClick={aoCancelar}>Cancelar</Button>}
          </Actions>
        </>
      ) : null}
      {erro && <Notice $error role="alert">{erro}</Notice>}
    </Stack>
  );
}

function ConectarComToken({ aoConectar, voltar, aoCancelar }: { aoConectar: (r: ResultadoConexao) => void; voltar?: () => void; aoCancelar?: () => void }) {
  const [token, setToken] = useState("");
  const [numeros, setNumeros] = useState<Escolha[]>([]);
  const [numero, setNumero] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);

  const conectar = async () => {
    setEnviando(true); setErro(null);
    try { aoConectar(await whatsappRequest<ResultadoConexao>("conexao", { body: { acao: "token", token, phoneNumberId: numero || undefined } })); }
    catch (falha) {
      if (falha instanceof WhatsAppRequestError && falha.code === "CHOOSE_PHONE" && Array.isArray(falha.details)) { setNumeros(falha.details as Escolha[]); setNumero((falha.details as Escolha[])[0]?.id ?? ""); }
      setErro({ texto: errorMessage(falha), campo: falha instanceof WhatsAppRequestError ? falha.field : undefined });
    } finally { setEnviando(false); }
  };

  return (
    <Stack>
      <Note>Em <strong>Meta Business &gt; Configurações &gt; Usuários do sistema</strong>, gere um token para o app cadastrado com as permissões <code>whatsapp_business_management</code> e <code>whatsapp_business_messaging</code> (validade “Nunca”). Cole aqui: o ERP descobre a conta e o número sozinho.</Note>
      <form onSubmit={(evento) => { evento.preventDefault(); void conectar(); }} autoComplete="off">
        <Stack>
          <TextField label="Token de usuário do sistema" name="token-meta-sistema" value={token} onChange={(evento) => setToken(evento.target.value)} placeholder="EAA…" error={erro?.campo === "token" ? erro.texto : undefined} hint="Fica cifrado no servidor e nunca volta ao navegador." style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} {...semPreenchimento} />
          {numeros.length > 1 && (
            <Modos role="radiogroup" aria-label="Número da conta">
              {numeros.map((opcao) => (
                <Modo key={opcao.id} $ativo={numero === opcao.id}>
                  <input type="radio" name="numero-whatsapp" checked={numero === opcao.id} onChange={() => setNumero(opcao.id)} />
                  <span><strong>{opcao.numero || opcao.id}</strong><small>{opcao.nome}</small></span>
                </Modo>
              ))}
            </Modos>
          )}
          <Actions>
            <Button type="submit" icon={PlugsConnectedIcon} loading={enviando} disabled={!token.trim()}>Conectar com o token</Button>
            {voltar && <Button variant="ghost" size="sm" onClick={voltar}>Voltar para “Conectar com a Meta”</Button>}
            {aoCancelar && <Button variant="ghost" size="sm" onClick={aoCancelar}>Cancelar</Button>}
          </Actions>
        </Stack>
      </form>
      {erro && erro.campo !== "token" && <Notice $error role="alert">{erro.texto}</Notice>}
    </Stack>
  );
}

/* ---------------------------------------------------------------- app da Meta */

function CartaoApp({ situacao, aoMudar }: { situacao: Situacao; aoMudar: (s: Situacao) => void }) {
  const { app } = situacao;
  const [aberto, setAberto] = useState(!app.cadastroIncorporadoPronto && !situacao.conexao.conectado);
  const [campos, setCampos] = useState({ appId: app.appId, appSecret: "", configId: app.configId });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<{ texto: string; campo?: string } | null>(null);
  const [salvo, setSalvo] = useState(false);
  const alterar = (campo: keyof typeof campos) => (evento: React.ChangeEvent<HTMLInputElement>) => { setCampos((atual) => ({ ...atual, [campo]: evento.target.value })); setSalvo(false); };

  const salvar = async () => {
    setSalvando(true); setErro(null);
    try {
      aoMudar(await whatsappRequest<Situacao>("conexao", { body: { acao: "salvar-app", appId: campos.appId.trim(), appSecret: campos.appSecret, configId: campos.configId.trim() } }));
      setCampos((atual) => ({ ...atual, appSecret: "" })); setSalvo(true);
    } catch (falha) { setErro({ texto: errorMessage(falha), campo: falha instanceof WhatsAppRequestError ? falha.field : undefined }); }
    finally { setSalvando(false); }
  };
  const erroDe = (campo: string) => (erro?.campo === campo ? erro.texto : undefined);

  return (
    <Painel>
      <Cabeca>
        <Titulo>App da Meta <small>(uma vez só)</small></Titulo>
        <Pill $tone={app.cadastroIncorporadoPronto ? "green" : "peach"}>{app.cadastroIncorporadoPronto ? "Pronto" : app.faltando.length === 1 ? `Falta 1 dado: ${app.faltando[0]}` : `Faltam ${app.faltando.length} dados`}</Pill>
      </Cabeca>
      {!aberto ? (
        <Actions><Note>App {app.appId || "não cadastrado"} · Graph {app.versao}</Note><Button size="sm" variant="ghost" onClick={() => setAberto(true)}>Ver ou alterar</Button></Actions>
      ) : (
        <form onSubmit={(evento) => { evento.preventDefault(); void salvar(); }} autoComplete="off">
          <Stack>
            <Note>Em <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">Meta for Developers</a>, abra o app da empresa. O App ID e o App Secret ficam em <strong>Configurações do app &gt; Básico</strong>. O ID da configuração fica em <strong>Login do Facebook para Empresas &gt; Configurações</strong> (a configuração do “Cadastro incorporado do WhatsApp”).</Note>
            <FieldGrid>
              <TextField label="App ID" name="meta-app-id" inputMode="numeric" value={campos.appId} onChange={alterar("appId")} error={erroDe("appId")} {...semPreenchimento} />
              <TextField label="App Secret" name="meta-app-chave" value={campos.appSecret} onChange={alterar("appSecret")} placeholder={app.appSecretSalvo ? "Guardado. Deixe vazio para manter" : "32 letras e números"} error={erroDe("appSecret")} style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} {...semPreenchimento} />
              <TextField label="ID da configuração (cadastro incorporado)" name="meta-config-id" inputMode="numeric" value={campos.configId} onChange={alterar("configId")} error={erroDe("configId")} hint="Opcional se for conectar com token." {...semPreenchimento} />
            </FieldGrid>
            <Actions>
              <Button type="submit" loading={salvando}>Salvar e conferir na Meta</Button>
              {app.cadastroIncorporadoPronto && <Button variant="ghost" size="sm" onClick={() => setAberto(false)}>Fechar</Button>}
              {salvo && <Note>Salvo e conferido na Meta.</Note>}
            </Actions>
            {erro && !["appId", "appSecret", "configId"].includes(erro.campo ?? "") && <Notice $error role="alert">{erro.texto}</Notice>}
          </Stack>
        </form>
      )}
    </Painel>
  );
}

/* ---------------------------------------------------------------- o que configurar na Meta */

function CartaoMeta({ situacao }: { situacao: Situacao }) {
  const { webhook, meta } = situacao;
  const linhas: Array<{ rotulo: string; valor: string; segredo?: boolean; onde: string }> = [
    { rotulo: "Domínio permitido do SDK JavaScript", valor: `https://${meta.dominio}`, onde: "Login do Facebook para Empresas > Configurações" },
    { rotulo: "URI de redirecionamento OAuth válida", valor: meta.paginaDoBotao, onde: "Login do Facebook para Empresas > Configurações" },
    { rotulo: "URL de callback do webhook", valor: webhook.url, onde: "WhatsApp > Configuração > Webhook" },
    { rotulo: "Token de verificação do webhook", valor: webhook.verifyToken, segredo: true, onde: "WhatsApp > Configuração > Webhook" },
    { rotulo: "Campos do webhook a assinar", valor: webhook.campos.join(", "), onde: "WhatsApp > Configuração > Campos do webhook" },
    { rotulo: "Política de privacidade", valor: meta.privacidade, onde: "Configurações do app > Básico" },
    { rotulo: "Termos de serviço", valor: meta.termos, onde: "Configurações do app > Básico" },
    { rotulo: "Exclusão de dados (callback)", valor: meta.exclusaoCallback, onde: "Configurações do app > Básico" },
  ];
  return (
    <Painel>
      <Cabeca><Titulo>O que fica cadastrado no app da Meta</Titulo></Cabeca>
      <Note>Valores para copiar no painel da Meta. Eles não mudam quando o número é trocado ou reconectado: o webhook continua o mesmo.</Note>
      <Tabela>
        {linhas.map((linha) => (
          <li key={linha.rotulo}>
            <div><strong>{linha.rotulo}</strong><small>{linha.onde}</small></div>
            <code>{!linha.valor ? "Gerado ao salvar o app" : linha.segredo ? `${linha.valor.slice(0, 4)}••••••••${linha.valor.slice(-4)}` : linha.valor}</code>
            {linha.valor && <CopyButton text={linha.valor} label={`Copiar ${linha.rotulo.toLowerCase()}`} icon={CopyIcon} size="sm" variant="ghost" />}
          </li>
        ))}
      </Tabela>
    </Painel>
  );
}

/* ---------------------------------------------------------------- estilos */

const Painel = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(4)};
  padding: ${({ theme }) => theme.spacing(5)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.palette.neutral[0]};
  min-width: 0;
  code { font-size: 0.75rem; overflow-wrap: anywhere; }
  ${({ theme }) => theme.media.md} { padding: ${({ theme }) => theme.spacing(4)}; }
`;
const Cabeca = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
`;
const Titulo = styled.h3`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  small { font-size: 0.8125rem; font-weight: 400; color: ${({ theme }) => theme.colors.text.muted}; }
`;
const Numero = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
  svg { color: ${({ theme }) => theme.colors.primary.main}; flex-shrink: 0; }
  strong { display: block; font-size: 1.125rem; }
  span { font-size: 0.8125rem; color: ${({ theme }) => theme.colors.text.muted}; }
`;
const Modos = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: ${({ theme }) => theme.spacing(2)};
`;
const Modo = styled("label", { shouldForwardProp: (prop) => prop !== "$ativo" })<{ $ativo: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(3)};
  border: 1px solid ${({ theme, $ativo }) => ($ativo ? theme.colors.primary.main : theme.colors.border.subtle)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme, $ativo }) => ($ativo ? theme.colors.background.surface : "transparent")};
  cursor: pointer;
  input { margin-top: 3px; accent-color: ${({ theme }) => theme.colors.primary.main}; }
  strong { display: block; font-size: 0.875rem; }
  small { display: block; margin-top: 2px; font-size: 0.8125rem; line-height: 1.5; color: ${({ theme }) => theme.colors.text.muted}; }
`;
const Passos = styled.ol`
  margin: 0;
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  font-size: 0.8125rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.text.secondary};
`;
const Tabela = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  li {
    display: grid;
    grid-template-columns: minmax(12rem, 1fr) minmax(0, 2fr) auto;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(3)};
    padding: ${({ theme }) => theme.spacing(2, 0)};
    border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
  li > div strong { display: block; font-size: 0.8125rem; }
  li > div small { font-size: 0.75rem; color: ${({ theme }) => theme.colors.text.muted}; }
  ${({ theme }) => theme.media.md} { li { grid-template-columns: minmax(0, 1fr) auto; } li > div { grid-column: 1 / -1; } }
`;
