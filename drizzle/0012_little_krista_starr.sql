CREATE TABLE `notification_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`staff_user_id` integer NOT NULL,
	`last_seen_at` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`staff_user_id`) REFERENCES `staff_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_states_staff_user_id_unique` ON `notification_states` (`staff_user_id`);