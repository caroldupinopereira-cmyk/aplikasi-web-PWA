CREATE TABLE `visitor_logs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `visit_number` text NOT NULL,
  `visitor_name` text NOT NULL,
  `origin` text NOT NULL,
  `purpose` text NOT NULL,
  `staff_to_meet` text NOT NULL,
  `visit_date` text NOT NULL,
  `check_in_time` text NOT NULL,
  `check_out_time` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'Di Kantor' NOT NULL,
  `result_notes` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visitor_logs_visit_number_unique` ON `visitor_logs` (`visit_number`);
--> statement-breakpoint
CREATE INDEX `visitor_logs_date_status_idx` ON `visitor_logs` (`visit_date`, `status`);
