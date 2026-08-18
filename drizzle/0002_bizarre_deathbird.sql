ALTER TABLE `practiceSessions` ADD `preparationSeconds` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `practiceSessions` ADD `recordingKind` enum('audio','video') DEFAULT 'audio' NOT NULL;--> statement-breakpoint
ALTER TABLE `practiceSessions` ADD `recordingMimeType` varchar(128);