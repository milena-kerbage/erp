import { erpApi, jsonBodyERP } from '@/lib/erp/server';
import { listTeam, inviteMember } from '@/lib/erp/access';
export const runtime = 'nodejs';
export async function GET(request:Request) { return erpApi(request,{},user=>listTeam(user)); }
export async function POST(request:Request) { return erpApi(request,{mutation:true,roles:['admin']},async user=>inviteMember(await jsonBodyERP(request),user,process.env.AUTH_ORIGIN || new URL(request.url).origin)); }
