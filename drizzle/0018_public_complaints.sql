CREATE TABLE `public_complaints` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `complaint_number` text NOT NULL,
  `reporter_name` text DEFAULT '' NOT NULL,
  `suco` text NOT NULL,
  `category` text NOT NULL,
  `location` text NOT NULL,
  `summary` text NOT NULL,
  `priority` text DEFAULT 'Normal' NOT NULL,
  `status` text DEFAULT 'Baru' NOT NULL,
  `assigned_to_staff_id` integer,
  `assigned_to_name` text NOT NULL,
  `created_by_staff_id` integer,
  `follow_up` text DEFAULT '' NOT NULL,
  `received_date` text NOT NULL,
  `due_date` text NOT NULL,
  `resolved_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`assigned_to_staff_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`created_by_staff_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_complaints_complaint_number_unique` ON `public_complaints` (`complaint_number`);
--> statement-breakpoint
CREATE INDEX `public_complaints_status_assignee_idx` ON `public_complaints` (`status`, `assigned_to_staff_id`);
