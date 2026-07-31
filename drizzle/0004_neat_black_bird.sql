CREATE TABLE `budget_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`budget_year` integer NOT NULL,
	`program_name` text NOT NULL,
	`category` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`receipt_number` text NOT NULL,
	`expense_date` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`program_name` text NOT NULL,
	`payee` text NOT NULL,
	`payment_method` text DEFAULT 'Tunai' NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text DEFAULT 'Belum Diverifikasi' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
