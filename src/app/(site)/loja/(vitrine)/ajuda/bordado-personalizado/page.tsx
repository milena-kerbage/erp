import Link from "next/link";
import { prosa } from "@/loja/componentes/institucional/estilos";
import { BlocoContato, PaginaInstitucional } from "@/loja/componentes/institucional/PaginaInstitucional";
import { LateralAjuda, metadataTema, PerguntasDoTema, trilhaTema } from "@/loja/componentes/institucional/secoes";

const SLUG = "bordado-personalizado";
export const metadata = metadataTema(SLUG);

// Como o bordado funciona hoje na loja: a peça que aceita bordado tem a escolha "com" ou "sem" bordado
// (carrinho/estado.ts, Personalizacao); o nome e os detalhes são confirmados pelo WhatsApp.
// [CONFIRMAR] com o ateliê: fontes e cores de linha disponíveis, limite de letras e se o bordado
// muda o prazo das peças a pronta entrega (aqui não citamos números).
export default function BordadoPersonalizado() {
  return (
    <PaginaInstitucional
      trilha={trilhaTema(SLUG)}
      titulo="Bordado personalizado"
      abertura="Muitas peças do ateliê podem levar o nome do bebê bordado. Você escolhe no site e confirma os detalhes com a vendedora."
      lateral={<LateralAjuda atual={`/ajuda/${SLUG}`} />}
    >
      <div className={prosa}>
        <h2 id="como-escolher">Como escolher</h2>
        <ol>
          <li>
            Na página do produto, veja se a peça aceita bordado e se ele é incluso ou opcional. Escolha <strong>com bordado</strong> ou{" "}
            <strong>sem bordado</strong>.
          </li>
          <li>
            Ao fazer o pedido, escreva o nome nas observações, se já tiver. O mesmo produto com e sem bordado entra como linhas diferentes na
            sacola.
          </li>
          <li>
            Na conversa pelo WhatsApp, a vendedora confirma o nome, a grafia, a posição e as cores do bordado antes de produzir.
          </li>
        </ol>

        <h2 id="prazo">Prazo</h2>
        <p>
          O bordado entra em produção depois que o nome é confirmado com a vendedora, e o prazo conta a partir daí. Ainda não escolheram o
          nome? Dá para fazer o pedido e avisar a vendedora: ela combina com você o melhor momento. Veja os prazos de produção em{" "}
          <Link href="/ajuda/entregas#prazos">Entregas e retirada</Link>.
        </p>

        <h2 id="revisao">Revise com calma</h2>
        <p>
          Como a peça bordada é feita só para você, a troca dela acontece em caso de defeito ou de bordado diferente do combinado. Confira
          letra por letra na mensagem da vendedora antes de aprovar. Saiba mais em{" "}
          <Link href="/ajuda/trocas-e-devolucoes#bordado">Trocas e devoluções</Link>.
        </p>

        <h2 id="cuidados">Cuidados com a peça bordada</h2>
        <p>
          Lave com sabão neutro, sem alvejante, e passe com ferro em temperatura baixa, com o bordado virado para baixo. Veja os cuidados de
          cada tecido em <Link href="/ajuda/tecidos-e-cuidados">Cuidados com as peças</Link>.
        </p>
      </div>

      <PerguntasDoTema slug={SLUG} />
      <BlocoContato texto="Quer conferir se uma peça aceita bordado ou tirar uma dúvida sobre o nome? Fale com uma vendedora pelo WhatsApp." />
    </PaginaInstitucional>
  );
}
