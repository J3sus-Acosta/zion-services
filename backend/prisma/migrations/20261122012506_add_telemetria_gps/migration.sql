-- AlterTable
ALTER TABLE `usuarios` MODIFY `rol` ENUM('SUPERADMIN', 'ADMIN', 'JEFE_OPERACIONES', 'OPERACIONES', 'COMERCIAL', 'CONDUCTOR', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE';

-- CreateTable
CREATE TABLE `registros_telemetria_gps` (
    `id` VARCHAR(191) NOT NULL,
    `jornadaId` VARCHAR(191) NULL,
    `ordenServicioId` VARCHAR(191) NULL,
    `latitud` DOUBLE NOT NULL,
    `longitud` DOUBLE NOT NULL,
    `precisionMts` DOUBLE NULL,
    `velocidadKmh` DOUBLE NULL,
    `rumbo` DOUBLE NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `registros_telemetria_gps_jornadaId_idx`(`jornadaId`),
    INDEX `registros_telemetria_gps_ordenServicioId_idx`(`ordenServicioId`),
    INDEX `registros_telemetria_gps_timestamp_idx`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `registros_telemetria_gps` ADD CONSTRAINT `registros_telemetria_gps_jornadaId_fkey` FOREIGN KEY (`jornadaId`) REFERENCES `jornadas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registros_telemetria_gps` ADD CONSTRAINT `registros_telemetria_gps_ordenServicioId_fkey` FOREIGN KEY (`ordenServicioId`) REFERENCES `ordenes_servicio`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
