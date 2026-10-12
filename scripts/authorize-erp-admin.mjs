import {findUser,normalizeEmail,validEmail} from '../src/lib/auth/core.ts';
import {currentMember,accessDb,accessAudit} from '../src/lib/erp/access.ts';
import {closeDatabases} from '../src/lib/database.ts';
const email=normalizeEmail(process.argv[2] || '');
try {
 if(!validEmail(email) || !(process.env.ERP_ADMIN_EMAILS || '').split(',').map(normalizeEmail).includes(email)) throw new Error('Informe uma conta existente incluída em ERP_ADMIN_EMAILS no ambiente privado.');
 const user=await findUser(email);if(!user) throw new Error('Conta não encontrada. Crie a conta antes da autorização.');
 await currentMember(user);
 await accessDb().transaction(async()=>{
  await accessDb().prepare("UPDATE members SET permission = 'admin' WHERE user_id = ? AND status = 'active'").run(user.id);
  await accessDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  await accessAudit('server-administration','admin_bootstrap_authorized',user.id);
 });
 console.log('Administração autorizada no banco configurado. Entre novamente; sessões anteriores foram revogadas.');
} catch(error) {console.error(error.message || 'Não foi possível autorizar a administração.');process.exitCode=1;}
finally {await closeDatabases();}
