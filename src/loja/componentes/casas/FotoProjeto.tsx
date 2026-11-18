import { ImagemNativa as Image } from "@/loja/componentes/produto/ImagemNativa";
import { css, cx } from "styled-system/css";
import { token } from "styled-system/tokens";
import type { IconeModulo } from "@/loja/lib/casas/modulos";
import { fotoDeEspera } from "@/loja/lib/fotosAtelie";

// Mistura a cor da paleta (dado do projeto, por isso vai em style) com o fundo claro da loja.
export function tomDaPaleta(hex: string | undefined, porcentagem: number): string {
  return hex ? `color-mix(in srgb, ${hex} ${porcentagem}%, ${token("colors.fundo")})` : token("colors.fundoProduto");
}

// Foto de projeto, de quartinho ou de módulo do montador. Sem foto própria, uma foto do ateliê no
// mesmo assunto do ícone (fotosAtelie.ts), com as cores da paleta em bolinhas embaixo: nunca só o
// ícone. Quem usa define a proporção pela className (5:6 na sacola e nos cards).
export function FotoProjeto({
  paleta,
  foto,
  icone = "bebe",
  bolinhas = true,
  sizes = "120px",
  className,
}: {
  paleta?: readonly string[];
  foto?: { src: string; alt: string };
  icone?: IconeModulo;
  bolinhas?: boolean;
  sizes?: string;
  className?: string;
}) {
  const imagem = foto ?? { ...fotoDeEspera(icone, paleta?.join(",") ?? ""), alt: "" };
  return (
    <div className={cx(moldura, className)}>
      <Image src={imagem.src} alt={imagem.alt} fill sizes={sizes} className={css({ objectFit: "cover" })} />
      {!foto && bolinhas && paleta && paleta.length > 0 && (
        <span aria-hidden className={linhaBolinhas}>
          {paleta.map((cor) => (
            <span key={cor} className={bolinha} style={{ backgroundColor: cor }} />
          ))}
        </span>
      )}
    </div>
  );
}

// containerType: as bolinhas medem pela largura da moldura (cqw), da miniatura de 64 ao card grande.
const moldura = css({ position: "relative", flexShrink: "0", overflow: "hidden", bg: "fundoProduto", containerType: "inline-size" });

const linhaBolinhas = css({ position: "absolute", left: "[50%]", bottom: "[8%]", translate: "[-50% 0]", display: "flex", gap: "[clamp(2px, 1.5cqw, 6px)]", p: "[clamp(2px, 1.5cqw, 6px)]", borderRadius: "pilula", bg: "fundo" });

const bolinha = css({ w: "[clamp(6px, 6cqw, 14px)]", aspectRatio: "square", borderRadius: "pilula", boxShadow: "[inset 0 0 0 1px token(colors.contornoAmostra)]" });
