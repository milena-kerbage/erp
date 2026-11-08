"use client";

import { useEffect, useId, useRef, useState } from "react";
import { css, cx } from "styled-system/css";
import { botaoContorno, botaoEscuro } from "@/loja/componentes/carrinho/estilos";
import { Check, Copy, WhatsappLogo } from "@/loja/componentes/icones";
import { linkCompartilharWhatsApp, linkIndicacao, mensagemIndicacao } from "@/loja/lib/indicacao";

// Botões da página /indique: abrir o WhatsApp com a mensagem pronta (a cliente escolhe o contato) e
// copiar o link da loja. Sem login, sem código pessoal e sem recompensa: só compartilhar.
export function BotoesIndicacao({ origem }: { origem: string }) {
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const temporizador = useRef<number | undefined>(undefined);
  const id = useId();
  const linkCopia = linkIndicacao(origem, "link");
  const whatsapp = linkCompartilharWhatsApp(mensagemIndicacao(linkIndicacao(origem, "whatsapp")));

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(linkCopia);
    } catch {
      // Sem permissão de área de transferência (navegador antigo ou página fora de HTTPS): seleciona o
      // link no campo para a cliente copiar à mão.
      campo.current?.select();
      return;
    }
    setCopiado(true);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => setCopiado(false), 4000);
  }

  return (
    <div className={css({ display: "grid", gap: "6", maxW: "[560px]" })}>
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cx(botaoEscuro, css({ w: { base: "full", md: "auto" }, justifySelf: "start" }))}>
        <WhatsappLogo size={20} aria-hidden /> Indicar pelo WhatsApp
        <span className={css({ srOnly: true })}> (abre em nova aba)</span>
      </a>

      <div>
        <label htmlFor={`${id}-link`} className={css({ display: "block", fontSize: "sm", fontWeight: "medium", color: "escuro" })}>
          Ou copie o link da loja
        </label>
        <div className={css({ display: "flex", flexDirection: { base: "column", md: "row" }, gap: "3", mt: "2" })}>
          <input
            ref={campo}
            id={`${id}-link`}
            readOnly
            value={linkCopia}
            onFocus={(evento) => evento.currentTarget.select()}
            className={campoLink}
          />
          <button type="button" onClick={copiar} className={cx(botaoContorno, css({ flexShrink: "0" }))}>
            {copiado ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
            {copiado ? "Link copiado" : "Copiar link"}
          </button>
        </div>
        <p role="status" className={css({ mt: "2", minH: "5", fontSize: "sm", color: "sucesso" })}>
          {copiado ? "Pronto: o link está na área de transferência." : ""}
        </p>
      </div>
    </div>
  );
}

const campoLink = css({
  flex: { base: "none", md: "1" },
  w: "full",
  minW: "0",
  h: "11",
  px: "4",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "pilula",
  bg: "fundoSutil",
  fontSize: "sm",
  color: "texto",
  textOverflow: "ellipsis",
  _focusVisible: { outline: "none", borderColor: "escuro", boxShadow: "anelFoco" },
});
