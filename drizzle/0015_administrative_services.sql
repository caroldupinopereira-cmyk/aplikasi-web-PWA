CREATE TABLE `administrative_services` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `service_number` text NOT NULL,
  `applicant_name` text NOT NULL,
  `suco` text NOT NULL,
  `service_type` text NOT NULL,
  `received_date` text NOT NULL,
  `due_date` text NOT NULL,
  `assigned_to` text NOT NULL,
  `requirements` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'Baru' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `completed_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `administrative_services_service_number_unique`
ON `administrative_services` (`service_number`);
