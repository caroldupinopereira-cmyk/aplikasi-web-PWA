import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const incomingLetters = sqliteTable("incoming_letters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  letterNumber: text("letter_number").notNull(),
  receivedDate: text("received_date").notNull(),
  letterDate: text("letter_date").notNull(),
  sender: text("sender").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("Umum"),
  status: text("status").notNull().default("Baru"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const outgoingLetters = sqliteTable("outgoing_letters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  letterNumber: text("letter_number").notNull(),
  letterDate: text("letter_date").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  category: text("category").notNull().default("Umum"),
  signatory: text("signatory").notNull(),
  deliveryMethod: text("delivery_method").notNull().default("Diantar"),
  status: text("status").notNull().default("Draf"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const residents = sqliteTable("residents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recordNumber: text("record_number").notNull(),
  fullName: text("full_name").notNull(),
  gender: text("gender").notNull(),
  birthDate: text("birth_date").notNull(),
  suco: text("suco").notNull(),
  aldeia: text("aldeia").notNull(),
  householdNumber: text("household_number").notNull(),
  isHouseholdHead: integer("is_household_head", { mode: "boolean" }).notNull().default(false),
  maritalStatus: text("marital_status").notNull().default("Belum Menikah"),
  occupation: text("occupation").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const activityReports = sqliteTable("activity_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reportNumber: text("report_number").notNull(),
  title: text("title").notNull(),
  activityDate: text("activity_date").notNull(),
  location: text("location").notNull(),
  activityType: text("activity_type").notNull().default("Rapat"),
  responsiblePerson: text("responsible_person").notNull(),
  participantCount: integer("participant_count").notNull().default(0),
  summary: text("summary").notNull(),
  obstacles: text("obstacles").notNull().default(""),
  recommendations: text("recommendations").notNull().default(""),
  status: text("status").notNull().default("Draf"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const budgetAllocations = sqliteTable("budget_allocations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  budgetYear: integer("budget_year").notNull(),
  programName: text("program_name").notNull(),
  category: text("category").notNull(),
  amountCents: integer("amount_cents").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  receiptNumber: text("receipt_number").notNull(),
  expenseDate: text("expense_date").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  programName: text("program_name").notNull(),
  payee: text("payee").notNull(),
  paymentMethod: text("payment_method").notNull().default("Tunai"),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("Belum Diverifikasi"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  referenceNumber: text("reference_number").notNull().default(""),
  documentDate: text("document_date").notNull(),
  category: text("category").notNull(),
  archiveYear: integer("archive_year").notNull(),
  fileName: text("file_name").notNull(),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const staffUsers = sqliteTable("staff_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("Staf"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorEmail: text("actor_email").notNull(),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
