import type { ReactNode } from 'react';
import Link from 'next/link';
import styles from '@/features/legal/legal.module.css';

export default function LegalLayout({ children }: { children: ReactNode }) {
  return <div className={styles.shell}>
    <a href="#conteudo-politicas" className={styles.skip}>Ir para o conteúdo</a>
    <header className={styles.topbar}>
      <Link href="/politicas" className={styles.brand}>Ateliê Milena Kerbage</Link>
      <Link href="/login">Acessar o sistema</Link>
    </header>
    <main className={styles.main} id="conteudo-politicas" tabIndex={-1}>{children}</main>
    <footer className={styles.footer}>Ateliê Milena Kerbage · Atendimento, privacidade e transparência<br />As políticas se aplicam ao sistema e aos canais de atendimento descritos em cada documento.</footer>
  </div>;
}
