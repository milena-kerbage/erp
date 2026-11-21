// Link de WhatsApp do ateliê usado em TODO o site. Passa por /ir/whatsapp, que acrescenta o código de origem à
// mensagem (campanha, busca, página do clique) antes de abrir a conversa: é assim que o ERP sabe de onde veio quem
// chamou no WhatsApp sem ter feito pedido. Use sempre em <a> comum (nunca <Link>, que faria prefetch da rota).
export const MENSAGEM_PADRAO = "Oi! Vim pela loja do ateliê.";

export const linkWhatsAppAtelie = (texto: string = MENSAGEM_PADRAO) => `/ir/whatsapp?texto=${encodeURIComponent(texto)}`;
