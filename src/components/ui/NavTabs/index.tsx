"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isPathActive } from "@/lib/navigation";
import { List, Tab } from "./styles";

export type NavTabItem = {
  label: string;
  href: string;
};

type NavTabsProps = {
  items: readonly NavTabItem[];
  /** Nome do landmark de navegação para leitores de tela. */
  label: string;
  /** Elemento antes das abas (ex.: botão de visão geral). */
  start?: ReactNode;
  className?: string;
};

/** Navegação em pílulas; a aba ativa é definida pela URL atual. */
export function NavTabs({ items, label, start, className }: NavTabsProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className={className}>
      <List>
        {start && <li>{start}</li>}
        {items.map((item) => {
          const active = isPathActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Tab
                href={item.href}
                $active={active}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Tab>
            </li>
          );
        })}
      </List>
    </nav>
  );
}
