// Teste CRUD de ponta a ponta com o código real do ERP (src/lib/erp/core.ts) contra o banco de DATABASE_URL.
// Cada fase roda em um PROCESSO NOVO (simula reiniciar a aplicação) e usa só dados identificáveis:
//   escrever  → cria um lead "[TESTE-INTEGRACAO]", muda de etapa e registra uma nota
//   verificar → lê em outro processo (persistência), arquiva (exclusão lógica do app) e confere os filtros
//   limpar    → remove do banco SOMENTE o lead de teste, suas notas e os eventos de auditoria do ator de teste
// Observação: a primeira chamada do ERP cria a configuração inicial (1 linha em workspace_settings + 3 funis) se o banco
// estiver vazio. Esse é o comportamento normal do app no primeiro acesso e essas linhas NÃO são removidas.
//
//   npm run db:crud -- --confirm=ESCREVER-DADOS-DE-TESTE
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { closeDatabases } from '../src/lib/database.ts';
import { addNote, archiveLead, createLead, erpDB, getLead, initializeERP, leadsSnapshot, updateLead } from '../src/lib/erp/core.ts';

const actor = { id: 'teste-integracao', name: 'Teste de integração', email: 'teste-integracao@example.invalid', permission: 'admin' };
const noteText = 'Nota de teste de integração (será removida).';
const phase = process.argv.find(argument => argument.startsWith('--phase='))?.slice(8);
const leadId = process.argv.find(argument => argument.startsWith('--lead='))?.slice(7);

async function write() {
  await initializeERP();
  const created = await createLead({ lead: { name: '[TESTE-INTEGRACAO] Lead temporário', phone: '85900000000', budget: 1234, funnelId: 'vendas', stage: 'novo', tags: ['teste-integracao'] } }, actor);
  const id = created.lead.id;
  assert.equal(created.lead.revision, 1);
  await updateLead(id, { revision: 1, lead: { stage: 'contato' } }, actor);
  await addNote(id, { text: noteText }, actor);
  const snapshot = await leadsSnapshot();
  assert.ok(snapshot.leads.some(lead => lead.id === id), 'lead criado precisa aparecer na listagem');
  console.log(`LEAD=${id}`);
}

async function verify() {
  const found = await getLead(leadId);
  assert.equal(found.lead.stage, 'contato', 'a mudança de etapa precisa ter persistido');
  assert.equal(found.lead.name, '[TESTE-INTEGRACAO] Lead temporário');
  assert.equal(found.lead.revision, 2, 'a revisão precisa refletir a edição');
  assert.ok(found.messages.some(message => message.text === noteText), 'a nota precisa ter persistido');
  assert.ok(found.details.history.length >= 2, 'o histórico precisa registrar criação e mudança de etapa');
  assert.ok((await leadsSnapshot()).leads.some(lead => lead.id === leadId), 'lead precisa estar na listagem ativa');
  await archiveLead(leadId, found.lead.revision, actor);
  assert.ok(!(await leadsSnapshot()).leads.some(lead => lead.id === leadId), 'lead arquivado não pode aparecer na listagem ativa');
  assert.ok((await leadsSnapshot('only')).leads.some(lead => lead.id === leadId), 'lead arquivado precisa aparecer no filtro de arquivados');
  console.log('VERIFICADO');
}

async function clean() {
  await initializeERP();
  const database = erpDB();
  await database.transaction(async () => {
    await database.prepare('DELETE FROM lead_attachments WHERE lead_id = ?').run(leadId);
    await database.prepare('DELETE FROM lead_notes WHERE lead_id = ?').run(leadId);
    await database.prepare('DELETE FROM leads WHERE id = ? AND data_json LIKE ?').run(leadId, '%[TESTE-INTEGRACAO]%');
    await database.prepare('DELETE FROM erp_audit WHERE actor = ?').run(actor.id);
  });
  const left = await database.prepare('SELECT (SELECT count(*) FROM leads WHERE id = ?) AS leads, (SELECT count(*) FROM lead_notes WHERE lead_id = ?) AS notes, (SELECT count(*) FROM erp_audit WHERE actor = ?) AS audit').get(leadId, leadId, actor.id);
  assert.deepEqual([Number(left.leads), Number(left.notes), Number(left.audit)], [0, 0, 0], 'restaram dados de teste no banco');
  console.log('LIMPO');
}

if (phase) {
  try { await { write, verify, clean }[phase](); }
  catch (error) { console.log(`FALHA na fase ${phase}: ${error?.code || error?.name}: ${String(error?.message).slice(0, 300)}`); process.exitCode = 1; }
  finally { await closeDatabases(); }
} else {
  if (!process.argv.includes('--confirm=ESCREVER-DADOS-DE-TESTE')) { console.log('Recusado: o teste grava e remove dados de teste no banco configurado (possivelmente produção).\nRepita com --confirm=ESCREVER-DADOS-DE-TESTE'); process.exit(1); }
  const run = (name, extra = []) => new Promise(resolve => {
    const child = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', process.argv[1], `--phase=${name}`, ...extra], { env: process.env });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('close', status => resolve({ status, output: output.trim() }));
  });
  let id;
  const written = await run('write');
  console.log(`  ${written.status === 0 ? '✓' : '✗'} escrever (criar lead, mudar etapa, nota): ${written.status === 0 ? 'ok' : written.output}`);
  if (written.status === 0) id = /LEAD=([0-9a-f-]{36})/.exec(written.output)?.[1];
  let failed = written.status !== 0 || !id;
  if (id) {
    const verified = await run('verify', [`--lead=${id}`]);
    console.log(`  ${verified.status === 0 ? '✓' : '✗'} verificar em outro processo (ler, arquivar, filtros): ${verified.status === 0 ? 'ok' : verified.output}`);
    failed ||= verified.status !== 0;
    const cleaned = await run('clean', [`--lead=${id}`]);
    console.log(`  ${cleaned.status === 0 ? '✓' : '✗'} limpar dados de teste: ${cleaned.status === 0 ? 'ok' : `${cleaned.output} (apague manualmente o lead ${id})`}`);
    failed ||= cleaned.status !== 0;
  }
  console.log(failed ? '\nResultado: falhou.' : '\nResultado: CRUD real concluído e dados de teste removidos.');
  process.exit(failed ? 1 : 0);
}
