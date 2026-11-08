import { Montador } from "@/loja/componentes/casas/Montador";
import { pecasParecidas, sugestoesDoMontador } from "@/loja/componentes/casas/dadosMontador";
import { JsonLd } from "@/loja/componentes/seo/JsonLd";
import { schemaTrilhaProjetos } from "@/loja/lib/seo/projetos";

// "Monte o seu quartinho": o quartinho personalizado, peça por peça, com uma página por etapa
// (/personalizado/monte-o-seu/<etapa>, ver lib/casas/etapas.ts). O layout guarda o montador (estado do
// quartinho, progresso, resumo lateral, barra do celular, modais) e não remonta entre as etapas; cada
// página só diz qual etapa mostrar. Regras em lib/casas/modulos.ts; componentes em casas/Montador.tsx.
export default function LayoutMonteOSeu({ children }: LayoutProps<"/loja/personalizado/monte-o-seu">) {
  return (
    <>
      <JsonLd
        dados={schemaTrilhaProjetos([
          { rotulo: "Personalizado", href: "/personalizado" },
          { rotulo: "Monte o seu quartinho", href: "/personalizado/monte-o-seu" },
        ])}
      />
      <Montador sugestoes={sugestoesDoMontador()} parecidas={pecasParecidas()}>
        {children}
      </Montador>
    </>
  );
}
