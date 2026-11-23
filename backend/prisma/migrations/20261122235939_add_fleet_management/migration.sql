-- AlterTable
ALTER TABLE `vehiculos` ADD COLUMN `estado` ENUM('HABILITADO', 'DESHABILITADO') NOT NULL DEFAULT 'HABILITADO',
    ADD COLUMN `estadoCambiadoAt` DATETIME(3) NULL,
    ADD COLUMN `estadoCambiadoPorId` VARCHAR(191) NULL,
    ADD COLUMN `motivoEstado` TEXT NULL,
    ADD COLUMN `observaciones` TEXT NULL,
    ADD COLUMN `origenBloqueo` ENUM('MANUAL', 'CHECKLIST_SEGURIDAD') NULL,
    ADD COLUMN `tipoEquipo` ENUM('CAMION', 'CAMIONETA', 'MAQUINARIA', 'OTRO') NOT NULL DEFAULT 'CAMION';

-- CreateTable
CREATE TABLE `notificaciones_conductor` (
    `id` VARCHAR(191) NOT NULL,
    `conductorId` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'TRANSFERENCIA_FLOTA',
    `titulo` VARCHAR(191) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notificaciones_conductor_conductorId_leida_idx`(`conductorId`, `leida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `vehiculos_estado_tipoEquipo_idx` ON `vehiculos`(`estado`, `tipoEquipo`);

-- AddForeignKey
ALTER TABLE `vehiculos` ADD CONSTRAINT `vehiculos_estadoCambiadoPorId_fkey` FOREIGN KEY (`estadoCambiadoPorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones_conductor` ADD CONSTRAINT `notificaciones_conductor_conductorId_fkey` FOREIGN KEY (`conductorId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill data according to D2 (expand phase)
UPDATE `vehiculos` SET `estado` = 'DESHABILITADO', `origenBloqueo` = 'CHECKLIST_SEGURIDAD',
       `motivoEstado` = COALESCE(NULLIF(`motivoBloqueo`, ''), 'Bloqueo por seguridad (migrado)'), `estadoCambiadoAt` = NOW()
 WHERE `bloqueadoPorSeguridad` = 1;

UPDATE `vehiculos` SET `estado` = 'DESHABILITADO', `origenBloqueo` = 'MANUAL',
       `motivoEstado` = 'Deshabilitado previamente (migrado)', `estadoCambiadoAt` = NOW()
 WHERE `activo` = 0 AND `bloqueadoPorSeguridad` = 0;

