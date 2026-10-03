import { PageTransition } from "@/components/layout/PageTransition";

/** Só o conteúdo da seção entra animado (o menu das configurações fica parado). */
export default function SettingsTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition fill={false}>{children}</PageTransition>;
}
