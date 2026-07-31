CREATE TABLE `outgoing_letters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`letter_number` text NOT NULL,
	`letter_date` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`category` text DEFAULT 'Umum' NOT NULL,
	`signatory` text NOT NULL,
	`delivery_method` text DEFAULT 'Diantar' NOT NULL,
	`status` text DEFAULT 'Draf' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
