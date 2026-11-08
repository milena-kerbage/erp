import Image from "next/image";
import { css, cx } from "styled-system/css";
import { token } from "styled-system/tokens";
import { Baby, Bed, Cloud, Feather, Flower, FlowerTulip, Gift, Handbag, Heart, Leaf, Moon, Star, Yarn } from "@/loja/componentes/icones";
import type { IconeModulo } from "@/loja/lib/casas/modulos";

const ICONES = {
  berco: Bed,
  nuvem: Cloud,
  lua: Moon,
  pena: Feather,
  estrela: Star,
  folha: Leaf,
  novelo: Yarn,
  coracao: Heart,
  flor: Flower,
  bebe: Baby,
  bolsa: Handbag,
  presente: Gift,
  tulipa: FlowerTulip,
} as const;

// Mistura a cor da paleta (dado do projeto, por isso vai em style) com o fundo claro da loja.
export function tomDaPaleta(hex: string | undefined, porcentagem: number): string {
  return hex ? `color-mix(in srgb, ${hex} ${porcentagem}%, ${token("colors.fundo")})` : token("colors.fundoProduto");
}

// Foto de projeto, de quartinho ou de módulo do montador. Enquanto não há foto, uma composição nos
// tons da paleta: degradê da 1ª para a 2ª cor sobre o fundo claro, o ícone de traço fino no centro e
// as cores em bolinhas embaixo. Quem usa define a proporção pela className (5:6 na sacola e nos cards).
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
  if (foto) {
    return (
      <div className={cx(moldura, className)}>
        <Image src={foto.src} alt={foto.alt} fill sizes={sizes} className={css({ objectFit: "cover" })} />
      </div>
    );
  }
  const Icone = ICONES[icone];
  return (
    <div
      aria-hidden
      className={cx(moldura, espera, className)}
      style={{ backgroundImage: `linear-gradient(160deg, ${tomDaPaleta(paleta?.[0], 22)} 0%, ${tomDaPaleta(paleta?.[1] ?? paleta?.[0], 55)} 100%)` }}
    >
      <Icone weight="thin" className={iconeEstilo} />
      {bolinhas && paleta && paleta.length > 0 && (
        <span className={linhaBolinhas}>
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

const espera = css({ display: "flex", alignItems: "center", justifyContent: "center" });

// O ícone acompanha o tamanho da moldura (36% do lado), como o bloco de espera dos produtos.
const iconeEstilo = css({ w: "[36%]", h: "[36%]", maxW: "[160px]", maxH: "[160px]", color: "marca", opacity: "[0.55]" });

const linhaBolinhas = css({ position: "absolute", left: "[50%]", bottom: "[8%]", translate: "[-50% 0]", display: "flex", gap: "[clamp(2px, 1.5cqw, 6px)]" });

const bolinha = css({ w: "[clamp(6px, 6cqw, 14px)]", aspectRatio: "square", borderRadius: "pilula", boxShadow: "[inset 0 0 0 1px token(colors.contornoAmostra)]" });
