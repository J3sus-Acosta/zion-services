-- AlterTable
ALTER TABLE `documentos_expediente` ADD COLUMN `hashSha256` VARCHAR(64) NULL,
    ADD COLUMN `qrUrl` VARCHAR(512) NULL;

-- CreateTable
CREATE TABLE `bitacoras_servicios` (
    `id` VARCHAR(191) NOT NULL,
    `ordenServicioId` VARCHAR(191) NOT NULL,
    `tipoEvento` ENUM('TRAFICO', 'ACCESO_DENEGADO', 'FALLA_EQUIPO', 'VOLUMEN_DISCREPANTE', 'OBSERVACION_GENERAL') NOT NULL,
    `descripcion` TEXT NOT NULL,
    `latitud` DOUBLE NULL,
    `longitud` DOUBLE NULL,
    `fotoUrl` VARCHAR(512) NULL,
    `registradoPorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bitacoras_servicios_ordenServicioId_idx`(`ordenServicioId`),
    INDEX `bitacoras_servicios_tipoEvento_idx`(`tipoEvento`),
    INDEX `bitacoras_servicios_createdAt_idx`(`createdAt`),
    INDEX `bitacoras_servicios_registradoPorId_idx`(`registradoPorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `documentos_expediente_hashSha256_idx` ON `documentos_expediente`(`hashSha256`);

-- AddForeignKey
ALTER TABLE `bitacoras_servicios` ADD CONSTRAINT `bitacoras_servicios_ordenServicioId_fkey` FOREIGN KEY (`ordenServicioId`) REFERENCES `ordenes_servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bitacoras_servicios` ADD CONSTRAINT `bitacoras_servicios_registradoPorId_fkey` FOREIGN KEY (`registradoPorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `documentos_expediente` RENAME INDEX `documentos_expediente_expedienteDocumentalId_fkey` TO `documentos_expediente_expedienteDocumentalId_idx`;
