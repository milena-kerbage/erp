import Link from "next/link";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { LateralAjuda, metadataTema, PerguntasDoTema, trilhaTema } from "@/loja/componentes/institucional/secoes";
import { EMPRESA } from "@/loja/lib/empresa";

const SLUG = "trocas-e-devolucoes";
export const metadata = metadataTema(SLUG);

// Versão prática (passo a passo) da política de trocas (/politicas/trocas, o texto formal).
// [CONFIRMAR] com o jurídico e o ateliê: peça com bordado personalizado só troca por defeito ou por
// bordado diferente do combinado; quem paga o frete de troca por gosto (fora do arrependimento);
// prazo de análise da peça devolvida.
export default function TrocasEDevolucoes() {
  return (
    <PaginaInstitucional
      trilha={trilhaTema(SLUG)}
      titulo="Trocas e devoluções"
      abertura="Toda troca ou devolução começa por uma conversa com a vendedora no WhatsApp. Veja abaixo os seus direitos e o passo a passo."
      lateral={<LateralAjuda atual={`/ajuda/${SLUG}`} />}
    >
      <div className={prosa}>
        <h2 id="arrependimento">Desistiu da compra? Você tem 7 dias</h2>
        <p>
          Nas compras feitas fora da loja física, como pelo site e pelo WhatsApp, você pode desistir em até <strong>7 dias</strong> a contar
          do recebimento da peça, sem precisar explicar o motivo. É o direito de arrependimento do artigo 49 do Código de Defesa do
          Consumidor. Os valores pagos, inclusive o frete de envio, são devolvidos.
        </p>

        <h2 id="defeito">Peça com defeito</h2>
        <p>
          Se a peça chegar com defeito de costura, de tecido ou de bordado, ou diferente do que foi combinado, fale com a vendedora com
          fotos da peça. O ateliê avalia e resolve com conserto, troca ou devolução do valor, nos prazos do Código de Defesa do Consumidor.
        </p>

        <h2 id="bordado">Peças com bordado personalizado</h2>
        <p>
          Peças bordadas com o nome do bebê são feitas só para você e não podem ser revendidas. Por isso, a troca ou a devolução delas é
          feita em caso de defeito ou de bordado diferente do combinado. Antes de produzir, a vendedora confirma com você o nome, a grafia e
          as cores do bordado: revise com calma.
        </p>

        <h2 id="passo-a-passo">Passo a passo</h2>
        <ol>
          <li>
            Chame a vendedora no WhatsApp {EMPRESA.whatsapp.exibicao} e conte o que aconteceu, com o seu nome e, se tiver, fotos da peça.
          </li>
          <li>A vendedora confirma o pedido e explica como embalar a peça.</li>
          <li>Combine o envio de volta ou a entrega no ateliê, em Fortaleza. Não envie a peça antes dessa conversa.</li>
          <li>Mande a peça sem uso, lavagem ou sinais de uso, com as etiquetas e na embalagem original, sempre que possível.</li>
          <li>Quando a peça chega, o ateliê confere e faz a troca, o conserto ou a devolução do valor, como combinado.</li>
        </ol>
        <p>
          As regras completas estão na <Link href="/politicas/trocas">Política de trocas e devoluções</Link>.
        </p>
      </div>

      <PerguntasDoTema slug={SLUG} />
      <BlocoContato />
    </PaginaInstitucional>
  );
}
