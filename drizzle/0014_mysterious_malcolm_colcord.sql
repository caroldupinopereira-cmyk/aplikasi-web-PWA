ALTER TABLE `incoming_letter_tasks` ADD `result_type` text DEFAULT 'Catatan' NOT NULL;--> statement-breakpoint
ALTER TABLE `incoming_letter_tasks` ADD `outgoing_letter_id` integer REFERENCES outgoing_letters(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `incoming_letter_tasks` ADD `document_id` integer REFERENCES documents(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `incoming_letter_tasks` ADD `completion_note` text DEFAULT '' NOT NULL;
