import nodemailer from 'nodemailer';

// E-mail das contas de cliente da loja (link de redefinição de senha), PREPARADO e DESLIGADO.
// Hoje não há SMTP: a vendedora manda o link pelo WhatsApp. Para ligar quando o SMTP existir:
// SMTP_HOST, SMTP_PORT (587 com STARTTLS ou 465), SMTP_USER, SMTP_PASSWORD, SMTP_FROM e
// LOJA_EMAIL_REDEFINICAO=true. Mesmo transporte (TLS obrigatório, certificado validado) do ERP.

export function emailDeContasLigado(ambiente: Record<string, string | undefined> = process.env) {
  return ambiente.LOJA_EMAIL_REDEFINICAO === 'true' && Boolean(ambiente.SMTP_HOST && ambiente.SMTP_USER && ambiente.SMTP_PASSWORD && ambiente.SMTP_FROM);
}

/** Envia o link de redefinição por e-mail. Desligado (padrão): não envia e devolve false. Nunca registra o link em log. */
export async function enviarRedefinicaoPorEmail({ para, nome, link }: { para: string; nome: string; link: string }): Promise<boolean> {
  if (!emailDeContasLigado()) return false;
  try {
    const smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', requireTLS: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 10000, socketTimeout: 15000,
    });
    await smtp.sendMail({
      from: process.env.SMTP_FROM, to: para, subject: 'Crie uma nova senha — Ateliê Milena Kerbage',
      text: `Olá, ${nome.split(' ')[0] || 'tudo bem'}!\n\nPara criar uma nova senha da sua conta na loja do Ateliê Milena Kerbage, abra este link em até 2 horas (ele funciona uma vez):\n${link}\n\nSe não pediu, ignore esta mensagem.`,
    });
    return true;
  } catch {
    console.error('[contas] Falha no envio do e-mail de redefinição.');
    return false;
  }
}
