import {
  BookOpenTextIcon,
  CalculatorIcon,
  CalendarBlankIcon,
  ChartLineUpIcon,
  ClipboardTextIcon,
  GearSixIcon,
  InfoIcon,
  KanbanIcon,
  PackageIcon,
  SealCheckIcon,
  SparkleIcon,
  SquaresFourIcon,
  StorefrontIcon,
  ToggleLeftIcon,
  UserFocusIcon,
  UsersIcon,
  WalletIcon,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { IconeInstagram, IconeWhatsApp } from "@/components/brand/LogosCanais";

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
 * Fonte única do menu: o header lista os módulos (e o dock, no celular) e
 * mostra as seções (`tabs`) do módulo atual.
 *
 * Liberados (2026-11-19, a pedido): Painel, Leads e clientes, WhatsApp, Instagram e E-commerce, além das Configurações
 * (sem elas não há como conectar o WhatsApp, editar funis nem cuidar da equipe). Os demais módulos estão com `soon`:
 * aparecem com o selo "Produção" e a tela deles fica bloqueada (AppShell + LockedModule), mesmo já tendo página
 * pronta. Para liberar um módulo, basta tirar o `soon` dele.
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
    // Leads e clientes na mesma tabela (a categoria vem do funil); /clientes redireciona para cá.
    { label: "Leads e clientes", href: "/leads", icon: UserFocusIcon },
    // Atendimento: cada canal com a própria tela e a logo colorida; uma troca no topo das listas liga os dois.
    { label: "WhatsApp", href: "/conversas", icon: IconeWhatsApp },
    { label: "Instagram", href: "/instagram", icon: IconeInstagram },
    {
      label: "Agenda",
      href: "/agenda",
      icon: CalendarBlankIcon,
      soon: {
        description: "Entregas, retiradas e compromissos do ateliê num calendário só, com lembretes para a equipe.",
        features: ["Calendário por pessoa da equipe", "Lembretes de prazos e entregas", "Compromissos ligados à oportunidade"],
      },
    },
    {
      label: "Orçamentos",
      href: "/orcamentos",
      icon: CalculatorIcon,
      soon: {
        description: "Monte orçamentos com produtos, personalização e prazos, e envie para aprovação.",
        features: ["Modelos de orçamento por tipo de produto", "Envio pelo WhatsApp", "Aprovação que já vira pedido"],
      },
    },
    {
      label: "Pedidos",
      href: "/pedidos",
      icon: ClipboardTextIcon,
      soon: {
        description: "Cada pedido do sinal à entrega, com pagamentos e prazos no mesmo lugar.",
        features: ["Linha do tempo de cada pedido", "Controle de sinal e parcelas", "Alertas de prazo de entrega"],
      },
      tabs: [
        { label: "Em andamento", href: "/pedidos/em-andamento" },
        { label: "Finalizados", href: "/pedidos/finalizados" },
      ],
    },
    {
      label: "Catálogo",
      href: "/catalogo",
      icon: BookOpenTextIcon,
      soon: {
        description: "Produtos, tecidos e acabamentos com fotos e preços, para orçar mais rápido.",
        features: ["Ficha e fotos de cada produto", "Tabela de preços por tecido", "Coleções para compartilhar"],
      },
    },
    {
      label: "E-commerce",
      href: "/ecommerce",
      icon: StorefrontIcon,
      // "Visão geral" (/ecommerce) entra sozinha antes das seções.
      tabs: [
        { label: "Pedidos", href: "/ecommerce/pedidos" },
        { label: "Produtos", href: "/ecommerce/produtos" },
        { label: "Categorias", href: "/ecommerce/categorias" },
        { label: "Opções", href: "/ecommerce/opcoes" },
        { label: "Coleções", href: "/ecommerce/colecoes" },
        { label: "Menu do site", href: "/ecommerce/menu" },
        { label: "Cupons", href: "/ecommerce/cupons" },
        { label: "Clientes", href: "/ecommerce/clientes" },
        { label: "Carrinhos abandonados", href: "/ecommerce/carrinhos" },
        { label: "Avaliações", href: "/ecommerce/avaliacoes" },
      ],
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
      soon: {
        description: "Tecidos e aviamentos com quantidade, fornecedor e aviso de reposição.",
        features: ["Entradas e saídas por pedido", "Aviso de estoque baixo", "Cadastro de fornecedores"],
      },
      tabs: [
        { label: "Materiais", href: "/estoque/materiais" },
        { label: "Movimentações", href: "/estoque/movimentacoes" },
      ],
    },
    {
      label: "Financeiro",
      href: "/financeiro",
      icon: WalletIcon,
      soon: {
        description: "Contas a receber e a pagar, fluxo de caixa e o resultado de cada pedido.",
        features: ["Recebimentos por pedido e parcela", "Contas a pagar com vencimento", "Fluxo de caixa do mês"],
      },
      tabs: [
        { label: "Contas a receber", href: "/financeiro/receber" },
        { label: "Contas a pagar", href: "/financeiro/pagar" },
        { label: "Fluxo de caixa", href: "/financeiro/fluxo-de-caixa" },
      ],
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
        { label: "Fotos e vídeos", href: "/configuracoes/midia" },
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
