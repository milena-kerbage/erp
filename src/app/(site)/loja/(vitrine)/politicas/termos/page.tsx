import Link from "next/link";
import { css } from "styled-system/css";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { ATUALIZACAO_POLITICAS, LateralPoliticas } from "@/loja/componentes/institucional/secoes";
import { EMPRESA } from "@/loja/lib/empresa";
import { metadataPagina } from "@/loja/lib/seo/institucional";

const CAMINHO = "/politicas/termos";

export const metadata = metadataPagina({
  titulo: "Termos de uso",
  descricao:
    "Termos de uso da loja online do Ateliê Milena Kerbage: catálogo com preço, pedido confirmado pelo WhatsApp, pagamento, frete, prazos, peças feitas à mão e direitos do consumidor.",
  caminho: CAMINHO,
  indexar: true,
});

// Termos da LOJA (o modelo de negócio real: catálogo com preço e pedido fechado pelo WhatsApp com
// uma vendedora; sem pagamento nem frete calculado no site; o pedido é feito com conta de cliente). [CONFIRMAR] com o jurídico.
export default function Termos() {
  return (
    <PaginaInstitucional
      trilha={[
        { rotulo: "Políticas", href: "/politicas" },
        { rotulo: "Termos de uso", href: CAMINHO },
      ]}
      titulo="Termos de uso"
      abertura="As condições para usar o site de compras do ateliê e para fazer pedidos pelo WhatsApp."
      lateral={<LateralPoliticas atual={CAMINHO} />}
    >
      <div className={prosa}>
        <p className={css({ fontSize: "sm", color: "textoSuave" })}>Atualizados em {ATUALIZACAO_POLITICAS}.</p>

        <h2 id="quem-somos">Quem somos</h2>
        <p>
          O site é mantido por {EMPRESA.razaoSocial} ({EMPRESA.nomeFantasia}), CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}. Contato: WhatsApp{" "}
          {EMPRESA.whatsapp.exibicao} e <a href={`mailto:${EMPRESA.emailAtendimento}`}>{EMPRESA.emailAtendimento}</a>.
        </p>

        <h2 id="como-funciona">Como a loja funciona</h2>
        <p>
          O site é um catálogo com preço. Você monta a sacola e envia o pedido pelo WhatsApp; uma vendedora do ateliê confirma
          disponibilidade, valores, bordado, frete, prazo e forma de pagamento. <strong>O pedido só é fechado quando você e a vendedora
          confirmam essas condições na conversa.</strong> Enviar a mensagem não gera cobrança nem obrigação de compra.
        </p>
        <p>
          Para fazer o pedido pelo site é preciso ter uma conta (veja <a href="#conta">Conta de cliente</a>). Os dados que o site guarda no
          seu navegador estão descritos na <Link href="/politicas/cookies">Política de cookies</Link>.
        </p>

        <h2 id="conta">Conta de cliente</h2>
        <ul>
          <li>A conta é pessoal: use dados verdadeiros e guarde a sua senha. Avise o ateliê se suspeitar de uso indevido.</li>
          <li>
            Esqueceu a senha? Fale com o ateliê pelo WhatsApp: a vendedora envia um link de redefinição, válido por 2 horas e de uso único.
          </li>
          <li>
            Você pode excluir a conta quando quiser, em Minha conta › Segurança. Os pedidos já feitos continuam no ateliê sem os seus dados
            pessoais (veja a <Link href="/politicas/privacidade#conta">Política de privacidade</Link>).
          </li>
        </ul>

        <h2 id="precos">Preços, cupons e disponibilidade</h2>
        <ul>
          <li>
            Os preços aparecem como “a partir de” porque o valor final depende das opções da peça (tamanho, bordado, tecido) e do frete.
          </li>
          <li>O valor que vale é o confirmado pela vendedora antes do pagamento.</li>
          <li>Cupons têm regras próprias e são conferidos pelo site e na conversa. Um cupom por pedido: os cupons não se somam.</li>
          <li>
            Cupom de primeira compra: ao criar a conta, você ganha 5% OFF na primeira compra, exclusivo da sua conta e de uso único, sobre
            os valores “a partir de” das peças (sem o frete). Ele não se soma a outros cupons e é independente do desconto no Pix, que é
            combinado à parte com a vendedora.
          </li>
          <li>As peças na sacola não ficam reservadas até o pedido ser confirmado.</li>
          <li>Se houver erro evidente de preço ou de descrição, a vendedora avisa antes de fechar o pedido.</li>
        </ul>

        <h2 id="pagamento">Pagamento</h2>
        <p>
          O site não processa pagamentos. A forma de pagamento é combinada com a vendedora. Nunca envie número de cartão, senha ou código de
          segurança pelo WhatsApp.
        </p>

        <h2 id="producao-e-entrega">Produção e entrega</h2>
        <p>
          Peças a pronta entrega saem do ateliê depois da confirmação do pedido; peças sob encomenda e projetos de quartinho são produzidos
          para você, no prazo informado. O frete e o prazo de entrega são combinados pelo WhatsApp, e a retirada pode ser feita no ateliê,
          em Fortaleza. Veja os detalhes em <Link href="/ajuda/entregas">Entregas e retirada</Link>.
        </p>

        <h2 id="feito-a-mao">Peças feitas à mão</h2>
        <p>
          As peças são feitas à mão. As medidas podem variar até 2 cm e o tom do tecido pode mudar levemente conforme a tela e o lote. As
          fotos e ilustrações do site são referências do modelo.
        </p>

        <h2 id="trocas">Trocas, devoluções e garantia</h2>
        <p>
          Você tem os direitos do Código de Defesa do Consumidor, inclusive o de desistir da compra à distância em até 7 dias a contar do
          recebimento. Veja a <Link href="/politicas/trocas">Política de trocas e devoluções</Link>.
        </p>

        <h2 id="uso-do-site">Uso do site</h2>
        <ul>
          <li>Use o site para conhecer as peças e fazer pedidos de forma legítima, com dados verdadeiros.</li>
          <li>Não tente acessar áreas restritas, interferir no funcionamento do site ou coletar dados de forma automatizada abusiva.</li>
          <li>
            Textos, fotos, marca e projetos do site pertencem ao ateliê ou a quem os licenciou. Não os reproduza para fins comerciais sem
            autorização.
          </li>
        </ul>

        <h2 id="disponibilidade">Disponibilidade do site</h2>
        <p>
          O site pode ficar fora do ar por manutenção ou falhas de terceiros (hospedagem, WhatsApp). Se a mensagem do pedido não abrir, fale
          direto com o ateliê pelo WhatsApp {EMPRESA.whatsapp.exibicao}.
        </p>

        <h2 id="privacidade">Privacidade</h2>
        <p>
          O uso dos seus dados segue a <Link href="/politicas/privacidade">Política de privacidade</Link>.
        </p>

        <h2 id="alteracoes">Alterações e foro</h2>
        <p>
          Podemos atualizar estes termos; a versão que vale para o seu pedido é a publicada na data em que ele foi confirmado. Aplica-se a
          lei brasileira, e você pode buscar seus direitos no foro do seu domicílio, como prevê o Código de Defesa do Consumidor.
        </p>
      </div>

      <BlocoContato titulo="Dúvidas sobre os termos?" />
    </PaginaInstitucional>
  );
}
