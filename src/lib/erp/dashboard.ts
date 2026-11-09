import { erpDB, initializeERP, ERPError } from './core.ts';
import type { Lead, LeadDetails } from '../../features/leads/types.ts';
import type { AttentionRow, SourceRow, StageValue } from '../../features/dashboard/metrics.ts';

type Funnel={id:string;name:string;stages:{id:string;label:string}[]};
export async function dashboardSummary(now=Date.now(),offsetMinutes=180){
  if(!Number.isFinite(now)||!Number.isInteger(offsetMinutes)||Math.abs(offsetMinutes)>840)throw new ERPError(400,'Data inválida.','INVALID_DATE');
  await initializeERP();const db=erpDB(),pg=db.backend==='postgres',offset=offsetMinutes*60000,local=new Date(now-offset),year=local.getUTCFullYear(),month=local.getUTCMonth(),date=local.getUTCDate();
  const at=(m:number,d:number)=>Date.UTC(year,m,d)+offset;
  const start=at(month,1),next=at(month+1,1),previousStart=at(month-1,1),previousDay=Math.min(date,new Date(Date.UTC(year,month,0)).getUTCDate()),previousEnd=at(month-1,previousDay+1);
  const json=(column:string,key:string)=>pg?`(${column}::jsonb ->> '${key}')`:`json_extract(${column},'$.${key}')`;
  const budget=`ROUND(COALESCE(CAST(${json('data_json','budget')} AS NUMERIC),0)*100)`;
  const source=`COALESCE(NULLIF(${json('details_json','source')},''),'Outro')`;
  const day=pg?`to_char(to_timestamp((created - ${offset})/1000.0) AT TIME ZONE 'UTC','YYYY-MM-DD')`:`strftime('%Y-%m-%d',(created - ${offset})/1000,'unixepoch')`;
  return db.transaction(async()=>{
    const funnels=(await db.prepare('SELECT id,data_json FROM funnels ORDER BY position,id').all()).map(row=>({id:String(row.id),...JSON.parse(String(row.data_json))} as Funnel));
    const sales=funnels.find(f=>f.id==='vendas')??funnels[0],closed=sales?.stages.at(-1)?.id??'',first=sales?.stages[0]?.id??'';
    const client=`(funnel_id='clientes' OR (funnel_id=? AND stage=?))`;
    const groups=await db.prepare(`SELECT funnel_id,stage,COUNT(*) AS count,SUM(${budget}) AS budget FROM leads WHERE archived_at IS NULL GROUP BY funnel_id,stage`).all();
    const total=groups.reduce((sum,r)=>sum+Number(r.count),0),isClient=(r:Record<string,unknown>)=>r.funnel_id==='clientes'||r.funnel_id===sales?.id&&r.stage===closed;
    const pipeline=groups.filter(r=>r.funnel_id===sales?.id&&r.stage!==closed).reduce((sum,r)=>sum+Number(r.budget)/100,0);
    const monthly=await db.prepare(`SELECT ${day} AS day,funnel_id,stage,${source} AS source,COUNT(*) AS count,SUM(${budget}) AS budget FROM leads WHERE archived_at IS NULL AND created>=? AND created<? GROUP BY ${day},funnel_id,stage,${source}`).all(start,next);
    const previous=await db.prepare(`SELECT COUNT(*) AS count,COALESCE(SUM(${budget}),0) AS value FROM leads WHERE archived_at IS NULL AND created>=? AND created<?`).get(previousStart,previousEnd);
    const last=pg?"COALESCE(NULLIF(details_json::jsonb ->> 'lastContactAt',''),to_char(to_timestamp(created/1000.0) AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"'))":"COALESCE(NULLIF(json_extract(details_json,'$.lastContactAt'),''),strftime('%Y-%m-%dT%H:%M:%fZ',created/1000.0,'unixepoch'))";
    const staleWhere=`archived_at IS NULL AND NOT ${client} AND ${last} <= ?`,staleParams=[sales?.id??'',closed,new Date(now-7*86400000).toISOString()];
    const staleCount=Number((await db.prepare(`SELECT COUNT(*) AS count FROM leads WHERE ${staleWhere}`).get(...staleParams))?.count??0);
    const stale=(await db.prepare(`SELECT id,data_json,revision,created FROM leads WHERE ${staleWhere} ORDER BY ${last},id LIMIT 5`).all(...staleParams)).map(row=>({...JSON.parse(String(row.data_json)),id:String(row.id),revision:Number(row.revision),createdAt:new Date(Number(row.created)).toISOString()} as Lead));
    const daysInMonth=new Date(Date.UTC(year,month+1,0)).getUTCDate();
    const days=Array.from({length:daysInMonth},(_,index)=>{const dayString=new Date(Date.UTC(year,month,index+1)).toISOString().slice(0,10);const rows=monthly.filter(row=>row.day===dayString);return {date:new Date(at(month,index+1)).toISOString(),count:rows.reduce((sum,r)=>sum+Number(r.count),0),value:rows.reduce((sum,r)=>sum+Number(r.budget)/100,0),future:index+1>date};});
    const fresh=monthly.filter(row=>String(row.day)<=new Date(local).toISOString().slice(0,10)),freshCount=fresh.reduce((sum,r)=>sum+Number(r.count),0);
    const monthTotal=days.filter(d=>!d.future).reduce((sum,d)=>sum+d.value,0),pace=monthTotal/date;
    const sources=new Map<string,SourceRow>();for(const row of monthly){const name=String(row.source),current=sources.get(name)??{source:name,count:0,value:0,converted:0};current.count+=Number(row.count);current.value+=Number(row.budget)/100;if(isClient(row))current.converted+=Number(row.count);sources.set(name,current);}
    const sourceRows=[...sources.values()].sort((a,b)=>b.count-a.count||b.value-a.value);
    const proposals=groups.filter(r=>r.funnel_id===sales?.id&&sales.stages.findIndex(stage=>stage.id===r.stage)>=2&&r.stage!==closed);
    const stages:Record<string,StageValue[]>={};for(const funnel of funnels)stages[funnel.id]=funnel.stages.map(stage=>{const group=groups.find(r=>r.funnel_id===funnel.id&&r.stage===stage.id);return{id:stage.id,label:stage.label,count:Number(group?.count??0),value:Number(group?.budget??0)/100};});
    // O CRM persiste somente notas internas em lead_notes; atendimento WhatsApp usa outro domínio.
    return {total,month:days,monthTotal,pace,projection:pace*daysInMonth,previous:{value:Number(previous?.value??0)/100,count:Number(previous?.count??0),until:new Date(at(month-1,previousDay)).toISOString()},pipeline,days:date,fresh:freshCount,attended:fresh.filter(r=>r.funnel_id!==sales?.id||r.stage!==first).reduce((sum,r)=>sum+Number(r.count),0),won:fresh.filter(isClient).reduce((sum,r)=>sum+Number(r.count),0),wonValue:fresh.filter(isClient).reduce((sum,r)=>sum+Number(r.budget)/100,0),ticket:freshCount?monthTotal/freshCount:0,ticketBySource:sourceRows.map(r=>({source:r.source,average:r.value/r.count})).sort((a,b)=>b.average-a.average).slice(0,2),response:null as number|null,answers:0,fast:0,conversations:0,open:0,resolved:0,waiting:[] as AttentionRow[],proposals:proposals.reduce((sum,r)=>sum+Number(r.count),0),proposalsValue:proposals.reduce((sum,r)=>sum+Number(r.budget)/100,0),salesLeads:groups.filter(r=>r.funnel_id===sales?.id).reduce((sum,r)=>sum+Number(r.count),0),stale,staleCount,active:groups.filter(r=>!isClient(r)).reduce((sum,r)=>sum+Number(r.count),0),sources:sourceRows,stages};
  });
}
export async function dashboardActivity(){
  await initializeERP();const db=erpDB(),name=db.backend==='postgres'?"l.data_json::jsonb ->> 'name'":"json_extract(l.data_json,'$.name')";
  return {events:(await db.prepare(`SELECT a.id,a.action,a.created,a.record_id,${name} AS name FROM erp_audit a JOIN leads l ON l.id=a.record_id WHERE a.resource='leads' AND l.archived_at IS NULL AND a.created>=? ORDER BY a.created DESC,a.id DESC LIMIT 50`).all(Date.now()-8*86400000)).map(r=>({id:String(r.id),action:String(r.action),at:new Date(Number(r.created)).toISOString(),leadId:String(r.record_id),name:String(r.name)}))};
}
