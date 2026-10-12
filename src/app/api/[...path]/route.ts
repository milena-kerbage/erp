const missing=()=>Response.json({error:'Rota de API não encontrada.',code:'NOT_FOUND'},{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export const GET=missing;
export const POST=missing;
export const PUT=missing;
export const PATCH=missing;
export const DELETE=missing;
export const OPTIONS=missing;
