CREATE TABLE `assets` (
	`hash` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`content_type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_key_unique` ON `assets` (`key`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`link` text,
	`ownership` text NOT NULL,
	`tags` text NOT NULL,
	`thumbnail` text,
	`body` text NOT NULL,
	`source_properties` text NOT NULL,
	`source_revision` text NOT NULL,
	`content_hash` text NOT NULL,
	`updated_at` integer NOT NULL,
	`removed_at` integer,
	FOREIGN KEY (`thumbnail`) REFERENCES `assets`(`hash`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_visibility` ON `products` (`removed_at`,`ownership`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`scanned` integer DEFAULT 0 NOT NULL,
	`changed` integer DEFAULT 0 NOT NULL,
	`uploaded` integer DEFAULT 0 NOT NULL,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`fence` integer DEFAULT 0 NOT NULL,
	`lease_owner` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`last_success` integer,
	`last_run` text,
	CONSTRAINT "valid_lease" CHECK("sync_state"."lease_until" >= 0)
);
