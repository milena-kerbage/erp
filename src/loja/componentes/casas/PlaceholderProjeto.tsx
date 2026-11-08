import { css, cx } from "styled-system/css";
import { Baby } from "@/loja/componentes/icones";

// Enquanto não há fotos dos projetos: fundo claro do ateliê com o ícone de bebê em traço fino e,
// opcionalmente, a paleta do projeto em bolinhas embaixo. Ocupa todo o espaço do pai (que define a
// proporção). Quando houver fotos em public/vitrine/projetos/<slug>/, as telas usam a foto.
export function PlaceholderProjeto({
  nome,
  paleta,
  tom = 0,
  tamanho = 56,
  className,
}: {
  nome: string;
  paleta?: ReadonlyArray<{ nome: string; hex: string }>;
  tom?: number; // alterna o fundo entre os tons claros, para a grade não ficar chapada
  tamanho?: number;
  className?: string;
}) {
  return (
    <div role="img" aria-label={`${nome}: foto em breve`} className={cx(base, TONS[tom % TONS.length], className)}>
      <Baby size={tamanho} weight="thin" aria-hidden className={css({ color: "marca" })} />
      {paleta && paleta.length > 0 && (
        <span aria-hidden className={css({ display: "flex", gap: "1.5" })}>
          {paleta.map((cor) => (
            <span key={cor.hex} className={bolinha} style={{ backgroundColor: cor.hex }} />
          ))}
        </span>
      )}
    </div>
  );
}

const base = css({
  position: "absolute",
  inset: "0",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "4",
});

const TONS = [css({ bg: "fundoProduto" }), css({ bg: "placeholder" }), css({ bg: "marcaSuave" })];

const bolinha = css({ w: "3", h: "3", borderRadius: "full", borderWidth: "1px", borderColor: "[rgba(0, 0, 0, 0.08)]" });
