CREATE TABLE `office_assets` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `asset_code` text NOT NULL,
  `asset_name` text NOT NULL,
  `category` text NOT NULL,
  `quantity` integer DEFAULT 1 NOT NULL,
  `location` text NOT NULL,
  `responsible_person` text NOT NULL,
  `condition` text DEFAULT 'Baik' NOT NULL,
  `status` text DEFAULT 'Aktif' NOT NULL,
  `acquisition_date` text NOT NULL,
  `next_inspection_date` text DEFAULT '' NOT NULL,
  `notes` text DEFAULT '' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `office_assets_asset_code_unique` ON `office_assets` (`asset_code`);
--> statement-breakpoint
CREATE INDEX `office_assets_condition_status_idx` ON `office_assets` (`condition`, `status`);
