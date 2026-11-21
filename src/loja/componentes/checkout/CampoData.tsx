"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { CalendarBlank, CaretLeft, CaretRight } from "@/loja/componentes/icones";
import { campo, Mensagem, rotuloEstilo } from "./Campo";

// Campo de data da loja (no lugar do <input type="date"> do navegador, que muda de cara em cada aparelho):
// dá para digitar "18/02/2027" (a máscara põe as barras) ou escolher no calendário. O calendário abre junto ao
// campo, com o dia de hoje marcado, troca de mês nas setas e, tocando no mês, a escolha rápida de mês e ano.
// O valor entra e sai no formato do banco: "AAAA-MM-DD" (vazio = sem data).

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DIAS_LONGOS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const dois = (numero: number) => String(numero).padStart(2, "0");
const paraIso = (data: Date) => `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}`;
const paraTexto = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
/** "18/02/2027" → Date (só datas que existem: 31/02 não vale). */
function lerTexto(texto: string): Date | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!partes) return null;
  const [dia, mes, ano] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia && ano >= 1900 && ano <= 2100 ? data : null;
}
const mascarar = (bruto: string) => {
  const d = bruto.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 8)].filter(Boolean).join("/");
};
const mesmoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

type Props = { id: string; rotulo: string; value: string; onChange: (iso: string) => void; erro?: string; dica?: ReactNode; required?: boolean; className?: string };

export function CampoData({ id, rotulo, value, onChange, erro, dica, required, className }: Props) {
  const [texto, setTexto] = useState(() => paraTexto(value));
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<"dias" | "meses">("dias");
  const selecionada = useMemo(() => lerTexto(paraTexto(value)), [value]);
  const [mes, setMes] = useState(() => { const base = lerTexto(paraTexto(value)) ?? new Date(); return new Date(base.getFullYear(), base.getMonth(), 1); });
  const raiz = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const hoje = useMemo(() => new Date(), []);

  // O valor mudou por fora (ex.: os dados da conta chegaram): o texto acompanha.
  useEffect(() => { setTexto(paraTexto(value)); }, [value]);

  // Fecha ao clicar fora ou apertar Esc (o foco volta ao campo).
  useEffect(() => {
    if (!aberto) return;
    const fora = (evento: PointerEvent) => { if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false); };
    const tecla = (evento: globalThis.KeyboardEvent) => { if (evento.key === "Escape") { setAberto(false); entrada.current?.focus(); } };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", tecla); };
  }, [aberto]);

  const abrir = () => {
    const base = selecionada ?? new Date();
    setMes(new Date(base.getFullYear(), base.getMonth(), 1));
    setModo("dias");
    setAberto(true);
  };
  const escolher = (data: Date) => { onChange(paraIso(data)); setTexto(paraTexto(paraIso(data))); setAberto(false); entrada.current?.focus(); };
  const limpar = () => { onChange(""); setTexto(""); setAberto(false); entrada.current?.focus(); };

  function digitar(bruto: string) {
    const novo = mascarar(bruto);
    setTexto(novo);
    if (!novo) { onChange(""); return; }
    const data = lerTexto(novo);
    if (data) { onChange(paraIso(data)); setMes(new Date(data.getFullYear(), data.getMonth(), 1)); }
  }
  // Saiu do campo com a data pela metade ou impossível: volta ao último valor válido.
  const aoSair = () => { if (texto && !lerTexto(texto)) setTexto(paraTexto(value)); };
  const aoTeclar = (evento: KeyboardEvent<HTMLInputElement>) => { if (evento.key === "ArrowDown" && !aberto) { evento.preventDefault(); abrir(); } };

  // 6 semanas a partir do domingo anterior (ou igual) ao dia 1.
  const dias = useMemo(() => {
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1 - mes.getDay());
    return Array.from({ length: 42 }, (_, indice) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + indice));
  }, [mes]);
  const mover = (meses: number) => setMes((atual) => new Date(atual.getFullYear(), atual.getMonth() + meses, 1));
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;

  return (
    <div ref={raiz} className={cx(css({ position: "relative", display: "grid", gap: "1.5", alignContent: "start" }), className)}>
      <label htmlFor={id} className={rotuloEstilo}>
        {rotulo}
        {!required && <span className={css({ fontWeight: "normal", color: "textoSuave" })}> (opcional)</span>}
      </label>
      <div className={css({ position: "relative" })}>
        <input ref={entrada} id={id} type="text" inputMode="numeric" autoComplete="off" placeholder="dd/mm/aaaa" maxLength={10} value={texto} required={required}
          aria-invalid={erro ? true : undefined} aria-describedby={descricao} className={cx(campo, css({ pr: "12" }))}
          onChange={(evento) => digitar(evento.target.value)} onBlur={aoSair} onKeyDown={aoTeclar} />
        <button type="button" className={botaoCalendario} aria-label={aberto ? "Fechar o calendário" : "Abrir o calendário"} aria-expanded={aberto} aria-controls={`${id}-calendario`} onClick={() => (aberto ? setAberto(false) : abrir())}>
          <CalendarBlank size={18} aria-hidden />
        </button>
      </div>
      <Mensagem id={id} erro={erro} dica={dica} />

      {aberto && (
        <div id={`${id}-calendario`} role="dialog" aria-label={`Escolher ${rotulo.toLowerCase()}`} className={painel}>
          <div className={topo}>
            <button type="button" className={seta} aria-label={modo === "dias" ? "Mês anterior" : "Ano anterior"} onClick={() => mover(modo === "dias" ? -1 : -12)}><CaretLeft size={14} weight="bold" aria-hidden /></button>
            <button type="button" className={titulo} aria-label={modo === "dias" ? "Escolher mês e ano" : "Voltar aos dias"} onClick={() => setModo(modo === "dias" ? "meses" : "dias")}>
              {modo === "dias" ? `${MESES[mes.getMonth()][0].toUpperCase()}${MESES[mes.getMonth()].slice(1)} de ${mes.getFullYear()}` : mes.getFullYear()}
            </button>
            <button type="button" className={seta} aria-label={modo === "dias" ? "Próximo mês" : "Próximo ano"} onClick={() => mover(modo === "dias" ? 1 : 12)}><CaretRight size={14} weight="bold" aria-hidden /></button>
          </div>

          {modo === "dias" ? (
            <>
              <div className={grade} aria-hidden>
                {DIAS.map((dia, indice) => <span key={`${dia}-${indice}`} className={diaDaSemana}>{dia}</span>)}
              </div>
              <div className={grade}>
                {dias.map((dia) => {
                  const fora = dia.getMonth() !== mes.getMonth();
                  const escolhido = selecionada ? mesmoDia(dia, selecionada) : false;
                  return (
                    <button key={paraIso(dia)} type="button" className={celula} data-fora={fora || undefined} data-hoje={mesmoDia(dia, hoje) || undefined} data-escolhido={escolhido || undefined}
                      aria-pressed={escolhido} aria-label={`${DIAS_LONGOS[dia.getDay()]}, ${dia.getDate()} de ${MESES[dia.getMonth()]} de ${dia.getFullYear()}`} onClick={() => escolher(dia)}>
                      {dia.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={gradeMeses}>
              {MESES_CURTOS.map((nome, indice) => (
                <button key={nome} type="button" className={celulaMes} data-escolhido={(selecionada && selecionada.getFullYear() === mes.getFullYear() && selecionada.getMonth() === indice) || undefined}
                  data-hoje={(hoje.getFullYear() === mes.getFullYear() && hoje.getMonth() === indice) || undefined} aria-label={`${MESES[indice]} de ${mes.getFullYear()}`}
                  onClick={() => { setMes(new Date(mes.getFullYear(), indice, 1)); setModo("dias"); }}>
                  {nome}
                </button>
              ))}
            </div>
          )}

          <div className={rodape}>
            <button type="button" className={acao} onClick={limpar} disabled={!value}>Limpar</button>
            <button type="button" className={acao} onClick={() => escolher(new Date())}>Hoje</button>
          </div>
        </div>
      )}
    </div>
  );
}

const botaoCalendario = css({
  position: "absolute", top: "[50%]", right: "2", transform: "translateY(-50%)", display: "grid", placeItems: "center", w: "9", h: "9", borderRadius: "[10px]", color: "textoSuave", cursor: "pointer",
  transition: "[background-color 0.2s ease, color 0.2s ease]",
  _hover: { bg: "superficieSuave", color: "escuro" },
  "&[aria-expanded=true]": { bg: "superficieSuave", color: "escuro" },
});
const painel = css({
  position: "absolute", zIndex: "[30]", top: "[calc(100% - 2px)]", left: "0", mt: "2", w: "[19rem]", maxW: "[calc(100vw - 2rem)]", p: "3",
  borderRadius: "[16px]", bg: "superficie", borderWidth: "1px", borderColor: "[rgb(29 31 27 / 0.1)]", boxShadow: "[0 16px 40px rgb(29 31 27 / 0.14)]",
  animation: "[subirSecao 0.22s cubic-bezier(0.22, 1, 0.36, 1)]",
});
const topo = css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2", mb: "2" });
const titulo = css({ flex: "1", h: "9", px: "3", borderRadius: "[10px]", fontSize: "sm", fontWeight: "semibold", color: "escuro", cursor: "pointer", transition: "[background-color 0.2s ease]", _hover: { bg: "superficieSuave" } });
const seta = css({ display: "grid", placeItems: "center", w: "9", h: "9", borderRadius: "[10px]", color: "texto", cursor: "pointer", transition: "[background-color 0.2s ease]", _hover: { bg: "superficieSuave" } });
const grade = css({ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "[2px]" });
const diaDaSemana = css({ display: "grid", placeItems: "center", h: "8", fontSize: "[11px]", fontWeight: "semibold", color: "textoSuave" });
const celula = css({
  display: "grid", placeItems: "center", aspectRatio: "[1 / 1]", borderRadius: "full", fontSize: "sm", color: "escuro", cursor: "pointer",
  transition: "[background-color 0.15s ease, color 0.15s ease]",
  _hover: { bg: "superficieSuave" },
  "&[data-fora]": { color: "textoSuave", opacity: "[0.55]" },
  "&[data-hoje]": { boxShadow: "[inset 0 0 0 1px token(colors.marca)]", fontWeight: "semibold" },
  "&[data-escolhido]": { bg: "marca", color: "sobreDestaque", opacity: "[1]", fontWeight: "semibold", boxShadow: "none" },
});
const gradeMeses = css({ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "1.5", py: "1" });
const celulaMes = css({
  h: "11", borderRadius: "[12px]", fontSize: "sm", color: "escuro", textTransform: "capitalize", cursor: "pointer", transition: "[background-color 0.15s ease]",
  _hover: { bg: "superficieSuave" },
  "&[data-hoje]": { boxShadow: "[inset 0 0 0 1px token(colors.marca)]" },
  "&[data-escolhido]": { bg: "marca", color: "sobreDestaque", fontWeight: "semibold", boxShadow: "none" },
});
const rodape = css({ display: "flex", justifyContent: "space-between", mt: "2", pt: "2", borderTopWidth: "1px", borderColor: "[rgb(29 31 27 / 0.08)]" });
const acao = css({ h: "8", px: "3", borderRadius: "[10px]", fontSize: "sm", fontWeight: "semibold", color: "texto", cursor: "pointer", transition: "[background-color 0.2s ease]", _hover: { bg: "superficieSuave" }, _disabled: { opacity: "[0.4]", cursor: "default", _hover: { bg: "transparent" } } });
