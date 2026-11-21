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
    // Comparação com o mesmo trecho do mês passado (até o mesmo dia): fechados e conversão.
    const anteriores=await db.prepare(`SELECT funnel_id,stage,COUNT(*) AS count,SUM(${budget}) AS budget FROM leads WHERE archived_at IS NULL AND created>=? AND created<? GROUP BY funnel_id,stage`).all(previousStart,previousEnd);
    const previousWon=anteriores.filter(isClient).reduce((sum,r)=>sum+Number(r.count),0),previousWonValue=anteriores.filter(isClient).reduce((sum,r)=>sum+Number(r.budget)/100,0);
    // Faturamento por mês (últimos 6): vendas fechadas, no mês em que a ficha entrou na etapa final do funil de vendas
    // ou no funil de clientes (pelo histórico da ficha). Sem esse registro, vale o mês em que a ficha foi criada.
    const MESES=6,inicioSerie=at(month-(MESES-1),1),clientes=funnels.find(f=>f.id==='clientes');
    const abertas=new Set((sales?.stages??[]).map(stage=>stage.id).filter(id=>id!==closed)),fechou=new Set([closed,...(clientes?.stages??[]).map(stage=>stage.id).filter(id=>!abertas.has(id))]);
    const vendas=await db.prepare(`SELECT ${budget} AS budget,created,details_json FROM leads WHERE archived_at IS NULL AND ${client} AND updated>=? LIMIT 5000`).all(sales?.id??'',closed,inicioSerie);
    const porMes=new Map<string,{value:number;count:number}>();
    for(const row of vendas){
      let quando=Number(row.created),dentro=false;
      try{const ficha=(typeof row.details_json==='string'?JSON.parse(row.details_json):row.details_json) as LeadDetails;for(const item of ficha?.history??[]){if(item.type!=='stage')continue;const agora=fechou.has(String(item.stage));if(agora&&!dentro){const instante=Date.parse(item.at);if(Number.isFinite(instante))quando=instante;}dentro=agora;}}catch{/* ficha sem histórico legível: vale a criação */}
      if(quando<inicioSerie||quando>=next)continue;
      const chave=new Date(quando-offset).toISOString().slice(0,7),atual=porMes.get(chave)??{value:0,count:0};atual.value+=Number(row.budget)/100;atual.count+=1;porMes.set(chave,atual);
    }
    // Quanto entrou em orçamentos em cada mês (pela criação da ficha): a linha de comparação do faturamento.
    const mes=pg?`to_char(to_timestamp((created - ${offset})/1000.0) AT TIME ZONE 'UTC','YYYY-MM')`:`strftime('%Y-%m',(created - ${offset})/1000,'unixepoch')`;
    const entradas=new Map((await db.prepare(`SELECT ${mes} AS month,SUM(${budget}) AS budget FROM leads WHERE archived_at IS NULL AND created>=? AND created<? GROUP BY ${mes}`).all(inicioSerie,next)).map(r=>[String(r.month),Number(r.budget)/100]));
    const revenue=Array.from({length:MESES},(_,indice)=>{const chave=new Date(Date.UTC(year,month-(MESES-1)+indice,1)).toISOString().slice(0,7);return{month:chave,value:porMes.get(chave)?.value??0,count:porMes.get(chave)?.count??0,entered:entradas.get(chave)??0};});
    // Bebês chegando: o prazo do enxoval. Nascimentos previstos nos próximos 30, 60 e 90 dias e os mais próximos.
    const hoje=new Date(now-offset).toISOString().slice(0,10),ate=(dias:number)=>new Date(now-offset+dias*86400000).toISOString().slice(0,10),nascimento=json('details_json','eventDate');
    const prazo=await db.prepare(`SELECT SUM(CASE WHEN ${nascimento}<=? THEN 1 ELSE 0 END) AS d30,SUM(CASE WHEN ${nascimento}<=? THEN 1 ELSE 0 END) AS d60,COUNT(*) AS d90 FROM leads WHERE archived_at IS NULL AND ${nascimento}>=? AND ${nascimento}<=?`).get(ate(30),ate(60),hoje,ate(90));
    // Os nascimentos mais próximos, para a lista do cartão.
    const nascimentos=(await db.prepare(`SELECT id,${json('data_json','name')} AS name,${json('details_json','babyName')} AS baby,${nascimento} AS date,funnel_id,stage FROM leads WHERE archived_at IS NULL AND ${nascimento}>=? AND ${nascimento}<=? ORDER BY ${nascimento},id LIMIT 6`).all(hoje,ate(90))).map(r=>({id:String(r.id),name:String(r.name??''),baby:String(r.baby??''),date:String(r.date),client:isClient(r)}));
    const proximos=nascimentos;
    const stages:Record<string,StageValue[]>={};for(const funnel of funnels)stages[funnel.id]=funnel.stages.map(stage=>{const group=groups.find(r=>r.funnel_id===funnel.id&&r.stage===stage.id);return{id:stage.id,label:stage.label,count:Number(group?.count??0),value:Number(group?.budget??0)/100};});
    // O CRM persiste somente notas internas em lead_notes; atendimento WhatsApp usa outro domínio.
    return {total,month:days,monthTotal,pace,projection:pace*daysInMonth,previous:{value:Number(previous?.value??0)/100,count:Number(previous?.count??0),until:new Date(at(month-1,previousDay)).toISOString()},pipeline,days:date,fresh:freshCount,attended:fresh.filter(r=>r.funnel_id!==sales?.id||r.stage!==first).reduce((sum,r)=>sum+Number(r.count),0),won:fresh.filter(isClient).reduce((sum,r)=>sum+Number(r.count),0),wonValue:fresh.filter(isClient).reduce((sum,r)=>sum+Number(r.budget)/100,0),ticket:freshCount?monthTotal/freshCount:0,ticketBySource:sourceRows.map(r=>({source:r.source,average:r.value/r.count})).sort((a,b)=>b.average-a.average).slice(0,2),response:null as number|null,answers:0,fast:0,conversations:0,open:0,resolved:0,waiting:[] as AttentionRow[],proposals:proposals.reduce((sum,r)=>sum+Number(r.count),0),proposalsValue:proposals.reduce((sum,r)=>sum+Number(r.budget)/100,0),salesLeads:groups.filter(r=>r.funnel_id===sales?.id).reduce((sum,r)=>sum+Number(r.count),0),stale,staleCount,active:groups.filter(r=>!isClient(r)).reduce((sum,r)=>sum+Number(r.count),0),sources:sourceRows,stages,previousWon,previousWonValue,revenue,births:{d30:Number(prazo?.d30??0),d60:Number(prazo?.d60??0),d90:Number(prazo?.d90??0),next:proximos}};
  });
}
export async function dashboardActivity(){
  await initializeERP();const db=erpDB(),name=db.backend==='postgres'?"l.data_json::jsonb ->> 'name'":"json_extract(l.data_json,'$.name')";
  return {events:(await db.prepare(`SELECT a.id,a.action,a.created,a.record_id,${name} AS name FROM erp_audit a JOIN leads l ON l.id=a.record_id WHERE a.resource='leads' AND l.archived_at IS NULL AND a.created>=? ORDER BY a.created DESC,a.id DESC LIMIT 50`).all(Date.now()-8*86400000)).map(r=>({id:String(r.id),action:String(r.action),at:new Date(Number(r.created)).toISOString(),leadId:String(r.record_id),name:String(r.name)}))};
}
