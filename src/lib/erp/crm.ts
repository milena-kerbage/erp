import {createHash} from 'node:crypto';
import { erpDB, initializeERP, ERPError } from './core.ts';
import type { LeadQuery, LeadPage } from '../../features/leads/query.ts';
import type { Lead, LeadDetails, ChatMessage, ConversationStatus } from '../../features/leads/types.ts';

export function crmQuery(url:URL):LeadQuery {
  const raw=url.searchParams.get('filter')||'{}';
  if(raw.length>6000) throw new ERPError(400,'Filtros muito longos.','INVALID_FILTER');
  let value:LeadQuery;
  try{value=JSON.parse(raw);}catch{throw new ERPError(400,'Filtros inválidos.','INVALID_FILTER');}
  if(!value||typeof value!=='object'||Array.isArray(value)) throw new ERPError(400,'Filtros inválidos.','INVALID_FILTER');
  const allowed=['q','funnels','stages','sources','owners','createdDays','eventDays','stale','unread','sort','direction','conversations','statuses','archived','searchNotes'];
  if(Object.keys(value).some(key=>!allowed.includes(key))) throw new ERPError(400,'Filtro desconhecido.','INVALID_FILTER');
  if(value.q!==undefined&&(typeof value.q!=='string'||value.q.length>200)) throw new ERPError(400,'Busca inválida.','INVALID_FILTER');
  for(const key of ['funnels','stages','sources','owners','statuses'] as const) if(value[key]!==undefined&&(!Array.isArray(value[key])||value[key]!.length>50||value[key]!.some(item=>typeof item!=='string'||item.length>150))) throw new ERPError(400,'Seleção inválida.','INVALID_FILTER');
  for(const key of ['stale','unread','conversations','archived','searchNotes'] as const) if(value[key]!==undefined&&typeof value[key]!=='boolean') throw new ERPError(400,'Filtro inválido.','INVALID_FILTER');
  if(value.sort&&!['activity','name','event','stage','budget','contact','created','source','owner'].includes(value.sort)||value.direction&&!['asc','desc'].includes(value.direction)) throw new ERPError(400,'Ordenação inválida.','INVALID_FILTER');
  for(const key of ['createdDays','eventDays'] as const) if(value[key]!==undefined&&!(key==='eventDays'&&value[key]==='none')&&(!Number.isInteger(value[key])||Number(value[key])<1||Number(value[key])>36500)) throw new ERPError(400,'Período inválido.','INVALID_FILTER');
  return value;
}
export async function crmPage(query:LeadQuery={},limit=50,offset=0,options:{cursor?:string;totals?:boolean}={}):Promise<LeadPage>{
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0||offset>100000) throw new ERPError(400,'Paginação inválida.','INVALID_PAGINATION');
  await initializeERP(); const db=erpDB(),pg=db.backend==='postgres';
  const field=(key:string,column='l.details_json')=>pg?`(${column}::jsonb #>> '{${key.split('.').join(',')}}')`:`json_extract(${column}, '$.${key}')`;
  const fold=(sql:string)=>{let expression=`LOWER(COALESCE(${sql},''))`;const accents='áàâãäéèêëíìîïóòôõöúùûüç',ascii='aaaaaeeeeiiiiooooouuuuc',from=accents+accents.toUpperCase(),to=ascii+ascii;if(pg)return `translate(${expression},'${from}','${to}')`;for(let i=0;i<from.length;i++)expression=`replace(${expression},'${from[i]}','${to[i]}')`;return expression;};
  const clauses=[`l.archived_at IS ${query.archived?'NOT ':''}NULL`],params:(string|number)[]=[];
  const select=(values:string[]|undefined,expression:string)=>{if(values?.length){clauses.push(`${expression} IN (${values.map(()=>'?').join(',')})`);params.push(...values);}};
  select(query.funnels,'l.funnel_id');select(query.stages,"l.funnel_id || ':' || l.stage");select(query.sources,field('source'));select(query.owners,field('owner.seed'));select(query.statuses,'l.status');
  const now=Date.now(),day=86400000;
  if(query.createdDays){clauses.push('l.created >= ?');params.push(now-query.createdDays*day);}
  if(query.eventDays==='none')clauses.push(`COALESCE(${field('eventDate')},'')=''`);
  else if(query.eventDays){const start=new Date(now-day).toISOString().slice(0,10),end=new Date(now+query.eventDays*day).toISOString().slice(0,10);clauses.push(`${field('eventDate')} BETWEEN ? AND ?`);params.push(start,end);}
  if(query.stale){clauses.push(`((COALESCE(${field('lastContactAt')},'')='' AND l.created<=?) OR ${field('lastContactAt')} <= ?)`);params.push(now-7*day,new Date(now-7*day).toISOString());}
  // Notas internas não são mensagens recebidas; o contador WhatsApp tem seu endpoint próprio.
  if(query.unread)clauses.push('1=0');
  if(query.conversations)clauses.push('EXISTS (SELECT 1 FROM lead_notes n WHERE n.lead_id=l.id)');
  const search=query.q?.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(search){
    const escaped=search.replace(/[\\%_]/g,'\\$&');const digits=search.replace(/\D/g,'');
    let condition=`${fold(`${field('name','l.data_json')} || ' ' || COALESCE(${field('email')},'') || ' ' || COALESCE(${field('city')},'') || ' ' || COALESCE(${field('tags','l.data_json')},'')`)} LIKE ? ESCAPE '\\'`;
    params.push(`%${escaped}%`);
    if(digits.length>=3){condition+=' OR '+field('phone','l.data_json')+" LIKE ? ESCAPE '\\'";params.push(`%${digits}%`);}
    if(query.searchNotes){condition+=` OR EXISTS (SELECT 1 FROM lead_notes n WHERE n.lead_id=l.id AND ${fold('n.text')} LIKE ? ESCAPE '\\')`;params.push(`%${escaped}%`);}
    clauses.push(`(${condition})`);
  }
  const stageOrder=pg?`COALESCE((SELECT ordinality FROM jsonb_array_elements(f.data_json::jsonb -> 'stages') WITH ORDINALITY AS s(value,ordinality) WHERE s.value ->> 'id'=l.stage),0)`:`COALESCE((SELECT CAST(s.key AS INTEGER)+1 FROM json_each(f.data_json,'$.stages') s WHERE json_extract(s.value,'$.id')=l.stage),0)`;
  const orders={activity:'COALESCE((SELECT n.created FROM lead_notes n WHERE n.lead_id=l.id ORDER BY n.created DESC,n.id DESC LIMIT 1),l.created)',created:'l.created',name:field('name','l.data_json'),budget:`CAST(${field('budget','l.data_json')} AS NUMERIC)`,event:`COALESCE(${field('eventDate')},'9999')`,contact:`COALESCE(${field('lastContactAt')},'')`,source:field('source'),owner:field('owner.name'),stage:`f.position*100+${stageOrder}`};
  const order=orders[query.sort??'created'],direction=query.direction==='asc'?'ASC':'DESC',where=clauses.join(' AND ');
  return db.transaction(async()=>{
    const groups=options.totals===false?[]:await db.prepare(`SELECT l.funnel_id,l.stage,COUNT(*) AS count,SUM(CAST(${field('budget','l.data_json')} AS NUMERIC)) AS budget FROM leads l LEFT JOIN funnels f ON f.id=l.funnel_id WHERE ${where} GROUP BY l.funnel_id,l.stage`).all(...params);
    const byStage=groups.map(row=>({funnelId:String(row.funnel_id),stage:String(row.stage),count:Number(row.count),budget:Number(row.budget)})),total=byStage.reduce((sum,row)=>sum+row.count,0);
    const details=pg?"(l.details_json::jsonb - 'history' - 'attachments')::text":"json_remove(l.details_json,'$.history','$.attachments')";
    const note=pg?"json_build_object('id',n.id,'text',SUBSTR(n.text,1,500),'at',n.created,'actor',n.actor,'author',n.author_name)::text":"json_object('id',n.id,'text',SUBSTR(n.text,1,500),'at',n.created,'actor',n.actor,'author',n.author_name)";
    const queryHash=createHash('sha256').update(JSON.stringify(query)).digest('hex');
    let cursorWhere='',cursorValues:(string|number)[]=[];
    if(options.cursor){
      try{if(options.cursor.length>1000||(query.sort&&query.sort!=='created'))throw new Error();const c=JSON.parse(Buffer.from(options.cursor,'base64url').toString());if(!Number.isSafeInteger(c.created)||typeof c.id!=='string'||c.id.length>100||c.queryHash!==queryHash||c.direction!==direction)throw new Error();const comparator=direction==='ASC'?'>':'<';cursorWhere=` AND (l.created ${comparator} ? OR (l.created=? AND l.id ${comparator} ?))`;cursorValues=[c.created,c.created,c.id];}catch{throw new ERPError(400,'Cursor inválido.','INVALID_CURSOR');}
    }
    const rows=await db.prepare(`SELECT l.id,l.data_json,${details} AS details_json,l.status,l.revision,l.created,l.archived_at,
      (SELECT ${note} FROM lead_notes n WHERE n.lead_id=l.id ORDER BY n.created DESC,n.id DESC LIMIT 1) AS preview
      FROM leads l LEFT JOIN funnels f ON f.id=l.funnel_id WHERE ${where}${cursorWhere} ORDER BY ${order} ${direction},l.id ${direction} LIMIT ? OFFSET ?`).all(...params,...cursorValues,limit+1,options.cursor?0:offset);
    const result:LeadPage={leads:[],details:{},messages:{},statuses:{},pagination:{limit,offset,total:options.totals===false?null:total,hasMore:rows.length>limit,nextCursor:null as string|null},byStage};
    const selectedRows=rows.slice(0,limit),last=selectedRows.at(-1);
    if(last&&(!query.sort||query.sort==='created'))result.pagination.nextCursor=Buffer.from(JSON.stringify({created:Number(last.created),id:String(last.id),queryHash,direction})).toString('base64url');
    for(const row of selectedRows){const id=String(row.id);result.leads.push({...JSON.parse(String(row.data_json)),id,revision:Number(row.revision),createdAt:new Date(Number(row.created)).toISOString(),...(row.archived_at?{archivedAt:new Date(Number(row.archived_at)).toISOString()}: {})} as Lead);result.details[id]={...JSON.parse(String(row.details_json)),history:[],attachments:[]} as LeadDetails;result.statuses[id]=row.status as ConversationStatus;result.messages[id]=[];
      if(row.preview){const n=JSON.parse(String(row.preview));result.messages[id]=[{id:n.id,direction:'out',kind:'note',text:n.text,at:new Date(Number(n.at)).toISOString(),author:{name:n.author,seed:n.actor}} as ChatMessage];}
    }
    if(query.searchNotes&&search&&result.leads.length){
      const ids=result.leads.map(lead=>lead.id),whereText=fold('n.text'),position=pg?`strpos(${whereText},?)`:`instr(${whereText},?)`,greatest=pg?'GREATEST':'MAX';
      const matching=await db.prepare(`SELECT n.id,n.lead_id,n.actor,n.author_name,n.created,SUBSTR(n.text,${greatest}(1,${position}-50),500) AS text FROM lead_notes n WHERE n.lead_id IN (${ids.map(()=>'?').join(',')}) AND ${whereText} LIKE ? ESCAPE '\\' ORDER BY n.created DESC,n.id DESC LIMIT 20`).all(search,...ids,`%${search.replace(/[\\%_]/g,'\\$&')}%`);
      const matches=new Map<string,ChatMessage[]>();for(const n of matching){const id=String(n.lead_id);const rows=matches.get(id)??[];rows.push({id:String(n.id),direction:'out',kind:'note',text:String(n.text),at:new Date(Number(n.created)).toISOString(),author:{name:String(n.author_name),seed:String(n.actor)}});matches.set(id,rows);}for(const [id,messages]of matches)result.messages[id]=messages;
    }
    return result;
  });
}
/** Opções de vínculos usam somente identificador, nome e telefone, sem fichas e notas. */
export async function leadOptions(){await initializeERP();const db=erpDB(),name=db.backend==='postgres'?"data_json::jsonb ->> 'name'":"json_extract(data_json,'$.name')",phone=db.backend==='postgres'?"data_json::jsonb ->> 'phone'":"json_extract(data_json,'$.phone')";return {leads:await db.prepare(`SELECT id,${name} AS name,${phone} AS phone FROM leads WHERE archived_at IS NULL ORDER BY ${name},id`).all()};}
