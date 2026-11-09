"use client";
import {prepareImageUpload} from "@/lib/images/browser";
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {erpRequest,errorMessage} from '@/features/erp/client';
import {Card,Page,PageHeader} from './ui';
type Media={storage:{driver:string;configured:boolean;publicMediaConfigured:boolean};files:{id:string;mime:string;size:number;status:string;public_url:string|null}[];hasMore:boolean};
export function MediaSettings(){
  const [data,setData]=useState<Media|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  async function load(append=false){try{const next=await erpRequest<Media>(`/media?offset=${append?data?.files.length??0:0}`);setData(current=>append&&current?{...next,files:[...current.files,...next.files]}:next);}catch(cause){setError(errorMessage(cause));}}
  useEffect(()=>{void load();},[]);
  async function upload(file:File){setBusy(true);setError('');try{file=await prepareImageUpload(file,'general');if(file.size>128*1024*1024)throw new Error('Envie um arquivo de até 128 MiB.');const reservation=await erpRequest<{id:string;uploadUrl:string}>('/media','POST',{type:file.type,size:file.size});const response=await fetch(reservation.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file,credentials:'omit',redirect:'error'});if(!response.ok)throw new Error('Não foi possível enviar o arquivo. Confira o CORS do bucket.');const result=await erpRequest<{compression?:{originalBytes:number;webpBytes:number;avifBytes:number}}>(`/media/${reservation.id}/publish`,'POST',{});if(result.compression)setNotice(`Imagem otimizada: WebP ${(result.compression.webpBytes/1024).toFixed(0)} KiB · AVIF ${(result.compression.avifBytes/1024).toFixed(0)} KiB.`);await load();}catch(cause){setError(errorMessage(cause));}finally{setBusy(false);}}
  return <Page><PageHeader title="Fotos e vídeos" description="Biblioteca de mídia pública da loja. Envie somente conteúdo que pode ser publicado."/>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <Card>{data&&!data.storage.configured?<p>O armazenamento ainda precisa ser conectado. Configure os buckets e as credenciais Cloudflare R2 no ambiente do servidor.</p>:null}
      <label>Publicar foto ou vídeo <input aria-label="Selecionar foto ou vídeo público" type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" disabled={busy||!data?.storage.configured||!data?.storage.publicMediaConfigured} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);event.target.value='';}}/></label>
      <p>Fotos até 12 MiB e vídeos até 128 MiB. Fotos são otimizadas automaticamente em WebP e AVIF. O envio vai diretamente ao storage. As fotos de produtos continuam sendo cadastradas na ficha do produto.</p>
      {busy&&<p role="status">Enviando e publicando arquivo…</p>}
    </Card>
    <Card><h3>Mídias publicadas</h3>{data?.files.filter(file=>file.status==='published').map(file=><div key={file.id} style={{display:'flex',gap:'1rem',padding:'0.5rem',flexWrap:'wrap'}}><span>{file.mime} · {(file.size/1024/1024).toFixed(1)} MiB</span><a href={file.public_url??''} target="_blank" rel="noreferrer">Abrir arquivo</a><Button variant="ghost" onClick={()=>void navigator.clipboard.writeText(file.public_url??'').catch(()=>setError('Não foi possível copiar o endereço.'))}>Copiar endereço</Button></div>)}{data?.hasMore&&<Button variant="secondary" onClick={()=>void load(true)}>Carregar mais</Button>}</Card>
  </Page>;
}
