import { EstadoEquipo, PrismaClient, RolUsuario, TipoCliente, TipoEquipo } from '@prisma/client';
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
