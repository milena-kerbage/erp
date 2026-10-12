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
    },
    {
      label: "Orçamentos",
      href: "/orcamentos",
      icon: CalculatorIcon,
    },
    {
      label: "Pedidos",
      href: "/pedidos",
      icon: ClipboardTextIcon,
      tabs: [
        { label: "Em andamento", href: "/pedidos/em-andamento" },
        { label: "Finalizados", href: "/pedidos/finalizados" },
      ],
    },
    {
      label: "Catálogo",
      href: "/catalogo",
      icon: BookOpenTextIcon,
    },
    {
      label: "Produção",
      href: "/producao",
      icon: KanbanIcon,
    },
    {
      label: "Estoque",
      href: "/estoque",
      icon: PackageIcon,
      tabs: [
        { label: "Materiais", href: "/estoque/materiais" },
        { label: "Movimentações", href: "/estoque/movimentacoes" },
      ],
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
    },
    {
      label: "Relatórios",
      href: "/relatorios",
      icon: ChartLineUpIcon,
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
    },
    { label: "Preferências", href: "/configuracoes/preferencias", icon: ToggleLeftIcon },
  ],
  support: [
    {
      label: "Central de ajuda",
      href: "/ajuda",
      icon: InfoIcon,
    },
  ],
} as const satisfies Record<string, readonly NavModule[]>;
