import Link from "next/link";
import { css } from "styled-system/css";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { ATUALIZACAO_POLITICAS, LateralPoliticas } from "@/loja/componentes/institucional/secoes";
import { EMPRESA } from "@/loja/lib/empresa";
import { metadataPagina } from "@/loja/lib/seo/institucional";

const CAMINHO = "/politicas/privacidade";

export const metadata = metadataPagina({
  titulo: "Política de privacidade",
  descricao:
    "Como a loja online do Ateliê Milena Kerbage trata dados pessoais: conta de cliente, pedido pelo WhatsApp, dados salvos no seu aparelho, cookies, compartilhamento e seus direitos pela LGPD.",
  caminho: CAMINHO,
  indexar: true,
});

// Privacidade da LOJA, escrita a partir do que o código faz hoje: conta de cliente (e-mail e senha,
// src/lib/loja/contas.ts) obrigatória no pedido, registrado no servidor e enviado pela cliente no WhatsApp;
// sacola, favoritos e cópia dos pedidos enviados no localStorage; CEP consultado pelo servidor no ViaCEP e coordenadas no
// OpenStreetMap (lib/localizacao/servicos.ts); cookies de atribuição e, com consentimento, de
// análise e de anúncios (lib/rastreamento/nucleo.ts). Base de linguagem: a política do ERP.
// [CONFIRMAR] com o jurídico: hipóteses legais, prazos de guarda de pedidos e conversas, região da
// hospedagem (Vercel) e se há encarregado (DPO) nomeado.
export default function Privacidade() {
  return (
    <PaginaInstitucional
      trilha={[
        { rotulo: "Políticas", href: "/politicas" },
        { rotulo: "Privacidade", href: CAMINHO },
      ]}
      titulo="Política de privacidade"
      abertura="Como a loja online do ateliê usa os seus dados, com quem compartilha e como você exerce os seus direitos."
      lateral={<LateralPoliticas atual={CAMINHO} />}
    >
      <div className={prosa}>
        <p className={css({ fontSize: "sm", color: "textoSuave" })}>Atualizada em {ATUALIZACAO_POLITICAS}.</p>

        <h2 id="resumo">Em poucas palavras</h2>
        <ul>
          <li>Para fazer pedidos, você cria uma conta com o mínimo: nome, WhatsApp, e-mail e senha. Os demais dados são opcionais.</li>
          <li>O pedido fica registrado na sua conta e segue na mensagem que você mesma envia ao WhatsApp do ateliê. O site não cobra nada.</li>
          <li>Você pode corrigir os seus dados e excluir a conta quando quiser, em <Link href="/conta/seguranca">Minha conta</Link>.</li>
          <li>Sacola e favoritos ficam salvos só no seu navegador, e você pode apagar quando quiser.</li>
          <li>Cookies de análise e de anúncios só com a sua autorização.</li>
        </ul>

        <h2 id="responsavel">Quem é responsável pelos dados</h2>
        <p>
          {EMPRESA.razaoSocial}, nome comercial {EMPRESA.nomeFantasia}, CNPJ {EMPRESA.cnpj}, {EMPRESA.endereco}. Para assuntos de
          privacidade, escreva para <a href={`mailto:${EMPRESA.emailPrivacidade}`}>{EMPRESA.emailPrivacidade}</a>.
        </p>
        <p>
          Esta política vale para o site de compras {EMPRESA.nomeFantasia} (ateliemilenakerbage.com.br). Quando você conversa com o ateliê
          pelo WhatsApp, também se aplicam os termos e a política de privacidade do próprio WhatsApp.
        </p>

        <h2 id="dados">Quais dados usamos</h2>
        <h3>Quando você faz um pedido</h3>
        <p>
          O pedido é feito com a sua conta (veja <a href="#conta">Conta de cliente</a>). Registramos no nosso servidor as peças, os valores
          “a partir de”, o cupom usado e, se você quiser, cidade/UF ou CEP, a preferência por retirar no ateliê e observações (como o nome
          para o bordado e a data prevista do parto), junto com o seu nome, WhatsApp e e-mail. A mensagem do pedido abre no seu WhatsApp e só
          chega à conversa com o ateliê se você enviar.
        </p>
        <h3>Na conversa com a vendedora</h3>
        <p>
          Na conversa, o ateliê recebe o que você escreve e o seu número, e pode precisar de endereço de entrega e de dados para emitir a
          nota fiscal. Esses dados servem para confirmar o pedido, produzir as peças, combinar pagamento e entrega e prestar o atendimento
          depois da compra.
        </p>
        <h3>Salvos no seu aparelho</h3>
        <p>
          A sacola, os favoritos, as preferências de compra e uma cópia do resumo dos pedidos enviados deste aparelho (incluindo a mensagem,
          com nome e WhatsApp) ficam no armazenamento local do seu navegador, para você rever em <Link href="/conta">Minha conta</Link>.
          Essa cópia não sai do aparelho. A sessão da conta usa um cookie técnico, necessário para manter você conectada. Veja a lista completa na <Link href="/politicas/cookies">Política de cookies</Link>.
        </p>
        <h3>Localização para o frete</h3>
        <p>
          Se você informar o CEP, o nosso servidor consulta a cidade no serviço público ViaCEP. Se preferir usar a localização do aparelho,
          o navegador pede a sua permissão e o servidor envia as coordenadas, arredondadas, ao serviço de mapas OpenStreetMap só para achar o
          CEP. A cidade e o CEP ficam num cookie do seu navegador por até 180 dias.
        </p>
        <h3>Navegação</h3>
        <p>
          Para saber de onde vêm as visitas, o site guarda num cookie a origem da visita (por exemplo, o link de uma campanha ou o site que
          trouxe você até aqui) e a página de entrada. Identificadores de visitante e de sessão para estatísticas, e os cookies de anúncios
          da Meta, só são gravados se você autorizar. A hospedagem do site registra dados técnicos das requisições, como endereço IP e
          navegador, para segurança e funcionamento.
        </p>

        <h2 id="conta">Conta de cliente</h2>
        <p>
          No cadastro pedimos só nome, WhatsApp, e-mail e senha, e registramos a data e a versão dos Termos de uso e desta política que você
          aceitou. A senha é guardada de forma irreversível (hash), nunca em texto. Em Minha conta você pode, se quiser, completar CPF,
          endereço, data prevista ou de nascimento e nome do bebê, como conheceu o ateliê e preferências: esses dados são opcionais e servem
          para agilizar o atendimento, a entrega e a nota fiscal.
        </p>
        <p>
          Ao criar a conta, você ganha um cupom de 5% OFF na primeira compra, ligado à sua conta e de uso único: registramos quando e em
          qual pedido ele foi usado. A equipe do ateliê vê os seus dados e pedidos no sistema interno para atender você. Se você esquecer a
          senha, a vendedora gera um link de redefinição (válido por 2 horas, de uso único) e envia pelo WhatsApp; o ateliê não envia
          e-mails pela loja.
        </p>
        <p>
          Você pode excluir a conta a qualquer momento em <Link href="/conta/seguranca">Minha conta › Segurança</Link>. A exclusão
          apaga a conta, os dados pessoais, as sessões e o cupom; os pedidos ficam no ateliê sem nome, contato, cidade, observações nem a
          mensagem, só com as peças e os valores, para controle e obrigações legais.
        </p>

        {/* Seção referenciada pelo formulário de avaliação (/politicas/privacidade#avaliacoes): manter o id. */}
        <h2 id="avaliacoes">Avaliações de produtos</h2>
        <p>
          Quando você envia uma avaliação na página de um produto, coletamos a nota, o título, o texto, o nome que você escolhe exibir,
          a cidade e a UF e o “para quem” (opcionais), as fotos que você anexar (até 4) e a data do envio. Também registramos, apenas
          para evitar abusos, um código irreversível derivado do endereço IP, que é apagado depois da revisão ou em até 24 horas.
        </p>
        <p>
          Antes de ser guardada, cada foto é reduzida e perde todos os metadados, como localização (GPS), modelo da câmera e data. Toda
          avaliação passa pela revisão da equipe do ateliê antes de aparecer. Quando aprovada, ficam públicos na página do produto a
          nota, o título, o texto, o nome de exibição, a cidade, o “para quem”, as fotos e a eventual resposta do ateliê.
        </p>
        <p>
          O tratamento se baseia no seu consentimento, dado no envio. As avaliações ficam publicadas enquanto o produto estiver no
          catálogo ou até você pedir a remoção; as recusadas ficam guardadas só para controle interno até serem excluídas. Você pode
          pedir a correção ou a exclusão da sua avaliação e das fotos a qualquer momento pelo WhatsApp {EMPRESA.whatsapp.exibicao} ou
          pelo e-mail <a href={`mailto:${EMPRESA.emailPrivacidade}`}>{EMPRESA.emailPrivacidade}</a>. A exclusão apaga a avaliação e as
          fotos de forma definitiva.
        </p>

        <h2 id="finalidades">Para que usamos e com qual base legal</h2>
        <ul>
          <li>
            <strong>Atender e entregar o seu pedido</strong>, a seu pedido: procedimentos preliminares e execução do contrato de compra.
          </li>
          <li>
            <strong>Lembrar a sacola, os favoritos e os pedidos enviados</strong> no seu aparelho: funcionamento do serviço que você usa.
          </li>
          <li>
            <strong>Saber de onde vêm as visitas</strong>, sem identificar você: legítimo interesse, com dados mínimos.
          </li>
          <li>
            <strong>Estatísticas de uso e anúncios</strong>: só com o seu consentimento, que pode ser retirado a qualquer momento.
          </li>
          <li>
            <strong>Emitir nota fiscal e cumprir obrigações legais</strong>: cumprimento de obrigação legal.
          </li>
          <li>
            <strong>Proteger o site e resolver disputas</strong>: legítimo interesse e exercício regular de direitos.
          </li>
        </ul>
        <p>Não vendemos dados pessoais e não usamos os seus dados para decisões automatizadas.</p>

        <h2 id="compartilhamento">Com quem compartilhamos</h2>
        <ul>
          <li>
            <strong>WhatsApp (Meta)</strong>, por onde o pedido e o atendimento acontecem.
          </li>
          <li>
            <strong>Vercel</strong>, a hospedagem do site, que processa as requisições.
          </li>
          <li>
            <strong>ViaCEP e OpenStreetMap</strong>, consultados pelo nosso servidor só com o CEP ou as coordenadas arredondadas, sem o seu
            nome.
          </li>
          <li>
            <strong>Transportadoras e Correios</strong>, com nome, endereço e telefone, quando o envio é combinado com você.
          </li>
          <li>
            <strong>Meios de pagamento</strong>, conforme a forma combinada com a vendedora.
          </li>
          <li>
            <strong>Autoridades</strong>, quando a lei exigir.
          </li>
        </ul>
        <p>
          Alguns desses serviços podem tratar dados fora do Brasil, com as garantias previstas na Lei Geral de Proteção de Dados (LGPD).
        </p>

        <h2 id="guarda">Por quanto tempo guardamos</h2>
        <p>
          Os dados salvos no seu navegador ficam lá até você apagar, em <Link href="/conta">Minha conta</Link> ou limpando os dados do site
          no navegador. Os dados da conta ficam guardados enquanto a conta existir; ao excluí-la, eles são apagados e os pedidos,
          anonimizados. Os cookies têm os prazos descritos na <Link href="/politicas/cookies">Política de cookies</Link>. Os dados de pedidos
          e da conversa ficam guardados pelo tempo necessário para o atendimento, a garantia das peças e as obrigações fiscais e legais.
        </p>

        <h2 id="direitos">Seus direitos</h2>
        <p>
          Pela LGPD, você pode pedir confirmação e acesso aos seus dados, correção, anonimização, bloqueio ou eliminação de dados
          desnecessários, portabilidade, informação sobre compartilhamento, revogação do consentimento e eliminação dos dados tratados com
          consentimento, além de se opor a tratamentos irregulares.
        </p>
        <p>
          Para isso, escreva para <a href={`mailto:${EMPRESA.emailPrivacidade}`}>{EMPRESA.emailPrivacidade}</a> com o número de WhatsApp
          usado no pedido. Podemos pedir uma confirmação simples de identidade. Você também pode reclamar à Autoridade Nacional de Proteção
          de Dados (ANPD) e aos órgãos de defesa do consumidor.
        </p>

        <h2 id="criancas">Dados do bebê</h2>
        <p>
          A loja é voltada a adultos que compram para bebês. O nome do bebê, quando informado para o bordado, e a data prevista do parto são
          usados só para produzir e entregar o pedido. Não peça nem envie documentos ou dados de saúde pelo WhatsApp.
        </p>

        <h2 id="seguranca">Segurança</h2>
        <p>
          O site usa conexão segura (HTTPS), os cookies de navegação não podem ser lidos por scripts e o ateliê nunca pede senha nem dados de
          cartão pelo site ou pelo WhatsApp. Se notar algo estranho, como alguém se passando pelo ateliê, avise pelo e-mail de privacidade.
        </p>

        <h2 id="mudancas">Mudanças nesta política</h2>
        <p>
          Quando mudarmos a forma de tratar dados, atualizamos esta página e a data no topo. Mudanças relevantes também serão avisadas no
          site.
        </p>
      </div>

      <BlocoContato titulo="Dúvidas sobre os seus dados?" texto={`Escreva para ${EMPRESA.emailPrivacidade} ou fale com o ateliê pelo WhatsApp.`} />
    </PaginaInstitucional>
  );
}
