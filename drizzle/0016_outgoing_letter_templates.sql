ALTER TABLE `outgoing_letters` ADD `template_key` text DEFAULT 'custom' NOT NULL;
--> statement-breakpoint
ALTER TABLE `outgoing_letters` ADD `content` text DEFAULT '' NOT NULL;
