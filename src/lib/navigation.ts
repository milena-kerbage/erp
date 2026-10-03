import { navigation, type NavModule } from "@/config/navigation";

export type CrumbLink = {
  label: string;
  href: string;
  active?: boolean;
};

export type Crumb = CrumbLink & {
  /** Seções do módulo: a trilha vira um seletor para trocar de seção. */
  sections?: CrumbLink[];
};

/**
 * Indica se `href` corresponde à rota atual.
 * `exact` exige igualdade; caso contrário, também casa com sub-rotas
 * (ex.: "/pedidos" fica ativo em "/pedidos/123").
 */
export function isPathActive(pathname: string, href: string, exact = false) {
  if (href === "/" || exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Todas as rotas do menu (módulos, conta e ajuda). */
export const allModules: readonly NavModule[] = [
  ...navigation.main,
  ...navigation.secondary,
  ...navigation.account,
  ...navigation.support,
];

const home = allModules.find((item) => item.href === "/");

/** Primeira tela liberada do menu (para onde a logo e os atalhos levam). */
export const firstAvailableHref =
  (navigation.main as readonly NavModule[]).find((item) => !item.soon)?.href ?? "/";

/** Módulo em produção (bloqueado) ao qual a rota pertence, se houver. */
export function findLockedModule(pathname: string) {
  const current = findModule(pathname);
  return current?.soon ? current : undefined;
}

/** Módulo ao qual a rota atual pertence. */
export function findModule(pathname: string) {
  return allModules.find((item) => isPathActive(pathname, item.href));
}

/** Trilha da rota atual: Painel › módulo › seção. O último item é a página atual. */
export function getBreadcrumbs(pathname: string): Crumb[] {
  const trail: Crumb[] = home ? [{ label: home.label, href: home.href }] : [];
  const current = findModule(pathname);

  if (current && current !== home) {
    const sections = current.tabs && [
      ...(current.overview === false
        ? []
        : [{ label: "Visão geral", href: current.href, active: pathname === current.href }]),
      ...current.tabs.map((item) => ({
        label: item.label,
        href: item.href,
        active: isPathActive(pathname, item.href),
      })),
    ];

    trail.push({ label: current.label, href: current.href, sections });

    const tab = current.tabs?.find((item) => isPathActive(pathname, item.href));
    if (tab) trail.push({ label: tab.label, href: tab.href });
  }

  return trail;
}
