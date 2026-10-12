import { cache } from 'react';
import { effectiveLegalFields } from '../../lib/whatsapp/config.ts';

/** Dados publicados nas políticas: apenas informações empresariais, nunca segredos. */
const value = (name: string) => process.env[name]?.trim() || undefined;
const email = (name: string) => {
  const candidate = value(name);
  return candidate && candidate.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : undefined;
};
const phone = () => {
  const candidate = value('LEGAL_WHATSAPP_PHONE')?.replace(/[^0-9]/g, '');
  return candidate && /^[1-9][0-9]{7,14}$/.test(candidate) ? candidate : undefined;
};

export const legalIdentity = cache(async () => {
  const defaults = {
    brand: 'Ateliê Milena Kerbage',
    entity: value('LEGAL_ENTITY_NAME') || 'Milena Cavalcante Kerbage',
    cnpj: value('LEGAL_CNPJ') || '13.592.162/0001-08',
    address: value('LEGAL_ADDRESS') || 'Rua Professor Heraclito, 233, Vicente Pinzon, Fortaleza - CE, CEP 60181-245',
    privacyEmail: email('LEGAL_PRIVACY_EMAIL') || 'milenakerbageatelie@gmail.com',
    supportEmail: email('LEGAL_SUPPORT_EMAIL') || 'milenakerbageatelie@gmail.com',
    whatsappPhone: phone(),
  };
  try { return { ...defaults, ...await effectiveLegalFields() }; }
  catch { return defaults; } // Durante bootstrap, continua publicando identidade e contato postal conhecidos.
});

export async function legalRetentionDays() {
  try { return (await effectiveLegalFields()).retentionDays; } catch { /* Bootstrap ainda não conectado. */ }
  const days = Number(process.env.WHATSAPP_RETENTION_DAYS || 90);
  return Number.isInteger(days) && days >= 1 && days <= 3650 ? days : 90;
}

export const POLICY_VERSION = '2026-10-12';
export const POLICY_DATE = '12 de outubro de 2026';
export const LEGAL_LINKS = [
  { href: '/privacidade', title: 'Política de privacidade', description: 'Dados tratados, finalidades, compartilhamento e seus direitos.' },
  { href: '/termos', title: 'Termos de uso', description: 'Regras de acesso ao sistema e de atendimento pelos canais digitais.' },
  { href: '/exclusao-de-dados', title: 'Exclusão de dados', description: 'Como solicitar eliminação, revogar permissões e acompanhar pedidos.' },
  { href: '/cookies', title: 'Política de cookies', description: 'Cookies e armazenamento local usados pelo aplicativo.' },
  { href: '/politica-de-comunicacao', title: 'Comunicação pelo WhatsApp', description: 'Autorizações, mensagens de serviço, ofertas e descadastramento.' },
] as const;

export const LEGAL_SOURCES = {
  lgpd: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
  messaging: 'https://whatsappbusiness.com/policy/',
  processing: 'https://www.whatsapp.com/legal/business-data-processing-terms',
  transfer: 'https://www.whatsapp.com/legal/DTA',
  anpdTransfer: 'https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024',
  cookies: 'https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais',
  anpd: 'https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao-titular-de-dados',
};
