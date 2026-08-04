import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { outgoingLetters } from "../../../db/schema";
import { addAudit, ADMIN_ROLES, auditDifference, MANAGE_ROLES, READ_ROLES, requireRole, WRITE_ROLES } from "../../security";
import { cleanText, parsePositiveId, serverError, validDateFields } from "../validation";
import { readListQuery } from "../list-query";
import { OUTGOING_TEMPLATE_KEYS } from "../../outgoing-templates";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Terjadi kesalahan.";
  return Response.json({ error: message }, { status: 500 });
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
        like(outgoingLetters.letterNumber, pattern),
        like(outgoingLetters.recipient, pattern),
        like(outgoingLetters.subject, pattern),
      ));
    }
    if (status && status !== "Semua") conditions.push(eq(outgoingLetters.status, status));
    const where = conditions.length ? and(...conditions) : undefined;
    const db = await getDb();
    const [rows, [totalRow], [summary]] = await Promise.all([
      db.select().from(outgoingLetters).where(where).orderBy(desc(outgoingLetters.letterDate), desc(outgoingLetters.id)).limit(perPage).offset(offset),
      db.select({ value: sql<number>`count(*)` }).from(outgoingLetters).where(where),
      db.select({
        total: sql<number>`count(*)`,
        draft: sql<number>`sum(case when ${outgoingLetters.status} = 'Draf' then 1 else 0 end)`,
        pending: sql<number>`sum(case when ${outgoingLetters.status} = 'Menunggu Persetujuan' then 1 else 0 end)`,
        sent: sql<number>`sum(case when ${outgoingLetters.status} = 'Terkirim' then 1 else 0 end)`,
      }).from(outgoingLetters),
    ]);
    return Response.json({
      letters: rows,
      currentUser: auth.user,
      pagination: { page, perPage, total: Number(totalRow?.value ?? 0) },
      summary: {
        total: Number(summary?.total ?? 0),
        draft: Number(summary?.draft ?? 0),
        pending: Number(summary?.pending ?? 0),
        sent: Number(summary?.sent ?? 0),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, string>;
    const required = ["letterNumber", "letterDate", "recipient", "subject", "signatory"];
    const missing = required.find((key) => !payload[key]?.trim());

    if (missing) {
      return Response.json({ error: `Kolom ${missing} wajib diisi.` }, { status: 400 });
    }
    const dateError = validDateFields(payload, ["letterDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });
    const templateKey = OUTGOING_TEMPLATE_KEYS.includes(payload.templateKey as typeof OUTGOING_TEMPLATE_KEYS[number]) ? payload.templateKey : "custom";
    const content = cleanText(payload.content, 12000);

    const db = await getDb();
    const [letter] = await db
      .insert(outgoingLetters)
      .values({
        letterNumber: payload.letterNumber.trim(),
        letterDate: payload.letterDate,
        recipient: payload.recipient.trim(),
        subject: payload.subject.trim(),
        category: payload.category?.trim() || "Umum",
        signatory: payload.signatory.trim(),
        deliveryMethod: payload.deliveryMethod?.trim() || "Diantar",
        templateKey,
        content,
        status: "Draf",
        notes: payload.notes?.trim() || "",
      })
      .returning();

    await addAudit(auth.user, "Tambah surat keluar", "Surat Keluar", `${letter.letterNumber} — ${letter.recipient}`);
    return Response.json({ letter }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, unknown>;
    const id = parsePositiveId(payload.id);
    if (!id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }
    const dateError = validDateFields(payload, ["letterDate"]);
    if (dateError) return Response.json({ error: dateError }, { status: 400 });

    const db = await getDb();
    const [current] = await db
      .select()
      .from(outgoingLetters)
      .where(eq(outgoingLetters.id, id))
      .limit(1);
    if (!current) {
      return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    if (payload.status) {
      const nextStatus = String(payload.status);
      const manager = MANAGE_ROLES.includes(auth.user.role);
      const allowedTransition =
        (current.status === "Draf" && nextStatus === "Menunggu Persetujuan") ||
        (current.status === "Ditolak" && nextStatus === "Menunggu Persetujuan") ||
        (current.status === "Disetujui" && nextStatus === "Terkirim") ||
        (current.status === "Menunggu Persetujuan" &&
          manager &&
          ["Disetujui", "Ditolak"].includes(nextStatus));
      if (!allowedTransition) {
        return Response.json(
          { error: "Perubahan status tidak sesuai alur persetujuan atau peran Anda." },
          { status: 403 },
        );
      }
      if (nextStatus === "Ditolak" && !String(payload.approvalNote ?? "").trim()) {
        return Response.json(
          { error: "Catatan penolakan wajib diisi." },
          { status: 400 },
        );
      }
      updates.status = nextStatus;
      if (["Disetujui", "Ditolak"].includes(nextStatus)) {
        updates.approvalNote = String(payload.approvalNote ?? "").trim();
        updates.approvedBy = auth.user.displayName;
        updates.approvedAt = new Date().toISOString();
      } else if (nextStatus === "Menunggu Persetujuan") {
        updates.approvalNote = "";
        updates.approvedBy = null;
        updates.approvedAt = null;
      }
    }
    if (
      payload.status === undefined &&
      !["Draf", "Ditolak"].includes(current.status)
    ) {
      return Response.json(
        { error: "Hanya surat berstatus Draf atau Ditolak yang dapat diedit." },
        { status: 403 },
      );
    }
    for (const key of ["letterNumber", "letterDate", "recipient", "subject", "category", "signatory", "deliveryMethod", "notes", "content"]) {
      if (payload[key] !== undefined) updates[key] = String(payload[key]).trim();
    }
    if (payload.templateKey !== undefined) {
      const templateKey = String(payload.templateKey);
      if (!OUTGOING_TEMPLATE_KEYS.includes(templateKey as typeof OUTGOING_TEMPLATE_KEYS[number])) {
        return Response.json({ error: "Template Karta Sai tidak valid." }, { status: 400 });
      }
      updates.templateKey = templateKey;
    }
    if (Object.keys(updates).length === 0) {
      return Response.json({ error: "Tidak ada data yang diperbarui." }, { status: 400 });
    }

    const [letter] = await db
      .update(outgoingLetters)
      .set(updates)
      .where(eq(outgoingLetters.id, id))
      .returning();
    if (!letter) return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    const action = payload.status
      ? `Status surat: ${String(payload.status)}`
      : "Perbarui surat keluar";
    await addAudit(auth.user, action, "Surat Keluar", `${letter.letterNumber} — ${letter.recipient}`, {
      entityId: id,
      ...auditDifference(current, letter, Object.keys(updates), ["letterNumber", "letterDate", "recipient", "subject", "category", "signatory", "deliveryMethod", "templateKey", "content", "status", "approvalNote", "approvedBy", "approvedAt"]),
    });
    return Response.json({ letter });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRole(request, ADMIN_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as { id?: number };
    const id = parsePositiveId(payload.id);
    if (!id) {
      return Response.json({ error: "ID wajib disertakan." }, { status: 400 });
    }

    const db = await getDb();
    const [deleted] = await db
      .delete(outgoingLetters)
      .where(eq(outgoingLetters.id, id))
      .returning();

    if (!deleted) {
      return Response.json({ error: "Surat tidak ditemukan." }, { status: 404 });
    }

    await addAudit(auth.user, "Hapus surat keluar", "Surat Keluar", `${deleted.letterNumber}`);

    return Response.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
