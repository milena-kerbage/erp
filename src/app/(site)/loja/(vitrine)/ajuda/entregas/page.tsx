import Link from "next/link";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { LateralAjuda, metadataTema, PerguntasDoTema, trilhaTema } from "@/loja/componentes/institucional/secoes";
import { PRODUCAO_ENCOMENDA, PRODUCAO_PRONTA, textoPrazo } from "@/loja/lib/carrinho/totais";
import { PRAZO_PRODUCAO as PRAZO_PROJETOS } from "@/loja/lib/casas/catalogo";
import { EMPRESA } from "@/loja/lib/empresa";

const SLUG = "entregas";
export const metadata = metadataTema(SLUG);

// Entregas: sem frete calculado no site (combinado pelo WhatsApp), retirada no ateliê e os prazos de
// produção de lib/carrinho/totais.ts. [CONFIRMAR] com o ateliê: transportadoras usadas, endereço e
// horário de retirada (aqui só "combinados pelo WhatsApp") e os prazos de produção.
export default function Entregas() {
  return (
    <PaginaInstitucional
      trilha={trilhaTema(SLUG)}
      titulo="Entregas e retirada"
      abertura={`O ateliê fica em ${EMPRESA.cidade}/${EMPRESA.uf} e envia para todo o Brasil. O frete e o prazo de entrega são combinados com a vendedora pelo WhatsApp.`}
      lateral={<LateralAjuda atual={`/ajuda/${SLUG}`} />}
    >
      <div className={prosa}>
        <h2 id="frete">Frete para todo o Brasil</h2>
        <p>
          O site não calcula frete. Quando você envia o pedido, a vendedora cota o envio pelo seu CEP, considerando a cidade e o volume das
          peças, e informa o valor e o prazo antes do pagamento. Informar a cidade ou o CEP no pedido agiliza a cotação.
        </p>
        <p>Quando houver código de rastreio, a vendedora envia pela conversa.</p>

        <h2 id="retirada">Retirada no ateliê, em {EMPRESA.cidade}</h2>
        <p>
          No pedido, marque <strong>Prefiro retirar no ateliê, em Fortaleza</strong>. A vendedora avisa quando as peças estiverem prontas e
          combina com você o dia, o horário e o endereço da retirada.
        </p>

        <h2 id="prazos">Prazos de produção</h2>
        <p>O prazo de entrega é a soma do prazo de produção com o prazo do frete.</p>
        <ul>
          <li>
            <strong>Pronta entrega:</strong> a peça já está feita e sai do ateliê em até {textoPrazo({ min: PRODUCAO_PRONTA.max, max: PRODUCAO_PRONTA.max })}.
            Veja tudo o que está em <Link href="/pronta-entrega">Pronta entrega</Link>.
          </li>
          <li>
            <strong>Sob encomenda:</strong> a peça é cortada, costurada e bordada para você, em {textoPrazo(PRODUCAO_ENCOMENDA)} depois do
            pedido confirmado.
          </li>
          <li>
            <strong>Quartinhos personalizados:</strong> o quarto completo leva de {PRAZO_PROJETOS}, conforme o orçamento.
          </li>
        </ul>
        <p>
          O pedido sai inteiro, então vale o prazo da peça mais demorada. Se precisar de alguma peça antes, combine com a vendedora o envio
          separado. Peças com bordado entram em produção depois que o nome é confirmado.
        </p>
        <p>
          Para enxoval sob encomenda, peça com folga em relação à data prevista do parto e informe essa data nas observações do pedido: a
          vendedora confirma se o prazo atende.
        </p>
      </div>

      <PerguntasDoTema slug={SLUG} />
      <BlocoContato />
    </PaginaInstitucional>
  );
}
