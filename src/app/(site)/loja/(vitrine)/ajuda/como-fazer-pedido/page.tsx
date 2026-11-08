import Link from "next/link";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { LateralAjuda, metadataTema, PerguntasDoTema, trilhaTema } from "@/loja/componentes/institucional/secoes";
import { DESCONTO_PIX_PERCENTUAL, MAX_PARCELAS } from "@/loja/lib/carrinho/totais";
import { EMPRESA } from "@/loja/lib/empresa";

const SLUG = "como-fazer-pedido";
export const metadata = metadataTema(SLUG);

// Como o pedido funciona de verdade (lib/checkout/pedido.ts): a sacola vira uma mensagem pronta no
// WhatsApp do ateliê; a vendedora confirma valores, bordado, frete, prazo e pagamento na conversa.
export default function ComoFazerPedido() {
  return (
    <PaginaInstitucional
      trilha={trilhaTema(SLUG)}
      titulo="Como fazer seu pedido"
      abertura="A loja é um catálogo com preço: você monta a sacola no site e o pedido segue pelo WhatsApp, com uma vendedora do ateliê."
      lateral={<LateralAjuda atual={`/ajuda/${SLUG}`} />}
    >
      <div className={prosa}>
        <h2 id="passo-a-passo">Passo a passo</h2>
        <ol>
          <li>
            <strong>Escolha as peças.</strong> Em cada produto, escolha a cor, o tamanho (quando houver) e se quer com ou sem bordado do
            nome, e toque em Adicionar à sacola.
          </li>
          <li>
            <strong>Revise a sacola.</strong> Na <Link href="/carrinho">sacola</Link> dá para mudar quantidades, trocar opções, salvar
            peças nos favoritos e aplicar um cupom. Os valores aparecem como “a partir de” e o frete fica para a conversa.
          </li>
          <li>
            <strong>Faça o pedido.</strong> Toque em Fazer pedido pelo WhatsApp e informe nome e WhatsApp com DDD. Cidade ou CEP,
            preferência por retirada no ateliê e observações (como o nome do bordado e a data prevista do parto) são opcionais.
          </li>
          <li>
            <strong>Envie a mensagem.</strong> O WhatsApp abre com a mensagem do pedido pronta, com as peças, as opções e os valores. É só
            enviar para o número do ateliê, {EMPRESA.whatsapp.exibicao}.
          </li>
          <li>
            <strong>Combine com a vendedora.</strong> Ela confirma disponibilidade, valores, bordado, frete e prazo e combina o pagamento.
            O pedido só é confirmado depois dessa conversa.
          </li>
        </ol>

        <h2 id="pagamento">Pagamento</h2>
        <p>
          Nada é cobrado no site. O pagamento é combinado com a vendedora: Pix, com {DESCONTO_PIX_PERCENTUAL}% de desconto nos produtos,
          ou cartão de crédito em até {MAX_PARCELAS}x sem juros, respeitada a parcela mínima. Nunca envie dados de cartão pelo WhatsApp:
          a vendedora informa o meio de pagamento seguro.
        </p>

        <h2 id="depois-de-enviar">Depois de enviar</h2>
        <p>
          O resumo do pedido fica salvo neste aparelho, em <Link href="/conta/pedidos">Minha conta › Pedidos enviados</Link>. Se a
          mensagem não chegou ou se você trocou de conversa, abra o pedido e toque em Reenviar no WhatsApp. O acompanhamento da produção
          e do envio é feito pela conversa com a vendedora.
        </p>
        <p>
          Prefere montar o quarto inteiro? Os <Link href="/projetos/como-funciona">Projetos de quartinho</Link> têm um caminho próprio,
          com orçamento pelo WhatsApp.
        </p>
      </div>

      <PerguntasDoTema slug={SLUG} />
      <BlocoContato />
    </PaginaInstitucional>
  );
}
