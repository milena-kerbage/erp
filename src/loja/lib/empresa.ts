// Dados oficiais do ateliê: fonte única para rodapé, páginas de política e schema.org (Organization).
// Mesmos valores padrão do ERP (src/features/legal/config.ts, variáveis LEGAL_*). O Decreto 7.962/2013
// exige no site a razão social, o CNPJ e o endereço de quem vende.
// Contato e redes conferidos no perfil oficial do Instagram (@milenakerbageatelie, nov/2026).

export const SITE_INSTITUCIONAL = "https://www.ateliemilenakerbage.com.br";

export const EMPRESA = {
  nomeFantasia: "Ateliê Milena Kerbage",
  razaoSocial: "Milena Cavalcante Kerbage",
  cnpj: "13.592.162/0001-08",
  endereco: "Rua Professor Heraclito, 233, Vicente Pinzon, Fortaleza/CE, CEP 60181-245",
  cidade: "Fortaleza",
  uf: "CE",
  emailAtendimento: "milenakerbageatelie@gmail.com",
  emailPrivacidade: "milenakerbageatelie@gmail.com",
  // WhatsApp de vendas publicado no Instagram. No ERP, preencher LEGAL_WHATSAPP_PHONE com o mesmo número.
  whatsapp: { exibicao: "(85) 98582-2208", numero: "5585985822208" },
  // [CONFIRMAR] com o ateliê o horário de atendimento da vendedora pelo WhatsApp (rodapé da loja).
  horarioAtendimento: "Segunda a sexta, das 9h às 18h",
  // Enxoval e quarto de bebê feitos no ateliê, com entrega para todo o Brasil.
  segmento: "Enxoval e quarto de bebê",
  entrega: "Entrega para todo o Brasil",
} as const;

export const REDES_SOCIAIS = {
  instagram: "https://www.instagram.com/milenakerbageatelie/",
  linktree: "https://linktr.ee/ateliemilenakerbage",
} as const;
