import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { officeEvents } from "../../../db/schema";
import { OFFICE_EVENT_PRIORITIES, OFFICE_EVENT_STATUSES, OFFICE_EVENT_TYPES, isOfficeEventOverdue } from "../../office-calendar";
import { addAudit, ADMIN_ROLES, auditDifference, READ_ROLES, requireRole, WRITE_ROLES } from "../../security";
import { readListQuery } from "../list-query";
import { cleanText, isIsoDate, parsePositiveId, serverError } from "../validation";

function readPayload(payload: Record<string, unknown>) {
  const values = {
    title: cleanText(payload.title, 200),
    eventType: cleanText(payload.eventType, 60),
    eventDate: String(payload.eventDate ?? ""),
    startTime: String(payload.startTime ?? ""),
    endTime: String(payload.endTime ?? ""),
    location: cleanText(payload.location, 200),
    responsiblePerson: cleanText(payload.responsiblePerson, 150),
    priority: cleanText(payload.priority, 30),
    status: cleanText(payload.status, 40),
    description: cleanText(payload.description, 2000),
  };
  if (!values.title || !values.location || !values.responsiblePerson) return { error: "Judul, lokasi, dan penanggung jawab agenda wajib diisi." };
  if (!isIsoDate(values.eventDate)) return { error: "Tanggal agenda tidak valid." };
  if (!/^\d{2}:\d{2}$/.test(values.startTime) || (values.endTime && !/^\d{2}:\d{2}$/.test(values.endTime))) return { error: "Waktu agenda tidak valid." };
  if (values.endTime && values.endTime < values.startTime) return { error: "Waktu selesai tidak boleh sebelum waktu mulai." };
  if (!OFFICE_EVENT_TYPES.includes(values.eventType as typeof OFFICE_EVENT_TYPES[number]) || !OFFICE_EVENT_STATUSES.includes(values.status as typeof OFFICE_EVENT_STATUSES[number]) || !OFFICE_EVENT_PRIORITIES.includes(values.priority as typeof OFFICE_EVENT_PRIORITIES[number])) return { error: "Kategori, prioritas, atau status agenda tidak valid." };
  return { values };
}

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;
    const { page, perPage, offset, query, params } = readListQuery(request);
    const status = (params.get("status") ?? "").trim();
    const month = (params.get("month") ?? "").trim();
    const conditions = [];
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(or(like(officeEvents.title, pattern), like(officeEvents.location, pattern), like(officeEvents.responsiblePerson, pattern)));
    }
    if (status && status !== "Semua") conditions.push(eq(officeEvents.status, status));
    if (/^\d{4}-\d{2}$/.test(month)) conditions.push(like(officeEvents.eventDate, `${month}-%`));
    const where = conditions.length ? and(...conditions) : undefined;
    const today = new Date().toISOString().slice(0, 10);
    const db = await getDb();
    const [events, [total], [summary]] = await Promise.all([
      db.select().from(officeEvents).where(where).orderBy(asc(officeEvents.eventDate), asc(officeEvents.startTime)).limit(perPage).offset(offset),
      db.select({ value: sql<number>`count(*)` }).from(officeEvents).where(where),
      db.select({
        total: sql<number>`count(*)`,
        today: sql<number>`sum(case when ${officeEvents.eventDate} = ${today} and ${officeEvents.status} != 'Dibatalkan' then 1 else 0 end)`,
        upcoming: sql<number>`sum(case when ${officeEvents.eventDate} > ${today} and ${officeEvents.status} = 'Dijadwalkan' then 1 else 0 end)`,
        overdue: sql<number>`sum(case when ${officeEvents.eventDate} < ${today} and ${officeEvents.status} not in ('Selesai','Dibatalkan') then 1 else 0 end)`,
      }).from(officeEvents),
    ]);
    return Response.json({
      events: events.map((event) => ({ ...event, overdue: isOfficeEventOverdue(event.eventDate, event.status, today) })),
      pagination: { page, perPage, total: Number(total?.value ?? 0) },
      summary: { total: Number(summary?.total ?? 0), today: Number(summary?.today ?? 0), upcoming: Number(summary?.upcoming ?? 0), overdue: Number(summary?.overdue ?? 0) },
      currentUser: auth.user,
    });
  } catch (error) { return serverError(error); }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const parsed = readPayload(await request.json() as Record<string, unknown>);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const [event] = await (await getDb()).insert(officeEvents).values(parsed.values).returning();
    await addAudit(auth.user, "Tambah agenda kantor", "Kalender & Agenda", `${event.eventDate} — ${event.title}`, { entityId: event.id });
    return Response.json({ event }, { status: 201 });
  } catch (error) { return serverError(error); }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = await request.json() as Record<string, unknown>;
    const id = parsePositiveId(payload.id);
    if (!id) return Response.json({ error: "ID agenda tidak valid." }, { status: 400 });
    const parsed = readPayload(payload);
    if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
    const db = await getDb();
    const [before] = await db.select().from(officeEvents).where(eq(officeEvents.id, id)).limit(1);
    if (!before) return Response.json({ error: "Agenda tidak ditemukan." }, { status: 404 });
    const [event] = await db.update(officeEvents).set({ ...parsed.values, updatedAt: new Date().toISOString() }).where(eq(officeEvents.id, id)).returning();
    await addAudit(auth.user, "Perbarui agenda kantor", "Kalender & Agenda", `${event.eventDate} — ${event.title}`, auditDifference(before, event, id));
    return Response.json({ event });
  } catch (error) { return serverError(error); }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ADMIN_ROLES);
    if ("response" in auth) return auth.response;
    const id = parsePositiveId((await request.json() as { id?: unknown }).id);
    if (!id) return Response.json({ error: "ID agenda tidak valid." }, { status: 400 });
    const [event] = await (await getDb()).delete(officeEvents).where(eq(officeEvents.id, id)).returning();
    if (!event) return Response.json({ error: "Agenda tidak ditemukan." }, { status: 404 });
    await addAudit(auth.user, "Hapus agenda kantor", "Kalender & Agenda", `${event.eventDate} — ${event.title}`, { entityId: id });
    return Response.json({ success: true });
  } catch (error) { return serverError(error); }
}
