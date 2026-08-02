ALTER TABLE `outgoing_letters` ADD `approval_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `outgoing_letters` ADD `approved_by` text;--> statement-breakpoint
ALTER TABLE `outgoing_letters` ADD `approved_at` text;