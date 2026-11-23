import { EstadoEquipo, PrismaClient, RolUsuario, TipoCliente, TipoEquipo } from '@prisma/client';
import { CryptoUtil } from '../src/utils/crypto.js';
import { seedPlanningData } from './seed-planning.js';

const prisma = new PrismaClient();

export async function seedDemoData(client: PrismaClient = prisma) {
  console.log('--- Iniciando Seed de Base de Datos SATEM / Zion Services ---');

  // 1. Empresas Clientes Demo
  const empresas = [
    {
      id: 'empresa-horse',
      rut: '76.111.222-3',
      razonSocial: 'Horse Chile S.A.',
      nombreFantasia: 'Horse Chile',
      giro: 'Servicios Industriales y Automotrices',
      tipo: TipoCliente.CONTRACTUAL,
      activo: true
    },
    {
      id: 'empresa-acme',
      rut: '77.333.444-5',
      razonSocial: 'Acme Logistics SpA',
      nombreFantasia: 'Acme Logistics',
      giro: 'Logística y Almacenamiento',
      tipo: TipoCliente.SPOT,
      activo: true
    },
    {
      id: 'empresa-bravo-energy',
      rut: '78.555.666-7',
      razonSocial: 'Bravo Energy SpA',
      nombreFantasia: 'Bravo Energy',
      giro: 'Generación y Energía',
      tipo: TipoCliente.SPOT,
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
