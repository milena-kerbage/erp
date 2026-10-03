"use client";

import { useState } from "react";
import { generatedAvatarUrl } from "@/lib/avatar";
import { Image, Root, type AvatarShape, type AvatarSize } from "./styles";

export type { AvatarShape, AvatarSize };

type AvatarProps = {
  name: string;
  src?: string | null;
  /**
   * Base do avatar ilustrado usado quando não há foto. Prefira um id
   * estável; sem ele, usa o nome.
   */
  seed?: string;
  size?: AvatarSize;
  /** Siga o contêiner: `rounded` dentro de controles retos, `circle` em círculos. */
  shape?: AvatarShape;
  /** Anel de destaque ao redor. */
  ring?: boolean;
  className?: string;
};

/**
 * Foto da pessoa; sem foto (ou se a foto falhar), um avatar ilustrado Clay.
 * Decorativo: o nome acessível deve estar no elemento que o envolve.
 */
export function Avatar({
  name,
  src,
  seed,
  size = "md",
  shape = "rounded",
  ring = false,
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = src && !failed ? src : generatedAvatarUrl(seed ?? name);

  return (
    <Root aria-hidden $size={size} $shape={shape} $ring={ring} className={className}>
      <Image
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        onError={url === src ? () => setFailed(true) : undefined}
      />
    </Root>
  );
}
