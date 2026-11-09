import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {compressImage,IMAGE_PROFILES,requestedImageFormat} from '../src/lib/storage/images.ts';
async function original(){const width=1800,height=1200,raw=Buffer.alloc(width*height*3);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*3;raw[i]=(x*13+y*7)%256;raw[i+1]=(x*3+y*11)%256;raw[i+2]=(x^y)%256;}return sharp(raw,{raw:{width,height,channels:3}}).jpeg({quality:95}).withMetadata({orientation:6,exif:{IFD0:{Artist:'Dados pessoais que devem sair'}}}).toBuffer();}

test('produto preserva mais detalhe e avaliação usa compressão mais forte em WebP e AVIF',async()=>{
 const source=await original(),review=await compressImage(source,'review'),product=await compressImage(source,'product');
 assert.equal(review.height,1280);assert.equal(product.height,1600);assert.ok(product.webp.large.length>review.webp.large.length);assert.ok(product.avif.large.length>review.avif.large.length);
 assert.ok(IMAGE_PROFILES.product.webp>IMAGE_PROFILES.review.webp);assert.ok(IMAGE_PROFILES.product.avif>IMAGE_PROFILES.review.avif);
 for(const output of [review,product])for(const format of ['webp','avif'])for(const variant of ['large','small']){const bytes=output[format][variant],metadata=await sharp(bytes).metadata();assert.equal(format==='webp'?metadata.format:metadata.compression,format==='webp'?'webp':'av1');assert.equal(metadata.exif,undefined);assert.equal(metadata.icc,undefined);assert.equal(metadata.xmp,undefined);assert.ok(!bytes.includes(Buffer.from('Dados pessoais')));assert.ok(bytes.length<source.length);}
});
test('não amplia imagem pequena e preserva transparência',async()=>{
 const image=await sharp({create:{width:80,height:60,channels:4,background:{r:255,g:0,b:0,alpha:0.3}}}).png().toBuffer();
 const output=await compressImage(image,'profile');assert.equal(output.width,80);assert.equal(output.height,60);assert.equal((await sharp(output.webp.large).metadata()).hasAlpha,true);assert.equal((await sharp(output.avif.large).metadata()).hasAlpha,true);
});
test('limites e conteúdo inválido são recusados sem encodar',async()=>{
 await assert.rejects(compressImage(Buffer.from('<svg onload="evil"/>')),{code:'INVALID_IMAGE'});
 await assert.rejects(compressImage(Buffer.alloc(12*1024*1024+1)),{status:413});
 const huge=await sharp({create:{width:5000,height:5000,channels:3,background:'white'}}).png().toBuffer();await assert.rejects(compressImage(huge),{code:'INVALID_IMAGE'});
});
test('negociação respeita q=0, formato explícito e fallback WebP',()=>{
 const request=(query,accept)=>new Request('https://loja.example/image'+query,{headers:{accept}});
 assert.equal(requestedImageFormat(request('','image/avif,image/webp')),'avif');assert.equal(requestedImageFormat(request('','image/avif;q=0,image/webp')),'webp');assert.equal(requestedImageFormat(request('?formato=webp','image/avif')),'webp');assert.equal(requestedImageFormat(request('?formato=avif','*/*')),'avif');assert.equal(requestedImageFormat(request('','*/*')),'webp');
});
