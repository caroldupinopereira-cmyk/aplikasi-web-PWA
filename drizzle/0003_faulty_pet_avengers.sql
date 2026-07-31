CREATE TABLE `activity_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_number` text NOT NULL,
	`title` text NOT NULL,
	`activity_date` text NOT NULL,
	`location` text NOT NULL,
	`activity_type` text DEFAULT 'Rapat' NOT NULL,
	`responsible_person` text NOT NULL,
	`participant_count` integer DEFAULT 0 NOT NULL,
	`summary` text NOT NULL,
	`obstacles` text DEFAULT '' NOT NULL,
	`recommendations` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Draf' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
