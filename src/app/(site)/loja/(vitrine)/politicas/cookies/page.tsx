import Link from "next/link";
import { css, cx } from "styled-system/css";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { ATUALIZACAO_POLITICAS, LateralPoliticas } from "@/loja/componentes/institucional/secoes";
import { VALIDADE_LOCAL_S } from "@/loja/lib/localizacao/cep";
import { CHAVE_HISTORICO } from "@/loja/lib/pedidos/historico";
import { COOKIE, VALIDADE } from "@/loja/lib/rastreamento/nucleo";
import { metadataPagina } from "@/loja/lib/seo/institucional";

const CAMINHO = "/politicas/cookies";

export const metadata = metadataPagina({
  titulo: "Política de cookies",
  descricao:
    "Os cookies e os dados que a loja do Ateliê Milena Kerbage guarda no seu navegador (sacola, favoritos, pedidos enviados, CEP e origem da visita), por quanto tempo e como apagar.",
  caminho: CAMINHO,
  indexar: true,
});

const DIA = 86_400;
const dias = (segundos: number) => `${Math.round(segundos / DIA)} dias`;

type Linha = { nome: string; finalidade: string; duracao: string };

// Lista tirada do código (nomes e prazos importados das constantes, para não divergir):
// cookies do proxy em lib/rastreamento/nucleo.ts, mk_local em lib/localizacao/cep.ts e as chaves de
// localStorage/sessionStorage dos componentes (carrinho/estado.ts, casas/AreaProjetos.tsx,
// listagem/AreaListagem.tsx, localizacao/estado.ts, pedidos/historico.ts).
// Chave nova no navegador? Acrescente aqui. [CONFIRMAR] o prazo do mk_consentimento quando o aviso de
// cookies (banner) for implementado: hoje ele ainda não existe, então os opcionais não são gravados.
const NECESSARIOS: Linha[] = [
  {
    nome: COOKIE.atribuicao,
    finalidade:
      "Origem da visita: parâmetros de campanha (utm), site de origem e página de entrada. Identificadores de clique de anúncios são descartados se você recusar os cookies de marketing.",
    duracao: `Até fechar o navegador; ${dias(VALIDADE.atribuicao)} se você autorizar cookies opcionais`,
  },
  { nome: COOKIE.consentimento, finalidade: "Guarda a sua escolha sobre os cookies opcionais.", duracao: "Até você mudar a escolha" },
  { nome: "mk_local", finalidade: "Cidade/UF e CEP que você informou, para falar de frete e retirada.", duracao: dias(VALIDADE_LOCAL_S) },
  {
    nome: "__Host-mk_cliente",
    finalidade: "Sessão da sua conta de cliente (só depois de entrar ou criar a conta). Código aleatório, sem dados pessoais; httpOnly, só neste site.",
    duracao: "Até 30 dias, ou até você sair da conta",
  },
];

const OPCIONAIS: Linha[] = [
  { nome: COOKIE.visitante, finalidade: "Identificador aleatório do navegador, para estatísticas de visitas (análise).", duracao: dias(VALIDADE.visitante) },
  { nome: COOKIE.sessao, finalidade: "Identifica a visita atual, para estatísticas (análise).", duracao: `${VALIDADE.sessao / 60} minutos sem atividade` },
  { nome: `${COOKIE.metaClique} e ${COOKIE.metaNavegador}`, finalidade: "Medição de anúncios da Meta (Facebook e Instagram) (marketing).", duracao: dias(VALIDADE.meta) },
];

const ARMAZENAMENTO: Linha[] = [
  { nome: "mk_carrinho", finalidade: "Peças da sacola.", duracao: "Até você apagar" },
  { nome: "mk_favoritos", finalidade: "Peças salvas nos favoritos.", duracao: "Até você apagar" },
  { nome: "mk_compra", finalidade: "Preferências do pedido: entrega ou retirada e cupom.", duracao: "Até você apagar" },
  {
    nome: CHAVE_HISTORICO,
    finalidade: "Pedidos enviados pelo WhatsApp neste aparelho, com a mensagem enviada, para rever e reenviar em Minha conta.",
    duracao: "Até você apagar (guarda os 20 mais recentes)",
  },
  { nome: "mk_densidade e mk_densidade_listagem", finalidade: "Tamanho das fotos escolhido nas listagens.", duracao: "Até você apagar" },
  { nome: "mk_lembrete_cep", finalidade: "Não mostrar de novo o lembrete do CEP nesta visita.", duracao: "Até fechar o navegador" },
];

export default function Cookies() {
  return (
    <PaginaInstitucional
      trilha={[
        { rotulo: "Políticas", href: "/politicas" },
        { rotulo: "Cookies", href: CAMINHO },
      ]}
      titulo="Política de cookies"
      abertura="Os cookies e os dados que a loja guarda no seu navegador, para que servem, por quanto tempo ficam e como apagar."
      lateral={<LateralPoliticas atual={CAMINHO} />}
    >
      <div className={prosa}>
        <p className={css({ fontSize: "sm", color: "textoSuave" })}>Atualizada em {ATUALIZACAO_POLITICAS}.</p>
        <p>
          Cookies são pequenos arquivos que o site grava no seu navegador. A loja também usa o armazenamento local do navegador
          (localStorage), que funciona de forma parecida, mas nunca é enviado ao nosso servidor. Não há cookies de outras empresas sem a
          sua autorização.
        </p>

        <h2 id="necessarios">Necessários</h2>
        <p>Fazem a loja funcionar e não identificam você.</p>
      </div>
      <Tabela linhas={NECESSARIOS} rotulo="Cookies necessários" />

      <div className={depoisDaTabela}>
        <h2 id="opcionais">Opcionais: análise e marketing</h2>
        <p>
          Só são gravados se você autorizar. Se recusar, eles não são criados, e os que já existirem são apagados na próxima visita.
        </p>
      </div>
      <Tabela linhas={OPCIONAIS} rotulo="Cookies opcionais" />

      <div className={depoisDaTabela}>
        <h2 id="armazenamento">Armazenamento no seu aparelho</h2>
        <p>
          Ficam só no seu navegador e não são enviados ao ateliê. É assim que a loja lembra a sua sacola, os seus favoritos e os pedidos
          que você enviou, sem precisar de login.
        </p>
      </div>
      <Tabela linhas={ARMAZENAMENTO} rotulo="Dados guardados no navegador" />

      <div className={depoisDaTabela}>
        <h2 id="como-apagar">Como apagar</h2>
        <ul>
          <li>
            Em <Link href="/conta">Minha conta</Link>, remova favoritos e apague o histórico de pedidos enviados.
          </li>
          <li>Na sacola, remova as peças uma a uma.</li>
          <li>
            Para apagar tudo de uma vez, limpe os cookies e os dados do site ateliemilenakerbage.com.br nas configurações do seu navegador.
            A sacola, os favoritos e o histórico serão perdidos.
          </li>
        </ul>
        <p>
          Saiba como tratamos os seus dados na <Link href="/politicas/privacidade">Política de privacidade</Link>.
        </p>
      </div>

      <BlocoContato titulo="Dúvidas sobre cookies?" />
    </PaginaInstitucional>
  );
}

// Tabela no desktop; no celular, cada linha vira um cartão (rótulos repetidos), sem rolagem lateral.
function Tabela({ linhas, rotulo }: { linhas: Linha[]; rotulo: string }) {
  return (
    <table aria-label={rotulo} className={tabela}>
      <thead className={css({ display: { base: "none", md: "table-header-group" } })}>
        <tr>
          <th scope="col">Nome</th>
          <th scope="col">Para que serve</th>
          <th scope="col">Duração</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha) => (
          <tr key={linha.nome}>
            <th scope="row" data-rotulo="Nome">
              <code>{linha.nome}</code>
            </th>
            <td data-rotulo="Para que serve">{linha.finalidade}</td>
            <td data-rotulo="Duração">{linha.duracao}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const depoisDaTabela = cx(prosa, css({ mt: { base: "12", md: "16" } }));

const tabela = css({
  w: "full",
  maxW: "[960px]",
  mt: "6",
  borderCollapse: "collapse",
  fontSize: "sm",
  lineHeight: "texto",
  color: "texto",
  textAlign: "left",
  "& th, & td": { verticalAlign: "top" },
  "& thead th": { pb: "3", fontWeight: "medium", color: "textoSuave", borderBottomWidth: "1px", borderColor: "escuro" },
  "& code": { fontFamily: "mono", fontSize: "xs", color: "escuro", overflowWrap: "anywhere" },
  "& tbody tr": {
    display: { base: "grid", md: "table-row" },
    gap: "2",
    py: { base: "4", md: "0" },
    borderBottomWidth: "1px",
    borderColor: "borda",
  },
  "& tbody th, & tbody td": {
    display: { base: "grid", md: "table-cell" },
    gridTemplateColumns: "[96px minmax(0, 1fr)]",
    gap: "3",
    py: { md: "4" },
    pr: { md: "6" },
  },
  "& tbody th::before, & tbody td::before": {
    content: "attr(data-rotulo)",
    display: { base: "block", md: "none" },
    fontSize: "xs",
    color: "textoSuave",
  },
  "& tbody th": { fontWeight: "normal", w: { md: "[28%]" } },
  "& tbody td:last-child": { w: { md: "[24%]" } },
});
