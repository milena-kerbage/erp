"use client";
import Image,{type ImageProps} from 'next/image';
export function ImagemNativa(props:ImageProps){
  const source=typeof props.src==='string'?props.src:'';
  // Fotos estáticas da loja (public/vitrine, já em WebP comprimido) vão direto: o otimizador as busca por uma
  // requisição interna fora do host da loja, que o proxy recusa.
  if(source.startsWith('/vitrine/'))return <Image {...props} unoptimized/>;
  if(!/^\/api\/(catalogo\/imagem|avaliacoes\/foto)\//.test(source))return <Image {...props}/>;
  const review=source.startsWith('/api/avaliacoes/'),small=review?320:400,large=review?1280:1600;
  const url=(format:string,size:string)=>{const url=new URL(source,'https://native.invalid');url.searchParams.set('formato',format);url.searchParams.set('tamanho',size);return url.pathname+url.search;};
  const sizes=props.sizes??(typeof props.width==='number'?`${props.width}px`:'100vw');
  return <picture style={{display:'contents'}}>
    <source type="image/avif" srcSet={`${url('avif','mini')} ${small}w, ${url('avif','grande')} ${large}w`} sizes={sizes}/>
    <source type="image/webp" srcSet={`${url('webp','mini')} ${small}w, ${url('webp','grande')} ${large}w`} sizes={sizes}/>
    <Image {...props} unoptimized/>
  </picture>;
}
