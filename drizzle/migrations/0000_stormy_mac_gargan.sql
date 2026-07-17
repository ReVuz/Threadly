CREATE TABLE `cloth_seasons` (
	`cloth_id` integer NOT NULL,
	`season_id` integer NOT NULL,
	FOREIGN KEY (`cloth_id`) REFERENCES `clothes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`season_id`) REFERENCES `seasons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `cloth_tags` (
	`cloth_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`cloth_id`) REFERENCES `clothes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `clothes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wardrobe_id` integer NOT NULL,
	`uuid` text NOT NULL,
	`nickname` text,
	`type` text,
	`primary_color` text,
	`secondary_color` text,
	`pattern` text,
	`material` text,
	`fit` text,
	`formality` text,
	`sleeve_length` text,
	`neckline` text,
	`brand` text,
	`condition` text,
	`weather_suitability` text,
	`image_original` text NOT NULL,
	`image_processed` text,
	`image_thumbnail` text,
	`width` integer,
	`height` integer,
	`file_size` integer,
	`mime_type` text,
	`checksum` text NOT NULL,
	`ai_status` text DEFAULT 'PENDING' NOT NULL,
	`ai_analyzed_at` text,
	`ai_raw_json` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`wardrobe_id`) REFERENCES `wardrobes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clothes_uuid_unique` ON `clothes` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `clothes_checksum_unique` ON `clothes` (`checksum`);--> statement-breakpoint
CREATE TABLE `outfit_items` (
	`outfit_id` integer NOT NULL,
	`cloth_id` integer NOT NULL,
	FOREIGN KEY (`outfit_id`) REFERENCES `outfits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cloth_id`) REFERENCES `clothes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `outfits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wardrobe_id` integer NOT NULL,
	`name` text NOT NULL,
	`occasion` text,
	`rating` integer DEFAULT 0,
	`favorite` integer DEFAULT 0,
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`wardrobe_id`) REFERENCES `wardrobes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seasons_name_unique` ON `seasons` (`name`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `wardrobes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wishlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`wardrobe_id` integer NOT NULL,
	`name` text NOT NULL,
	`reason` text,
	`priority` integer DEFAULT 3,
	`estimated_outfit_unlock_count` integer DEFAULT 0,
	`ai_generated` integer DEFAULT 0,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`wardrobe_id`) REFERENCES `wardrobes`(`id`) ON UPDATE no action ON DELETE cascade
);
