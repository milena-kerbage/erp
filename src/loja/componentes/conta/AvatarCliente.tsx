import { css } from "styled-system/css";
import type { ContaCliente } from "./estadoConta";

// Avatar ilustrado da cliente (DiceBear "Gaze", CC0), gerado no servidor a partir do id da conta e
// entregue como data URI pela API (src/lib/loja/avatar.ts). Sem o avatar, a inicial no círculo sálvia.
// Decorativo: o nome acessível fica no elemento que o envolve.
export function AvatarCliente({ cliente, tamanho = 40 }: { cliente: Pick<ContaCliente, "avatar" | "inicial">; tamanho?: number }) {
  return (
    <span aria-hidden className={moldura} style={{ width: tamanho, height: tamanho }}>
      {cliente.avatar ? (
        // biome-ignore lint/performance/noImgElement: SVG em data URI gerado no servidor (não passa pelo otimizador)
        <img src={cliente.avatar} alt="" width={tamanho} height={tamanho} className={css({ w: "full", h: "full", display: "block" })} />
      ) : (
        <span className={css({ fontSize: "sm", fontWeight: "semibold", color: "sobreDestaque" })}>{cliente.inicial || "•"}</span>
      )}
    </span>
  );
}

const moldura = css({
  display: "inline-flex",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  borderRadius: "pilula",
  bg: "marca",
  transitionProperty: "box-shadow",
  transitionDuration: "normal",
});
