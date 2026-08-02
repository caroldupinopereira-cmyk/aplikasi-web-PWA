CREATE TABLE `document_sequences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`document_type` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_sequences_type_year_month_unique` ON `document_sequences` (`document_type`,`year`,`month`);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `entity_id` text;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `changed_fields` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `before_data` text;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `after_data` text;