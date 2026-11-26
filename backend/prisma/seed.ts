import {
  EstadoAtencionProgramada,
  EstadoCicloTransporte,
  EstadoEquipo,
  EstadoJornada,
  EstadoOrdenServicio,
  EstadoSolicitud,
  ModalidadJornada,
  PrismaClient,
  RolUsuario,
  TipoCliente,
  TipoEquipo,
  TipoTramo
} from '@prisma/client';
import { CryptoUtil } from '../src/utils/crypto.js';
import { seedPlanningData } from './seed-planning.js';

const prisma = new PrismaClient();

export async function seedDemoData(client: PrismaClient = prisma) {
  console.log('--- Iniciando Seed de Base de Datos Zion Services ---');

  // 1. Empresas Clientes Demo
  const empresas = [
    {
      id: 'empresa-horse',
      rut: '76.111.222-8',
      razonSocial: 'Horse Chile S.A.',
      nombreFantasia: 'Horse Chile',
      giro: 'Servicios Industriales y Automotrices',
      tipo: TipoCliente.CONTRACTUAL,
      activo: true
    },
    {
      id: 'empresa-acme',
      rut: '77.333.444-7',
      razonSocial: 'Acme Logistics SpA',
      nombreFantasia: 'Acme Logistics',
      giro: 'Logística y Almacenamiento',
      tipo: TipoCliente.SPOT,
      activo: true
    },
    {
      id: 'empresa-bravo-energy',
      rut: '78.555.666-6',
      razonSocial: 'Bravo Energy SpA',
      nombreFantasia: 'Bravo Energy',
      giro: 'Generación y Energía',
      tipo: TipoCliente.SPOT,
      activo: true
    },
    {
      id: 'empresa-minera-andes',
      rut: '76.432.109-K',
      razonSocial: 'Minera Los Andes SpA',
      nombreFantasia: 'Minera Los Andes',
      giro: 'Extracción y Procesamiento de Minerales',
      tipo: TipoCliente.CONTRACTUAL,
      activo: true
    },
    {
      id: 'empresa-agricola-valle',
      rut: '77.987.654-3',
      razonSocial: 'Agrícola del Valle S.A.',
      nombreFantasia: 'Agrícola del Valle',
      giro: 'Producción y Procesamiento Agroindustrial',
      tipo: TipoCliente.CONTRACTUAL,
      activo: true
    }
  ];

  for (const emp of empresas) {
    await client.empresaCliente.upsert({
      where: { id: emp.id },
      update: emp,
      create: emp
    });
  }
  console.log(`✓ ${empresas.length} Empresas clientes verificadas/creadas.`);

  // 1.1 Sucursales y Faenas Demo
  const sucursales = [
    {
      id: 'suc-horse-panamericana',
      empresaClienteId: 'empresa-horse',
      nombre: 'Planta Panamericana Norte',
      direccion: 'Av. Panamericana Norte 9800',
      comuna: 'Quilicura',
      ciudad: 'Santiago',
      region: 'Metropolitana',
      contactoNombre: 'Juan Sepúlveda',
      contactoTelefono: '+56 9 8765 4321',
      contactoEmail: 'jsepulveda@horse.cl',
      activo: true
    },
    {
      id: 'suc-horse-san-bernardo',
      empresaClienteId: 'empresa-horse',
      nombre: 'Centro Logístico San Bernardo',
      direccion: 'Camino La Vara 1500',
      comuna: 'San Bernardo',
      ciudad: 'Santiago',
      region: 'Metropolitana',
      contactoNombre: 'Patricia Morales',
      contactoTelefono: '+56 9 8765 4322',
      contactoEmail: 'pmorales@horse.cl',
      activo: true
    },
    {
      id: 'suc-acme-pudahuel',
      empresaClienteId: 'empresa-acme',
      nombre: 'Bodega Central Enea',
      direccion: 'Av. El Parque 1200',
      comuna: 'Pudahuel',
      ciudad: 'Santiago',
      region: 'Metropolitana',
      contactoNombre: 'Roberto Fuentes',
      contactoTelefono: '+56 9 7654 3210',
      contactoEmail: 'rfuentes@acmelogistics.cl',
      activo: true
    },
    {
      id: 'suc-acme-valparaiso',
      empresaClienteId: 'empresa-acme',
      nombre: 'Terminal Portuario Valparaíso',
      direccion: 'Av. Errázuriz 230',
      comuna: 'Valparaíso',
      ciudad: 'Valparaíso',
      region: 'Valparaíso',
      contactoNombre: 'Camila Soto',
      contactoTelefono: '+56 9 7654 3211',
      contactoEmail: 'csoto@acmelogistics.cl',
      activo: true
    },
    {
      id: 'suc-bravo-colina',
      empresaClienteId: 'empresa-bravo-energy',
      nombre: 'Parque Solar Colina Norte',
      direccion: 'Camino a Coquimbo Km 34',
      comuna: 'Colina',
      ciudad: 'Santiago',
      region: 'Metropolitana',
      contactoNombre: 'Ignacio Vargas',
      contactoTelefono: '+56 9 6543 2109',
      contactoEmail: 'ivargas@bravoenergy.cl',
      activo: true
    },
    {
      id: 'suc-minera-rancagua',
      empresaClienteId: 'empresa-minera-andes',
      nombre: 'Faena El Peumo Rancagua',
      direccion: 'Carretera El Cobre Km 12',
      comuna: 'Machalí',
      ciudad: 'Rancagua',
      region: "Libertador Bernardo O'Higgins",
      contactoNombre: 'Marcela Tapia',
      contactoTelefono: '+56 9 5432 1098',
      contactoEmail: 'mtapia@mineralosandes.cl',
      activo: true
    },
    {
      id: 'suc-agricola-buin',
      empresaClienteId: 'empresa-agricola-valle',
      nombre: 'Packing y Planta Buin',
      direccion: 'Camino Los Morros 450',
      comuna: 'Buin',
      ciudad: 'Santiago',
      region: 'Metropolitana',
      contactoNombre: 'Gonzalo Araya',
      contactoTelefono: '+56 9 4321 0987',
      contactoEmail: 'garaya@agricoladelvalle.cl',
      activo: true
    }
  ];

  for (const suc of sucursales) {
    await client.sucursalFaena.upsert({
      where: { id: suc.id },
      update: suc,
      create: suc
    });
  }
  console.log(`✓ ${sucursales.length} Sucursales/Faenas verificadas/creadas.`);

  // 2. Usuarios Demo
  const usuarios = [
    {
      id: 'usr-superadmin-01',
      email: 'superadmin@zion.cl',
      passwordHash: CryptoUtil.hashPassword('SuperAdmin2026!'),
      nombre: 'Super',
      apellido: 'Administrador',
      rut: '1-9',
      rol: RolUsuario.SUPERADMIN,
      activo: true
    },
    {
      id: 'usr-admin-01',
      email: 'admin@zion.cl',
      passwordHash: CryptoUtil.hashPassword('Admin2026!'),
      nombre: 'Administrador',
      apellido: 'Zion',
      rut: '2-7',
      rol: RolUsuario.ADMIN,
      activo: true
    },
    {
      id: 'usr-jefe-ops-01',
      email: 'operaciones@zion.cl',
      passwordHash: CryptoUtil.hashPassword('Ops2026!'),
      nombre: 'Jefe',
      apellido: 'Operaciones',
      rut: '3-5',
      rol: RolUsuario.JEFE_OPERACIONES,
      activo: true
    },
    {
      id: 'usr-conductor-01',
      email: 'conductor@zion.cl',
      passwordHash: CryptoUtil.hashPassword('Conductor2026!'),
      nombre: 'Carlos',
      apellido: 'Sánchez',
      rut: '4-3',
      rol: RolUsuario.CONDUCTOR,
      activo: true
    },
    {
      id: 'usr-cliente-01',
      email: 'cliente@horse.cl',
      passwordHash: CryptoUtil.hashPassword('Cliente2026!'),
      nombre: 'Contacto',
      apellido: 'Horse Chile',
      rut: '5-1',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-horse',
      activo: true
    },
    {
      id: 'usr-cliente-inactivo',
      email: 'inactivo@cliente.cl',
      passwordHash: CryptoUtil.hashPassword('Inactivo2026!'),
      nombre: 'Usuario',
      apellido: 'Inactivo',
      rut: '6-K',
      rol: RolUsuario.CLIENTE,
      empresaClienteId: 'empresa-horse',
      activo: false
    }
  ];

  for (const usr of usuarios) {
    await client.usuario.upsert({
      where: { id: usr.id },
      update: usr,
      create: usr
    });
  }
  console.log(`✓ ${usuarios.length} Usuarios demo verificados/creados.`);

  // 3. Conductor asignado
  await client.conductor.upsert({
    where: { id: 'cond-01' },
    update: {
      usuarioId: 'usr-conductor-01',
      licenciaNumero: '12345678',
      licenciaClase: 'A4/A5',
      licenciaVencimiento: new Date('2028-12-31T00:00:00.000Z'),
      activo: true
    },
    create: {
      id: 'cond-01',
      usuarioId: 'usr-conductor-01',
      licenciaNumero: '12345678',
      licenciaClase: 'A4/A5',
      licenciaVencimiento: new Date('2028-12-31T00:00:00.000Z'),
      activo: true
    }
  });
  console.log('✓ Perfil Conductor cond-01 verificado/creado.');

  // 4. Vehículo demo
  await client.vehiculo.upsert({
    where: { id: 'veh-01' },
    update: {
      patente: 'RVFL-92',
      marca: 'Mercedes-Benz',
      modelo: 'Actros 2645',
      anio: 2022,
      capacidadEstanqueM3: 15.0,
      equipoHidrojet: true,
      equipoVacio: true,
      tipoEquipo: TipoEquipo.CAMION,
      estado: EstadoEquipo.HABILITADO,
      observaciones: 'Unidad principal de hidrojet/vacío para servicios de alta presión.',
      bloqueadoPorSeguridad: false,
      activo: true
    },
    create: {
      id: 'veh-01',
      patente: 'RVFL-92',
      marca: 'Mercedes-Benz',
      modelo: 'Actros 2645',
      anio: 2022,
      capacidadEstanqueM3: 15.0,
      equipoHidrojet: true,
      equipoVacio: true,
      tipoEquipo: TipoEquipo.CAMION,
      estado: EstadoEquipo.HABILITADO,
      observaciones: 'Unidad principal de hidrojet/vacío para servicios de alta presión.',
      bloqueadoPorSeguridad: false,
      activo: true
    }
  });
  console.log('✓ Vehículo veh-01 (RVFL-92) verificado/creado.');

  // 6. Catálogos y Plantas de Planificación
  await seedPlanningData(client);

  // 7. Solicitudes y Órdenes de Servicio con Ciclos de Transporte Inicializados
  console.log('--- Creando Solicitudes, Órdenes y Ciclos de Transporte Demo ---');

  const solicitudesDemo = [
    {
      id: 'sol-demo-01',
      folio: 'SOL-2026-0001',
      empresaClienteId: 'empresa-horse',
      sucursalFaenaId: 'suc-horse-panamericana',
      tipoResiduo: 'RILes Peligrosos',
      descripcion: 'Succión y transporte certificado de RILes en faena Panamericana Norte.',
      cantidadEstimada: 15.0,
      unidadEstimada: 'M3',
      fechaPreferente: new Date(),
      estado: EstadoSolicitud.APROBADA
    },
    {
      id: 'sol-demo-02',
      folio: 'SOL-2026-0002',
      empresaClienteId: 'empresa-acme',
      sucursalFaenaId: 'suc-acme-pudahuel',
      tipoResiduo: 'Lodos de Fosa Séptica',
      descripcion: 'Limpieza y mantención preventiva de cámaras desgrasadoras y fosa séptica.',
      cantidadEstimada: 8.0,
      unidadEstimada: 'M3',
      fechaPreferente: new Date(),
      estado: EstadoSolicitud.APROBADA
    }
  ];

  for (const sol of solicitudesDemo) {
    await client.solicitudServicio.upsert({
      where: { id: sol.id },
      update: sol,
      create: sol
    });
  }
  console.log(`✓ ${solicitudesDemo.length} Solicitudes de servicio demo verificadas/creadas.`);

  // Órdenes de servicio
  const ordenesDemo = [
    {
      id: 'os-demo-01',
      folio: 'OS-2026-0001',
      solicitudServicioId: 'sol-demo-01',
      estado: EstadoOrdenServicio.EN_EJECUCION,
      observaciones: 'Servicio en ejecución activo para pruebas operativas de terreno y telemetría.'
    },
    {
      id: 'os-demo-02',
      folio: 'OS-2026-0002',
      solicitudServicioId: 'sol-demo-02',
      estado: EstadoOrdenServicio.PLANIFICADA,
      observaciones: 'Servicio planificado para pruebas de inicio de ciclo de transporte.'
    }
  ];

  for (const os of ordenesDemo) {
    await client.ordenServicio.upsert({
      where: { id: os.id },
      update: os,
      create: os
    });
  }
  console.log(`✓ ${ordenesDemo.length} Órdenes de servicio demo verificadas/creadas.`);

  // Ciclos de Transporte (1:1 con OrdenServicio)
  const ciclosDemo = [
    {
      id: 'ciclo-demo-01',
      ordenServicioId: 'os-demo-01',
      estado: EstadoCicloTransporte.EN_RUTA_CLIENTE,
      horaLlegadaFaena: null,
      horaSalidaFaena: null
    },
    {
      id: 'ciclo-demo-02',
      ordenServicioId: 'os-demo-02',
      estado: EstadoCicloTransporte.PENDIENTE,
      horaLlegadaFaena: null,
      horaSalidaFaena: null
    }
  ];

  for (const ciclo of ciclosDemo) {
    await client.cicloTransporte.upsert({
      where: { id: ciclo.id },
      update: ciclo,
      create: ciclo
    });
  }
  console.log(`✓ ${ciclosDemo.length} Ciclos de transporte inicializados para terreno y tracking.`);

  // Expedientes Documentales (1:1 con OrdenServicio)
  const expedientesDemo = [
    {
      id: 'exp-demo-01',
      ordenServicioId: 'os-demo-01',
      completo: false
    },
    {
      id: 'exp-demo-02',
      ordenServicioId: 'os-demo-02',
      completo: false
    }
  ];

  for (const exp of expedientesDemo) {
    await client.expedienteDocumental.upsert({
      where: { id: exp.id },
      update: exp,
      create: exp
    });
  }
  console.log(`✓ ${expedientesDemo.length} Expedientes documentales demo inicializados.`);

  // Jornada Demo
  await client.jornada.upsert({
    where: { id: 'jornada-demo-01' },
    update: {
      vehiculoId: 'veh-01',
      conductorId: 'cond-01',
      modalidad: ModalidadJornada.LOCAL_SANTIAGO,
      fechaInicio: new Date(),
      estado: EstadoJornada.EN_CURSO
    },
    create: {
      id: 'jornada-demo-01',
      vehiculoId: 'veh-01',
      conductorId: 'cond-01',
      modalidad: ModalidadJornada.LOCAL_SANTIAGO,
      fechaInicio: new Date(),
      estado: EstadoJornada.EN_CURSO
    }
  });
  console.log('✓ Jornada jornada-demo-01 verificada/creada.');

  // Hoja de Ruta Demo
  await client.hojaDeRuta.upsert({
    where: { id: 'hdr-demo-01' },
    update: {
      jornadaId: 'jornada-demo-01',
      codigo: 'HDR-2026-0001'
    },
    create: {
      id: 'hdr-demo-01',
      jornadaId: 'jornada-demo-01',
      codigo: 'HDR-2026-0001'
    }
  });

  // Tramo de Ruta Demo
  await client.tramoRuta.upsert({
    where: { id: 'tramo-demo-01' },
    update: {
      hojaDeRutaId: 'hdr-demo-01',
      ordenSecuencia: 1,
      tipo: TipoTramo.HACIA_CLIENTE,
      origenNombre: 'Base Operaciones Zion Quilicura',
      destinoNombre: 'Planta Panamericana Norte (Horse Chile)',
      completado: false,
      fechaHoraInicio: new Date(),
      ordenServicioId: 'os-demo-01'
    },
    create: {
      id: 'tramo-demo-01',
      hojaDeRutaId: 'hdr-demo-01',
      ordenSecuencia: 1,
      tipo: TipoTramo.HACIA_CLIENTE,
      origenNombre: 'Base Operaciones Zion Quilicura',
      destinoNombre: 'Planta Panamericana Norte (Horse Chile)',
      completado: false,
      fechaHoraInicio: new Date(),
      ordenServicioId: 'os-demo-01'
    }
  });
  console.log('✓ Hoja de ruta y tramo vinculados a jornada y orden de servicio creados.');

  // Atención Programada Demo
  await client.atencionProgramada.upsert({
    where: { id: 'atencion-demo-01' },
    update: {
      folio: 'AP-2026-00001',
      solicitudServicioId: 'sol-demo-01',
      sucursalFaenaId: 'suc-horse-panamericana',
      plantaDestinoId: 'planta-la-farfana',
      fechaHoraInicio: new Date(),
      fechaHoraFinEstimada: new Date(Date.now() + 2 * 3600 * 1000),
      duracionEstimadaMinutos: 120,
      estado: EstadoAtencionProgramada.EN_CURSO,
      vehiculoId: 'veh-01',
      conductorId: 'usr-conductor-01',
      ordenServicioId: 'os-demo-01',
      jornadaId: 'jornada-demo-01'
    },
    create: {
      id: 'atencion-demo-01',
      folio: 'AP-2026-00001',
      solicitudServicioId: 'sol-demo-01',
      sucursalFaenaId: 'suc-horse-panamericana',
      plantaDestinoId: 'planta-la-farfana',
      fechaHoraInicio: new Date(),
      fechaHoraFinEstimada: new Date(Date.now() + 2 * 3600 * 1000),
      duracionEstimadaMinutos: 120,
      estado: EstadoAtencionProgramada.EN_CURSO,
      vehiculoId: 'veh-01',
      conductorId: 'usr-conductor-01',
      ordenServicioId: 'os-demo-01',
      jornadaId: 'jornada-demo-01'
    }
  });
  console.log('✓ Atención programada AP-2026-00001 creada y vinculada a OS-2026-0001.');

  // Registro de Telemetría GPS Demo inicial
  await client.registroTelemetriaGPS.upsert({
    where: { id: 'gps-demo-01' },
    update: {
      jornadaId: 'jornada-demo-01',
      ordenServicioId: 'os-demo-01',
      latitud: -33.3645,
      longitud: -70.6892,
      precisionMts: 5.0,
      velocidadKmh: 42.5,
      rumbo: 180.0,
      timestamp: new Date()
    },
    create: {
      id: 'gps-demo-01',
      jornadaId: 'jornada-demo-01',
      ordenServicioId: 'os-demo-01',
      latitud: -33.3645,
      longitud: -70.6892,
      precisionMts: 5.0,
      velocidadKmh: 42.5,
      rumbo: 180.0,
      timestamp: new Date()
    }
  });
  console.log('✓ Registro inicial de telemetría GPS demo verificado/creado.');

  console.log('--- Seed completado exitosamente ---');
}

// Ejecución directa si se invoca como script
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDemoData()
    .catch((e) => {
      console.error('Error durante el seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
