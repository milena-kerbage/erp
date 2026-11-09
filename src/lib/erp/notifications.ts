import { erpDb,initializeERP } from './core.ts';
import { accessDb,ApiError,type Actor } from './access.ts';
import type { AppNotification } from '../../features/notifications/types.ts';
export async function notifications(actor:Actor) {
  await initializeERP();
  const events=await erpDb().prepare('SELECT * FROM erp_audit ORDER BY created DESC LIMIT 100').all() as Array<{id:string;actor:string;action:string;resource:string;record_id:string;created:number}>;
  const names=new Map((await accessDb().prepare(`SELECT users.id, users.name FROM users LEFT JOIN members ON members.user_id = users.id ${actor.permission==='admin'?'':"WHERE members.status = 'active' OR members.status IS NULL"}`).all()).map(member=>[String(member.id),String(member.name)]));
  const ids=events.map(event=>event.id);
  const states=ids.length ? await accessDb().prepare(`SELECT notification_id,is_read,archived FROM notification_states WHERE user_id = ? AND notification_id IN (${ids.map(()=>'?').join(',')})`).all(actor.id,...ids) as {notification_id:string;is_read:number;archived:number}[] : [];
  const state=new Map(states.map(row=>[row.notification_id,row]));
  const labels:Record<string,string>={leads:'Leads',agenda:'Agenda',orcamentos:'Orçamentos',pedidos:'Pedidos',catalogo:'Catálogo',producao:'Produção',materiais:'Estoque',movimentacoes:'Estoque',financeiro:'Financeiro',funnels:'Funis',preferences:'Preferências',avaliacoes:'Avaliações da loja',loja_clientes:'Clientes da loja',loja_pedidos:'Pedidos da loja',loja_produtos:'Produtos da loja',loja_categorias:'Categorias da loja',loja_grupos_opcoes:'Opções da loja',loja_colecoes:'Coleções da loja',loja_menu_itens:'Menu da loja',loja_cupons_campanha:'Cupons da loja',loja_carrinhos:'Carrinhos da loja'};
  const lojaVerbs:Record<string,string>={avaliacoes:'recebeu uma avaliação para moderar em',loja_clientes:'recebeu um cadastro em',loja_pedidos:'recebeu um pedido em'};
  const hrefs:Record<string,string>={loja_clientes:'/clientes/loja',loja_pedidos:'/pedidos/loja'};
  const actions:Record<string,string>={created:'criou um registro em',updated:'atualizou um registro em',archived:'arquivou um registro em',restored:'restaurou um registro em',note_created:'registrou uma nota em',file_attached:'anexou um arquivo em',file_removed:'removeu um arquivo em',removed:'removeu um registro em',reordered:'alterou a ordem em',approved:'aprovou uma avaliação em',rejected:'recusou uma avaliação em',reopened:'voltou para pendente uma avaliação em',replied:'respondeu a uma avaliação em',reply_removed:'removeu a resposta de uma avaliação em',reset_link_created:'gerou um link de redefinição de senha em',imported:'importou o catálogo em',reminder_prepared:'preparou um lembrete de carrinho em'};
  return {notifications:events.filter(event=>!['financeiro','avaliacoes','loja_clientes','loja_pedidos','loja_cupons_campanha','loja_carrinhos'].includes(event.resource)||actor.permission!=='member').map(event=>({id:event.id,tab:event.resource==='leads'?'inbox':'general',actor:{kind:'member',seed:event.actor},who:names.get(event.actor)||(event.actor==='loja'?'Loja':'Equipe'),verb:event.actor==='loja'&&event.action==='created'?lojaVerbs[event.resource]||'recebeu um registro em':actions[event.action]||'registrou uma ação em',target:labels[event.resource]||event.resource,at:new Date(event.created).toISOString(),context:labels[event.resource]||event.resource,href:event.resource==='leads'?(event.action==='archived'?'/leads':`/leads/${event.record_id}`):event.resource==='preferences'?'/configuracoes/preferencias':event.resource==='funnels'?'/configuracoes/funis':event.resource==='materiais'||event.resource==='movimentacoes'?'/estoque':hrefs[event.resource]?hrefs[event.resource]:`/${event.resource}`,read:state.has(event.id)?Boolean(state.get(event.id)!.is_read):event.actor===actor.id,archived:Boolean(state.get(event.id)?.archived)} as AppNotification))};
}
export async function updateNotifications(input:Record<string,unknown>,actor:Actor) {
  const feed=(await notifications(actor)).notifications;
  if (input.all!==true && typeof input.id!=='string') throw new ApiError(400,'Selecione uma notificação.','INVALID_NOTIFICATION');
  if (input.read!==undefined && typeof input.read!=='boolean' || input.archived!==undefined && typeof input.archived!=='boolean') throw new ApiError(400,'Estado de notificação inválido.','INVALID_NOTIFICATION');
  const selected=input.all===true?feed:feed.filter(row=>row.id===input.id);
  if (!selected.length && input.all!==true) throw new ApiError(404,'Notificação não encontrada.','NOT_FOUND');
  const database=accessDb();
  await database.transaction(async()=>{
    for(const row of selected) await database.prepare('INSERT INTO notification_states VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id,notification_id) DO UPDATE SET is_read = CASE WHEN ? = 1 THEN excluded.is_read ELSE notification_states.is_read END, archived = CASE WHEN ? = 1 THEN excluded.archived ELSE notification_states.archived END, updated = excluded.updated').run(actor.id,row.id,input.all===true?1:input.read===undefined?row.read?1:0:input.read?1:0,input.archived===undefined?row.archived?1:0:input.archived?1:0,Date.now(),input.all===true||input.read!==undefined?1:0,input.archived!==undefined?1:0);
  });
  return notifications(actor);
}
