"use client";

import { useState } from "react";
import styled from "@emotion/styled";
import { ArrowRightIcon, BellRingingIcon, CheckIcon, LockSimpleIcon, SparkleIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { allModules, firstAvailableHref } from "@/lib/navigation";
import { staggerChildren } from "@/styles/animations";

const Root = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing(8, 6)};
`;

const Card = styled.section`
  ${staggerChildren(5, 60)};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(4)};
  max-width: 30rem;
  text-align: center;
`;

/** Ícone do módulo com um cadeado no canto. */
const Tile = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LockBadge = styled.span`
  position: absolute;
  right: -6px;
  bottom: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  border: 2px solid ${({ theme }) => theme.colors.background.surface};
  border-radius: 50%;
  background-color: ${({ theme }) => theme.tones.peach.soft};
  color: ${({ theme }) => theme.tones.peach.fg};
`;

const Texts = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};

  h2 {
    font-size: ${({ theme }) => theme.fontSizes.xl};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  p {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    line-height: 1.6;
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const Features = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  width: 100%;
  padding: ${({ theme }) => theme.spacing(4)};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radii.lg};
  background-color: ${({ theme }) => theme.palette.neutral[0]};
  text-align: left;

  li {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2.5)};
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  svg {
    flex-shrink: 0;
    color: ${({ theme }) => theme.tones.peach.fg};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing(2)};
`;

/**
 * Tela dos módulos ainda em produção: explica o que vem e bloqueia o acesso
 * (as telas são liberadas aos poucos, conforme o plano).
 */
export function LockedModule({ href }: { href: string }) {
  const locked = allModules.find((item) => item.href === href);
  const [notify, setNotify] = useState(false);
  if (!locked?.soon) return null;

  const available = allModules.find((item) => item.href === firstAvailableHref);

  return (
    <Root>
      <Card aria-labelledby="locked-title">
        <Tile aria-hidden>
          <locked.icon size={28} />
          <LockBadge>
            <LockSimpleIcon size={12} weight="fill" />
          </LockBadge>
        </Tile>

        <Texts>
          <Badge tone="peach">Produção</Badge>
          <h2 id="locked-title">{locked.label} está em produção</h2>
          <p>{locked.soon.description}</p>
        </Texts>

        <Features aria-label="O que vem neste módulo">
          {locked.soon.features.map((feature) => (
            <li key={feature}>
              <SparkleIcon size={15} weight="fill" aria-hidden />
              {feature}
            </li>
          ))}
        </Features>

        <Actions>
          {available && (
            <Button href={available.href} iconEnd={ArrowRightIcon}>
              Ir para {available.label}
            </Button>
          )}
          <Button
            variant="secondary"
            icon={notify ? CheckIcon : BellRingingIcon}
            aria-pressed={notify}
            onClick={() => setNotify(true)}
          >
            {notify ? "Aviso ativado" : "Avisar quando lançar"}
          </Button>
        </Actions>
      </Card>
    </Root>
  );
}
