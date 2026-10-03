import { PageTransition } from "@/components/layout/PageTransition";

/** Transição também entre o quadro e a oportunidade (mesmo segmento /leads). */
export default function LeadsTemplate({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
