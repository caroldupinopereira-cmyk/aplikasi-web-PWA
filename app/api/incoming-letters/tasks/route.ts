import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import {
  incomingLetterMessages,
  incomingLetters,
  incomingLetterTasks,
  documents,
  outgoingLetters,
  staffUsers,
} from "../../../../db/schema";
import {
  addAudit,
  MANAGE_ROLES,
  READ_ROLES,
  requireRole,
  WRITE_ROLES,
} from "../../../security";
import { cleanText, isIsoDate, parsePositiveId } from "../../validation";

const managerRoles = new Set<string>(MANAGE_ROLES);
const resultTypes = new Set(["Karta Sai", "Dokumen Arsip", "Catatan"]);

async function readLetterContext(request: Request, letterId: number) {
  const auth = await requireRole(request, READ_ROLES);
  if ("response" in auth) return auth;
  const db = await getDb();
  const [letter] = await db
    .select()
    .from(incomingLetters)
    .where(eq(incomingLetters.id, letterId))
    .limit(1);
  if (!letter) {
    return {
      response: Response.json(
        { error: "Karta Tama tidak ditemukan." },
        { status: 404 },
      ),
    };
  }
  return { auth, db, letter };
}

export async function GET(request: Request) {
  try {
    const letterId = parsePositiveId(
      new URL(request.url).searchParams.get("letterId"),
    );
    if (!letterId) {
      return Response.json({ error: "ID Karta Tama wajib diisi." }, { status: 400 });
    }
    const context = await readLetterContext(request, letterId);
    if ("response" in context) return context.response;
    const { auth, db, letter } = context;
    const canManage = managerRoles.has(auth.user.role);
    const [[task], messages, assignableStaff, availableOutgoing, availableDocuments] = await Promise.all([
      db
        .select()
        .from(incomingLetterTasks)
        .where(eq(incomingLetterTasks.incomingLetterId, letterId))
        .limit(1),
      db
        .select()
        .from(incomingLetterMessages)
        .where(eq(incomingLetterMessages.incomingLetterId, letterId))
        .orderBy(incomingLetterMessages.createdAt, incomingLetterMessages.id),
      canManage
        ? db
            .select({
              id: staffUsers.id,
              displayName: staffUsers.displayName,
              email: staffUsers.email,
            })
            .from(staffUsers)
            .where(and(eq(staffUsers.active, true), eq(staffUsers.role, "Staf")))
            .orderBy(staffUsers.displayName)
        : Promise.resolve([]),
      db
        .select({
          id: outgoingLetters.id,
          letterNumber: outgoingLetters.letterNumber,
          subject: outgoingLetters.subject,
          status: outgoingLetters.status,
        })
        .from(outgoingLetters)
        .orderBy(desc(outgoingLetters.id))
        .limit(100),
      db
        .select({
          id: documents.id,
          title: documents.title,
          referenceNumber: documents.referenceNumber,
          fileName: documents.fileName,
        })
        .from(documents)
        .orderBy(desc(documents.id))
        .limit(100),
    ]);
    const isAssignee = task?.assignedToStaffId === auth.user.id;
    return Response.json({
      letter,
      task: task ?? null,
      messages,
      assignableStaff,
      availableOutgoing,
      availableDocuments,
      linkedOutgoing:
        availableOutgoing.find((item) => item.id === task?.outgoingLetterId) ?? null,
      linkedDocument:
        availableDocuments.find((item) => item.id === task?.documentId) ?? null,
      permissions: {
        canManage,
        canReply: canManage || isAssignee,
        canSubmit: isAssignee && ["Diproses", "Perlu Perbaikan"].includes(task?.status ?? ""),
        canReview: canManage && task?.status === "Diajukan Selesai",
      },
    });
  } catch {
    return Response.json(
      { error: "Tugas dan diskusi belum dapat dimuat." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, WRITE_ROLES);
    if ("response" in auth) return auth.response;
    const payload = (await request.json()) as Record<string, unknown>;
    const letterId = parsePositiveId(payload.letterId);
    const action = String(payload.action ?? "");
    if (!letterId) {
      return Response.json({ error: "ID Karta Tama wajib diisi." }, { status: 400 });
    }
    const context = await readLetterContext(request, letterId);
    if ("response" in context) return context.response;
    const { db, letter } = context;
    const canManage = managerRoles.has(auth.user.role);
    const [task] = await db
      .select()
      .from(incomingLetterTasks)
      .where(eq(incomingLetterTasks.incomingLetterId, letterId))
      .limit(1);
    const isAssignee = task?.assignedToStaffId === auth.user.id;
    const now = new Date().toISOString();

    if (action === "disposition") {
      if (!canManage) {
        return Response.json({ error: "Hanya Pimpinan atau Administrator yang dapat memberi disposisi." }, { status: 403 });
      }
      const staffUserId = parsePositiveId(payload.staffUserId);
      const instruction = cleanText(payload.instruction, 2000);
      const dueDate = String(payload.dueDate ?? "");
      const resultType = String(payload.resultType ?? "");
      if (!staffUserId || !instruction || !isIsoDate(dueDate) || !resultTypes.has(resultType)) {
        return Response.json(
          { error: "Penanggung jawab, instruksi, tenggat, dan jenis hasil wajib diisi dengan benar." },
          { status: 400 },
        );
      }
      const [assignee] = await db
        .select()
        .from(staffUsers)
        .where(
          and(
            eq(staffUsers.id, staffUserId),
            eq(staffUsers.active, true),
            eq(staffUsers.role, "Staf"),
          ),
        )
        .limit(1);
      if (!assignee) {
        return Response.json({ error: "Staf penanggung jawab tidak ditemukan atau tidak aktif." }, { status: 404 });
      }
      const [savedTask] = await db
        .insert(incomingLetterTasks)
        .values({
          incomingLetterId: letterId,
          assignedToStaffId: assignee.id,
          assignedToName: assignee.displayName,
          assignedToEmail: assignee.email,
          instruction,
          dueDate,
          resultType,
          status: "Diproses",
          assignedByName: auth.user.displayName,
          assignedByEmail: auth.user.email,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: incomingLetterTasks.incomingLetterId,
          set: {
            assignedToStaffId: assignee.id,
            assignedToName: assignee.displayName,
            assignedToEmail: assignee.email,
            instruction,
            dueDate,
            resultType,
            outgoingLetterId: task?.resultType === resultType ? task.outgoingLetterId : null,
            documentId: task?.resultType === resultType ? task.documentId : null,
            completionNote: "",
            status: "Diproses",
            assignedByName: auth.user.displayName,
            assignedByEmail: auth.user.email,
            updatedAt: now,
          },
        })
        .returning();
      await db.insert(incomingLetterMessages).values({
        incomingLetterId: letterId,
        authorName: auth.user.displayName,
        authorEmail: auth.user.email,
        authorRole: auth.user.role,
        message: instruction,
      });
      await db
        .update(incomingLetters)
        .set({ status: "Diproses" })
        .where(eq(incomingLetters.id, letterId));
      await addAudit(
        auth.user,
        "Berikan disposisi Karta Tama",
        "Surat Masuk",
        `${letter.letterNumber} — ${assignee.displayName} — ${dueDate}`,
        { entityId: letterId },
      );
      return Response.json({ task: savedTask });
    }

    if (action === "link-result") {
      if (!task || (!canManage && !isAssignee)) {
        return Response.json({ error: "Anda tidak memiliki izin untuk menghubungkan hasil tugas ini." }, { status: 403 });
      }
      const kind = String(payload.kind ?? "");
      const resultId = parsePositiveId(payload.resultId);
      if (!resultId || !["outgoing", "document"].includes(kind)) {
        return Response.json({ error: "Hasil tugas yang dipilih tidak valid." }, { status: 400 });
      }
      if (
        (kind === "outgoing" && task.resultType !== "Karta Sai") ||
        (kind === "document" && task.resultType === "Catatan")
      ) {
        return Response.json({ error: "Jenis hasil tidak sesuai dengan disposisi tugas." }, { status: 400 });
      }
      if (kind === "outgoing") {
        const [outgoing] = await db
          .select()
          .from(outgoingLetters)
          .where(eq(outgoingLetters.id, resultId))
          .limit(1);
        if (!outgoing) return Response.json({ error: "Karta Sai tidak ditemukan." }, { status: 404 });
        await db.update(incomingLetterTasks).set({ outgoingLetterId: outgoing.id, updatedAt: now }).where(eq(incomingLetterTasks.id, task.id));
      } else {
        const [document] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, resultId))
          .limit(1);
        if (!document) return Response.json({ error: "Dokumen Arsip tidak ditemukan." }, { status: 404 });
        await db.update(incomingLetterTasks).set({ documentId: document.id, updatedAt: now }).where(eq(incomingLetterTasks.id, task.id));
      }
      await addAudit(auth.user, "Hubungkan hasil tugas Karta Tama", "Surat Masuk", `${letter.letterNumber} — ${kind}`, { entityId: letterId });
      return Response.json({ success: true });
    }

    if (action === "message") {
      if (!task || (!canManage && !isAssignee)) {
        return Response.json({ error: "Anda tidak memiliki izin untuk diskusi tugas ini." }, { status: 403 });
      }
      const message = cleanText(payload.message, 2000);
      if (!message) {
        return Response.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
      }
      const [savedMessage] = await db
        .insert(incomingLetterMessages)
        .values({
          incomingLetterId: letterId,
          authorName: auth.user.displayName,
          authorEmail: auth.user.email,
          authorRole: auth.user.role,
          message,
        })
        .returning();
      await addAudit(
        auth.user,
        "Balas diskusi Karta Tama",
        "Surat Masuk",
        `${letter.letterNumber} — ${auth.user.displayName}`,
        { entityId: letterId },
      );
      return Response.json({ message: savedMessage });
    }

    if (action === "submit") {
      if (!task || !isAssignee || !["Diproses", "Perlu Perbaikan"].includes(task.status)) {
        return Response.json({ error: "Tugas ini belum dapat diajukan selesai." }, { status: 403 });
      }
      const completionNote = cleanText(payload.completionNote, 2000);
      if (!completionNote) {
        return Response.json({ error: "Catatan hasil pekerjaan wajib diisi." }, { status: 400 });
      }
      const [linkedOutgoing] = task.outgoingLetterId
        ? await db.select().from(outgoingLetters).where(eq(outgoingLetters.id, task.outgoingLetterId)).limit(1)
        : [];
      if (
        task.resultType === "Karta Sai" &&
        (!linkedOutgoing || !["Disetujui", "Terkirim"].includes(linkedOutgoing.status))
      ) {
        return Response.json(
          { error: "Karta Sai harus disetujui atau terkirim sebelum tugas diajukan selesai." },
          { status: 400 },
        );
      }
      if (task.resultType === "Dokumen Arsip" && !task.documentId) {
        return Response.json({ error: "Dokumen hasil wajib dihubungkan dari Arsip Dokumen." }, { status: 400 });
      }
      await db
        .update(incomingLetterTasks)
        .set({ status: "Diajukan Selesai", completionNote, updatedAt: now })
        .where(eq(incomingLetterTasks.id, task.id));
      await db.insert(incomingLetterMessages).values({
        incomingLetterId: letterId,
        authorName: auth.user.displayName,
        authorEmail: auth.user.email,
        authorRole: auth.user.role,
        message: completionNote,
      });
      await addAudit(auth.user, "Ajukan penyelesaian Karta Tama", "Surat Masuk", letter.letterNumber, { entityId: letterId });
      return Response.json({ success: true });
    }

    if (action === "approve" || action === "revision") {
      if (!canManage || !task || task.status !== "Diajukan Selesai") {
        return Response.json({ error: "Tugas ini belum dapat diperiksa." }, { status: 403 });
      }
      const nextStatus = action === "approve" ? "Selesai" : "Perlu Perbaikan";
      const reviewMessage = cleanText(payload.message, 2000);
      if (action === "revision" && !reviewMessage) {
        return Response.json({ error: "Catatan perbaikan wajib diisi." }, { status: 400 });
      }
      await db
        .update(incomingLetterTasks)
        .set({ status: nextStatus, updatedAt: now })
        .where(eq(incomingLetterTasks.id, task.id));
      if (reviewMessage) {
        await db.insert(incomingLetterMessages).values({
          incomingLetterId: letterId,
          authorName: auth.user.displayName,
          authorEmail: auth.user.email,
          authorRole: auth.user.role,
          message: reviewMessage,
        });
      }
      await db
        .update(incomingLetters)
        .set({ status: action === "approve" ? "Selesai" : "Diproses" })
        .where(eq(incomingLetters.id, letterId));
      await addAudit(
        auth.user,
        action === "approve" ? "Selesaikan tugas Karta Tama" : "Kembalikan tugas Karta Tama",
        "Surat Masuk",
        letter.letterNumber,
        { entityId: letterId },
      );
      return Response.json({ success: true, status: nextStatus });
    }

    return Response.json({ error: "Tindakan tugas tidak valid." }, { status: 400 });
  } catch {
    return Response.json(
      { error: "Tugas Karta Tama belum dapat diperbarui." },
      { status: 500 },
    );
  }
}
