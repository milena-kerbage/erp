import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { css, cx } from "styled-system/css";

// Campos do pedido: rótulo sempre visível em cima (nada de placeholder no lugar do rótulo),
// erro em vermelho ligado ao campo por aria-describedby, e o mesmo visual do resto da loja.
type Comum = { id: string; rotulo: string; erro?: string; dica?: ReactNode; className?: string };

export function Campo({ id, rotulo, erro, dica, className, ...input }: Comum & InputHTMLAttributes<HTMLInputElement>) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={cx(css({ display: "grid", gap: "1.5", alignContent: "start" }), className)}>
      <label htmlFor={id} className={rotuloEstilo}>
        {rotulo}
        {!input.required && <span className={css({ fontWeight: "normal", color: "textoSuave" })}> (opcional)</span>}
      </label>
      <input id={id} aria-invalid={erro ? true : undefined} aria-describedby={descricao} className={campo} {...input} />
      <Mensagem id={id} erro={erro} dica={dica} />
    </div>
  );
}

export function Selecao({ id, rotulo, erro, dica, className, children, ...select }: Comum & SelectHTMLAttributes<HTMLSelectElement>) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={cx(css({ display: "grid", gap: "1.5", alignContent: "start" }), className)}>
      <label htmlFor={id} className={rotuloEstilo}>
        {rotulo}
      </label>
      <select
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={cx(campo, css({ pr: "10" }))}
        {...select}
      >
        {children}
      </select>
      <Mensagem id={id} erro={erro} dica={dica} />
    </div>
  );
}

export function Marcacao({ id, children, ...input }: { id: string; children: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      htmlFor={id}
      className={css({ display: "flex", alignItems: "flex-start", gap: "2.5", fontSize: "sm", color: "texto", cursor: "pointer" })}
    >
      <input id={id} type="checkbox" className={caixa} {...input} />
      <span>{children}</span>
    </label>
  );
}

function Mensagem({ id, erro, dica }: { id: string; erro?: string; dica?: ReactNode }) {
  if (erro)
    return (
      <p id={`${id}-erro`} className={css({ fontSize: "sm", color: "erro" })}>
        {erro}
      </p>
    );
  if (dica)
    return (
      <p id={`${id}-dica`} className={css({ fontSize: "sm", color: "textoSuave" })}>
        {dica}
      </p>
    );
  return null;
}

const rotuloEstilo = css({ fontSize: "sm", fontWeight: "semibold", color: "escuro" });

const campo = css({
  w: "full",
  h: "12",
  px: "4",
  borderWidth: "1px",
  borderColor: "borda",
  borderRadius: "campo",
  bg: "fundo",
  fontSize: "md",
  color: "escuro",
  _placeholder: { color: "textoSuave" },
  _focusVisible: { borderColor: "escuro", outline: "none", boxShadow: "[0 0 0 1px token(colors.escuro)]" },
  _disabled: { bg: "fundoSutil", color: "textoSuave" },
  "&[aria-invalid=true]": { borderColor: "erro" },
});

const caixa = css({ flexShrink: "0", w: "5", h: "5", mt: "[1px]", accentColor: "[token(colors.escuro)]", cursor: "pointer" });

export function AreaTexto({ id, rotulo, erro, dica, className, ...area }: Comum & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const descricao = erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
  return (
    <div className={cx(css({ display: "grid", gap: "1.5", alignContent: "start" }), className)}>
      <label htmlFor={id} className={rotuloEstilo}>
        {rotulo}
        {!area.required && <span className={css({ fontWeight: "normal", color: "textoSuave" })}> (opcional)</span>}
      </label>
      <textarea
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={cx(campo, css({ h: "auto", minH: "24", py: "3", resize: "vertical" }))}
        {...area}
      />
      <Mensagem id={id} erro={erro} dica={dica} />
    </div>
  );
}
