"use client";

import Link from "next/link";
import { type ReactNode, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { reais, Valor } from "@/loja/componentes/carrinho/Resumo";
import {
  ArrowLeft,
  ArrowsClockwise,
  CalendarBlank,
  Check,
  Clock,
  Copy,
  CreditCard,
  FilePdf,
  Info,
  PixLogo,
  Storefront,
  Truck,
  WhatsappLogo,
  X,
} from "@/loja/componentes/icones";
import { Imagem } from "@/loja/componentes/inicio/blocos";
import { EMPRESA } from "@/loja/lib/empresa";
import { acoes, dataComHora, dataCurta, diaPorExtenso, diasParaAgendar, linhaDoTempo, type Pedido, situacao } from "@/loja/lib/pedidos/status";
import { comprarDeNovo, mensagemPrincipal, SeloStatus, useAgora } from "./comum";
import { atualizarPedidoSimulado, usePedidosSimulados } from "./pedidosSimulados";

const PIX_EXEMPLO = "00020126SIMULACAO-MK-NAO-PAGAR5204000053039865802BR5925ATELIE MILENA KERBAGE6304ABCD";
const MOTIVOS = [
  "Comprei errado ou a mais",
  "Escolhi a cor ou o tamanho errado",
  "O prazo não chega antes do nascimento",
  "Vou pagar de outra forma",
  "Outro motivo",
];

// Acompanhamento do pedido (referencia.md §16): situação em destaque com o rastreio por etapas,
// o que fazer agora (pagar o Pix, mostrar o código de retirada, rastrear), itens, histórico,
// valores, entrega e ações (cancelar, agendar a entrega, nota, trocar, comprar de novo).
// Pedido simulado: as mudanças ficam no navegador. Exemplo: só nesta tela.
export function DetalhePedido({ numero, exemplo }: { numero: string; exemplo?: Pedido }) {
  const simulados = usePedidosSimulados();
  const [alterado, setAlterado] = useState<Pedido | null>(null);
  const [mensagem, setMensagem] = useState("");
  const dialogoCancelar = useRef<HTMLDialogElement>(null);
  const dialogoReagendar = useRef<HTMLDialogElement>(null);

  const base = exemplo ?? simulados?.find((pedido) => pedido.numero === numero);
  if (!base && simulados === null) return <Esqueleto />;
  if (!base) return <NaoEncontrado numero={numero} />;
  const pedido = alterado ?? base;

  const permitido = acoes(pedido);
  const passos = linhaDoTempo(pedido);
  const { tom } = situacao(pedido.status);
  const quantidade = pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);

  function aplicar(mudar: (atual: Pedido) => Pedido, aviso: string) {
    if (pedido.simulado) {
      atualizarPedidoSimulado(pedido.numero, mudar);
      setAlterado(mudar(pedido));
      setMensagem(aviso);
    } else {
      setAlterado(mudar(pedido));
      setMensagem(`${aviso} (Exemplo: a mudança vale só nesta tela.)`);
    }
  }

  return (
    <div className={css({ mt: { base: "5", lg: "6" } })}>
      <Link href="/conta/pedidos" className={voltar}>
        <ArrowLeft size={16} aria-hidden /> Meus pedidos
      </Link>

      <div className={css({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "3", mt: "3" })}>
        <div>
          <h1 className={css({ fontSize: { base: "2xl", lg: "3xl" }, fontWeight: "normal", letterSpacing: "[-0.02em]", color: "escuro" })}>
            Pedido {pedido.numero}
          </h1>
          <p className={css({ mt: "1", fontSize: "sm", color: "textoSuave" })}>
            Feito em {dataComHora(pedido.criadoEm)} · {quantidade} {quantidade === 1 ? "item" : "itens"} · {reais(pedido.valores.total)}
            {pedido.simulado ? " · simulado no checkout" : " · exemplo"}
          </p>
        </div>
        <SeloStatus status={pedido.status} />
      </div>

      {mensagem && (
        <p role="status" className={confirmacao}>
          <Check size={18} aria-hidden className={css({ flexShrink: "0" })} />
          <span className={css({ flex: "1" })}>{mensagem}</span>
          <button type="button" aria-label="Fechar aviso" onClick={() => setMensagem("")} className={css({ cursor: "pointer" })}>
            <X size={16} />
          </button>
        </p>
      )}

      {/* Situação + rastreio por etapas */}
      <section aria-labelledby="titulo-situacao" data-tom={tom} className={destaque}>
        <h2 id="titulo-situacao" className={css({ fontSize: { base: "xl", md: "2xl" }, fontWeight: "semibold", color: "escuro" })}>
          {mensagemPrincipal(pedido)}
        </h2>
        <p className={css({ mt: "1", fontSize: "sm", color: "texto" })}>
          {pedido.entrega.tipo === "retirada"
            ? `Retirada grátis no ${pedido.entrega.local}`
            : `Entrega ${pedido.entrega.modalidade.toLowerCase()} para ${pedido.entrega.destino} · ${pedido.entrega.prazo}`}
        </p>

        <ol aria-label="Etapas do pedido" className={linha}>
          {passos.map((passo) => (
            <li key={passo.rotulo} data-estado={passo.estado} className={passoEstilo}>
              <span aria-hidden className={marcador}>
                {passo.estado === "feito" && <Check size={12} weight="bold" />}
              </span>
              <span className={css({ display: "grid", gap: "0.5" })}>
                <span
                  className={css({
                    fontSize: "sm",
                    fontWeight: passo.estado === "proximo" ? "normal" : "semibold",
                    color: passo.estado === "proximo" ? "textoSuave" : "escuro",
                  })}
                >
                  {passo.rotulo}
                  {passo.estado === "atual" && <span className={css({ srOnly: true })}> (etapa atual)</span>}
                </span>
                {passo.em && <span className={css({ fontSize: "xs", color: "textoSuave" })}>{dataComHora(passo.em)}</span>}
              </span>
            </li>
          ))}
        </ol>

        {permitido.pagar && pedido.pagamento.forma === "pix" && (
          <PagarPix
            pedido={pedido}
            aoGerar={(expiraEm) =>
              aplicar((atual) => ({ ...atual, pagamento: { ...atual.pagamento, expiraEm } }), "Novo código Pix gerado.")
            }
          />
        )}
        {pedido.status === "pronto_para_retirada" && pedido.entrega.tipo === "retirada" && <CodigoRetirada pedido={pedido} />}
        {permitido.rastrear && pedido.entrega.tipo === "endereco" && (
          <div className={caixaInterna}>
            <Truck size={24} aria-hidden className={css({ flexShrink: "0" })} />
            <div className={css({ flex: "1", minW: "0" })}>
              <p className={css({ fontSize: "sm", color: "texto" })}>{pedido.entrega.transportadora}</p>
              <p className={css({ fontWeight: "semibold", color: "escuro", letterSpacing: "wide" })}>{pedido.entrega.rastreio}</p>
            </div>
            <BotaoCopiar texto={pedido.entrega.rastreio ?? ""} rotulo="Copiar código" />
          </div>
        )}
      </section>

      <div className={grade}>
        <div className={css({ display: "grid", gap: "4", minW: "0" })}>
          <Bloco titulo={`Itens (${quantidade})`} id="titulo-itens">
            <ul>
              {pedido.itens.map((item) => (
                <li key={`${item.slug}-${item.variacao ?? ""}`} className={linhaItem}>
                  <Link href={`/produto/${item.slug}`} aria-label={item.nome} className={css({ flexShrink: "0" })}>
                    <Imagem tom="claro" className={css({ w: "16", h: "16", borderRadius: "sm" })} />
                  </Link>
                  <div className={css({ flex: "1", minW: "0" })}>
                    <Link href={`/produto/${item.slug}`} className={nomeItem}>
                      {item.nome}
                    </Link>
                    <p className={css({ fontSize: "sm", color: "textoSuave" })}>
                      {item.marca} · {item.quantidade} × {reais(Math.round(Number(item.preco) * 100))} / {item.unidade}
                      {item.variacao && ` · ${item.variacao}`}
                    </p>
                  </div>
                  <p className={css({ fontWeight: "semibold", color: "escuro", whiteSpace: "nowrap" })}>
                    {reais(Math.round(Number(item.preco) * 100) * item.quantidade)}
                  </p>
                </li>
              ))}
            </ul>
          </Bloco>

          <Bloco titulo="Histórico" id="titulo-historico">
            <ol className={css({ display: "grid", gap: "4" })}>
              {[...pedido.historico].reverse().map((evento) => (
                <li
                  key={`${evento.status}-${evento.em}`}
                  className={css({
                    display: "grid",
                    gridTemplateColumns: { base: "1fr", sm: "140px minmax(0, 1fr)" },
                    gap: { base: "0.5", sm: "4" },
                  })}
                >
                  <time dateTime={evento.em} className={css({ fontSize: "sm", color: "textoSuave" })}>
                    {dataComHora(evento.em)}
                  </time>
                  <span className={css({ fontSize: "sm", color: "texto" })}>
                    <strong className={css({ color: "escuro" })}>{situacao(evento.status).rotulo}</strong>
                    {evento.detalhe && ` · ${evento.detalhe}`}
                  </span>
                </li>
              ))}
            </ol>
          </Bloco>
        </div>

        <aside className={css({ display: "grid", gap: "4", alignContent: "start", position: { lg: "sticky" }, top: { lg: "[120px]" } })}>
          <Bloco titulo="Pagamento" id="titulo-pagamento">
            <dl className={css({ display: "grid", gap: "2", fontSize: "sm" })}>
              <Valor rotulo="Produtos" valor={reais(pedido.valores.produtos)} />
              {pedido.valores.desconto > 0 && <Valor rotulo="Descontos" valor={`− ${reais(pedido.valores.desconto)}`} destaque />}
              <Valor
                rotulo={pedido.entrega.tipo === "retirada" ? "Retirada" : "Frete"}
                valor={pedido.valores.frete ? reais(pedido.valores.frete) : "Grátis"}
              />
            </dl>
            <div
              className={css({
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                mt: "3",
                pt: "3",
                borderTopWidth: "1px",
                borderColor: "borda",
              })}
            >
              <span className={css({ fontWeight: "semibold", color: "escuro" })}>Total</span>
              <span className={css({ fontSize: "xl", fontWeight: "bold", color: "escuro" })}>{reais(pedido.valores.total)}</span>
            </div>
            <p className={css({ display: "flex", alignItems: "center", gap: "2", mt: "3", fontSize: "sm", color: "texto" })}>
              {pedido.pagamento.forma === "pix" ? <PixLogo size={18} aria-hidden /> : <CreditCard size={18} aria-hidden />}
              {pedido.pagamento.forma === "pix"
                ? "Pix"
                : `Cartão final ${pedido.pagamento.final} · ${pedido.pagamento.parcelas}x de ${reais(Math.ceil(pedido.valores.total / (pedido.pagamento.parcelas ?? 1)))}`}
            </p>
          </Bloco>

          <Bloco titulo={pedido.entrega.tipo === "retirada" ? "Retirada" : "Entrega"} id="titulo-entrega">
            <div className={css({ display: "grid", gap: "1", fontSize: "sm", color: "texto" })}>
              {pedido.entrega.tipo === "retirada" ? (
                <>
                  <p className={css({ fontWeight: "semibold", color: "escuro" })}>{pedido.entrega.local}</p>
                  <p>{EMPRESA.endereco}</p>
                  <p>Pronto a partir de {diaPorExtenso(pedido.entrega.previsao)}</p>
                  {pedido.entrega.retiraAte && <p>Retire até {diaPorExtenso(pedido.entrega.retiraAte)}</p>}
                  <p className={css({ color: "textoSuave" })}>Leve documento com foto e o código de retirada.</p>
                </>
              ) : (
                <>
                  <p className={css({ fontWeight: "semibold", color: "escuro" })}>
                    {pedido.entrega.modalidade} · {pedido.entrega.prazo}
                  </p>
                  <p>{pedido.entrega.endereco ?? "Endereço informado no checkout"}</p>
                  <p>{pedido.entrega.destino}</p>
                  {pedido.entrega.agendamento && (
                    <p className={css({ color: "escuro" })}>
                      Agendada: {diaPorExtenso(pedido.entrega.agendamento.data)}, {pedido.entrega.agendamento.periodo}
                    </p>
                  )}
                  <p className={css({ color: "textoSuave" })}>Enviado do ateliê, em Fortaleza, com código de rastreio.</p>
                </>
              )}
            </div>
          </Bloco>

          <Bloco titulo="O que você pode fazer" id="titulo-acoes">
            <div className={css({ display: "grid", gap: "2" })}>
              <button
                type="button"
                onClick={() => {
                  comprarDeNovo(pedido.itens);
                  setMensagem("Itens adicionados ao carrinho.");
                }}
                className={botao({ variante: "escuro", tamanho: "m", largo: true })}
              >
                <ArrowsClockwise size={18} aria-hidden /> Comprar de novo
              </button>
              {permitido.reagendar && (
                <button
                  type="button"
                  onClick={() => dialogoReagendar.current?.showModal()}
                  className={botao({ variante: "contorno", tamanho: "m", largo: true })}
                >
                  <CalendarBlank size={18} aria-hidden />{" "}
                  {pedido.entrega.tipo === "endereco" && pedido.entrega.agendamento ? "Mudar agendamento" : "Agendar a entrega"}
                </button>
              )}
              {permitido.notaFiscal && (
                <button
                  type="button"
                  onClick={() => setMensagem("Exemplo: o PDF e o XML da nota fiscal entram com a integração fiscal.")}
                  className={botao({ variante: "contorno", tamanho: "m", largo: true })}
                >
                  <FilePdf size={18} aria-hidden /> Nota fiscal (PDF)
                </button>
              )}
              {permitido.trocar && (
                <Link href="/ajuda/trocas-e-devolucoes" className={botao({ variante: "contorno", tamanho: "m", largo: true })}>
                  Trocar ou devolver
                </Link>
              )}
              <a
                href={`https://wa.me/${EMPRESA.whatsapp.numero}?text=${encodeURIComponent(`Olá! Preciso de ajuda com o pedido ${pedido.numero}.`)}`}
                target="_blank"
                rel="noreferrer"
                className={botao({ variante: "fantasma", tamanho: "m", largo: true })}
              >
                <WhatsappLogo size={18} aria-hidden /> Ajuda no WhatsApp
              </a>
              {permitido.cancelar && (
                <button type="button" onClick={() => dialogoCancelar.current?.showModal()} className={cancelar}>
                  Cancelar pedido
                </button>
              )}
            </div>
          </Bloco>
        </aside>
      </div>

      <DialogoCancelar
        referencia={dialogoCancelar}
        pagamento={pedido.pagamento.forma}
        aoConfirmar={(motivo) =>
          aplicar(
            (atual) => ({
              ...atual,
              status: "cancelado",
              historico: [
                ...atual.historico,
                { status: "cancelado", em: new Date().toISOString(), detalhe: `A pedido do cliente: ${motivo.toLowerCase()}.` },
              ],
            }),
            "Pedido cancelado.",
          )
        }
      />
      {pedido.entrega.tipo === "endereco" && (
        <DialogoReagendar
          referencia={dialogoReagendar}
          atual={pedido.entrega.agendamento}
          aoConfirmar={(agendamento) =>
            aplicar(
              (atual) => (atual.entrega.tipo === "endereco" ? { ...atual, entrega: { ...atual.entrega, agendamento } } : atual),
              `Entrega agendada para ${diaPorExtenso(agendamento.data)}, ${agendamento.periodo}.`,
            )
          }
        />
      )}
    </div>
  );
}

// Pix pendente: QR Code, copia e cola e o tempo que falta; vencido, gera outro.
function PagarPix({ pedido, aoGerar }: { pedido: Pedido; aoGerar: (expiraEm: string) => void }) {
  const agora = useAgora(1000);
  const expira = pedido.pagamento.expiraEm ? new Date(pedido.pagamento.expiraEm).getTime() : null;
  const restante = agora && expira ? Math.max(0, expira - agora) : 0;
  const valido = restante > 0;
  const minutos = String(Math.floor(restante / 60000)).padStart(2, "0");
  const segundos = String(Math.floor((restante % 60000) / 1000)).padStart(2, "0");

  return (
    <div className={cx(caixaInterna, css({ alignItems: "flex-start", flexDirection: { base: "column", md: "row" } }))}>
      <Imagem
        rotulo="QR Code Pix"
        tom="claro"
        rotuloNoCentro
        className={css({ w: "[160px]", h: "[160px]", flexShrink: "0", borderRadius: "md", opacity: valido ? "1" : "0.35" })}
      />
      <div className={css({ display: "grid", gap: "3", flex: "1", minW: "0", w: "full" })}>
        <p className={css({ fontSize: "lg", fontWeight: "semibold", color: "escuro" })}>Pague {reais(pedido.valores.total)} com Pix</p>
        {agora === null ? null : valido ? (
          <p className={css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm", color: "alerta", fontWeight: "semibold" })}>
            <Clock size={18} aria-hidden /> O código vence em {minutos}:{segundos}
          </p>
        ) : (
          <p className={css({ fontSize: "sm", color: "texto" })}>O código Pix vale 30 minutos depois de gerado. Gere um novo para pagar.</p>
        )}
        {valido ? (
          <div className={css({ display: "flex", gap: "2" })}>
            <label htmlFor="pix-copia-cola" className={css({ srOnly: true })}>
              Pix copia e cola
            </label>
            <input id="pix-copia-cola" readOnly value={PIX_EXEMPLO} onFocus={(evento) => evento.target.select()} className={campoCodigo} />
            <BotaoCopiar texto={PIX_EXEMPLO} rotulo="Copiar" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => aoGerar(new Date(Date.now() + 30 * 60 * 1000).toISOString())}
            className={cx(botao({ variante: "escuro", tamanho: "m" }), css({ justifySelf: "start" }))}
          >
            <PixLogo size={18} aria-hidden /> Gerar código Pix
          </button>
        )}
        <p className={css({ fontSize: "xs", color: "textoSuave" })}>Simulação: o código é fictício e não pode ser pago.</p>
      </div>
    </div>
  );
}

// Código de retirada derivado do número (exemplo); no real vem da API e vale uma vez.
function CodigoRetirada({ pedido }: { pedido: Pedido }) {
  const codigo = pedido.numero.replace(/\D/g, "").slice(-4).split("").reverse().join("");
  return (
    <div className={caixaInterna}>
      <Storefront size={24} aria-hidden className={css({ flexShrink: "0" })} />
      <div className={css({ flex: "1", minW: "0" })}>
        <p className={css({ fontSize: "sm", color: "texto" })}>Código de retirada (mostre no ateliê)</p>
        <p className={css({ fontSize: "3xl", fontWeight: "bold", letterSpacing: "[0.3em]", color: "escuro" })}>{codigo}</p>
      </div>
      {pedido.entrega.tipo === "retirada" && pedido.entrega.retiraAte && (
        <p className={css({ fontSize: "sm", color: "texto" })}>Até {diaPorExtenso(pedido.entrega.retiraAte)}</p>
      )}
    </div>
  );
}

function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 2500);
        } catch {
          // sem permissão: o texto continua visível para copiar à mão
        }
      }}
      className={cx(botao({ variante: "contorno", tamanho: "m" }), css({ flexShrink: "0" }))}
    >
      <Copy size={18} aria-hidden /> {copiado ? "Copiado" : rotulo}
    </button>
  );
}

function DialogoCancelar({
  referencia,
  pagamento,
  aoConfirmar,
}: {
  referencia: React.RefObject<HTMLDialogElement | null>;
  pagamento: "pix" | "cartao";
  aoConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  return (
    <Dialogo referencia={referencia} titulo="Cancelar pedido" id="dialogo-cancelar">
      <fieldset className={css({ display: "grid", gap: "2" })}>
        <legend className={css({ mb: "2", fontSize: "sm", color: "texto" })}>Conte o motivo (ajuda a melhorar a loja):</legend>
        {MOTIVOS.map((item) => (
          <label
            key={item}
            className={css({ display: "flex", alignItems: "center", gap: "2.5", fontSize: "sm", color: "escuro", cursor: "pointer" })}
          >
            <input
              type="radio"
              name="motivo"
              checked={motivo === item}
              onChange={() => setMotivo(item)}
              className={css({ accentColor: "[token(colors.escuro)]" })}
            />
            {item}
          </label>
        ))}
      </fieldset>
      <p className={css({ display: "flex", gap: "2", mt: "4", fontSize: "sm", color: "texto" })}>
        <Info size={18} aria-hidden className={css({ flexShrink: "0" })} />
        {pagamento === "pix"
          ? "Se o Pix já foi pago, o valor volta para a mesma conta em até 2 dias úteis."
          : "O estorno aparece na fatura do cartão em até 2 faturas."}
      </p>
      <div className={rodapeDialogo}>
        <button type="button" onClick={() => referencia.current?.close()} className={botao({ variante: "contorno", tamanho: "m" })}>
          Manter pedido
        </button>
        <button
          type="button"
          onClick={() => {
            aoConfirmar(motivo);
            referencia.current?.close();
          }}
          className={botao({ variante: "primario", tamanho: "m" })}
        >
          Cancelar pedido
        </button>
      </div>
    </Dialogo>
  );
}

function DialogoReagendar({
  referencia,
  atual,
  aoConfirmar,
}: {
  referencia: React.RefObject<HTMLDialogElement | null>;
  atual?: { data: string; periodo: "manhã" | "tarde" };
  aoConfirmar: (agendamento: { data: string; periodo: "manhã" | "tarde" }) => void;
}) {
  const agora = useAgora();
  const dias = agora ? diasParaAgendar(new Date(agora)) : [];
  const [data, setData] = useState(atual?.data ?? "");
  const [periodo, setPeriodo] = useState<"manhã" | "tarde">(atual?.periodo ?? "manhã");
  const escolhida = data || dias[0] || "";
  return (
    <Dialogo referencia={referencia} titulo="Agendar a entrega" id="dialogo-reagendar">
      <p className={css({ fontSize: "sm", color: "texto" })}>
        Escolha um dia em que alguém esteja em casa para receber o pacote. A transportadora tenta entregar no período escolhido.
      </p>
      <fieldset className={css({ mt: "4" })}>
        <legend className={css({ mb: "2", fontSize: "sm", fontWeight: "semibold", color: "escuro" })}>Dia</legend>
        <div className={css({ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "2" })}>
          {dias.map((dia) => (
            <label key={dia} className={opcaoDia}>
              <input type="radio" name="dia" checked={escolhida === dia} onChange={() => setData(dia)} className={css({ srOnly: true })} />
              {diaPorExtenso(dia)}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className={css({ mt: "4" })}>
        <legend className={css({ mb: "2", fontSize: "sm", fontWeight: "semibold", color: "escuro" })}>Período</legend>
        <div className={css({ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "2" })}>
          {(["manhã", "tarde"] as const).map((item) => (
            <label key={item} className={opcaoDia}>
              <input
                type="radio"
                name="periodo"
                checked={periodo === item}
                onChange={() => setPeriodo(item)}
                className={css({ srOnly: true })}
              />
              {item === "manhã" ? "Manhã · 8h às 12h" : "Tarde · 13h às 18h"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={rodapeDialogo}>
        <button type="button" onClick={() => referencia.current?.close()} className={botao({ variante: "contorno", tamanho: "m" })}>
          Voltar
        </button>
        <button
          type="button"
          disabled={!escolhida}
          onClick={() => {
            aoConfirmar({ data: escolhida, periodo });
            referencia.current?.close();
          }}
          className={botao({ variante: "escuro", tamanho: "m" })}
        >
          Confirmar agendamento
        </button>
      </div>
    </Dialogo>
  );
}

function Dialogo({
  referencia,
  titulo,
  id,
  children,
}: {
  referencia: React.RefObject<HTMLDialogElement | null>;
  titulo: string;
  id: string;
  children: ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: o Esc já fecha o <dialog> nativo; o clique é só no véu
    <dialog
      ref={referencia}
      aria-labelledby={`${id}-titulo`}
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) referencia.current?.close();
      }}
      className={dialogo}
    >
      <div className={css({ p: { base: "5", md: "6" } })}>
        <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3", mb: "4" })}>
          <h2 id={`${id}-titulo`} className={css({ fontSize: "xl", fontWeight: "semibold", color: "escuro" })}>
            {titulo}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => referencia.current?.close()}
            className={css({ cursor: "pointer", color: "escuro" })}
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function Bloco({ titulo, id, children }: { titulo: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={bloco}>
      <h2 id={id} className={css({ mb: "3", fontSize: "md", fontWeight: "semibold", color: "escuro" })}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function NaoEncontrado({ numero }: { numero: string }) {
  return (
    <div className={css({ py: "16", textAlign: "center" })}>
      <h1 className={css({ fontSize: "2xl", color: "escuro" })}>Não encontramos o pedido {numero}</h1>
      <p className={css({ mt: "2", color: "textoSuave" })}>Confira o número no e-mail de confirmação ou fale com a gente.</p>
      <Link href="/conta/pedidos" className={cx(botao({ variante: "contorno", tamanho: "m" }), css({ mt: "6" }))}>
        Ver meus pedidos
      </Link>
    </div>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true" className={css({ display: "grid", gap: "4", mt: "6" })}>
      <div className={css({ w: "72", h: "9", bg: "placeholder", borderRadius: "sm" })} />
      <div className={css({ h: "[220px]", bg: "placeholder", borderRadius: "cartao" })} />
      <div className={css({ h: "[320px]", bg: "placeholder", borderRadius: "cartao" })} />
    </div>
  );
}

const voltar = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  fontSize: "sm",
  color: "texto",
  _hover: { color: "escuro", textDecoration: "underline", textUnderlineOffset: "3px" },
});

const confirmacao = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  mt: "4",
  px: "4",
  py: "3",
  borderRadius: "md",
  bg: "sucessoSuave",
  fontSize: "sm",
  color: "sucesso",
});

const destaque = css({
  display: "grid",
  gap: "1",
  mt: "5",
  p: { base: "5", md: "7" },
  borderRadius: "bloco",
  bg: "fundoSutil",
  borderWidth: "1px",
  borderColor: "borda",
  borderTopWidth: "4px",
  "&[data-tom=atencao]": { borderTopColor: "alerta" },
  "&[data-tom=andamento]": { borderTopColor: "link" },
  "&[data-tom=sucesso]": { borderTopColor: "sucesso" },
  "&[data-tom=neutro]": { borderTopColor: "textoSuave" },
});

// Rastreio: horizontal no desktop (bolinhas ligadas por traço), vertical no celular.
const linha = css({
  display: "grid",
  gridAutoFlow: { base: "row", md: "column" },
  gridAutoColumns: { md: "[minmax(0, 1fr)]" },
  gap: { base: "4", md: "2" },
  mt: "6",
});

const passoEstilo = css({
  position: "relative",
  display: "flex",
  flexDirection: { base: "row", md: "column" },
  alignItems: "flex-start",
  gap: { base: "3", md: "2" },
  // traço até a próxima etapa
  "&:not(:last-child)::after": {
    content: '""',
    position: "absolute",
    bg: "borda",
    top: { base: "6", md: "[11px]" },
    left: { base: "[11px]", md: "7" },
    w: { base: "[2px]", md: "[calc(100% - 28px)]" },
    h: { base: "[calc(100% - 8px)]", md: "[2px]" },
  },
  "&[data-estado=feito]:not(:last-child)::after": { bg: "escuro" },
});

const marcador = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "6",
  h: "6",
  borderRadius: "full",
  borderWidth: "2px",
  borderColor: "borda",
  bg: "fundo",
  color: "fundo",
  "[data-estado=feito] > &": { bg: "escuro", borderColor: "escuro" },
  "[data-estado=atual] > &": {
    borderColor: "escuro",
    boxShadow: "[inset 0 0 0 4px token(colors.fundo), inset 0 0 0 12px token(colors.escuro)]",
  },
});

const caixaInterna = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  mt: "6",
  p: "4",
  borderRadius: "md",
  bg: "fundo",
  borderWidth: "1px",
  borderColor: "borda",
});

const campoCodigo = css({
  flex: "1",
  minW: "0",
  h: "12",
  px: "3",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "campo",
  bg: "fundoSutil",
  fontSize: "xs",
  color: "texto",
  truncate: true,
});

const grade = css({
  display: "grid",
  gridTemplateColumns: { base: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 360px" },
  alignItems: "start",
  gap: { base: "4", lg: "8" },
  mt: "6",
});

const bloco = css({ p: { base: "4", md: "5" }, borderRadius: "cartao", borderWidth: "1px", borderColor: "borda" });

const linhaItem = css({
  display: "flex",
  alignItems: "center",
  gap: "4",
  py: "3",
  "&:not(:first-child)": { borderTopWidth: "1px", borderColor: "borda" },
});

const nomeItem = css({
  display: "block",
  fontWeight: "semibold",
  color: "escuro",
  lineClamp: "2",
  _hover: { textDecoration: "underline", textUnderlineOffset: "3px" },
});

const cancelar = css({
  mt: "2",
  fontSize: "sm",
  color: "erro",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
  cursor: "pointer",
  justifySelf: "center",
});

const dialogo = css({
  m: "auto",
  w: "[min(520px, calc(100vw - 32px))]",
  maxH: "[calc(100dvh - 48px)]",
  borderRadius: "bloco",
  bg: "fundo",
  boxShadow: "media",
  _backdrop: { bg: "veu" },
  _open: { animation: "surgir" },
});

const rodapeDialogo = css({ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: "2", mt: "6" });

const opcaoDia = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minH: "12",
  px: "2",
  borderRadius: "md",
  borderWidth: "1px",
  borderColor: "borda",
  fontSize: "sm",
  textAlign: "center",
  color: "escuro",
  cursor: "pointer",
  _hover: { borderColor: "escuro" },
  "&:has(input:checked)": { bg: "escuro", borderColor: "escuro", color: "fundo" },
  "&:has(input:focus-visible)": { outline: "[2px solid token(colors.foco)]", outlineOffset: "[2px]" },
});
