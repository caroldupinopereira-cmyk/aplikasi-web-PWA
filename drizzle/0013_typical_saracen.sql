CREATE TABLE `incoming_letter_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`incoming_letter_id` integer NOT NULL,
	`author_name` text NOT NULL,
	`author_email` text NOT NULL,
	`author_role` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`incoming_letter_id`) REFERENCES `incoming_letters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `incoming_letter_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`incoming_letter_id` integer NOT NULL,
	`assigned_to_staff_id` integer,
	`assigned_to_name` text NOT NULL,
	`assigned_to_email` text NOT NULL,
	`instruction` text NOT NULL,
	`due_date` text NOT NULL,
	`status` text DEFAULT 'Diproses' NOT NULL,
	`assigned_by_name` text NOT NULL,
	`assigned_by_email` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`incoming_letter_id`) REFERENCES `incoming_letters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`assigned_to_staff_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incoming_letter_tasks_incoming_letter_id_unique` ON `incoming_letter_tasks` (`incoming_letter_id`);