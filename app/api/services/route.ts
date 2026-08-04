import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { administrativeServices } from "../../../db/schema";
import {
  addAudit,
  ADMIN_ROLES,
  auditDifference,
  READ_ROLES,
  requireRole,
  WRITE_ROLES,
} from "../../security";
import { readListQuery } from "../list-query";
import {
  cleanText,
  isIsoDate,
  parsePositiveId,
  serverError,
} from "../validation";

const serviceStatuses = new Set(["Baru", "Diproses", "Menunggu", "Selesai", "Dibatalkan"]);
const serviceTypes = new Set([
  "Surat Keterangan",
  "Surat Rekomendasi",
  "Pengesahan Dokumen",
  "Permintaan Data",
  "Rujukan Administrasi",
  "Lainnya",
]);

function readServicePayload(payload: Record<string, unknown>) {
  const serviceNumber = cleanText(payload.serviceNumber, 60);
  const applicantName = cleanText(payload.applicantName, 150);
  const suco = cleanText(payload.suco, 100);
  const serviceType = cleanText(payload.serviceType, 100);
  const receivedDate = String(payload.receivedDate ?? "");
  const dueDate = String(payload.dueDate ?? "");
  const assignedTo = cleanText(payload.assignedTo, 150);
  const requirements = cleanText(payload.requirements, 2000);
  const status = cleanText(payload.status, 40) || "Baru";
  const notes = cleanText(payload.notes, 2000);

  if (!serviceNumber || !applicantName || !suco || !assignedTo) {
    return { error: "Nomor pelayanan, nama pemohon, Suco, dan penanggung jawab wajib diisi." };
  }
  if (!serviceTypes.has(serviceType) || !serviceStatuses.has(status)) {
    return { error: "Jenis pelayanan atau status tidak valid." };
  }
  if (!isIsoDate(receivedDate) || !isIsoDate(dueDate) || dueDate < receivedDate) {
    return { error: "Tanggal masuk dan tenggat wajib valid. Tenggat tidak boleh sebelum tanggal masuk." };
  }
  return {
    values: {
      serviceNumber,
      applicantName,
      suco,
      serviceType,
      receivedDate,
      dueDate,
      assignedTo,
      requirements,
      status,
      notes,
    },
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const { page, perPage, offset, query, params } = readListQuery(request);
    const status = (params.get("status") ?? "").trim();
    const conditions = [];
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(or(
        like(administrativeServices.serviceNumber, pattern),
        like(administrativeServices.applicantName, pattern),
        like(administrativeServices.suco, pattern),
        like(administrativeServices.serviceType, pattern),
        like(administrativeServices.assignedTo, pattern),
      ));
    }
    if (status && status !== "Semua") conditions.push(eq(administrativeServices.status, status));
    const where = conditions.length ? and(...conditions) : undefined;
    const today = new Date().toISOString().slice(0, 10);
    const db = await getDb();
    const [services, [totalRow], [summary]] = await Promise.all([
      db.select().from(administrativeServices).where(where).orderBy(desc(administrativeServices.receivedDate), desc(administrativeServices.id)).limit(perPage).offset(offset),
      db.select({ value: sql<number>`count(*)` }).from(administrativeServices).where(where),
      db.select({
        total: sql<number>`count(*)`,
        fresh: sql<number>`sum(case when ${administrativeServices.status} = 'Baru' then 1 else 0 end)`,
        processing: sql<number>`sum(case when ${administrativeServices.status} in ('Diproses', 'Menunggu') then 1 else 0 end)`,
        overdue: sql<number>`sum(case when ${administrativeServices.dueDate} < ${today} and ${administrativeServices.status} not in ('Selesai', 'Dibatalkan') then 1 else 0 end)`,
        completed: sql<number>`sum(case when ${administrativeServices.status} = 'Selesai' then 1 else 0 end)`,
      }).from(administrativeServices),
    ]);
    return Response.json({
      services: services.map((service) => ({
        ...service,
        overdue: service.dueDate < today && !["Selesai", "Dibatalkan"].includes(service.status),
      })),
      pagination: { page, perPage, total: Number(totalRow?.value ?? 0) },
      summary: {
        total: Number(summary?.total ?? 0),
        fresh: Number(summary?.fresh ?? 0),
        processing: Number(summary?.processing ?? 0),
        overdue: Number(summary?.overdue ?? 0),
        completed: Number(summary?.completed ?? 0),
      },
      currentUser: auth.user,
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const parsed = readServicePayload(await request.json() as Record<string, unknown>);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const db = await getDb();
    const [existing] = await db.select({ id: administrativeServices.id }).from(administrativeServices).where(eq(administrativeServices.serviceNumber, parsed.values.serviceNumber)).limit(1);
    if (existing) return Response.json({ error: "Nomor pelayanan sudah digunakan." }, { status: 409 });
    const now = new Date().toISOString();
    const [service] = await db.insert(administrativeServices).values({
      ...parsed.values,
      completedAt: parsed.values.status === "Selesai" ? now : null,
      updatedAt: now,
    }).returning();
    await addAudit(auth.user, "Tambah pelayanan administrasi", "Pelayanan Administrasi", `${service.serviceNumber} — ${service.serviceType}`, { entityId: service.id });
    return Response.json({ service }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as Record<string, unknown>;
    const id = parsePositiveId(payload.id);
    if (!id) return Response.json({ error: "ID pelayanan tidak valid." }, { status: 400 });
    const parsed = readServicePayload(payload);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const db = await getDb();
    const [before] = await db.select().from(administrativeServices).where(eq(administrativeServices.id, id)).limit(1);
    if (!before) return Response.json({ error: "Pelayanan tidak ditemukan." }, { status: 404 });
    const [duplicate] = await db.select({ id: administrativeServices.id }).from(administrativeServices).where(and(eq(administrativeServices.serviceNumber, parsed.values.serviceNumber), sql`${administrativeServices.id} != ${id}`)).limit(1);
    if (duplicate) return Response.json({ error: "Nomor pelayanan sudah digunakan." }, { status: 409 });
    const now = new Date().toISOString();
    const [service] = await db.update(administrativeServices).set({
      ...parsed.values,
      completedAt: parsed.values.status === "Selesai" ? before.completedAt ?? now : null,
      updatedAt: now,
    }).where(eq(administrativeServices.id, id)).returning();
    await addAudit(auth.user, "Perbarui pelayanan administrasi", "Pelayanan Administrasi", `${service.serviceNumber} — ${service.status}`, auditDifference(before, service, id));
    return Response.json({ service });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ADMIN_ROLES);
    if ("response" in auth) return auth.response;
    const id = parsePositiveId((await request.json() as { id?: unknown }).id);
    if (!id) return Response.json({ error: "ID pelayanan tidak valid." }, { status: 400 });
    const db = await getDb();
    const [deleted] = await db.delete(administrativeServices).where(eq(administrativeServices.id, id)).returning();
    if (!deleted) return Response.json({ error: "Pelayanan tidak ditemukan." }, { status: 404 });
    await addAudit(auth.user, "Hapus pelayanan administrasi", "Pelayanan Administrasi", `${deleted.serviceNumber} — ${deleted.serviceType}`, { entityId: id });
    return Response.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
