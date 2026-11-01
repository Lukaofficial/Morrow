CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE TABLE `booking_places` (
	`booking_id` text NOT NULL,
	`place_id` text NOT NULL,
	`price_cents` integer NOT NULL,
	PRIMARY KEY(`booking_id`, `place_id`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`access_token` text NOT NULL,
	`departure_id` text NOT NULL,
	`from_station` text NOT NULL,
	`to_station` text NOT NULL,
	`lead_name` text NOT NULL,
	`email` text NOT NULL,
	`travellers` integer NOT NULL,
	`breakfast` integer DEFAULT false NOT NULL,
	`wake_call` integer DEFAULT 30 NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`synthetic` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`cancelled_at` integer,
	FOREIGN KEY (`departure_id`) REFERENCES `departures`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_reference_unique` ON `bookings` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_access_token_unique` ON `bookings` (`access_token`);--> statement-breakpoint
CREATE INDEX `bookings_departure_idx` ON `bookings` (`departure_id`);--> statement-breakpoint
CREATE INDEX `bookings_created_idx` ON `bookings` (`created_at`);--> statement-breakpoint
CREATE TABLE `claims` (
	`departure_id` text NOT NULL,
	`place_id` text NOT NULL,
	`hold_id` text,
	`booking_id` text,
	`price_cents` integer NOT NULL,
	PRIMARY KEY(`departure_id`, `place_id`),
	FOREIGN KEY (`departure_id`) REFERENCES `departures`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hold_id`) REFERENCES `holds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `claims_hold_idx` ON `claims` (`hold_id`);--> statement-breakpoint
CREATE INDEX `claims_booking_idx` ON `claims` (`booking_id`);--> statement-breakpoint
CREATE TABLE `departures` (
	`id` text PRIMARY KEY NOT NULL,
	`line_id` text NOT NULL,
	`direction` text NOT NULL,
	`service_date` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`delay_minutes` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departures_service_unique` ON `departures` (`line_id`,`direction`,`service_date`);--> statement-breakpoint
CREATE INDEX `departures_date_idx` ON `departures` (`service_date`);--> statement-breakpoint
CREATE TABLE `holds` (
	`id` text PRIMARY KEY NOT NULL,
	`departure_id` text NOT NULL,
	`from_station` text NOT NULL,
	`to_station` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`departure_id`) REFERENCES `departures`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `holds_expiry_idx` ON `holds` (`expires_at`);