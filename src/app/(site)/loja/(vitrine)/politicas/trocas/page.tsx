import Link from "next/link";
import { css } from "styled-system/css";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { ATUALIZACAO_POLITICAS, LateralPoliticas } from "@/loja/componentes/institucional/secoes";
import { EMPRESA } from "@/loja/lib/empresa";
import { metadataPagina } from "@/loja/lib/seo/institucional";

const CAMINHO = "/politicas/trocas";

export const metadata = metadataPagina({
  titulo: "Política de trocas e devoluções",
  descricao:
    "Regras de trocas e devoluções da loja do Ateliê Milena Kerbage: arrependimento em 7 dias (art. 49 do CDC), defeitos, peças com bordado personalizado e reembolso.",
  caminho: CAMINHO,
  indexar: true,
});

// Texto formal das regras de troca (o passo a passo prático está em /ajuda/trocas-e-devolucoes).
// [CONFIRMAR] com o jurídico e o ateliê: (1) peça com bordado personalizado só troca por defeito ou
// bordado diferente do combinado; (2) frete da troca por gosto (fora do prazo de arrependimento) por
// conta da cliente; (3) prazo de reembolso (aqui: imediato após o recebimento e a conferência, sem
// número de dias); (4) se o ateliê aceita troca por gosto além dos 7 dias.
export default function PoliticaDeTrocas() {
  return (
    <PaginaInstitucional
      trilha={[
        { rotulo: "Políticas", href: "/politicas" },
        { rotulo: "Trocas e devoluções", href: CAMINHO },
      ]}
      titulo="Política de trocas e devoluções"
      abertura="Os seus direitos e as regras para trocar ou devolver uma peça comprada pelo site ou pelo WhatsApp."
      lateral={<LateralPoliticas atual={CAMINHO} />}
    >
      <div className={prosa}>
        <p className={css({ fontSize: "sm", color: "textoSuave" })}>Atualizada em {ATUALIZACAO_POLITICAS}.</p>

        <h2 id="arrependimento">1. Direito de arrependimento</h2>
        <p>
          Nas compras feitas fora do estabelecimento, como pelo site e pelo WhatsApp, você pode desistir em até 7 (sete) dias corridos a
          contar do recebimento da peça, sem precisar justificar, conforme o artigo 49 do Código de Defesa do Consumidor. Nesse caso, todos
          os valores pagos, inclusive o frete de envio, são devolvidos, pelo mesmo meio de pagamento ou por outro que você preferir e que o
          ateliê ofereça.
        </p>

        <h2 id="defeito">2. Defeitos e peças diferentes do combinado</h2>
        <p>
          Se a peça apresentar defeito de fabricação ou chegar diferente do que foi combinado, avise o ateliê com fotos. O prazo para
          reclamar de defeito aparente é de 30 dias para produtos não duráveis e de 90 dias para produtos duráveis, a contar da entrega
          (artigo 26 do CDC). O ateliê tem até 30 dias para resolver; se não resolver, você escolhe entre a troca por outra peça, a
          devolução do valor pago ou o abatimento proporcional do preço (artigo 18 do CDC). Nesses casos, o frete fica por conta do ateliê.
        </p>

        <h2 id="personalizadas">3. Peças com bordado personalizado</h2>
        <p>
          Peças bordadas com o nome do bebê ou feitas sob medida são produzidas exclusivamente para você, com os detalhes aprovados na
          conversa com a vendedora. Por isso, elas são trocadas ou devolvidas em caso de defeito ou de diferença em relação ao que foi
          aprovado (item 2).
        </p>

        <h2 id="condicoes">4. Condições da peça</h2>
        <ul>
          <li>A peça deve voltar sem uso, sem lavagem e sem sinais de uso, com as etiquetas.</li>
          <li>Sempre que possível, na embalagem original, com os acessórios e os brindes que vieram junto.</li>
          <li>Peças com defeito podem voltar no estado em que estão, para a análise do ateliê.</li>
        </ul>

        <h2 id="como-solicitar">5. Como solicitar</h2>
        <ol>
          <li>
            Fale com o ateliê pelo WhatsApp {EMPRESA.whatsapp.exibicao} ou pelo e-mail{" "}
            <a href={`mailto:${EMPRESA.emailAtendimento}`}>{EMPRESA.emailAtendimento}</a>, dentro dos prazos acima, com o seu nome e o motivo.
          </li>
          <li>O ateliê confirma o pedido e informa como embalar e como enviar a peça, ou combina a entrega no ateliê, em Fortaleza.</li>
          <li>Ao receber a peça, o ateliê confere as condições e faz a troca, o conserto ou o reembolso, como combinado com você.</li>
        </ol>
        <p>
          O passo a passo com dicas está em <Link href="/ajuda/trocas-e-devolucoes">Ajuda › Trocas e devoluções</Link>.
        </p>

        <h2 id="reembolso">6. Reembolso</h2>
        <p>
          O reembolso é feito pelo mesmo meio de pagamento usado na compra, depois do recebimento e da conferência da peça. Em compras no
          cartão de crédito, o estorno aparece na fatura conforme as regras da administradora do cartão.
        </p>

        <h2 id="duvidas">7. Dúvidas</h2>
        <p>
          Estas regras não limitam os direitos previstos no Código de Defesa do Consumidor. Em caso de dúvida, fale com o ateliê pelos canais
          acima.
        </p>
      </div>

      <BlocoContato titulo="Precisa trocar uma peça?" texto="Comece pelo WhatsApp: uma vendedora confirma o pedido e explica o envio." />
    </PaginaInstitucional>
  );
}
