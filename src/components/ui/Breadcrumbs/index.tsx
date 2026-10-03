"use client";

import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { Current, CrumbLink, CrumbSwitcher, Item, List } from "./styles";

export type BreadcrumbLink = {
  label: string;
  href: string;
  active?: boolean;
};

export type BreadcrumbItem = BreadcrumbLink & {
  /** Opções para trocar de seção a partir deste nível da trilha. */
  sections?: readonly BreadcrumbLink[];
};

type BreadcrumbsProps = {
  /** Do mais geral ao mais específico; o último é a página atual. */
  items: readonly BreadcrumbItem[];
  className?: string;
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Trilha de navegação" className={className}>
      <List>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <Item key={`${index}-${item.href}`}>
              {index > 0 && <CaretRightIcon size={10} weight="bold" aria-hidden />}

              {item.sections ? (
                <Menu
                  label={`Seções de ${item.label}`}
                  side="bottom"
                  align="start"
                  width="13.5rem"
                  trigger={(props) => (
                    <CrumbSwitcher type="button" {...props}>
                      {isLast ? <Current>{item.label}</Current> : item.label}
                      <CaretDownIcon size={10} weight="bold" aria-hidden />
                    </CrumbSwitcher>
                  )}
                >
                  {item.sections.map((section) => (
                    <MenuItem key={section.href} href={section.href} selected={section.active}>
                      {section.label}
                    </MenuItem>
                  ))}
                </Menu>
              ) : isLast ? (
                <Current aria-current="page">{item.label}</Current>
              ) : (
                <CrumbLink href={item.href}>{item.label}</CrumbLink>
              )}
            </Item>
          );
        })}
      </List>
    </nav>
  );
}
