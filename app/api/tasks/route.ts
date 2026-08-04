import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { incomingLetters, incomingLetterTasks } from "../../../db/schema";
import { READ_ROLES, requireRole } from "../../security";
import { readListQuery } from "../list-query";
import { serverError } from "../validation";
import { canSeeAllOfficeTasks, isOfficeTaskOverdue } from "../../task-center";

export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, READ_ROLES);
    if ("response" in auth) return auth.response;

    const { page, perPage, offset, query, params } = readListQuery(request);
    const status = (params.get("status") ?? "").trim();
    const conditions = [];

    if (!canSeeAllOfficeTasks(auth.user.role)) {
      conditions.push(eq(incomingLetterTasks.assignedToStaffId, auth.user.id));
    }
    if (query) {
      const pattern = `%${query}%`;
      conditions.push(or(
        like(incomingLetters.letterNumber, pattern),
        like(incomingLetters.subject, pattern),
        like(incomingLetters.sender, pattern),
        like(incomingLetterTasks.assignedToName, pattern),
        like(incomingLetterTasks.instruction, pattern),
      ));
    }
    if (status && status !== "Semua") {
      conditions.push(eq(incomingLetterTasks.status, status));
    }

    const where = conditions.length ? and(...conditions) : undefined;
    const scopeWhere = canSeeAllOfficeTasks(auth.user.role)
      ? undefined
      : eq(incomingLetterTasks.assignedToStaffId, auth.user.id);
    const today = new Date().toISOString().slice(0, 10);
    const db = await getDb();

    const baseSelection = {
      id: incomingLetterTasks.id,
      incomingLetterId: incomingLetters.id,
      letterNumber: incomingLetters.letterNumber,
      sender: incomingLetters.sender,
      subject: incomingLetters.subject,
      category: incomingLetters.category,
      assignedToName: incomingLetterTasks.assignedToName,
      instruction: incomingLetterTasks.instruction,
      dueDate: incomingLetterTasks.dueDate,
      resultType: incomingLetterTasks.resultType,
      status: incomingLetterTasks.status,
      assignedByName: incomingLetterTasks.assignedByName,
      completionNote: incomingLetterTasks.completionNote,
      updatedAt: incomingLetterTasks.updatedAt,
    };

    const [tasks, [totalRow], [summary]] = await Promise.all([
      db
        .select(baseSelection)
        .from(incomingLetterTasks)
        .innerJoin(incomingLetters, eq(incomingLetters.id, incomingLetterTasks.incomingLetterId))
        .where(where)
        .orderBy(
          sql`case when ${incomingLetterTasks.status} = 'Diajukan Selesai' then 0 when ${incomingLetterTasks.dueDate} < ${today} and ${incomingLetterTasks.status} != 'Selesai' then 1 else 2 end`,
          asc(incomingLetterTasks.dueDate),
          desc(incomingLetterTasks.updatedAt),
        )
        .limit(perPage)
        .offset(offset),
      db
        .select({ value: sql<number>`count(*)` })
        .from(incomingLetterTasks)
        .innerJoin(incomingLetters, eq(incomingLetters.id, incomingLetterTasks.incomingLetterId))
        .where(where),
      db
        .select({
          total: sql<number>`count(*)`,
          active: sql<number>`sum(case when ${incomingLetterTasks.status} in ('Diproses', 'Perlu Perbaikan') then 1 else 0 end)`,
          overdue: sql<number>`sum(case when ${incomingLetterTasks.dueDate} < ${today} and ${incomingLetterTasks.status} != 'Selesai' then 1 else 0 end)`,
          review: sql<number>`sum(case when ${incomingLetterTasks.status} = 'Diajukan Selesai' then 1 else 0 end)`,
          completed: sql<number>`sum(case when ${incomingLetterTasks.status} = 'Selesai' then 1 else 0 end)`,
        })
        .from(incomingLetterTasks)
        .where(scopeWhere),
    ]);

    return Response.json({
      tasks: tasks.map((task) => ({
        ...task,
        overdue: isOfficeTaskOverdue(task.dueDate, task.status, today),
      })),
      pagination: { page, perPage, total: Number(totalRow?.value ?? 0) },
      summary: {
        total: Number(summary?.total ?? 0),
        active: Number(summary?.active ?? 0),
        overdue: Number(summary?.overdue ?? 0),
        review: Number(summary?.review ?? 0),
        completed: Number(summary?.completed ?? 0),
      },
      currentUser: auth.user,
    });
  } catch (error) {
    return serverError(error);
  }
}
