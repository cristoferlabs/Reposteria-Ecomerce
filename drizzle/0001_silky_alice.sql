ALTER TABLE `users` MODIFY COLUMN `google_id` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` varchar(255);