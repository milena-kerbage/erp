import {
  BookOpenTextIcon,
  CalculatorIcon,
  CalendarBlankIcon,
  ChartLineUpIcon,
  ChatsCircleIcon,
  ClipboardTextIcon,
  GearSixIcon,
  InfoIcon,
  KanbanIcon,
  PackageIcon,
  SealCheckIcon,
  SparkleIcon,
  SquaresFourIcon,
  ToggleLeftIcon,
  UserFocusIcon,
  UsersIcon,
  UsersThreeIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";

export type NavTab = {
  label: string;
  href: string;
};

export type NavModule = {
  label: string;
  href: string;
  icon: Icon;
  /** Seções do módulo, exibidas como pílulas no header. */
  tabs?: readonly NavTab[];
  /** `false`: o módulo não tem "Visão geral" (a raiz leva à primeira seção). */
  overview?: false;
  /**
   * Módulo ainda em produção: aparece no menu com o selo "Produção" e o
   * acesso fica bloqueado (tela explicando o que vem). Tirar quando lançar.
   */
  soon?: {
    description: string;
    features: readonly string[];
  };
};

/**
 * Fonte única do menu: a sidebar lista os módulos e o header mostra as
 * seções (`tabs`) do módulo atual.
 *
 * Ícones vêm de `@phosphor-icons/react/ssr` para que este arquivo possa ser
 * importado tanto em Server quanto em Client Components.
 */
export const navigation = {
  main: [
    {
      label: "Painel",
      href: "/",
      icon: SquaresFourIcon,
    },
    { label: "Leads", href: "/leads", icon: UserFocusIcon },
    { label: "Conversas", href: "/conversas", icon: ChatsCircleIcon },
    { label: "Clientes", href: "/clientes", icon: UsersThreeIcon },
    {
      label: "Agenda",
      href: "/agenda",
      icon: CalendarBlankIcon,
      soon: {
        description: "Provas, visitas e entregas num calendário só, com lembretes para a equipe e para a cliente.",
        features: ["Agenda de provas por profissional", "Lembretes automáticos no WhatsApp", "Sincronização com o Google Agenda"],
      },
    },
    {
      label: "Orçamentos",
      href: "/orcamentos",
      icon: CalculatorIcon,
      soon: {
        description: "Monte orçamentos com tecidos, mão de obra e prazos, e envie para a cliente aprovar.",
        features: ["Modelos de orçamento por tipo de peça", "Envio por WhatsApp e e-mail", "Aprovação que já vira pedido"],
      },
    },
    {
      label: "Pedidos",
      href: "/pedidos",
      icon: ClipboardTextIcon,
      tabs: [
        { label: "Em andamento", href: "/pedidos/em-andamento" },
        { label: "Finalizados", href: "/pedidos/finalizados" },
      ],
      soon: {
        description: "Cada pedido do sinal à entrega, com provas, pagamentos e prazos no mesmo lugar.",
        features: ["Linha do tempo de provas e ajustes", "Controle de sinal e parcelas", "Alertas de prazo de entrega"],
      },
    },
    {
      label: "Catálogo",
      href: "/catalogo",
      icon: BookOpenTextIcon,
      soon: {
        description: "Modelos, tecidos e acabamentos com fotos e preços, para mostrar à cliente e orçar mais rápido.",
        features: ["Ficha e fotos de cada modelo", "Tabela de preços por tecido", "Coleções para compartilhar com a cliente"],
      },
    },
    {
      label: "Produção",
      href: "/producao",
      icon: KanbanIcon,
      soon: {
        description: "O ateliê por dentro: cada peça na etapa certa, do corte à finalização.",
        features: ["Quadro de produção por peça", "Responsável e prazo por etapa", "Ordem de serviço para a costura"],
      },
    },
    {
      label: "Estoque",
      href: "/estoque",
      icon: PackageIcon,
      tabs: [
        { label: "Materiais", href: "/estoque/materiais" },
        { label: "Movimentações", href: "/estoque/movimentacoes" },
      ],
      soon: {
        description: "Tecidos, rendas e aviamentos com quantidade, fornecedor e aviso de reposição.",
        features: ["Entradas e saídas por pedido", "Aviso de estoque baixo", "Cadastro de fornecedores"],
      },
    },
    {
      label: "Financeiro",
      href: "/financeiro",
      icon: WalletIcon,
      tabs: [
        { label: "Contas a receber", href: "/financeiro/receber" },
        { label: "Contas a pagar", href: "/financeiro/pagar" },
        { label: "Fluxo de caixa", href: "/financeiro/fluxo-de-caixa" },
      ],
      soon: {
        description: "Contas a receber e a pagar, fluxo de caixa e o lucro de cada pedido.",
        features: ["Recebimentos por pedido e parcela", "Contas a pagar com vencimento", "Fluxo de caixa do mês"],
      },
    },
    {
      label: "Relatórios",
      href: "/relatorios",
      icon: ChartLineUpIcon,
      soon: {
        description: "Vendas, conversão por origem, tempo de produção e desempenho da equipe.",
        features: ["Conversão por funil e origem", "Faturamento por período", "Desempenho de cada pessoa da equipe"],
      },
    },
  ],
  secondary: [
    {
      label: "Configurações",
      href: "/configuracoes",
      icon: GearSixIcon,
      overview: false,
      tabs: [
        { label: "Usuários", href: "/configuracoes/usuarios" },
        { label: "Funis e etapas", href: "/configuracoes/funis" },
        { label: "Preferências", href: "/configuracoes/preferencias" },
        { label: "Perfil", href: "/configuracoes/perfil" },
        { label: "Acessibilidade", href: "/configuracoes/acessibilidade" },
        { label: "Integrações", href: "/configuracoes/integracoes" },
        { label: "API e webhooks", href: "/configuracoes/api" },
      ],
    },
  ],
  /** Menu do perfil (rodapé da sidebar). */
  account: [
    { label: "Meu perfil", href: "/configuracoes/perfil", icon: SealCheckIcon },
    { label: "Equipe", href: "/configuracoes/usuarios", icon: UsersIcon },
    {
      label: "Novidades",
      href: "/conta/novidades",
      icon: SparkleIcon,
      soon: {
        description: "Tudo o que entra de novo no sistema, mês a mês, com vídeos curtos de como usar.",
        features: ["Lançamentos de cada mês", "Vídeos rápidos das novidades", "Aviso quando um módulo é liberado"],
      },
    },
    { label: "Preferências", href: "/configuracoes/preferencias", icon: ToggleLeftIcon },
  ],
  support: [
    {
      label: "Central de ajuda",
      href: "/ajuda",
      icon: InfoIcon,
      soon: {
        description: "Guias passo a passo, respostas rápidas e contato direto com o suporte.",
        features: ["Guias de cada tela", "Perguntas frequentes", "Chat com o suporte"],
      },
    },
  ],
} as const satisfies Record<string, readonly NavModule[]>;
