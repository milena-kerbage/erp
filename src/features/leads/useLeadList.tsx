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
  // Só aparece quando há o que fazer: mais registros para carregar ou um erro. Sem contagem solta no rodapé.
  if(!pagination.hasMore&&!error) return null;
  return <div style={{padding:'0.75rem',display:'flex',gap:'1rem',alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>
    {pagination.hasMore&&<Button variant="secondary" loading={loading} onClick={()=>void loadMore()}>Carregar mais ({listIds.length} de {pagination.total})</Button>}
    {error&&<span role="alert">{error}</span>}
  </div>;
}
