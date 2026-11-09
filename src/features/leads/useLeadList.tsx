"use client";
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useLeads } from './store';
import type { LeadQuery } from './query';
/** Mudanças de busca são agrupadas; os filtros chegam ao SQL antes do LIMIT. */
export function useLeadList(query:LeadQuery={}) {
  const context=useLeads(),key=JSON.stringify(query);
  useEffect(()=>{const timer=setTimeout(()=>context.configureList(JSON.parse(key)),250);return()=>clearTimeout(timer);},[key,context.configureList]);
  return {...context,leads:context.leads.filter(lead=>context.listIds.includes(lead.id))};
}
export function LeadPagination(){
  const {pagination,listIds,loadMore,loading,error}=useLeads();
  return <div style={{padding:'0.75rem',display:'flex',gap:'1rem',alignItems:'center',flexWrap:'wrap'}}>
    <span role="status">{listIds.length} de {pagination.total} resultados</span>
    {pagination.hasMore&&<Button variant="secondary" loading={loading} onClick={()=>void loadMore()}>Carregar mais</Button>}
    {error&&<span role="alert">{error}</span>}
  </div>;
}
