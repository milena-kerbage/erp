"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { LogoInstagram, LogoWhatsApp } from "@/components/brand/LogosCanais";
import { useUnreadConversations } from "@/features/leads/store";
import { useInstagramUnread } from "@/features/whatsapp/unread";

/** Troca entre os chats do WhatsApp e do Instagram, no topo das duas listas, com a logo e as não lidas de cada um. */
export function TrocaCanal({ atual }: { atual: "whatsapp" | "instagram" }) {
  const whatsapp = useUnreadConversations(), instagram = useInstagramUnread();
  const canais = [
    { id: "whatsapp", rotulo: "WhatsApp", href: "/conversas", Logo: LogoWhatsApp, naoLidas: whatsapp },
    { id: "instagram", rotulo: "Instagram", href: "/instagram", Logo: LogoInstagram, naoLidas: instagram },
  ] as const;
  return (
    <Trilho role="tablist" aria-label="Canal de atendimento">
      {canais.map(({ id, rotulo, href, Logo, naoLidas }) => (
        <Link key={id} href={href} role="tab" aria-selected={atual === id} data-ativo={atual === id || undefined} aria-label={naoLidas ? `${rotulo}, ${naoLidas} não lidas` : rotulo}>
          <Logo size={18} />
          <span>{rotulo}</span>
          {naoLidas > 0 && <b>{naoLidas > 99 ? "99+" : naoLidas}</b>}
        </Link>
      ))}
    </Trilho>
  );
}

const Trilho = styled.div`
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radii.full};
  background: ${({ theme }) => theme.palette.neutral[100]};
  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px 5px 9px;
    border-radius: ${({ theme }) => theme.radii.full};
    font-size: 0.875rem;
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.secondary};
    text-decoration: none;
    white-space: nowrap;
    transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  }
  a:hover { color: ${({ theme }) => theme.colors.text.primary}; }
  a[data-ativo] { background: ${({ theme }) => theme.palette.neutral[0]}; color: ${({ theme }) => theme.colors.text.primary}; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
  b {
    min-width: 1.125rem;
    padding: 0 5px;
    border-radius: ${({ theme }) => theme.radii.full};
    background: ${({ theme }) => theme.colors.primary.main};
    color: #fff;
    font-size: 0.6875rem;
    line-height: 1.125rem;
    text-align: center;
  }
`;
