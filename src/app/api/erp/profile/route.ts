import { erpApi, jsonBodyERP } from '@/lib/erp/server';
import { currentMember, updateMember } from '@/lib/erp/access';
export const runtime = 'nodejs';
export async function GET(request:Request) { return erpApi(request,{},async user=>({currentUser:await currentMember(user)})); }
export async function PATCH(request:Request) { return erpApi(request,{mutation:true},async user=>({currentUser:await updateMember(user.id,await jsonBodyERP(request),user,true)})); }
