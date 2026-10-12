import { erpApi } from '@/lib/erp/server';
import { ERP_ROUTE_CATALOG } from '@/lib/erp/catalog';
import { ERP_RESOURCES } from '@/lib/erp/types';
import { storageConfiguration } from '@/lib/database';
export const runtime='nodejs';
export async function GET(request:Request) {return erpApi(request,{allowApiKey:true},async()=>({baseUrl:process.env.AUTH_ORIGIN || new URL(request.url).origin,storage:storageConfiguration(),resources:ERP_RESOURCES,routes:ERP_ROUTE_CATALOG}));}
