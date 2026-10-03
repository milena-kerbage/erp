"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { FilterBarButton } from "@/components/ui/FilterBar";
import { IconTile } from "@/components/ui/IconTile";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/Menu";
import { useFunnels } from "@/features/settings/store";

type FunnelSelectProps = {
  funnelId?: string;
  /** "toolbar": botão compacto (ícone do funil + seta) ao lado dos filtros, no celular. */
  variant?: "header" | "toolbar";
};

/**
 * Troca o funil exibido, no mesmo padrão do menu da conta. O funil fica na
 * URL (?funil=...), então o link pode ser compartilhado e sobrevive ao
 * recarregar.
 */
export function FunnelSelect({ funnelId, variant = "header" }: FunnelSelectProps) {
  const { funnels, findFunnel } = useFunnels();
  const current = findFunnel(funnelId);

  return (
    <Menu
      label="Escolher funil"
      align="end"
      width="16.5rem"
      trigger={(props) =>
        variant === "toolbar" ? (
          <FilterBarButton type="button" {...props} aria-label={`Funil: ${current.name}. Trocar funil`}>
            <IconTile icon={current.icon} tone={current.tone} size="sm" />
            <CaretDownIcon size={11} weight="bold" aria-hidden />
          </FilterBarButton>
        ) : (
          <Button
            {...props}
            variant="secondary"
            icon={<IconTile icon={current.icon} tone={current.tone} size="sm" />}
            iconEnd={CaretDownIcon}
            aria-label={`Funil: ${current.name}. Trocar funil`}
            // Celular: o header mantém o nome do funil (os outros botões viram só ícone)
            data-keep-label=""
          >
            {current.name}
          </Button>
        )
      }
    >
      <MenuLabel>Funis</MenuLabel>
      {funnels.map((funnel) => (
        <MenuItem
          key={funnel.id}
          href={`/leads?funil=${funnel.id}`}
          leading={<IconTile icon={funnel.icon} tone={funnel.tone} />}
          meta={`${funnel.stages.length} etapas`}
          selected={funnel.id === current.id}
        >
          {funnel.name}
        </MenuItem>
      ))}
    </Menu>
  );
}
