import { css, cx } from "styled-system/css";
import { ImagemNativa as Image } from "@/loja/componentes/produto/ImagemNativa";
import { fotoDeEspera } from "@/loja/lib/fotosAtelie";

// Projeto sem foto própria: uma foto do ateliê (fotosAtelie.ts) e, opcionalmente, a paleta do projeto
// em bolinhas embaixo. Ocupa todo o espaço do pai (que define a proporção). Com fotos em
// public/vitrine/projetos/<slug>/, as telas usam a foto do projeto.
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
    <div className={cx(base, TONS[tom % TONS.length], className)}>
      <Image src={fotoDeEspera(tamanho > 40 ? "berco" : "bebe", nome).src} alt={`${nome}: foto ilustrativa do ateliê`} fill sizes="(min-width: 768px) 33vw, 100vw" className={css({ objectFit: "cover" })} />
      {paleta && paleta.length > 0 && (
        <span aria-hidden className={css({ position: "relative", display: "flex", gap: "1.5", mt: "auto", mb: "3", px: "2", py: "1", borderRadius: "full", bg: "fundo" })}>
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
