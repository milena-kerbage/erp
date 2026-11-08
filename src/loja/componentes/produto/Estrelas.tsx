import { css } from "styled-system/css";
import { Star } from "@/loja/componentes/icones";

// 5 estrelas da nota (cheias até a nota, contorno no resto). Nota 0 = sem avaliações: só contornos.
export function Estrelas({ nota, tamanho = 16 }: { nota: number; tamanho?: number }) {
  const cheias = Math.round(nota);
  return (
    <span
      role="img"
      aria-label={nota > 0 ? `Nota ${nota.toFixed(1).replace(".", ",")} de 5` : "Ainda sem avaliações"}
      className={css({ display: "inline-flex", gap: "0.5", color: "escuro" })}
    >
      {[1, 2, 3, 4, 5].map((posicao) => (
        <Star key={posicao} size={tamanho} weight={posicao <= cheias ? "fill" : "regular"} aria-hidden />
      ))}
    </span>
  );
}
