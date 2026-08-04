import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
    templateKey: text("template_key").notNull().default("custom"),
    content: text("content").notNull().default(""),
    status: text("status").notNull().default("Draf"),
    notes: text("notes").notNull().default(""),
    approvalNote: text("approval_note").notNull().default(""),
    approvedBy: text("approved_by"),
    approvedAt: text("approved_at"),
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

export const administrativeServices = sqliteTable("administrative_services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  serviceNumber: text("service_number").notNull().unique(),
  applicantName: text("applicant_name").notNull(),
  suco: text("suco").notNull(),
  serviceType: text("service_type").notNull(),
  receivedDate: text("received_date").notNull(),
  dueDate: text("due_date").notNull(),
  assignedTo: text("assigned_to").notNull(),
  requirements: text("requirements").notNull().default(""),
  status: text("status").notNull().default("Baru"),
  notes: text("notes").notNull().default(""),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const officeEvents = sqliteTable("office_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  eventType: text("event_type").notNull().default("Rapat"),
  eventDate: text("event_date").notNull(),
  startTime: text("start_time").notNull().default("08:00"),
  endTime: text("end_time").notNull().default(""),
  location: text("location").notNull(),
  responsiblePerson: text("responsible_person").notNull(),
  priority: text("priority").notNull().default("Normal"),
  status: text("status").notNull().default("Dijadwalkan"),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const publicComplaints = sqliteTable("public_complaints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  complaintNumber: text("complaint_number").notNull().unique(),
  reporterName: text("reporter_name").notNull().default(""),
  suco: text("suco").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  summary: text("summary").notNull(),
  priority: text("priority").notNull().default("Normal"),
  status: text("status").notNull().default("Baru"),
  assignedToStaffId: integer("assigned_to_staff_id"),
  assignedToName: text("assigned_to_name").notNull(),
  createdByStaffId: integer("created_by_staff_id"),
  followUp: text("follow_up").notNull().default(""),
  receivedDate: text("received_date").notNull(),
  dueDate: text("due_date").notNull(),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const visitorLogs = sqliteTable("visitor_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  visitNumber: text("visit_number").notNull().unique(),
  visitorName: text("visitor_name").notNull(),
  origin: text("origin").notNull(),
  purpose: text("purpose").notNull(),
  staffToMeet: text("staff_to_meet").notNull(),
  visitDate: text("visit_date").notNull(),
  checkInTime: text("check_in_time").notNull(),
  checkOutTime: text("check_out_time").notNull().default(""),
  status: text("status").notNull().default("Di Kantor"),
  resultNotes: text("result_notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const officeAssets = sqliteTable("office_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assetCode: text("asset_code").notNull().unique(),
  assetName: text("asset_name").notNull(),
  category: text("category").notNull(),
  quantity: integer("quantity").notNull().default(1),
  location: text("location").notNull(),
  responsiblePerson: text("responsible_person").notNull(),
  condition: text("condition").notNull().default("Baik"),
  status: text("status").notNull().default("Aktif"),
  acquisitionDate: text("acquisition_date").notNull(),
  nextInspectionDate: text("next_inspection_date").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
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
  checksumSha256: text("checksum_sha256"),
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

export const authCredentials = sqliteTable("auth_credentials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffUserId: integer("staff_user_id")
    .notNull()
    .unique()
    .references(() => staffUsers.id, { onDelete: "cascade" }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  passwordIterations: integer("password_iterations").notNull().default(600000),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  mustChangePassword: integer("must_change_password", { mode: "boolean" })
    .notNull()
    .default(true),
  passwordChangedAt: text("password_changed_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const authSessions = sqliteTable("auth_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffUserId: integer("staff_user_id")
    .notNull()
    .references(() => staffUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  userAgent: text("user_agent").notNull().default("Perangkat tidak dikenal"),
  expiresAt: text("expires_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const notificationStates = sqliteTable("notification_states", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffUserId: integer("staff_user_id")
    .notNull()
    .unique()
    .references(() => staffUsers.id, { onDelete: "cascade" }),
  lastSeenAt: text("last_seen_at").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const incomingLetterTasks = sqliteTable("incoming_letter_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  incomingLetterId: integer("incoming_letter_id")
    .notNull()
    .unique()
    .references(() => incomingLetters.id, { onDelete: "cascade" }),
  assignedToStaffId: integer("assigned_to_staff_id")
    .references(() => staffUsers.id, { onDelete: "set null" }),
  assignedToName: text("assigned_to_name").notNull(),
  assignedToEmail: text("assigned_to_email").notNull(),
  instruction: text("instruction").notNull(),
  dueDate: text("due_date").notNull(),
  resultType: text("result_type").notNull().default("Catatan"),
  outgoingLetterId: integer("outgoing_letter_id")
    .references(() => outgoingLetters.id, { onDelete: "set null" }),
  documentId: integer("document_id")
    .references(() => documents.id, { onDelete: "set null" }),
  completionNote: text("completion_note").notNull().default(""),
  status: text("status").notNull().default("Diproses"),
  assignedByName: text("assigned_by_name").notNull(),
  assignedByEmail: text("assigned_by_email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const incomingLetterMessages = sqliteTable("incoming_letter_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  incomingLetterId: integer("incoming_letter_id")
    .notNull()
    .references(() => incomingLetters.id, { onDelete: "cascade" }),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  authorRole: text("author_role").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorEmail: text("actor_email").notNull(),
  actorName: text("actor_name").notNull(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  details: text("details").notNull().default(""),
  entityId: text("entity_id"),
  changedFields: text("changed_fields").notNull().default("[]"),
  beforeData: text("before_data"),
  afterData: text("after_data"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const documentSequences = sqliteTable(
  "document_sequences",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    documentType: text("document_type").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    lastNumber: integer("last_number").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("document_sequences_type_year_month_unique").on(
      table.documentType,
      table.year,
      table.month,
    ),
  ],
);
