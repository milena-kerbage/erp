"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import {
  chaveItem,
  esvaziarCarrinho,
  salvarPreferenciasCompra,
  useItensCarrinho,
  usePreferenciasCompra,
} from "@/loja/componentes/carrinho/estado";
import { botaoContorno, botaoEscuro, largo, linkAcao, tituloBloco, tituloPagina } from "@/loja/componentes/carrinho/estilos";
import { FotoItem } from "@/loja/componentes/carrinho/FotoItem";
import { atributosDe } from "@/loja/componentes/carrinho/ItemSacola";
import { reais } from "@/loja/componentes/carrinho/Resumo";
import { AcessoConta } from "@/loja/componentes/conta/AcessoConta";
import { ConviteCupom } from "@/loja/componentes/conta/ConviteCupom";
import { cupomDaSacola, useContaDoCupom } from "@/loja/componentes/conta/cupomSacola";
import { chamarConta, ErroApiConta, type PedidoLoja, recarregarConta, type RespostaConta, sairDaConta, useConta } from "@/loja/componentes/conta/estadoConta";
import { registrarPedidoEnviado } from "@/loja/componentes/conta/historico";
import { paraPedidoEnviado } from "@/loja/componentes/conta/pedidosConta";
import { CheckCircle, WhatsappLogo } from "@/loja/componentes/icones";
import { useLocal } from "@/loja/componentes/localizacao/estado";
import type { ProdutoCarrinho } from "@/loja/lib/carrinho/catalogo";
import { linhaDoPedido, resolverItem } from "@/loja/lib/carrinho/linhas";
import { calcularTotais, centavos, DESCONTO_PIX_PERCENTUAL } from "@/loja/lib/carrinho/totais";
import { LIMITE_LOCAL, LIMITE_OBSERVACOES, linkWhatsApp, montarMensagemPedido } from "@/loja/lib/checkout/pedido";
import { PERCENTUAL_BOAS_VINDAS } from "@/loja/lib/contas/regras";
import { EMPRESA } from "@/loja/lib/empresa";
import { AreaTexto, Campo, Marcacao } from "./Campo";

type Entrega = { local: string; retirar: boolean; observacoes: string };
type Enviado = { numero: string; link: string };

// Pedido pelo WhatsApp (no lugar do checkout com pagamento): a loja é um CATÁLOGO COM PREÇO. Todo pedido
// é feito com conta: logada, a cliente revisa e envia; deslogada, entra ou cria a conta rápida aqui
// mesmo (nome, WhatsApp, e-mail, senha e o aceite) e o pedido segue na hora. O servidor registra o
// pedido (recalcula os valores "a partir de" pelo catálogo e confere o cupom; o de primeira compra é
// consumido aí), devolve o número e a mensagem, e o site abre o WhatsApp do ateliê. Uma vendedora
// confirma valores, bordado, frete e prazo e combina o pagamento por lá. Nada é cobrado no site.
// Se as contas estiverem fora do ar, o pedido ainda pode seguir direto pelo WhatsApp (sem cupom).
export function PaginaPedido({ catalogo }: { catalogo: ProdutoCarrinho[] }) {
  const itens = useItensCarrinho();
  const preferencias = usePreferenciasCompra();
  const local = useLocal();
  const conta = useConta();
  const contaCupom = useContaDoCupom();
  const porSlug = useMemo(() => new Map(catalogo.map((produto) => [produto.slug, produto])), [catalogo]);
  const [entrega, setEntrega] = useState<Entrega>({ local: "", retirar: false, observacoes: "" });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState<Enviado | null>(null);
  const [semRegistro, setSemRegistro] = useState(false);
  const aba = useRef<Window | null>(null);

  // CEP já informado no cabeçalho e a escolha de retirada (página de produto) chegam preenchidos.
  useEffect(() => {
    if (local) setEntrega((atual) => (atual.local ? atual : { ...atual, local: `${local.cidade}/${local.uf}` }));
  }, [local]);
  useEffect(() => {
    if (preferencias.entrega === "retirada") setEntrega((atual) => ({ ...atual, retirar: true }));
  }, [preferencias.entrega]);

  if (enviado) return <Confirmacao enviado={enviado} />;
  if (itens === null) return <Esqueleto />;

  const linhas = itens.flatMap((item) => {
    const produto = resolverItem(item, porSlug);
    return produto ? [{ item, produto }] : [];
  });
  if (linhas.length === 0) return <Vazio />;

  const precos = linhas.map(({ item, produto }) => ({ preco: produto.preco, quantidade: item.quantidade }));
  const subtotal = calcularTotais(precos).subtotal;
  const escolhido = cupomDaSacola(preferencias, contaCupom, subtotal);
  const totais = calcularTotais(precos, escolhido.cupom);
  const cliente = conta.situacao === "pronta" ? conta.cliente : null;
  const indisponivel = conta.situacao === "indisponivel" || semRegistro;
  // Prévia do cupom de boas-vindas para quem ainda vai criar a conta (se não escolheu outro cupom).
  const previaBoasVindas = !cliente && !preferencias.cupom ? Math.round((subtotal * PERCENTUAL_BOAS_VINDAS) / 100) : 0;

  function mudar<K extends keyof Entrega>(campo: K, valor: Entrega[K]) {
    setEntrega((atual) => ({ ...atual, [campo]: valor }));
    if (erros[campo]) setErros((atuais) => ({ ...atuais, [campo]: "" }));
  }

  // Abre a aba do WhatsApp DENTRO do clique (gesto da cliente), antes de esperar o servidor: assim o
  // bloqueador de pop-up deixa. Sem acesso de volta a esta página (opener nulo).
  function abrirAba() {
    const nova = window.open("", "_blank");
    if (nova) {
      try {
        nova.opener = null;
      } catch {
        // alguns navegadores não deixam alterar: segue assim
      }
    }
    aba.current = nova;
  }
  function fecharAba() {
    if (aba.current && !aba.current.closed) aba.current.close();
    aba.current = null;
  }

  async function registrar(cupom: string | undefined) {
    setEnviando(true);
    setErroGeral("");
    try {
      const resposta = await chamarConta<{ pedido: PedidoLoja; link: string }>("pedidos", {
        corpo: { itens, cupom: cupom ?? null, local: entrega.local, retirar: entrega.retirar, observacoes: entrega.observacoes },
      });
      // Cache "neste aparelho" (a fonte é o servidor: Minha conta › Pedidos).
      registrarPedidoEnviado(paraPedidoEnviado(resposta.pedido));
      salvarPreferenciasCompra({ entrega: entrega.retirar ? "retirada" : "endereco", cupom: undefined, semCupomAutomatico: undefined });
      void recarregarConta();
      if (aba.current && !aba.current.closed) aba.current.location.href = resposta.link;
      else window.open(resposta.link, "_blank", "noopener,noreferrer");
      aba.current = null;
      setEnviado({ numero: resposta.pedido.numero, link: resposta.link });
    } catch (erro) {
      fecharAba();
      if (erro instanceof ErroApiConta) {
        setErros(erro.campos);
        setErroGeral(erro.message);
        if (erro.codigo === "CUPOM_USADO" || erro.codigo === "CUPOM_INVALIDO") {
          salvarPreferenciasCompra({ cupom: undefined });
          void recarregarConta();
        }
        if (erro.codigo === "INDISPONIVEL" || erro.status === 0) setSemRegistro(true);
      } else setErroGeral("Não foi possível registrar o pedido agora. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  function enviarLogada(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;
    abrirAba();
    void registrar(escolhido.codigo);
  }

  // Conta criada ou login feito no próprio passo: o pedido segue em seguida, com o cupom da conta nova.
  async function aposConta(resposta: RespostaConta) {
    const cupom = cupomDaSacola(preferencias, { pronta: true, logada: true, cupom: resposta.cupom }, subtotal);
    await registrar(cupom.codigo);
  }

  // Contas fora do ar: o pedido segue direto pelo WhatsApp, como antes (sem cupom de conta e sem registro).
  function enviarSemRegistro() {
    const texto = montarMensagemPedido({
      linhas: linhas.map(({ item, produto }) => linhaDoPedido(item, produto)),
      cliente: { nome: cliente?.nome ?? "(meu nome está no WhatsApp)", whatsapp: cliente?.whatsappFormatado ?? "este número", ...entrega },
      descontoPixPercentual: DESCONTO_PIX_PERCENTUAL,
    });
    const link = linkWhatsApp(EMPRESA.whatsapp.numero, texto);
    window.open(link, "_blank", "noopener,noreferrer");
    setEnviado({ numero: "", link });
  }

  const camposEntrega = (
    <div className={css({ display: "grid", gap: "6" })}>
      <Campo
        id="pedido-local"
        rotulo="Cidade/UF ou CEP"
        autoComplete="off"
        placeholder="Ex.: Recife/PE ou 50000-000"
        maxLength={LIMITE_LOCAL}
        value={entrega.local}
        onChange={(evento) => mudar("local", evento.target.value)}
        erro={erros.local}
        dica="Ajuda a cotar o frete."
      />
      <Marcacao id="pedido-retirar" checked={entrega.retirar} onChange={(evento) => mudar("retirar", evento.target.checked)}>
        Prefiro retirar no ateliê, em Fortaleza
      </Marcacao>
      <AreaTexto
        id="pedido-observacoes"
        rotulo="Observações"
        maxLength={LIMITE_OBSERVACOES}
        rows={3}
        placeholder="Ex.: nome para o bordado, data prevista do parto"
        value={entrega.observacoes}
        onChange={(evento) => mudar("observacoes", evento.target.value)}
        erro={erros.observacoes}
      />
    </div>
  );

  const avisoErro = erroGeral && (
    <p role="alert" className={alerta}>
      {erroGeral}
    </p>
  );

  return (
    <div className={pagina}>
      <div className={grade}>
        <section aria-labelledby="titulo-pedido" className={colunaPrincipal}>
          <h1 id="titulo-pedido" className={tituloPagina}>
            Fazer pedido
          </h1>
          <p className={css({ mt: "4", fontSize: "md", lineHeight: "texto", color: "texto", maxW: "leitura" })}>
            O pedido fica registrado na sua conta e segue pelo WhatsApp do ateliê, com a mensagem pronta. Uma vendedora confirma valores,
            bordado, frete e prazo e combina o pagamento por lá. Nada é cobrado no site.
          </p>

          {conta.situacao === "carregando" ? (
            <div aria-busy="true" aria-label="Carregando a sua conta" className={css({ display: "grid", gap: "4", mt: "8", maxW: "formularioConta" })}>
              <div className={cx(bloco, css({ h: "12" }))} />
              <div className={cx(bloco, css({ h: "12" }))} />
              <div className={cx(bloco, css({ h: "12" }))} />
            </div>
          ) : indisponivel ? (
            <div className={css({ display: "grid", gap: "6", mt: "8", maxW: "[560px]" })}>
              <p role="alert" className={alerta}>
                Não conseguimos registrar pedidos no site agora. Você pode enviar a sacola direto pelo WhatsApp: a vendedora atende do mesmo jeito
                (o cupom de primeira compra fica para quando o site voltar).
              </p>
              {camposEntrega}
              <button type="button" onClick={enviarSemRegistro} className={cx(botaoEscuro, largo)}>
                <WhatsappLogo size={18} aria-hidden /> Enviar pelo WhatsApp
              </button>
            </div>
          ) : cliente ? (
            <form noValidate onSubmit={enviarLogada} className={css({ display: "grid", gap: "8", mt: "8", maxW: "[560px]" })}>
              <section aria-labelledby="titulo-passo-conta" className={passo}>
                <h2 id="titulo-passo-conta" className={tituloPasso}>
                  <span className={numeroPasso}>1</span> Sua conta
                </h2>
                <p className={css({ mt: "3", fontSize: "md", color: "escuro" })}>{cliente.nome}</p>
                <p className={css({ fontSize: "sm", color: "textoSuave", overflowWrap: "anywhere" })}>
                  {cliente.email} · WhatsApp {cliente.whatsappFormatado}
                </p>
                <p className={css({ mt: "2", fontSize: "sm", color: "textoSuave" })}>
                  <Link href="/conta/dados" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                    Alterar dados
                  </Link>{" "}
                  ·{" "}
                  <button type="button" onClick={() => void sairDaConta()} className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                    Não é você? Sair
                  </button>
                </p>
              </section>
              <section aria-labelledby="titulo-passo-entrega" className={passo}>
                <h2 id="titulo-passo-entrega" className={tituloPasso}>
                  <span className={numeroPasso}>2</span> Entrega e observações
                </h2>
                <div className={css({ mt: "5" })}>{camposEntrega}</div>
              </section>
              <div>
                {avisoErro}
                <button type="submit" disabled={enviando} aria-busy={enviando} className={cx(botaoEscuro, largo, css({ mt: erroGeral ? "4" : "0" }))}>
                  <WhatsappLogo size={18} aria-hidden /> {enviando ? "Registrando o pedido…" : "Fazer pedido pelo WhatsApp"}
                </button>
                <NotaPrivacidade />
              </div>
            </form>
          ) : (
            <div className={css({ display: "grid", gap: "8", mt: "8", maxW: "[560px]" })}>
              <section aria-labelledby="titulo-passo-entrega" className={passo}>
                <h2 id="titulo-passo-entrega" className={tituloPasso}>
                  <span className={numeroPasso}>1</span> Entrega e observações
                </h2>
                <div className={css({ mt: "5" })}>{camposEntrega}</div>
              </section>
              <section aria-labelledby="titulo-passo-conta" className={passo}>
                <h2 id="titulo-passo-conta" className={tituloPasso}>
                  <span className={numeroPasso}>2</span> Sua conta
                </h2>
                <p className={css({ mt: "3", mb: "5", fontSize: "sm", lineHeight: "texto", color: "textoSuave" })}>
                  Todo pedido é feito com conta: assim você acompanha os pedidos em qualquer aparelho. Leva menos de um minuto.
                </p>
                <ConviteCupom className={css({ mb: "6" })}>
                  {preferencias.cupom
                    ? `Um cupom por pedido: este pedido segue com o ${preferencias.cupom}, e o de primeira compra fica guardado na sua conta.`
                    : `Criando a conta agora, este pedido já sai com ${PERCENTUAL_BOAS_VINDAS}% OFF (− ${reais(previaBoasVindas)} na estimativa).`}
                </ConviteCupom>
                {conta.situacao === "pronta" && !conta.gravacao && (
                  <p role="note" className={css({ mb: "5", fontSize: "sm", color: "alerta" })}>
                    Desenvolvimento ligado ao banco remoto: criar conta e fazer pedido estão desligados aqui.
                  </p>
                )}
                {avisoErro}
                <AcessoConta
                  prefixo="pedido-conta"
                  rotuloCriar="Criar conta e fazer pedido"
                  rotuloEntrar="Entrar e fazer pedido"
                  aoIniciar={abrirAba}
                  aoFalhar={fecharAba}
                  aoConcluir={aposConta}
                />
                <NotaPrivacidade />
              </section>
            </div>
          )}
        </section>

        <aside aria-labelledby="titulo-revisao" className={colunaResumo}>
          <div className={css({ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "3" })}>
            <h2 id="titulo-revisao" className={tituloBloco}>
              Seu pedido
            </h2>
            <Link href="/carrinho" className={linkAcao}>
              Editar sacola
            </Link>
          </div>
          <ul className={css({ display: "grid", gap: "4", mt: "6" })}>
            {linhas.map(({ item, produto }) => (
              <li key={chaveItem(item)} className={css({ display: "grid", gridTemplateColumns: "[64px minmax(0, 1fr)]", gap: "3", alignItems: "start" })}>
                <FotoItem produto={produto} sizes="64px" className={css({ aspectRatio: "[5 / 6]", w: "full" })} />
                <div className={css({ minW: "0", fontSize: "sm", lineHeight: "texto" })}>
                  <p className={css({ color: "escuro" })}>{produto.nome}</p>
                  <p className={css({ fontSize: "xs", color: "textoSuave" })}>Quantidade: {item.quantidade}</p>
                  {atributosDe(produto, item).map((linha) => (
                    <p key={linha} className={css({ fontSize: "xs", color: "textoSuave" })}>
                      {linha}
                    </p>
                  ))}
                  <p className={css({ mt: "1", color: "escuro" })}>
                    <span className={css({ fontSize: "xs", color: "textoSuave" })}>a partir de </span>
                    {reais(centavos(produto.preco) * item.quantidade)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <dl className={css({ display: "grid", gap: "3", mt: "6", pt: "4", borderTopWidth: "1px", borderColor: "borda", fontSize: "sm" })}>
            <Linha rotulo={`Subtotal (${totais.itens} ${totais.itens === 1 ? "item" : "itens"})`} valor={`a partir de ${reais(totais.subtotal)}`} />
            {escolhido.cupom && totais.descontoCupom > 0 && (
              <Linha rotulo={escolhido.boasVindas ? `Cupom de primeira compra ${escolhido.cupom.codigo}` : `Cupom ${escolhido.cupom.codigo}`} valor={`− ${reais(totais.descontoCupom)}`} />
            )}
            {previaBoasVindas > 0 && !escolhido.cupom && <Linha rotulo={`${PERCENTUAL_BOAS_VINDAS}% OFF ao criar a conta`} valor={`− ${reais(previaBoasVindas)}`} />}
            <Linha rotulo="Frete" valor="A combinar pelo WhatsApp" />
            <Linha rotulo="Total estimado" valor={`a partir de ${reais(totais.totalCartao - (escolhido.cupom ? 0 : previaBoasVindas))}`} forte />
          </dl>
          {escolhido.automatico && escolhido.cupom && (
            <p className={css({ mt: "3", fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>
              Seu cupom de primeira compra entrou sozinho. Para guardar para outra compra, tire na{" "}
              <Link href="/carrinho" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
                sacola
              </Link>
              .
            </p>
          )}
          <p className={css({ mt: "3" })}>
            <span className={seloPix}>{DESCONTO_PIX_PERCENTUAL}% OFF no Pix</span>
          </p>
          <p className={css({ mt: "2", fontSize: "xs", lineHeight: "texto", color: "textoSuave" })}>
            O desconto no Pix é combinado à parte, com a vendedora.
          </p>
        </aside>
      </div>
    </div>
  );
}

function NotaPrivacidade() {
  return (
    <p className={css({ mt: "3", fontSize: "xs", lineHeight: "texto", color: "textoSuave", textAlign: "center" })}>
      O WhatsApp abre com a mensagem do pedido: é só enviar. O pedido fica salvo na sua conta, em Minha conta.{" "}
      <Link href="/politicas/privacidade" className={cx(linkAcao, css({ fontSize: "inherit" }))}>
        Privacidade
      </Link>
    </p>
  );
}

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={css({ display: "flex", justifyContent: "space-between", gap: "3", fontWeight: forte ? "medium" : "normal" })}>
      <dt className={css({ color: forte ? "escuro" : "texto" })}>{rotulo}</dt>
      <dd className={css({ color: "escuro", textAlign: "right" })}>{valor}</dd>
    </div>
  );
}

// Depois de enviar: o WhatsApp abriu em outra aba (ou foi bloqueado). Link de reserva, o número do
// pedido em Minha conta e a escolha entre esvaziar a sacola ou mantê-la.
function Confirmacao({ enviado }: { enviado: Enviado }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  const [esvaziada, setEsvaziada] = useState(false);

  useEffect(() => {
    titulo.current?.focus();
  }, []);

  return (
    <div className={pagina}>
      <div className={css({ maxW: "leitura" })}>
        <CheckCircle size={40} aria-hidden className={css({ color: "sucesso" })} />
        {enviado.numero && <p className={css({ mt: "4", fontSize: "sm", color: "textoSuave" })}>Pedido {enviado.numero}</p>}
        <h1 ref={titulo} tabIndex={-1} className={cx(tituloPagina, css({ mt: "2" }))}>
          Pedido enviado para o ateliê
        </h1>
        <p className={css({ mt: "4", fontSize: "md", lineHeight: "texto", color: "texto" })}>
          Abrimos o WhatsApp com a mensagem do seu pedido: é só enviar. Uma vendedora do ateliê continua a conversa por lá, confirma
          valores, bordado, frete e prazo e combina o pagamento.
        </p>
        <p className={css({ mt: "4" })}>
          <a href={enviado.link} target="_blank" rel="noopener noreferrer" className={linkAcao}>
            Se o WhatsApp não abriu, toque aqui
          </a>
        </p>
        {enviado.numero && (
          <p className={css({ mt: "2", fontSize: "sm", color: "textoSuave" })}>
            O pedido ficou na sua conta, em{" "}
            <Link href={`/conta/pedidos/${enviado.numero}`} className={cx(linkAcao, css({ fontSize: "inherit" }))}>
              Minha conta › Pedidos
            </Link>
            .
          </p>
        )}

        {esvaziada ? (
          <div className={css({ mt: "10" })}>
            <p role="status" className={css({ fontSize: "md", color: "escuro" })}>
              Sacola esvaziada.
            </p>
            <Link href="/" className={cx(botaoContorno, css({ mt: "4" }))}>
              Voltar para a loja
            </Link>
          </div>
        ) : (
          <div className={css({ mt: "10" })}>
            <p className={css({ fontSize: "md", fontWeight: "medium", color: "escuro" })}>E a sua sacola?</p>
            <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>Pode esvaziar agora ou manter as peças até fechar tudo com a vendedora.</p>
            <div className={css({ display: "flex", flexWrap: "wrap", gap: "3", mt: "4" })}>
              <button
                type="button"
                onClick={() => {
                  esvaziarCarrinho();
                  setEsvaziada(true);
                }}
                className={botaoEscuro}
              >
                Esvaziar a sacola
              </button>
              <Link href="/carrinho" className={botaoContorno}>
                Manter a sacola
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Vazio() {
  return (
    <div className={pagina}>
      <div className={css({ maxW: "leitura" })}>
        <h1 className={cx(tituloPagina, css({ fontSize: { base: "subtitulo", md: "4xl" } }))}>Sua sacola está vazia.</h1>
        <p className={css({ mt: "4", fontSize: "md", lineHeight: "texto", color: "textoSuave" })}>
          Escolha as peças e volte aqui para fazer o pedido pelo WhatsApp.
        </p>
        <Link href="/pronta-entrega" className={cx(botaoEscuro, css({ mt: "8" }))}>
          Ver pronta entrega
        </Link>
      </div>
    </div>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Carregando o pedido" className={pagina}>
      <div className={grade}>
        <div className={cx(colunaPrincipal, css({ display: "grid", gap: "4" }))}>
          <div className={cx(bloco, css({ h: "10", w: "[220px]" }))} />
          <div className={cx(bloco, css({ h: "12" }))} />
          <div className={cx(bloco, css({ h: "12" }))} />
          <div className={cx(bloco, css({ h: "12" }))} />
        </div>
        <div className={cx(colunaResumo, bloco, css({ h: "[320px]" }))} />
      </div>
    </div>
  );
}

const pagina = css({
  maxW: "sacola",
  mx: "auto",
  px: { base: "3", md: "5", desktop: "10" },
  pt: { base: "6", desktop: "10" },
  pb: { base: "12", desktop: "16" },
});

const grade = css({
  display: "grid",
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  columnGap: { base: "2", desktop: "5" },
  rowGap: "10",
  alignItems: "start",
});

const colunaPrincipal = css({ gridColumn: { base: "1 / -1", desktop: "1 / span 7" }, minW: "0" });
const colunaResumo = css({
  gridColumn: { base: "1 / -1", desktop: "9 / span 4" },
  position: { desktop: "sticky" },
  top: "6",
  minW: "0",
});

const passo = css({ pt: "6", borderTopWidth: "1px", borderColor: "borda" });
const tituloPasso = css({ display: "flex", alignItems: "center", gap: "3", fontSize: "lg", fontWeight: "medium", color: "escuro" });
const numeroPasso = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  w: "7",
  h: "7",
  borderRadius: "pilula",
  bg: "marcaSuave",
  fontSize: "sm",
  fontWeight: "semibold",
  color: "marca",
});

const alerta = css({ p: "3", mb: "4", borderRadius: "md", bg: "alertaSuave", fontSize: "sm", lineHeight: "texto", color: "erro" });

const seloPix = css({
  display: "inline-flex",
  px: "2",
  py: "0.5",
  borderRadius: "pilula",
  bg: "alertaSuave",
  fontSize: "xs",
  fontWeight: "medium",
  color: "escuro",
});

const bloco = css({ bg: "placeholder", borderRadius: "md", animation: "pulsar" });
