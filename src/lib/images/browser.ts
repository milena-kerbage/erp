/** Pré-redução local para economizar upload; o servidor sempre valida e gera WebP e AVIF. */
export async function prepareImageUpload(file:File,profile:'review'|'product'|'profile'|'general'='general'):Promise<File>{
  if(!/^image\/(jpeg|png|webp|avif)$/.test(file.type)||typeof createImageBitmap!=='function')return file;
  const settings={review:{size:1600,quality:0.82,budget:900*1024},product:{size:2000,quality:0.95,budget:3*1024*1024},profile:{size:768,quality:0.86,budget:1024*1024},general:{size:1800,quality:0.86,budget:3*1024*1024}}[profile];
  let bitmap:ImageBitmap|undefined;
  try{
    bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
    if(file.size<400*1024&&Math.max(bitmap.width,bitmap.height)<=settings.size)return file;
    const scale=Math.min(1,settings.size/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d');if(!context)return file;context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    let quality=settings.quality,blob:Blob|null=null;
    do{blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));quality-=0.06;}while(blob&&blob.size>settings.budget&&quality>=(profile==='product'?0.89:0.64));
    if(!blob||blob.type!=='image/webp'||blob.size>=file.size)return file;
    return new File([blob],`${file.name.replace(/\.[^.]+$/,'')||'foto'}.webp`,{type:'image/webp',lastModified:file.lastModified});
  }catch{return file;}finally{bitmap?.close();}
}
