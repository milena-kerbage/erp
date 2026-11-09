import sharp from 'sharp';
export type ImageProfile='review'|'product'|'profile'|'general';
export const IMAGE_PROFILES={
  review:{size:1280,thumbnail:320,webp:62,avif:42,effort:4},
  product:{size:1600,thumbnail:400,webp:85,avif:65,effort:4},
  profile:{size:512,thumbnail:128,webp:60,avif:40,effort:4},
  general:{size:1440,thumbnail:360,webp:64,avif:44,effort:4},
} as const;
export class ImageCompressionError extends Error{status:number;code:string;constructor(message:string,status=415,code='INVALID_IMAGE'){super(message);this.status=status;this.code=code;}}
let active=0;const waiting:(()=>void)[]=[];
async function limited<T>(operation:()=>Promise<T>){if(active>=2){if(waiting.length>=12)throw new ImageCompressionError('Há muitas fotos em processamento. Tente novamente em instantes.',429,'IMAGE_QUEUE_FULL');await new Promise<void>(resolve=>waiting.push(resolve));}else active++;try{return await operation();}finally{const next=waiting.shift();if(next)next();else active--;}}
export type CompressedImage={profile:ImageProfile;originalBytes:number;width:number;height:number;thumbnailWidth:number;thumbnailHeight:number;webp:{large:Buffer;small:Buffer};avif:{large:Buffer;small:Buffer}};
/** Sem rede: orientação EXIF aplicada, metadados removidos, sem ampliar imagens pequenas. */
export async function compressImage(bytes:Buffer,profile:ImageProfile='general'):Promise<CompressedImage>{
  if(!bytes.length||bytes.length>12*1024*1024)throw new ImageCompressionError('A imagem deve ter até 12 MiB.',413,'IMAGE_TOO_LARGE');
  return limited(async()=>{
    try{
      const config=IMAGE_PROFILES[profile],input=sharp(bytes,{limitInputPixels:24_000_000,failOn:'error'}),metadata=await input.metadata();
      if(!['jpeg','png','webp','avif','heif'].includes(metadata.format??'')||metadata.pages&&metadata.pages>1)throw new Error('unsupported');
      const pipeline=(size:number)=>input.clone().rotate().toColourspace('srgb').resize({width:size,height:size,fit:'inside',withoutEnlargement:true});
      const webp=await pipeline(config.size).webp({quality:config.webp,alphaQuality:profile==='product'?95:75,effort:5,smartSubsample:true}).toBuffer({resolveWithObject:true});
      const small=await pipeline(config.thumbnail).webp({quality:Math.max(50,config.webp-6),effort:4}).toBuffer({resolveWithObject:true});
      const avif=await pipeline(config.size).avif({quality:config.avif,effort:config.effort,chromaSubsampling:profile==='product'?'4:4:4':'4:2:0'}).toBuffer();
      const smallAvif=await pipeline(config.thumbnail).avif({quality:Math.max(30,config.avif-5),effort:3}).toBuffer();
      return{profile,originalBytes:bytes.length,width:webp.info.width,height:webp.info.height,thumbnailWidth:small.info.width,thumbnailHeight:small.info.height,webp:{large:webp.data,small:small.data},avif:{large:avif,small:smallAvif}};
    }catch(error){if(error instanceof ImageCompressionError)throw error;throw new ImageCompressionError('Não foi possível processar a imagem. Envie JPG, PNG, WebP ou AVIF válido.');}
  });
}
export function requestedImageFormat(request:Request):'webp'|'avif'{const explicit=new URL(request.url).searchParams.get('formato');if(explicit==='avif'||explicit==='webp')return explicit;const quality=(mime:string)=>{const value=(request.headers.get('accept')??'').split(',').find(value=>value.trim().split(';')[0]===mime);if(!value)return 0;const q=/;\s*q=([0-9.]+)/.exec(value);return q?Number(q[1]):1;};return quality('image/avif')>0&&quality('image/avif')>=quality('image/webp')?'avif':'webp';}
