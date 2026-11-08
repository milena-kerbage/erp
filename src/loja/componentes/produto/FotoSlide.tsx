import { Midia } from "@/loja/componentes/inicio/Midia";
import type { FotoGaleria } from "./dados";
import { FotoProduto } from "./FotoProduto";

// Uma foto da galeria, do visualizador ou do card da listagem. Sem foto real, a principal é o mesmo
// bloco de estúdio dos cards da home (FotoProduto) e as demais são mídias de espera em tons próprios.
// Quem usa define o formato (5:6, altura total) pela className.
// `tingir`: o bloco de estúdio ganha o tom da cor da peça (cards com troca de cor).
// `parallax`: a mídia anda com a rolagem (fotos grandes da página de produto).
export function FotoSlide({
  foto,
  sizes,
  preload = false,
  tingir = false,
  parallax = false,
  className,
}: {
  foto: FotoGaleria;
  sizes: string;
  preload?: boolean;
  tingir?: boolean;
  parallax?: boolean;
  className?: string;
}) {
  if (foto.principal && !foto.src) return <FotoProduto sizes={sizes} preload={preload} cor={tingir ? foto.tom : undefined} className={className} />;
  return (
    <Midia src={foto.src} alt={foto.alt} tom={foto.tom} icone={foto.icone} sizes={sizes} preload={preload} parallax={parallax} className={className} />
  );
}
