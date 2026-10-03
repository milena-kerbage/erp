import { PageTransition } from "@/components/layout/PageTransition";

/** Cada página entra com uma transição suave (o template remonta ao navegar). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
