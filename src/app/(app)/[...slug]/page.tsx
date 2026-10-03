import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockedModule } from "@/components/layout/LockedModule";
import { findLockedModule } from "@/lib/navigation";

/**
 * Responde pelas rotas dos módulos ainda em produção (`soon` no menu),
 * inclusive as seções deles: mostra a tela de bloqueio. Rotas fora do menu
 * retornam 404. Ao criar a tela de verdade (ex.: app/(app)/agenda/page.tsx)
 * e tirar o `soon`, ela tem prioridade sobre esta.
 */

async function resolve(params: PageProps<"/[...slug]">["params"]) {
  const { slug } = await params;
  const pathname = `/${slug.join("/")}`;
  const locked = findLockedModule(pathname);
  if (!locked) return undefined;

  // Só rotas que existem no menu (o módulo ou uma das seções)
  const known = locked.href === pathname || locked.tabs?.some((tab) => tab.href === pathname);
  return known ? locked : undefined;
}

export async function generateMetadata({ params }: PageProps<"/[...slug]">): Promise<Metadata> {
  const locked = await resolve(params);
  return { title: locked?.label };
}

export default async function LockedPage({ params }: PageProps<"/[...slug]">) {
  const locked = await resolve(params);
  if (!locked) notFound();

  return <LockedModule href={locked.href} />;
}
