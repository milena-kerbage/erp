"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { LogoInstagram, LogoWhatsApp } from "@/components/brand/LogosCanais";
import { Tooltip } from "@/components/ui/Tooltip";
import { useUnreadConversations } from "@/features/leads/store";
import { useInstagramUnread } from "@/features/whatsapp/unread";

/** Troca entre os chats do WhatsApp e do Instagram, no topo das duas listas: só as logos, com as não lidas de cada um. */
export function TrocaCanal({ atual }: { atual: "whatsapp" | "instagram" }) {
  const whatsapp = useUnreadConversations(), instagram = useInstagramUnread();
  const canais = [
    { id: "whatsapp", rotulo: "WhatsApp", href: "/conversas", Logo: LogoWhatsApp, naoLidas: whatsapp },
    { id: "instagram", rotulo: "Instagram", href: "/instagram", Logo: LogoInstagram, naoLidas: instagram },
  ] as const;
  return (
    <Trilho role="tablist" aria-label="Canal de atendimento">
      {canais.map(({ id, rotulo, href, Logo, naoLidas }) => (
        <Tooltip key={id} label={naoLidas ? `${rotulo} · ${naoLidas} não lidas` : rotulo} side="bottom">
          <Link href={href} role="tab" aria-selected={atual === id} data-ativo={atual === id || undefined} aria-label={naoLidas ? `${rotulo}, ${naoLidas} não lidas` : rotulo}>
            <Logo size={22} />
            {naoLidas > 0 && atual !== id && <b>{naoLidas > 99 ? "99+" : naoLidas}</b>}
          </Link>
        </Tooltip>
      ))}
    </Trilho>
  );
}

const Trilho = styled.div`
  display: inline-flex;
  gap: 4px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.palette.neutral[100]};
  a {
    position: relative;
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: ${({ theme }) => theme.radii.full};
    opacity: 0.7;
    filter: saturate(0.75);
    transition: opacity 0.15s ease, filter 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
  }
  a:hover { opacity: 1; filter: none; background: ${({ theme }) => theme.palette.neutral[50]}; }
  a:active { transform: scale(0.94); }
  a[data-ativo] { opacity: 1; filter: none; background: ${({ theme }) => theme.palette.neutral[0]}; box-shadow: 0 1px 3px rgb(0 0 0 / 0.1); }
  a:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.primary.main}; outline-offset: 1px; }
  b {
    position: absolute;
    top: -2px;
    right: -3px;
    min-width: 1rem;
    padding: 0 4px;
    border-radius: ${({ theme }) => theme.radii.full};
    border: 2px solid ${({ theme }) => theme.palette.neutral[100]};
    background: ${({ theme }) => theme.colors.danger};
    color: #fff;
    font-size: 0.625rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    line-height: 0.875rem;
    text-align: center;
  }
  @media (prefers-reduced-motion: reduce) { a { transition: none; } }
`;
