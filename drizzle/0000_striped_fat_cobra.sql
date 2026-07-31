CREATE TABLE `incoming_letters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`letter_number` text NOT NULL,
	`received_date` text NOT NULL,
	`letter_date` text NOT NULL,
	`sender` text NOT NULL,
	`subject` text NOT NULL,
	`category` text DEFAULT 'Umum' NOT NULL,
	`status` text DEFAULT 'Baru' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
