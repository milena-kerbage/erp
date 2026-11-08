import Link from "next/link";
import { css, cx } from "styled-system/css";
import { botao } from "styled-system/recipes";

// 404 real (status 404, nunca redirecionar para a home: seo.md §2.6 e publicacao.md §5).
export default function NaoEncontrada() {
  return (
    <main className={css({ minH: "dvh", display: "grid", placeItems: "center", p: "6", textAlign: "center" })}>
      <div>
        <p className={css({ fontSize: "sm", fontWeight: "semibold", color: "textoSuave" })}>Erro 404</p>
        <h1 className={css({ mt: "2", fontSize: "3xl", fontWeight: "extrabold" })}>Página não encontrada</h1>
        <p className={css({ mt: "3", color: "textoSuave" })}>O endereço pode ter mudado ou a peça não está mais disponível.</p>
        <Link href="/" className={cx(botao({ tamanho: "m" }), css({ mt: "8" }))}>
          Ir para a página inicial
        </Link>
      </div>
    </main>
  );
}
