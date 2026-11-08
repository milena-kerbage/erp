// O resumo do painel de compra ("Seja a primeira a avaliar") abre o formulário que mora na seção de
// avaliações, mais abaixo na página: os dois conversam por um evento do navegador.
export const EVENTO_ESCREVER_AVALIACAO = "loja:escrever-avaliacao";

export function abrirFormularioAvaliacao() {
  window.dispatchEvent(new Event(EVENTO_ESCREVER_AVALIACAO));
}
