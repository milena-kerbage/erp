import { css, cx } from "styled-system/css";
import { esqueleto } from "@/loja/componentes/produto/esqueleto";

// Esqueletos enquanto a listagem carrega (referencia.md §9: estado de carregamento; nada de tela branca),
// com o brilho que atravessa os blocos (lululemon-animacoes-edicao.md §1).
export function EsqueletoTopo() {
  return (
    <div aria-hidden className={css({ px: { base: "3", md: "5", desktop: "10" }, pt: "5" })}>
      <div className={cx(esqueleto, css({ w: "40", h: "3", borderRadius: "sm" }))} />
      <div className={cx(esqueleto, css({ w: "[min(520px, 80%)]", h: { base: "8", desktop: "16" }, mt: { base: "6", desktop: "16" }, borderRadius: "sm" }))} />
      <div className={css({ display: "flex", gap: "4", mt: { base: "4", desktop: "6" } })}>
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className={cx(esqueleto, css({ w: "20", h: "4", borderRadius: "sm" }))} />
        ))}
      </div>
    </div>
  );
}

export function EsqueletoGrade() {
  return (
    <div
      aria-busy="true"
      className={css({
        display: "grid",
        gridTemplateColumns: { base: "repeat(2, 1fr)", desktop: "repeat(3, 1fr)" },
        columnGap: "[1px]",
        mt: { base: "6", desktop: "16" },
      })}
    >
      {/* Mesmo formato do card: foto 5:6 e o bloco de informações. */}
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item}>
          <div className={cx(esqueleto, css({ aspectRatio: "[5 / 6]" }))} />
          <div className={css({ px: { base: "3", desktop: "5" }, pt: { base: "3", desktop: "4" }, pb: { base: "6", desktop: "8" } })}>
            <div className={cx(esqueleto, css({ w: "[70%]", h: "4", borderRadius: "sm" }))} />
            <div className={cx(esqueleto, css({ w: "[40%]", h: "3", mt: "3", borderRadius: "sm" }))} />
          </div>
        </div>
      ))}
    </div>
  );
}
