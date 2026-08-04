CREATE TABLE `office_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `title` text NOT NULL,
  `event_type` text DEFAULT 'Rapat' NOT NULL,
  `event_date` text NOT NULL,
  `start_time` text DEFAULT '08:00' NOT NULL,
  `end_time` text DEFAULT '' NOT NULL,
  `location` text NOT NULL,
  `responsible_person` text NOT NULL,
  `priority` text DEFAULT 'Normal' NOT NULL,
  `status` text DEFAULT 'Dijadwalkan' NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `office_events_date_status_idx` ON `office_events` (`event_date`, `status`);
