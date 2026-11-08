import Link from 'next/link';
import { LEGAL_LINKS, POLICY_DATE } from '@/features/legal/config';
import { LegalIdentity } from '@/features/legal/LegalDocument';
import styles from '@/features/legal/legal.module.css';

export const metadata = { title: 'Central de políticas', description: 'Privacidade, termos, cookies, direitos e regras de comunicação do Ateliê Milena Kerbage.' };

export default function PoliciesPage() {
  return <div className={styles.home}>
    <p className={styles.eyebrow}>ATELIÊ MILENA KERBAGE</p>
    <h1>Privacidade e transparência</h1>
    <p className={styles.summary}>Saiba como usamos informações no atendimento e no sistema de gestão, escolha como deseja receber mensagens e encontre os meios para exercer seus direitos.</p>
    <p className={styles.version}>Documentos atualizados em {POLICY_DATE}</p>
    <div className={styles.cards}>{LEGAL_LINKS.map((link) => <Link href={link.href} key={link.href} className={styles.card}>
      <h2>{link.title}</h2><p>{link.description}</p><span>Ler documento →</span>
    </Link>)}</div>
    <section className={styles.section}><h2>Identificação e contato</h2><LegalIdentity /></section>
  </div>;
}
