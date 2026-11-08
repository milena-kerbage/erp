"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";
import { CaretRight, Crosshair, MapPin, Truck, X } from "@/loja/componentes/icones";
import { RESPIRO_LATERAL } from "@/loja/componentes/layout/cabecalho/estilos";
import { desserializarLocal, formatarCep, type Local, mascararCep, normalizarCep, serializarLocal } from "@/loja/lib/localizacao/cep";
import { dispensarLembrete, lembreteDispensado, salvarLocal, useLocal } from "./estado";

const BUSCA_CEP_CORREIOS = "https://buscacepinter.correios.com.br/app/endereco/index.php";

const MENSAGENS: Record<string, string> = {
  cep_invalido: "CEP inválido. Confira os 8 números.",
  cep_nao_encontrado: "Não encontramos esse CEP. Confira os números.",
  geo_nao_encontrado: "Não achamos o CEP da sua localização. Digite o CEP, por favor.",
  coordenadas_invalidas: "Sua localização parece estar fora do Brasil. Digite o CEP, por favor.",
  geo_negada: "Você não autorizou a localização. Sem problema: digite o CEP.",
  geo_falhou: "Não conseguimos pegar sua localização. Digite o CEP, por favor.",
  geo_indisponivel: "Seu navegador não oferece localização. Digite o CEP, por favor.",
  servico_indisponivel: "Não conseguimos consultar agora. Tente de novo em instantes.",
};

type Estado = { tipo: "parado" } | { tipo: "carregando"; origem: "cep" | "geo" } | { tipo: "erro"; mensagem: string };

// Seletor de CEP: define preço, estoque e prazo. NÃO bloqueia a navegação (referencia.md §4 e §6):
// chip no cabeçalho + lembrete discreto na primeira visita; o CEP vira obrigatório só no frete.
// "barra": barra utilitária do desktop. "faixa": faixa de largura total abaixo do cabeçalho no celular.
// "produto": link "Calcular frete e prazo" do painel de compra (o "Obter datas de entrega" da Adidas).
// "carrinho": a mesma linha, compacta e sem o aviso "aparecem no carrinho".
// `comLembrete={false}`: sem o balão da primeira visita (ex.: dentro da gaveta do menu do celular,
// onde ele ficaria por cima dos níveis seguintes).
export function Localizacao({
  variante,
  comLembrete = true,
}: {
  variante: "barra" | "faixa" | "produto" | "carrinho";
  comLembrete?: boolean;
}) {
  const local = useLocal();
  const dialogo = useRef<HTMLDialogElement>(null);
  const [lembrete, setLembrete] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "parado" });
  const [cep, setCep] = useState("");
  const temLocal = local !== null;

  // Lembrete só depois de montar (lê cookie e sessionStorage) e só para quem ainda não informou.
  useEffect(() => {
    setLembrete(comLembrete && variante !== "produto" && !temLocal && !lembreteDispensado());
  }, [comLembrete, temLocal, variante]);

  function abrir() {
    setEstado({ tipo: "parado" });
    setCep(local ? formatarCep(local.cep) : "");
    dialogo.current?.showModal();
  }

  function fechar() {
    dialogo.current?.close();
  }

  function dispensar() {
    dispensarLembrete();
    setLembrete(false);
  }

  async function consultar(url: string, origem: "cep" | "geo") {
    setEstado({ tipo: "carregando", origem });
    try {
      const resposta = await fetch(url);
      const corpo = await resposta.json().catch(() => null);
      // A resposta passa pela mesma validação do cookie antes de ser gravada.
      const recebido = resposta.ok ? desserializarLocal(serializarLocal(corpo as Local)) : null;
      if (recebido) {
        salvarLocal(recebido);
        dispensar();
        setEstado({ tipo: "parado" });
        fechar();
        return;
      }
      const codigo: string = corpo?.erro?.codigo ?? "servico_indisponivel";
      const chave = origem === "geo" && codigo === "cep_nao_encontrado" ? "geo_nao_encontrado" : codigo;
      setEstado({ tipo: "erro", mensagem: MENSAGENS[chave] ?? MENSAGENS.servico_indisponivel });
    } catch {
      setEstado({ tipo: "erro", mensagem: MENSAGENS.servico_indisponivel });
    }
  }

  function enviarCep(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const normalizado = normalizarCep(cep);
    if (!normalizado) {
      setEstado({ tipo: "erro", mensagem: MENSAGENS.cep_invalido });
      return;
    }
    consultar(`/api/localizacao?cep=${normalizado}`, "cep");
  }

  function usarLocalizacao() {
    if (!("geolocation" in navigator)) {
      setEstado({ tipo: "erro", mensagem: MENSAGENS.geo_indisponivel });
      return;
    }
    setEstado({ tipo: "carregando", origem: "geo" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => consultar(`/api/localizacao?lat=${coords.latitude}&lng=${coords.longitude}`, "geo"),
      (falha) => setEstado({ tipo: "erro", mensagem: MENSAGENS[falha.code === falha.PERMISSION_DENIED ? "geo_negada" : "geo_falhou"] }),
      // Precisão de bairro basta para o CEP; aceita posição de até 10 min atrás (mais rápido, menos bateria).
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  }

  const carregando = estado.tipo === "carregando";
  const rotulo = local ? `Entregar em ${local.cidade}, ${local.uf} ${formatarCep(local.cep)}` : "Informe seu CEP";

  return (
    <div className={css({ position: "relative", display: "flex", w: variante === "faixa" ? "full" : "auto" })}>
      {variante === "produto" || variante === "carrinho" ? (
        <button
          type="button"
          onClick={abrir}
          aria-haspopup="dialog"
          className={cx(gatilhoProduto, variante === "carrinho" && css({ fontSize: "sm", alignItems: "center" }))}
        >
          {variante === "carrinho" ? (
            <MapPin size={18} aria-hidden className={css({ flexShrink: "0" })} />
          ) : (
            <Truck size={24} aria-hidden className={css({ flexShrink: "0" })} />
          )}
          {local ? (
            <span>
              Entrega para{" "}
              <strong className={css({ fontWeight: "semibold" })}>
                {local.cidade}, {local.uf}
              </strong>{" "}
              ({formatarCep(local.cep)}).{" "}
              <span className={css({ textDecoration: "underline", textUnderlineOffset: "3px" })}>Alterar CEP</span>
              {variante === "produto" && (
                <span className={css({ display: "block", mt: "1", fontSize: "sm", color: "textoSuave" })}>
                  Frete e prazo aparecem no carrinho.
                </span>
              )}
            </span>
          ) : (
            <span className={css({ fontWeight: "semibold", textDecoration: "underline", textUnderlineOffset: "3px" })}>
              {variante === "carrinho" ? "Informe o CEP para o frete exato" : "Calcular frete e prazo"}
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={abrir}
          aria-haspopup="dialog"
          aria-label={local ? `${rotulo}. Alterar CEP` : "Informe seu CEP para ver frete e prazo de entrega"}
          className={variante === "barra" ? gatilhoBarra : cx(gatilhoFaixa, css({ px: RESPIRO_LATERAL }))}
        >
          <MapPin size={variante === "barra" ? 16 : 20} aria-hidden />
          <span className={css({ truncate: true })}>
            {local ? (
              <>
                Entregar em <strong className={css({ fontWeight: "semibold" })}>{local.cidade}</strong> {formatarCep(local.cep)}
              </>
            ) : (
              "Informe seu CEP"
            )}
          </span>
          {variante === "faixa" && <CaretRight size={16} aria-hidden className={css({ ml: "auto", flexShrink: "0" })} />}
        </button>
      )}

      {lembrete && (
        <div role="note" className={cx(balao, css({ left: variante === "barra" ? "0" : "4" }))}>
          <p className={css({ fontSize: "sm", color: "escuro", lineHeight: "snug" })}>
            Informe seu CEP para ver o frete e o prazo de entrega. Em Fortaleza, dá para retirar no ateliê.
          </p>
          <div className={css({ display: "flex", gap: "2", mt: "3" })}>
            <button type="button" onClick={abrir} className={botao({ variante: "escuro", tamanho: "p" })}>
              Informar CEP
            </button>
            <button type="button" onClick={dispensar} className={botao({ variante: "fantasma", tamanho: "p" })}>
              Agora não
            </button>
          </div>
        </div>
      )}

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: o clique só fecha ao tocar no fundo; Esc já fecha o diálogo nativamente */}
      <dialog
        ref={dialogo}
        aria-labelledby={`titulo-cep-${variante}`}
        className={painel}
        onClick={(evento) => evento.target === evento.currentTarget && fechar()}
      >
        <div className={css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "4" })}>
          <h2 id={`titulo-cep-${variante}`} className={css({ fontSize: "xl", fontWeight: "bold", lineHeight: "tight" })}>
            Onde você quer receber?
          </h2>
          <button type="button" onClick={fechar} aria-label="Fechar" className={fecharBotao}>
            <X size={20} />
          </button>
        </div>
        <p className={css({ mt: "2", fontSize: "sm", color: "textoSuave" })}>
          Com o CEP mostramos o frete e o prazo de entrega. Enviamos para todo o Brasil a partir de Fortaleza.
        </p>

        {local && (
          <p className={atual}>
            <MapPin size={16} aria-hidden />
            Hoje: {local.cidade}, {local.uf} · {formatarCep(local.cep)}
          </p>
        )}

        <form onSubmit={enviarCep} className={css({ mt: "5" })} noValidate>
          <label htmlFor={`campo-cep-${variante}`} className={css({ fontSize: "sm", fontWeight: "medium", color: "escuro" })}>
            CEP
          </label>
          <div className={css({ display: "flex", gap: "2", mt: "1.5" })}>
            <input
              id={`campo-cep-${variante}`}
              name="cep"
              value={cep}
              onChange={(evento) => setCep(mascararCep(evento.target.value))}
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              maxLength={9}
              aria-invalid={estado.tipo === "erro"}
              aria-describedby={`mensagem-cep-${variante}`}
              className={campo}
            />
            <button type="submit" disabled={carregando} className={botao({ variante: "escuro", tamanho: "m" })}>
              {carregando && estado.origem === "cep" ? "Buscando…" : "Confirmar"}
            </button>
          </div>
        </form>

        <p id={`mensagem-cep-${variante}`} role="alert" className={css({ minH: "5", mt: "2", fontSize: "sm", color: "erro" })}>
          {estado.tipo === "erro" ? estado.mensagem : ""}
        </p>

        <div aria-hidden className={separador}>
          ou
        </div>

        <button
          type="button"
          onClick={usarLocalizacao}
          disabled={carregando}
          className={botao({ variante: "contorno", tamanho: "m", largo: true })}
        >
          <Crosshair size={20} aria-hidden />
          {carregando && estado.origem === "geo" ? "Localizando…" : "Usar minha localização"}
        </button>
        <p className={css({ mt: "3", fontSize: "xs", color: "textoSuave", textAlign: "center" })}>
          Usamos a localização só para achar seu CEP; ela não fica guardada.
        </p>

        <a href={BUSCA_CEP_CORREIOS} target="_blank" rel="noopener" className={naoSeiCep}>
          Não sei meu CEP
        </a>
      </dialog>
    </div>
  );
}

const gatilhoBarra = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  maxW: "[320px]",
  fontSize: "xs",
  fontWeight: "medium",
  color: "escuro",
  cursor: "pointer",
  _hover: { color: "textoSuave" },
});

const gatilhoProduto = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "3",
  w: "full",
  py: "5",
  fontSize: "md",
  color: "escuro",
  textAlign: "left",
  cursor: "pointer",
});

const gatilhoFaixa = css({
  display: "flex",
  alignItems: "center",
  gap: "2",
  w: "full",
  h: "10",
  bg: "fundoSutil",
  borderTopWidth: "1px",
  borderColor: "borda",
  fontSize: "sm",
  color: "escuro",
  textAlign: "left",
  cursor: "pointer",
});

// Balão ancorado no seletor: não cobre a página nem impede a navegação.
const balao = css({
  position: "absolute",
  zIndex: "[1]", // acima da barra principal, que vem depois no HTML
  top: "[calc(100% + 10px)]",
  w: "72",
  p: "4",
  bg: "fundo",
  borderRadius: "lg",
  boxShadow: "media",
  borderWidth: "1px",
  borderColor: "borda",
  animation: "surgir",
  _before: {
    content: '""',
    position: "absolute",
    top: "[-6px]",
    left: "5",
    w: "3",
    h: "3",
    bg: "fundo",
    borderTopWidth: "1px",
    borderLeftWidth: "1px",
    borderColor: "borda",
    transform: "rotate(45deg)",
  },
});

const painel = css({
  m: "auto",
  w: "[min(100% - 32px, 420px)]",
  maxW: "none",
  p: "6",
  borderWidth: "0",
  borderRadius: "lg",
  bg: "fundo",
  color: "texto",
  boxShadow: "media",
  _backdrop: { bg: "veu", animation: "escurecer" },
  _open: { animation: "surgir" },
});

const fecharBotao = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: "0",
  w: "8",
  h: "8",
  mt: "-1",
  mr: "-2",
  borderRadius: "full",
  color: "escuro",
  cursor: "pointer",
  _hover: { bg: "superficieSuave" },
});

const atual = css({
  display: "flex",
  alignItems: "center",
  gap: "1.5",
  mt: "4",
  px: "3",
  py: "2",
  bg: "superficieSuave",
  borderRadius: "md",
  fontSize: "sm",
  color: "escuro",
});

const campo = css({
  flex: "1",
  minW: "0",
  h: "12",
  px: "4",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "campo",
  fontSize: "md", // 16 px: evita o zoom do Safari no iPhone
  color: "escuro",
  letterSpacing: "wide",
  _placeholder: { color: "textoSuave" },
  _focusVisible: { borderColor: "escuro", outline: "none" },
  "&[aria-invalid=true]": { borderColor: "erro" },
});

const separador = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  my: "3",
  fontSize: "xs",
  color: "textoSuave",
  textTransform: "uppercase",
  _before: { content: '""', flex: "1", h: "[1px]", bg: "borda" },
  _after: { content: '""', flex: "1", h: "[1px]", bg: "borda" },
});

const naoSeiCep = css({
  display: "block",
  w: "fit",
  mx: "auto",
  mt: "4",
  fontSize: "sm",
  color: "escuro",
  textDecoration: "underline",
  textUnderlineOffset: "3px",
});
