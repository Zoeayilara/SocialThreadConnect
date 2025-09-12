CREATE TABLE `reposts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `saved_posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `comments` ADD `parent_id` integer;--> statement-breakpoint
ALTER TABLE `comments` ADD `replies_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `university_handle` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `link` text;--> statement-breakpoint
ALTER TABLE `users` ADD `is_private` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `media_urls`;--> statement-breakpoint
ALTER TABLE `posts` DROP COLUMN `media_type`;