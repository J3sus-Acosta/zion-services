-- CreateTable
CREATE TABLE `usuarios` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `apellido` VARCHAR(191) NOT NULL,
    `rut` VARCHAR(191) NOT NULL,
    `rol` ENUM('ADMIN', 'OPERACIONES', 'COMERCIAL', 'CONDUCTOR', 'CLIENTE') NOT NULL DEFAULT 'CLIENTE',
    `telefono` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `empresaClienteId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `usuarios_email_key`(`email`),
    UNIQUE INDEX `usuarios_rut_key`(`rut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `empresas_clientes` (
    `id` VARCHAR(191) NOT NULL,
    `rut` VARCHAR(191) NOT NULL,
    `razonSocial` VARCHAR(191) NOT NULL,
    `nombreFantasia` VARCHAR(191) NULL,
    `giro` VARCHAR(191) NULL,
    `tipo` ENUM('CONTRACTUAL', 'SPOT') NOT NULL DEFAULT 'SPOT',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `empresas_clientes_rut_key`(`rut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sucursales_faenas` (
    `id` VARCHAR(191) NOT NULL,
    `empresaClienteId` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `comuna` VARCHAR(191) NOT NULL,
    `ciudad` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NOT NULL,
    `contactoNombre` VARCHAR(191) NULL,
    `contactoTelefono` VARCHAR(191) NULL,
    `contactoEmail` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contratos_clientes` (
    `id` VARCHAR(191) NOT NULL,
    `empresaClienteId` VARCHAR(191) NOT NULL,
    `numeroContrato` VARCHAR(191) NOT NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaTermino` DATETIME(3) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `periodicidadCorte` VARCHAR(191) NOT NULL DEFAULT 'MENSUAL',
    `requiereOC` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `contratos_clientes_numeroContrato_key`(`numeroContrato`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehiculos` (
    `id` VARCHAR(191) NOT NULL,
    `patente` VARCHAR(191) NOT NULL,
    `marca` VARCHAR(191) NOT NULL,
    `modelo` VARCHAR(191) NOT NULL,
    `anio` INTEGER NOT NULL,
    `capacidadEstanqueM3` DECIMAL(10, 2) NOT NULL,
    `equipoHidrojet` BOOLEAN NOT NULL DEFAULT false,
    `equipoVacio` BOOLEAN NOT NULL DEFAULT false,
    `bloqueadoPorSeguridad` BOOLEAN NOT NULL DEFAULT false,
    `motivoBloqueo` TEXT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehiculos_patente_key`(`patente`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conductores` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NOT NULL,
    `licenciaNumero` VARCHAR(191) NOT NULL,
    `licenciaClase` VARCHAR(191) NOT NULL DEFAULT 'A4',
    `licenciaVencimiento` DATETIME(3) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `conductores_usuarioId_key`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspecciones_salida_fgmt` (
    `id` VARCHAR(191) NOT NULL,
    `vehiculoId` VARCHAR(191) NOT NULL,
    `conductorId` VARCHAR(191) NOT NULL,
    `fechaHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `kilometraje` INTEGER NULL,
    `horometro` INTEGER NULL,
    `estado` ENUM('CONFORME', 'NO_CONFORME', 'SUBSANADA') NOT NULL DEFAULT 'CONFORME',
    `observaciones` TEXT NULL,
    `itemsChecklist` JSON NOT NULL,
    `aprobadoPor` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fotos_inspeccion` (
    `id` VARCHAR(191) NOT NULL,
    `inspeccionSalidaId` VARCHAR(191) NULL,
    `inspeccionRetornoId` VARCHAR(191) NULL,
    `tipo` ENUM('FRONTAL', 'LATERAL_IZQUIERDA', 'TRASERA', 'LATERAL_DERECHA') NOT NULL,
    `archivoUrl` VARCHAR(191) NOT NULL,
    `fechaHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `autochecklists_ruta` (
    `id` VARCHAR(191) NOT NULL,
    `conductorId` VARCHAR(191) NOT NULL,
    `jornadaId` VARCHAR(191) NOT NULL,
    `fechaHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ubicacionTexto` VARCHAR(191) NULL,
    `conforme` BOOLEAN NOT NULL DEFAULT true,
    `detallesJson` JSON NOT NULL,
    `observaciones` TEXT NULL,
    `alertaEmitida` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspecciones_retorno_planta` (
    `id` VARCHAR(191) NOT NULL,
    `vehiculoId` VARCHAR(191) NOT NULL,
    `conductorId` VARCHAR(191) NOT NULL,
    `fechaHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `kilometrajeFinal` INTEGER NULL,
    `horometroFinal` INTEGER NULL,
    `estadoGeneral` TEXT NULL,
    `danosDetectados` TEXT NULL,
    `herramientasOK` BOOLEAN NOT NULL DEFAULT true,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jornadas` (
    `id` VARCHAR(191) NOT NULL,
    `vehiculoId` VARCHAR(191) NOT NULL,
    `conductorId` VARCHAR(191) NOT NULL,
    `modalidad` ENUM('LOCAL_SANTIAGO', 'VIAJE_INTERREGIONAL') NOT NULL DEFAULT 'LOCAL_SANTIAGO',
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NULL,
    `estado` ENUM('PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA') NOT NULL DEFAULT 'PROGRAMADA',
    `inspeccionSalidaId` VARCHAR(191) NULL,
    `inspeccionRetornoId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `jornadas_inspeccionSalidaId_key`(`inspeccionSalidaId`),
    UNIQUE INDEX `jornadas_inspeccionRetornoId_key`(`inspeccionRetornoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hojas_de_ruta` (
    `id` VARCHAR(191) NOT NULL,
    `jornadaId` VARCHAR(191) NOT NULL,
    `codigo` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hojas_de_ruta_codigo_key`(`codigo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tramos_ruta` (
    `id` VARCHAR(191) NOT NULL,
    `hojaDeRutaId` VARCHAR(191) NOT NULL,
    `ordenSecuencia` INTEGER NOT NULL,
    `tipo` ENUM('HACIA_CLIENTE', 'EN_FAENA_CLIENTE', 'HACIA_PLANTA_DESTINO', 'EN_PLANTA_DESTINO', 'RETORNO_A_BASE') NOT NULL,
    `origenNombre` VARCHAR(191) NOT NULL,
    `destinoNombre` VARCHAR(191) NOT NULL,
    `completado` BOOLEAN NOT NULL DEFAULT false,
    `fechaHoraInicio` DATETIME(3) NULL,
    `fechaHoraFin` DATETIME(3) NULL,
    `ordenServicioId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `solicitudes_servicio` (
    `id` VARCHAR(191) NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `empresaClienteId` VARCHAR(191) NOT NULL,
    `sucursalFaenaId` VARCHAR(191) NOT NULL,
    `fechaSolicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaPreferente` DATETIME(3) NOT NULL,
    `tipoResiduo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `cantidadEstimada` DECIMAL(10, 2) NULL,
    `unidadEstimada` VARCHAR(191) NULL DEFAULT 'KG',
    `estado` ENUM('BORRADOR', 'ENVIADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'ENVIADA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `solicitudes_servicio_folio_key`(`folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ordenes_servicio` (
    `id` VARCHAR(191) NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `solicitudServicioId` VARCHAR(191) NOT NULL,
    `estado` ENUM('EMITIDA', 'PLANIFICADA', 'EN_EJECUCION', 'EJECUTADA', 'LIQUIDADA', 'CERRADA', 'CANCELADA') NOT NULL DEFAULT 'EMITIDA',
    `estadoDePagoId` VARCHAR(191) NULL,
    `observaciones` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ordenes_servicio_folio_key`(`folio`),
    UNIQUE INDEX `ordenes_servicio_solicitudServicioId_key`(`solicitudServicioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ciclos_transporte` (
    `id` VARCHAR(191) NOT NULL,
    `ordenServicioId` VARCHAR(191) NOT NULL,
    `estado` ENUM('PENDIENTE', 'EN_RUTA_CLIENTE', 'EN_FAENA', 'FAENA_AUTORIZADA', 'RETIRO_COMPLETADO', 'EN_RUTA_DESTINO', 'DESCARGA_CERTIFICADA', 'FINALIZADO') NOT NULL DEFAULT 'PENDIENTE',
    `horaLlegadaFaena` DATETIME(3) NULL,
    `horaSalidaFaena` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ciclos_transporte_ordenServicioId_key`(`ordenServicioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `autorizaciones_faena` (
    `id` VARCHAR(191) NOT NULL,
    `cicloTransporteId` VARCHAR(191) NOT NULL,
    `nombreCliente` VARCHAR(191) NOT NULL,
    `rutCliente` VARCHAR(191) NOT NULL,
    `firmaClienteSvg` TEXT NOT NULL,
    `fechaHoraFirma` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `autorizaciones_faena_cicloTransporteId_key`(`cicloTransporteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fotos_faena_epp` (
    `id` VARCHAR(191) NOT NULL,
    `cicloTransporteId` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `archivoUrl` VARCHAR(191) NOT NULL,
    `fechaHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `actas_recepcion` (
    `id` VARCHAR(191) NOT NULL,
    `cicloTransporteId` VARCHAR(191) NOT NULL,
    `tipo` ENUM('CONFORME', 'CON_OBSERVACIONES', 'SIN_FIRMA_RECHAZO') NOT NULL DEFAULT 'CONFORME',
    `nombreFirmante` VARCHAR(191) NULL,
    `rutFirmante` VARCHAR(191) NULL,
    `firmaSvg` TEXT NULL,
    `observaciones` TEXT NULL,
    `fotoRespaldoUrl` VARCHAR(191) NULL,
    `fechaHoraFirma` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `actas_recepcion_cicloTransporteId_key`(`cicloTransporteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visitas_destino` (
    `id` VARCHAR(191) NOT NULL,
    `ordenServicioId` VARCHAR(191) NOT NULL,
    `plantaDestinoNombre` VARCHAR(191) NOT NULL,
    `fechaHoraLlegada` DATETIME(3) NULL,
    `fechaHoraDescarga` DATETIME(3) NULL,
    `sidrepFolio` VARCHAR(191) NULL,
    `sidrepOriginalPdfUrl` VARCHAR(191) NULL,
    `sidrepSelladoFotoUrl` VARCHAR(191) NULL,
    `ticketPesajeFotoUrl` VARCHAR(191) NULL,
    `pesoNetoCertificado` DECIMAL(10, 2) NULL,
    `unidadMedida` VARCHAR(191) NULL DEFAULT 'KG',
    `descargaCompleta` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `visitas_destino_ordenServicioId_key`(`ordenServicioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `expedientes_documentales` (
    `id` VARCHAR(191) NOT NULL,
    `ordenServicioId` VARCHAR(191) NOT NULL,
    `completo` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `expedientes_documentales_ordenServicioId_key`(`ordenServicioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `documentos_expediente` (
    `id` VARCHAR(191) NOT NULL,
    `expedienteDocumentalId` VARCHAR(191) NOT NULL,
    `categoria` ENUM('ORDEN_SERVICIO_PDF', 'CHECKLIST_SALIDA_F_GMT', 'FOTO_CAMION_SALIDA', 'GUIA_DESPACHO_CLIENTE', 'FOTO_FAENA_PROCESO', 'FOTO_EPP_SEGURIDAD', 'ACTA_RECEPCION_FIRMADA', 'SIDREP_VENTANILLA_UNICA', 'SIDREP_SELLADO_ROMANA', 'TICKET_PESAJE_ROMANA', 'CHECKLIST_RETORNO_PLANTA', 'FOTO_CAMION_RETORNO', 'ORDEN_COMPRA', 'OTRO') NOT NULL,
    `nombreArchivo` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `pesoBytes` INTEGER NOT NULL,
    `rutaAlmacenamiento` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `cargadoPorUsuarioId` VARCHAR(191) NULL,
    `visibleParaCliente` BOOLEAN NOT NULL DEFAULT true,
    `fechaCarga` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estados_de_pago` (
    `id` VARCHAR(191) NOT NULL,
    `folio` VARCHAR(191) NOT NULL,
    `empresaClienteId` VARCHAR(191) NOT NULL,
    `contratoClienteId` VARCHAR(191) NULL,
    `periodoMes` INTEGER NOT NULL,
    `periodoAnio` INTEGER NOT NULL,
    `periodoQuincena` INTEGER NULL,
    `montoNeto` DECIMAL(12, 2) NOT NULL,
    `montoIva` DECIMAL(12, 2) NOT NULL,
    `montoTotal` DECIMAL(12, 2) NOT NULL,
    `numeroOC` VARCHAR(191) NULL,
    `archivoOCUrl` VARCHAR(191) NULL,
    `numeroFactura` VARCHAR(191) NULL,
    `fechaFactura` DATETIME(3) NULL,
    `estado` ENUM('BORRADOR', 'EMITIDO', 'ESPERANDO_OC', 'HABILITADO_FACTURAR', 'FACTURADO', 'PAGADO') NOT NULL DEFAULT 'BORRADOR',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `estados_de_pago_folio_key`(`folio`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `historial_estados` (
    `id` VARCHAR(191) NOT NULL,
    `entidad` VARCHAR(191) NOT NULL,
    `entidadId` VARCHAR(191) NOT NULL,
    `estadoAnterior` VARCHAR(191) NOT NULL,
    `estadoNuevo` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `observacion` TEXT NULL,
    `origen` VARCHAR(191) NOT NULL DEFAULT 'SISTEMA',
    `fechaHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `historial_estados_entidad_entidadId_idx`(`entidad`, `entidadId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditoria_eventos` (
    `id` VARCHAR(191) NOT NULL,
    `usuarioId` VARCHAR(191) NULL,
    `accion` VARCHAR(191) NOT NULL,
    `recurso` VARCHAR(191) NOT NULL,
    `recursoId` VARCHAR(191) NULL,
    `detallesJson` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `fechaHora` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_empresaClienteId_fkey` FOREIGN KEY (`empresaClienteId`) REFERENCES `empresas_clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sucursales_faenas` ADD CONSTRAINT `sucursales_faenas_empresaClienteId_fkey` FOREIGN KEY (`empresaClienteId`) REFERENCES `empresas_clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contratos_clientes` ADD CONSTRAINT `contratos_clientes_empresaClienteId_fkey` FOREIGN KEY (`empresaClienteId`) REFERENCES `empresas_clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conductores` ADD CONSTRAINT `conductores_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspecciones_salida_fgmt` ADD CONSTRAINT `inspecciones_salida_fgmt_vehiculoId_fkey` FOREIGN KEY (`vehiculoId`) REFERENCES `vehiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspecciones_salida_fgmt` ADD CONSTRAINT `inspecciones_salida_fgmt_conductorId_fkey` FOREIGN KEY (`conductorId`) REFERENCES `conductores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fotos_inspeccion` ADD CONSTRAINT `fotos_inspeccion_inspeccionSalidaId_fkey` FOREIGN KEY (`inspeccionSalidaId`) REFERENCES `inspecciones_salida_fgmt`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fotos_inspeccion` ADD CONSTRAINT `fotos_inspeccion_inspeccionRetornoId_fkey` FOREIGN KEY (`inspeccionRetornoId`) REFERENCES `inspecciones_retorno_planta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `autochecklists_ruta` ADD CONSTRAINT `autochecklists_ruta_conductorId_fkey` FOREIGN KEY (`conductorId`) REFERENCES `conductores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `autochecklists_ruta` ADD CONSTRAINT `autochecklists_ruta_jornadaId_fkey` FOREIGN KEY (`jornadaId`) REFERENCES `jornadas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspecciones_retorno_planta` ADD CONSTRAINT `inspecciones_retorno_planta_vehiculoId_fkey` FOREIGN KEY (`vehiculoId`) REFERENCES `vehiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inspecciones_retorno_planta` ADD CONSTRAINT `inspecciones_retorno_planta_conductorId_fkey` FOREIGN KEY (`conductorId`) REFERENCES `conductores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jornadas` ADD CONSTRAINT `jornadas_vehiculoId_fkey` FOREIGN KEY (`vehiculoId`) REFERENCES `vehiculos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jornadas` ADD CONSTRAINT `jornadas_conductorId_fkey` FOREIGN KEY (`conductorId`) REFERENCES `conductores`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jornadas` ADD CONSTRAINT `jornadas_inspeccionSalidaId_fkey` FOREIGN KEY (`inspeccionSalidaId`) REFERENCES `inspecciones_salida_fgmt`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jornadas` ADD CONSTRAINT `jornadas_inspeccionRetornoId_fkey` FOREIGN KEY (`inspeccionRetornoId`) REFERENCES `inspecciones_retorno_planta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hojas_de_ruta` ADD CONSTRAINT `hojas_de_ruta_jornadaId_fkey` FOREIGN KEY (`jornadaId`) REFERENCES `jornadas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tramos_ruta` ADD CONSTRAINT `tramos_ruta_hojaDeRutaId_fkey` FOREIGN KEY (`hojaDeRutaId`) REFERENCES `hojas_de_ruta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tramos_ruta` ADD CONSTRAINT `tramos_ruta_ordenServicioId_fkey` FOREIGN KEY (`ordenServicioId`) REFERENCES `ordenes_servicio`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitudes_servicio` ADD CONSTRAINT `solicitudes_servicio_empresaClienteId_fkey` FOREIGN KEY (`empresaClienteId`) REFERENCES `empresas_clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solicitudes_servicio` ADD CONSTRAINT `solicitudes_servicio_sucursalFaenaId_fkey` FOREIGN KEY (`sucursalFaenaId`) REFERENCES `sucursales_faenas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio` ADD CONSTRAINT `ordenes_servicio_solicitudServicioId_fkey` FOREIGN KEY (`solicitudServicioId`) REFERENCES `solicitudes_servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ordenes_servicio` ADD CONSTRAINT `ordenes_servicio_estadoDePagoId_fkey` FOREIGN KEY (`estadoDePagoId`) REFERENCES `estados_de_pago`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ciclos_transporte` ADD CONSTRAINT `ciclos_transporte_ordenServicioId_fkey` FOREIGN KEY (`ordenServicioId`) REFERENCES `ordenes_servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `autorizaciones_faena` ADD CONSTRAINT `autorizaciones_faena_cicloTransporteId_fkey` FOREIGN KEY (`cicloTransporteId`) REFERENCES `ciclos_transporte`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fotos_faena_epp` ADD CONSTRAINT `fotos_faena_epp_cicloTransporteId_fkey` FOREIGN KEY (`cicloTransporteId`) REFERENCES `ciclos_transporte`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `actas_recepcion` ADD CONSTRAINT `actas_recepcion_cicloTransporteId_fkey` FOREIGN KEY (`cicloTransporteId`) REFERENCES `ciclos_transporte`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visitas_destino` ADD CONSTRAINT `visitas_destino_ordenServicioId_fkey` FOREIGN KEY (`ordenServicioId`) REFERENCES `ordenes_servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `expedientes_documentales` ADD CONSTRAINT `expedientes_documentales_ordenServicioId_fkey` FOREIGN KEY (`ordenServicioId`) REFERENCES `ordenes_servicio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documentos_expediente` ADD CONSTRAINT `documentos_expediente_expedienteDocumentalId_fkey` FOREIGN KEY (`expedienteDocumentalId`) REFERENCES `expedientes_documentales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estados_de_pago` ADD CONSTRAINT `estados_de_pago_empresaClienteId_fkey` FOREIGN KEY (`empresaClienteId`) REFERENCES `empresas_clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estados_de_pago` ADD CONSTRAINT `estados_de_pago_contratoClienteId_fkey` FOREIGN KEY (`contratoClienteId`) REFERENCES `contratos_clientes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `historial_estados` ADD CONSTRAINT `historial_estados_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditoria_eventos` ADD CONSTRAINT `auditoria_eventos_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

