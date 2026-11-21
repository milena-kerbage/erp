"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  CaretDownIcon, ChatCircleTextIcon, ClipboardTextIcon, CodeIcon, FolderSimpleIcon, FunnelIcon, ImagesIcon, ListIcon, LockSimpleIcon, PackageIcon, PersonArmsSpreadIcon, PlugsIcon,
  ShoppingCartIcon, SlidersHorizontalIcon, SquaresFourIcon, StackIcon, StarIcon, TicketIcon, ToggleLeftIcon, UserCircleIcon, UsersIcon, UsersThreeIcon, type Icon,
} from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/Dialog";
import { navigation, type NavModule } from "@/config/navigation";
import { isPathActive } from "@/lib/navigation";

type Opcao = { href: string; rotulo: string; icone?: ReactNode; ativo: boolean; pendentes?: number; bloqueado?: boolean };

// Ícone de cada seção dos módulos (E-commerce e Configurações): toda opção do menu tem o seu.
const ICONE_DA_SECAO: Record<string, Icon> = {
  "/ecommerce": SquaresFourIcon,
  "/ecommerce/pedidos": ClipboardTextIcon,
  "/ecommerce/produtos": PackageIcon,
  "/ecommerce/categorias": FolderSimpleIcon,
  "/ecommerce/opcoes": SlidersHorizontalIcon,
  "/ecommerce/colecoes": StackIcon,
  "/ecommerce/menu": ListIcon,
  "/ecommerce/cupons": TicketIcon,
  "/ecommerce/clientes": UsersIcon,
  "/ecommerce/carrinhos": ShoppingCartIcon,
  "/ecommerce/avaliacoes": StarIcon,
  "/configuracoes/usuarios": UsersThreeIcon,
  "/configuracoes/funis": FunnelIcon,
  "/configuracoes/preferencias": ToggleLeftIcon,
  "/configuracoes/perfil": UserCircleIcon,
  "/configuracoes/acessibilidade": PersonArmsSpreadIcon,
  "/configuracoes/integracoes": PlugsIcon,
  "/configuracoes/midia": ImagesIcon,
  "/configuracoes/api": CodeIcon,
};
type Grupo = { id: string; titulo: string; opcoes: Opcao[]; pendentes?: number };

/**
 * Menu completo num painel que entra pela direita, no padrão da gaveta de filtros da loja: título grande, o fechar
 * redondo e os grupos em sanfona (fechados de início; abrir um fecha o outro), separados por uma linha. Toda opção
 * tem o seu ícone. Os grupos: Principal,
 * Atendimento (com as conversas não lidas), cada módulo que tem seções (E-commerce, Configurações) e os módulos em
 * produção. Clicar numa opção leva à tela e fecha o painel.
 */
export function MenuLateral({ aberto, onClose, naoLidas }: { aberto: boolean; onClose: () => void; naoLidas: Record<string, number> }) {
  const pathname = usePathname();
  // Um grupo aberto por vez: abrir um fecha o outro.
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);

  const liberados: readonly NavModule[] = navigation.main.filter((item) => !("soon" in item));
  const emProducao: readonly NavModule[] = navigation.main.filter((item) => "soon" in item);
  const icone = (modulo: NavModule, ativo: boolean) => { const Icone = modulo.icon; return <Icone size={18} weight={ativo ? "fill" : "regular"} aria-hidden />; };
  const doModulo = (modulo: NavModule, extra: Partial<Opcao> = {}): Opcao => {
    const ativo = isPathActive(pathname, modulo.href);
    return { href: modulo.href, rotulo: modulo.label, icone: icone(modulo, ativo), ativo, pendentes: naoLidas[modulo.href], ...extra };
  };
  const daSecao = (href: string, rotulo: string, ativo: boolean): Opcao => {
    const Icone = ICONE_DA_SECAO[href] ?? ChatCircleTextIcon;
    return { href, rotulo, ativo, icone: <Icone size={18} weight={ativo ? "fill" : "regular"} aria-hidden /> };
  };
  // Módulo com seções vira um grupo próprio: a "Visão geral" (quando existe) e as seções dele.
  const comSecoes = (modulo: NavModule): Grupo => ({
    id: modulo.href,
    titulo: modulo.label,
    opcoes: [
      ...(modulo.overview === false ? [] : [daSecao(modulo.href, "Visão geral", pathname === modulo.href)]),
      ...(modulo.tabs ?? []).map((secao) => daSecao(secao.href, secao.label, isPathActive(pathname, secao.href))),
    ],
  });

  const canais = liberados.filter((modulo) => modulo.href in naoLidas);
  const grupos: Grupo[] = [
    { id: "principal", titulo: "Principal", opcoes: liberados.filter((modulo) => !(modulo.href in naoLidas) && !modulo.tabs?.length).map((modulo) => doModulo(modulo)) },
    { id: "atendimento", titulo: "Atendimento", opcoes: canais.map((modulo) => doModulo(modulo)), pendentes: canais.reduce((soma, modulo) => soma + (naoLidas[modulo.href] ?? 0), 0) },
    ...liberados.filter((modulo) => modulo.tabs?.length).map(comSecoes),
    ...navigation.secondary.map((modulo: NavModule) => (modulo.tabs?.length ? comSecoes(modulo) : { id: modulo.href, titulo: modulo.label, opcoes: [doModulo(modulo)] })),
    { id: "producao", titulo: "Em produção", opcoes: emProducao.map((modulo) => doModulo(modulo, { bloqueado: true })) },
  ].filter((grupo) => grupo.opcoes.length > 0);

  return (
    <Dialog open={aberto} onClose={onClose} side="right" title="Menu" width="22.5rem">
      <Lista aria-label="Menu completo">
        {grupos.map((grupo) => {
          const expandido = grupoAberto === grupo.id;
          const aqui = grupo.opcoes.some((opcao) => opcao.ativo);
          return (
            <section key={grupo.id} data-aqui={aqui || undefined}>
              <button type="button" className="titulo" aria-expanded={expandido} aria-controls={`menu-${grupo.id}`} onClick={() => setGrupoAberto(expandido ? null : grupo.id)}>
                <span>
                  {grupo.titulo}
                  {aqui && <i aria-label="você está aqui" />}
                </span>
                {Boolean(grupo.pendentes) && !expandido && <b aria-label={`${grupo.pendentes} não lidas`}>{grupo.pendentes! > 99 ? "99+" : grupo.pendentes}</b>}
                <CaretDownIcon className="seta" size={18} aria-hidden />
              </button>
              {expandido && (
                <ul id={`menu-${grupo.id}`}>
                  {grupo.opcoes.map((opcao) => (
                    <li key={opcao.href}>
                      <Link href={opcao.href} data-ativo={opcao.ativo || undefined} data-bloqueado={opcao.bloqueado || undefined} aria-current={opcao.ativo ? "page" : undefined} onClick={onClose}>
                        {opcao.icone && <span className="icone">{opcao.icone}</span>}
                        <span className="rotulo">{opcao.rotulo}</span>
                        {Boolean(opcao.pendentes) && <b aria-label={`${opcao.pendentes} não lidas`}>{opcao.pendentes! > 99 ? "99+" : opcao.pendentes}</b>}
                        {opcao.bloqueado && <LockSimpleIcon className="cadeado" size={13} weight="fill" aria-label="em produção" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </Lista>
    </Dialog>
  );
}

const Lista = styled.nav`
  display: flex;
  flex-direction: column;
  margin: 0 ${({ theme }) => theme.spacing(1)};

  /* Cada grupo é uma sanfona com a linha embaixo, como os filtros da loja */
  section {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  }
  section:last-of-type {
    border-bottom: 0;
  }

  .titulo {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2.5)};
    width: 100%;
    padding: ${({ theme }) => theme.spacing(4, 0)};
    font: inherit;
    font-size: 1.25rem;
    font-weight: ${({ theme }) => theme.fontWeights.regular};
    letter-spacing: -0.02em;
    line-height: 1.2;
    color: ${({ theme }) => theme.colors.text.primary};
    text-align: left;
    cursor: pointer;
  }
  .titulo > span {
    display: inline-flex;
    flex: 1;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(2)};
    min-width: 0;
  }
  .titulo:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary.main};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
  /* O grupo da tela atual leva um ponto ao lado do nome */
  .titulo i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary.main};
  }
  .seta {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.secondary};
    transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .titulo[aria-expanded="true"] .seta {
    transform: rotate(180deg);
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0 0 ${({ theme }) => theme.spacing(4)};
    display: flex;
    flex-direction: column;
    gap: 2px;
    animation: grupo-abre 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes grupo-abre {
    from { opacity: 0; transform: translateY(-4px); }
  }
  @media (prefers-reduced-motion: reduce) {
    ul { animation: none; }
    .seta { transition: none; }
  }

  a {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.spacing(3)};
    min-height: 2.25rem;
    margin: 0 -${({ theme }) => theme.spacing(2.5)};
    padding: ${({ theme }) => theme.spacing(1.5, 2.5)};
    border-radius: ${({ theme }) => theme.radii.md};
    font-size: 0.9375rem;
    color: ${({ theme }) => theme.colors.text.secondary};
    text-decoration: none;
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  a:hover,
  a:focus-visible {
    background: ${({ theme }) => theme.colors.interactive.hover};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  a:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary.main};
    outline-offset: -2px;
  }
  a[data-ativo] {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }
  a[data-bloqueado] {
    color: ${({ theme }) => theme.colors.text.muted};
  }

  .icone {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 1.25rem;
  }
  .rotulo {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .cadeado {
    flex-shrink: 0;
    color: ${({ theme }) => theme.colors.text.muted};
  }

  b {
    flex-shrink: 0;
    min-width: 1.25rem;
    padding: 0 6px;
    border-radius: 999px;
    background: ${({ theme }) => theme.colors.danger};
    color: #fff;
    font-size: 0.6875rem;
    font-weight: ${({ theme }) => theme.fontWeights.bold};
    letter-spacing: 0;
    line-height: 1.25rem;
    text-align: center;
  }
`;
