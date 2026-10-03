"use client";

import Image from "next/image";
import { Root } from "./styles";

export type LogoTone = "green" | "black" | "white";
export type LogoVariant = "horizontal" | "symbol" | "wordmark";

type LogoProps = {
  /**
   * `horizontal`: logotipo horizontal oficial. `symbol`: só o monograma.
   * `wordmark`: só a assinatura.
   */
  variant?: LogoVariant;
  tone?: LogoTone;
  /** Altura em px. */
  size?: number;
  href?: string;
  className?: string;
};

// Arquivos em /public e suas proporções (largura ÷ altura do viewBox).
const files: Record<LogoVariant, { file: string; ratio: number }> = {
  horizontal: { file: "logotipo-horizontal", ratio: 2762 / 692 },
  symbol: { file: "simbolo", ratio: 656 / 737 },
  wordmark: { file: "assinatura", ratio: 2710 / 552 },
};

export function Logo({
  variant = "horizontal",
  tone = "green",
  size = 32,
  href = "/",
  className,
}: LogoProps) {
  const { file, ratio } = files[variant];

  return (
    <Root href={href} aria-label="Ateliê Milena Kerbage, ir para o início" className={className}>
      <Image
        src={`/${file}-${tone}.svg`}
        alt=""
        width={Math.round(size * ratio)}
        height={size}
        priority
      />
    </Root>
  );
}
