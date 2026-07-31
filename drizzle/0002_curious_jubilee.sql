CREATE TABLE `residents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`record_number` text NOT NULL,
	`full_name` text NOT NULL,
	`gender` text NOT NULL,
	`birth_date` text NOT NULL,
	`suco` text NOT NULL,
	`aldeia` text NOT NULL,
	`household_number` text NOT NULL,
	`is_household_head` integer DEFAULT false NOT NULL,
	`marital_status` text DEFAULT 'Belum Menikah' NOT NULL,
	`occupation` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
