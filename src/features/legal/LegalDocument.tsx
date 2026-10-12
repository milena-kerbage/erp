import type { ReactNode } from 'react';
import Link from 'next/link';
import { LEGAL_LINKS, POLICY_DATE, POLICY_VERSION, legalIdentity } from './config';
import styles from './legal.module.css';

export type LegalSection = { id: string; title: string; content: ReactNode };

export async function LegalContact({ privacy = false }: { privacy?: boolean }) {
  const identity = await legalIdentity();
  const contact = privacy ? identity.privacyEmail : identity.supportEmail;
  if (contact) return <a href={`mailto:${contact}`}>{contact}</a>;
  if (identity.whatsappPhone) return <a href={`https://wa.me/${identity.whatsappPhone}`}>WhatsApp oficial do Ateliê</a>;
  return <span>Canal eletrônico de {privacy ? 'privacidade' : 'suporte'} em configuração. Envie correspondência a {identity.entity}, {identity.address}, ou solicite atendimento diretamente ao Ateliê pelo canal que já utiliza.</span>;
}

export async function LegalIdentity() {
  const identity = await legalIdentity();
  return <>
    <dl className={styles.identity}>
      <div><dt>Nome comercial</dt><dd>{identity.brand}</dd></div>
      <div><dt>Responsável pelo tratamento</dt><dd>{identity.entity || 'Identificação jurídica pendente de publicação'}</dd></div>
      <div><dt>CNPJ</dt><dd>{identity.cnpj || 'Pendente de publicação'}</dd></div>
      <div><dt>Endereço</dt><dd>{identity.address || 'Pendente de publicação'}</dd></div>
      <div><dt>Privacidade e direitos</dt><dd><LegalContact privacy /></dd></div>
      <div><dt>Atendimento</dt><dd><LegalContact /></dd></div>
    </dl>
    {(!identity.privacyEmail || !identity.supportEmail) && <aside className={styles.notice}>
      <strong>Canais eletrônicos em configuração.</strong> Os dados empresariais foram informados pelo responsável pelo projeto. Os canais de privacidade e suporte precisam ser completados e verificados antes do uso real e da apresentação desta instalação à Meta. Até lá, está disponível o endereço para correspondência acima.
    </aside>}
  </>;
}

export function LegalDocument({ title, summary, sections }: { title: string; summary: string; sections: LegalSection[] }) {
  return <article className={styles.document}>
    <header className={styles.intro}>
      <Link href="/politicas" className={styles.back}>← Central de políticas</Link>
      <p className={styles.eyebrow}>TRANSPARÊNCIA E DIREITOS</p>
      <h1>{title}</h1>
      <p className={styles.summary}>{summary}</p>
      <p className={styles.version}>Versão {POLICY_VERSION} · Atualizado em {POLICY_DATE}</p>
    </header>
    <nav className={styles.contents} aria-label="Conteúdo deste documento">
      <strong>Neste documento</strong>
      <ol>{sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
    </nav>
    <div className={styles.sections}>{sections.map((section, index) => <section id={section.id} key={section.id} className={styles.section}>
      <h2><span>{String(index + 1).padStart(2, '0')}</span>{section.title}</h2>
      {section.content}
    </section>)}</div>
    <footer className={styles.documentFooter}>
      <p>Consulte também</p>
      <nav aria-label="Outras políticas">{LEGAL_LINKS.map((link) => <Link href={link.href} key={link.href}>{link.title}</Link>)}</nav>
    </footer>
  </article>;
}

export function LegalTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return <div className={styles.tableWrap}><table><thead><tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
  </table></div>;
}
