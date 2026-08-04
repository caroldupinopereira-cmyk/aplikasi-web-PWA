import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { publicComplaints, staffUsers } from "../../../db/schema";
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES, COMPLAINT_STATUSES, canReadAllComplaints, isComplaintOverdue } from "../../public-complaints";
import { addAudit, ADMIN_ROLES, auditDifference, requireRole, WRITE_ROLES } from "../../security";
import { readListQuery } from "../list-query";
import { cleanText, isIsoDate, parsePositiveId, serverError } from "../validation";

async function parsePayload(payload: Record<string, unknown>, user: { id:number; role:string }) {
  const db = await getDb();
  const assignedId = user.role === "Staf" ? user.id : parsePositiveId(payload.assignedToStaffId);
  if (!assignedId) return { error: "Staf penanggung jawab wajib dipilih." };
  const [assignee] = await db.select().from(staffUsers).where(and(eq(staffUsers.id, assignedId), eq(staffUsers.active, true), eq(staffUsers.role, "Staf"))).limit(1);
  if (!assignee) return { error: "Staf penanggung jawab tidak ditemukan atau tidak aktif." };
  const values = {
    complaintNumber: cleanText(payload.complaintNumber,60), reporterName: cleanText(payload.reporterName,150),
    suco: cleanText(payload.suco,100), category: cleanText(payload.category,80), location: cleanText(payload.location,200),
    summary: cleanText(payload.summary,3000), priority: cleanText(payload.priority,30), status: cleanText(payload.status,40),
    assignedToStaffId: assignee.id, assignedToName: assignee.displayName, followUp: cleanText(payload.followUp,3000),
    receivedDate: String(payload.receivedDate??""), dueDate: String(payload.dueDate??""),
  };
  if(!values.complaintNumber||!values.suco||!values.location||!values.summary)return{error:"Nomor, Suco, lokasi, dan ringkasan pengaduan wajib diisi."};
  if(!isIsoDate(values.receivedDate)||!isIsoDate(values.dueDate)||values.dueDate<values.receivedDate)return{error:"Tanggal diterima dan tenggat pengaduan tidak valid."};
  if(!COMPLAINT_CATEGORIES.includes(values.category as typeof COMPLAINT_CATEGORIES[number])||!COMPLAINT_PRIORITIES.includes(values.priority as typeof COMPLAINT_PRIORITIES[number])||!COMPLAINT_STATUSES.includes(values.status as typeof COMPLAINT_STATUSES[number]))return{error:"Kategori, prioritas, atau status pengaduan tidak valid."};
  return { values };
}

export async function GET(request:Request){
 try{
  const auth=await requireRole(request,WRITE_ROLES);if("response"in auth)return auth.response;
  const {page,perPage,offset,query,params}=readListQuery(request);const status=(params.get("status")??"").trim();const conditions=[];
  if(!canReadAllComplaints(auth.user.role))conditions.push(eq(publicComplaints.assignedToStaffId,auth.user.id));
  if(query){const p=`%${query}%`;conditions.push(or(like(publicComplaints.complaintNumber,p),like(publicComplaints.suco,p),like(publicComplaints.category,p),like(publicComplaints.location,p),like(publicComplaints.summary,p)))}
  if(status&&status!=="Semua")conditions.push(eq(publicComplaints.status,status));const where=conditions.length?and(...conditions):undefined;
  const scope=canReadAllComplaints(auth.user.role)?undefined:eq(publicComplaints.assignedToStaffId,auth.user.id);const today=new Date().toISOString().slice(0,10);const db=await getDb();
  const [items,[total],[summary],staff]=await Promise.all([
   db.select().from(publicComplaints).where(where).orderBy(desc(publicComplaints.receivedDate),desc(publicComplaints.id)).limit(perPage).offset(offset),
   db.select({value:sql<number>`count(*)`}).from(publicComplaints).where(where),
   db.select({total:sql<number>`count(*)`,open:sql<number>`sum(case when ${publicComplaints.status} in ('Baru','Diproses','Menunggu') then 1 else 0 end)`,urgent:sql<number>`sum(case when ${publicComplaints.priority} = 'Mendesak' and ${publicComplaints.status} not in ('Selesai','Ditutup') then 1 else 0 end)`,overdue:sql<number>`sum(case when ${publicComplaints.dueDate}<${today} and ${publicComplaints.status} not in ('Selesai','Ditutup') then 1 else 0 end)`,completed:sql<number>`sum(case when ${publicComplaints.status} in ('Selesai','Ditutup') then 1 else 0 end)`}).from(publicComplaints).where(scope),
   db.select({id:staffUsers.id,displayName:staffUsers.displayName}).from(staffUsers).where(and(eq(staffUsers.active,true),eq(staffUsers.role,"Staf")))
  ]);
  return Response.json({complaints:items.map(x=>({...x,overdue:isComplaintOverdue(x.dueDate,x.status,today)})),pagination:{page,perPage,total:Number(total?.value??0)},summary:{total:Number(summary?.total??0),open:Number(summary?.open??0),urgent:Number(summary?.urgent??0),overdue:Number(summary?.overdue??0),completed:Number(summary?.completed??0)},assignableStaff:staff,currentUser:auth.user});
 }catch(e){return serverError(e)}
}
export async function POST(request:Request){try{const auth=await requireRole(request,WRITE_ROLES);if("response"in auth)return auth.response;const p=await request.json() as Record<string,unknown>;const parsed=await parsePayload(p,auth.user);if("error"in parsed)return Response.json({error:parsed.error},{status:400});const db=await getDb();const [dupe]=await db.select({id:publicComplaints.id}).from(publicComplaints).where(eq(publicComplaints.complaintNumber,parsed.values.complaintNumber)).limit(1);if(dupe)return Response.json({error:"Nomor pengaduan sudah digunakan."},{status:409});const [item]=await db.insert(publicComplaints).values({...parsed.values,createdByStaffId:auth.user.id,resolvedAt:["Selesai","Ditutup"].includes(parsed.values.status)?new Date().toISOString():null}).returning();await addAudit(auth.user,"Tambah pengaduan masyarakat","Pengaduan & Aspirasi",`${item.complaintNumber} — ${item.category}`,{entityId:item.id});return Response.json({complaint:item},{status:201})}catch(e){return serverError(e)}}
export async function PATCH(request:Request){try{const auth=await requireRole(request,WRITE_ROLES);if("response"in auth)return auth.response;const p=await request.json() as Record<string,unknown>;const id=parsePositiveId(p.id);if(!id)return Response.json({error:"ID pengaduan tidak valid."},{status:400});const db=await getDb();const [before]=await db.select().from(publicComplaints).where(eq(publicComplaints.id,id)).limit(1);if(!before)return Response.json({error:"Pengaduan tidak ditemukan."},{status:404});if(!canReadAllComplaints(auth.user.role)&&before.assignedToStaffId!==auth.user.id)return Response.json({error:"Anda tidak memiliki akses ke pengaduan ini."},{status:403});const parsed=await parsePayload(p,auth.user);if("error"in parsed)return Response.json({error:parsed.error},{status:400});const [item]=await db.update(publicComplaints).set({...parsed.values,resolvedAt:["Selesai","Ditutup"].includes(parsed.values.status)?before.resolvedAt??new Date().toISOString():null,updatedAt:new Date().toISOString()}).where(eq(publicComplaints.id,id)).returning();await addAudit(auth.user,"Perbarui pengaduan masyarakat","Pengaduan & Aspirasi",`${item.complaintNumber} — ${item.status}`,auditDifference(before,item,id));return Response.json({complaint:item})}catch(e){return serverError(e)}}
export async function DELETE(request:Request){try{const auth=await requireRole(request,ADMIN_ROLES);if("response"in auth)return auth.response;const id=parsePositiveId((await request.json() as {id?:unknown}).id);if(!id)return Response.json({error:"ID pengaduan tidak valid."},{status:400});const [item]=await(await getDb()).delete(publicComplaints).where(eq(publicComplaints.id,id)).returning();if(!item)return Response.json({error:"Pengaduan tidak ditemukan."},{status:404});await addAudit(auth.user,"Hapus pengaduan masyarakat","Pengaduan & Aspirasi",item.complaintNumber,{entityId:id});return Response.json({success:true})}catch(e){return serverError(e)}}
