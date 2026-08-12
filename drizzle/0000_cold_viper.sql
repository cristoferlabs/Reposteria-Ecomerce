CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`google_id` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`avatar_url` text,
	`role` enum('cliente','admin') NOT NULL DEFAULT 'cliente',
	`created_at` timestamp NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_google_id_unique` UNIQUE(`google_id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`size` varchar(100),
	`flavor` varchar(100),
	`price_delta_cents` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_id` int NOT NULL,
	`slug` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text NOT NULL DEFAULT (''),
	`base_price_cents` int NOT NULL,
	`image_url` text NOT NULL,
	`lead_time_days` int NOT NULL DEFAULT 2,
	`allows_urgent` boolean NOT NULL DEFAULT true,
	`featured` boolean NOT NULL DEFAULT false,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `delivery_points` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`zone` varchar(255),
	`cost_cents` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `delivery_points_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`variant_id` int,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price_cents` int NOT NULL,
	`customization_notes` text,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_status_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`from_status` enum('solicitado','ajustes_propuestos','tomado','rechazado','cancelado','pago_inicial_pendiente','pago_inicial_confirmado','en_preparacion','listo','entregado'),
	`to_status` enum('solicitado','ajustes_propuestos','tomado','rechazado','cancelado','pago_inicial_pendiente','pago_inicial_confirmado','en_preparacion','listo','entregado') NOT NULL,
	`changed_by_user_id` int,
	`note` text,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `order_status_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`public_id` varchar(64) NOT NULL,
	`customer_id` int NOT NULL,
	`status` enum('solicitado','ajustes_propuestos','tomado','rechazado','cancelado','pago_inicial_pendiente','pago_inicial_confirmado','en_preparacion','listo','entregado') NOT NULL DEFAULT 'solicitado',
	`desired_date` timestamp NOT NULL,
	`is_urgent` boolean NOT NULL DEFAULT false,
	`urgency_surcharge_cents` int NOT NULL DEFAULT 0,
	`delivery_method` enum('contraentrega','delivery_propio'),
	`delivery_point_id` int,
	`delivery_cost_cents` int NOT NULL DEFAULT 0,
	`subtotal_cents` int NOT NULL,
	`total_cents` int NOT NULL,
	`initial_payment_cents` int NOT NULL DEFAULT 0,
	`final_payment_cents` int NOT NULL DEFAULT 0,
	`final_payment_collected` boolean NOT NULL DEFAULT false,
	`customer_notes` text,
	`admin_notes` text,
	`rejected_reason` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_public_id_unique` UNIQUE(`public_id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`type` enum('inicial','final') NOT NULL,
	`amount_cents` int NOT NULL,
	`method` enum('mercado_pago','efectivo','yape','plin','otro') NOT NULL,
	`status` enum('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
	`mp_preference_id` varchar(255),
	`mp_payment_id` varchar(255),
	`raw_payload` text,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`customer_id` int NOT NULL,
	`order_id` int,
	`rating` int NOT NULL,
	`comment` text,
	`approved` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_changed_by_user_id_users_id_fk` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_users_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_delivery_point_id_delivery_points_id_fk` FOREIGN KEY (`delivery_point_id`) REFERENCES `delivery_points`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_customer_id_users_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;