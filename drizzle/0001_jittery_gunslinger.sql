CREATE TABLE `practiceSessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionType` enum('jam','gd','interview','challenge') NOT NULL,
	`topic` varchar(500) NOT NULL,
	`category` varchar(64) NOT NULL,
	`difficulty` varchar(16) NOT NULL,
	`durationSeconds` int NOT NULL DEFAULT 60,
	`status` enum('draft','complete','discarded') NOT NULL DEFAULT 'draft',
	`overallScore` int,
	`recordingKey` varchar(512),
	`recordingUrl` text,
	`transcript` text,
	`analysisJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `practiceSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savedTopics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`topic` varchar(500) NOT NULL,
	`category` varchar(64) NOT NULL,
	`difficulty` varchar(16) NOT NULL,
	`durationSeconds` int NOT NULL DEFAULT 60,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `savedTopics_id` PRIMARY KEY(`id`)
);
