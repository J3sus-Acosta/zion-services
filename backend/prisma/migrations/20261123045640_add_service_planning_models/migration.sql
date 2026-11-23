-- CreateTable
CREATE TABLE `servicios_catalogo` (
    `id` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `duracionEstimadaMinutos` INTEGER NOT NULL DEFAULT 120,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `servicios_catalogo_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plantas_destino` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `comuna` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL DEFAULT 'Metropolitana',
    `autorizadaRiles` BOOLEAN NOT NULL DEFAULT true,
    `resolucionSanitaria` VARCHAR(191) NULL,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `atenciones_programadas` (
    `id` VARCHAR(191) NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `solicitudServicioId` VARCHAR(191) NOT NULL,
    `sucursalFaenaId` VARCHAR(191) NOT NULL,
    `plantaDestinoId` VARCHAR(191) NULL,
    `fechaHoraInicio` DATETIME(3) NOT NULL,
    `fechaHoraFinEstimada` DATETIME(3) NOT NULL,
    `duracionEstimadaMinutos` INTEGER NOT NULL DEFAULT 120,
    `estado` ENUM('PENDIENTE_CONFIRMACION', 'PROGRAMADA', 'EN_CURSO', 'COMPLETADA', 'CANCELADA', 'REPROGRAMADA') NOT NULL DEFAULT 'PENDIENTE_CONFIRMACION',
    `vehiculoId` VARCHAR(191) NULL,
    `conductorId` VARCHAR(191) NULL,
    `ordenServicioId` VARCHAR(191) NULL,
    `jornadaId` VARCHAR(191) NULL,
    `justificacionForzado` TEXT NULL,
    `observacionesInternas` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `atenciones_programadas_folio_key`(`folio`),
    UNIQUE INDEX `atenciones_programadas_ordenServicioId_key`(`ordenServicioId`),
    INDEX `atenciones_programadas_fechaHoraInicio_fechaHoraFinEstimada_idx`(`fechaHoraInicio`, `fechaHoraFinEstimada`),
    INDEX `atenciones_programadas_vehiculoId_fechaHoraInicio_idx`(`vehiculoId`, `fechaHoraInicio`),
    INDEX `atenciones_programadas_conductorId_fechaHoraInicio_idx`(`conductorId`, `fechaHoraInicio`),
    INDEX `atenciones_programadas_estado_idx`(`estado`),
    INDEX `atenciones_programadas_solicitudServicioId_idx`(`solicitudServicioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `atencion_servicio_items` (
    `id` VARCHAR(191) NOT NULL,
    `atencionProgramadaId` VARCHAR(191) NOT NULL,
    `servicioCatalogoId` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `atencion_servicio_items_atencionProgramadaId_servicioCatalog_key`(`atencionProgramadaId`, `servicioCatalogoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `atenciones_programadas` ADD CONSTRAINT `atenciones_programadas_solicitudServicioId_fkey` FOREIGN KEY (`solicitudServicioId`) REFERENCES `solicitudes_servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atenciones_programadas` ADD CONSTRAINT `atenciones_programadas_sucursalFaenaId_fkey` FOREIGN KEY (`sucursalFaenaId`) REFERENCES `sucursales_faenas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atenciones_programadas` ADD CONSTRAINT `atenciones_programadas_plantaDestinoId_fkey` FOREIGN KEY (`plantaDestinoId`) REFERENCES `plantas_destino`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atenciones_programadas` ADD CONSTRAINT `atenciones_programadas_vehiculoId_fkey` FOREIGN KEY (`vehiculoId`) REFERENCES `vehiculos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atenciones_programadas` ADD CONSTRAINT `atenciones_programadas_conductorId_fkey` FOREIGN KEY (`conductorId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atenciones_programadas` ADD CONSTRAINT `atenciones_programadas_ordenServicioId_fkey` FOREIGN KEY (`ordenServicioId`) REFERENCES `ordenes_servicio`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atenciones_programadas` ADD CONSTRAINT `atenciones_programadas_jornadaId_fkey` FOREIGN KEY (`jornadaId`) REFERENCES `jornadas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atencion_servicio_items` ADD CONSTRAINT `atencion_servicio_items_atencionProgramadaId_fkey` FOREIGN KEY (`atencionProgramadaId`) REFERENCES `atenciones_programadas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `atencion_servicio_items` ADD CONSTRAINT `atencion_servicio_items_servicioCatalogoId_fkey` FOREIGN KEY (`servicioCatalogoId`) REFERENCES `servicios_catalogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
