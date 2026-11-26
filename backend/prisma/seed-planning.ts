import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SERVICIOS_CATALOGO_BASE = [
  {
    codigo: 'HIDROJET',
    nombre: 'Servicio Hidrojet de Alta Presión',
    descripcion: 'Destape, limpieza y lavado hidrodinámico de cañerías, colectores y redes de alcantarillado.',
    duracionEstimadaMinutos: 120,
    activo: true
  },
  {
    codigo: 'HIDROJET-ALTA',
    nombre: 'Hidrojet de Alta Presión para Redes Industriales',
    descripcion: 'Lavado especializado de tuberías y ductos industriales a alta presión con succión simultánea.',
    duracionEstimadaMinutos: 120,
    activo: true
  },
  {
    codigo: 'RETIRO_LODOS_MANUAL',
    nombre: 'Retiro Manual y Disposición de Lodos',
    descripcion: 'Extracción, ensacado y retiro manual de lodos en cámaras desgrasadoras, fosas y trampas.',
    duracionEstimadaMinutos: 180,
    activo: true
  },
  {
    codigo: 'RETIRO-LODOS-MANUAL',
    nombre: 'Retiro Manual y Manejo de Lodos Residuales',
    descripcion: 'Extracción manual de sedimentos y lodos en faenas sin acceso directo para camión limpiafosas.',
    duracionEstimadaMinutos: 180,
    activo: true
  },
  {
    codigo: 'SUCCION_RILES',
    nombre: 'Succión y Transporte de RILes',
    descripcion: 'Succión al vacío de residuos industriales líquidos (RILes) y transporte a planta autorizada.',
    duracionEstimadaMinutos: 150,
    activo: true
  },
  {
    codigo: 'SUCCION-RILES',
    nombre: 'Succión y Disposición Certificada de RILes',
    descripcion: 'Servicio integral de retiro al vacío y trazabilidad SIDREP para residuos industriales líquidos.',
    duracionEstimadaMinutos: 150,
    activo: true
  },
  {
    codigo: 'LIMPIEZA_FOSA',
    nombre: 'Limpieza y Desobstrucción de Fosas Sépticas',
    descripcion: 'Vaciado, succión de lodos sépticos y lavado profundo de cámaras y pozos absorbentes.',
    duracionEstimadaMinutos: 120,
    activo: true
  },
  {
    codigo: 'LIMPIEZA-FOSA',
    nombre: 'Limpieza Integral de Fosa Séptica',
    descripcion: 'Succión de lodos pesados y mantenimiento preventivo de fosas sépticas comerciales e industriales.',
    duracionEstimadaMinutos: 120,
    activo: true
  },
  {
    codigo: 'LODOS_DESHIDRATADOS',
    nombre: 'Manejo y Retiro de Lodos Deshidratados',
    descripcion: 'Carga mecanizada, transporte hermético y entrega en planta autorizada de lodos deshidratados.',
    duracionEstimadaMinutos: 180,
    activo: true
  },
  {
    codigo: 'LODOS-DESHIDRATADOS',
    nombre: 'Transporte y Disposición de Lodos Deshidratados',
    descripcion: 'Retiro de tortas de lodo deshidratado provenientes de plantas de tratamiento de riles (PTR).',
    duracionEstimadaMinutos: 180,
    activo: true
  }
];

export const PLANTAS_DESTINO_BASE = [
  {
    id: 'planta-la-farfana',
    nombre: 'Planta de Tratamiento La Farfana (Aguas Andinas)',
    direccion: 'Av. Rinconada Poniente 12345',
    comuna: 'Maipú',
    region: 'Metropolitana',
    autorizadaRiles: true,
    resolucionSanitaria: 'RES-SEREMI-RM-2019-8432',
    activa: true
  },
  {
    id: 'planta-trebal-mapocho',
    nombre: 'Planta de Tratamiento Trebal - Mapocho (Aguas Andinas)',
    direccion: 'Camino a Melipilla Km 28',
    comuna: 'Padre Hurtado',
    region: 'Metropolitana',
    autorizadaRiles: true,
    resolucionSanitaria: 'RES-SEREMI-RM-2020-5120',
    activa: true
  },
  {
    id: 'planta-armony-sustentable',
    nombre: 'Planta de Compostaje y Valorización Armony Sustentable',
    direccion: 'Camino Santa Margarita 01500',
    comuna: 'San Bernardo',
    region: 'Metropolitana',
    autorizadaRiles: true,
    resolucionSanitaria: 'RES-SEREMI-RM-2021-3981',
    activa: true
  },
  {
    id: 'planta-ecomaule-pudahuel',
    nombre: 'Centro de Transferencia y Tratamiento Ecomaule',
    direccion: 'Camino Los Carros s/n',
    comuna: 'Pudahuel',
    region: 'Metropolitana',
    autorizadaRiles: true,
    resolucionSanitaria: 'RES-SEREMI-RM-2022-7714',
    activa: true
  },
  {
    id: 'planta-kdm-quilicura',
    nombre: 'Planta de Tratamiento KDM Industrial Quilicura',
    direccion: 'Av. Américo Vespucio Norte 2400',
    comuna: 'Quilicura',
    region: 'Metropolitana',
    autorizadaRiles: true,
    resolucionSanitaria: 'RES-SEREMI-RM-2018-4509',
    activa: true
  }
];

export async function seedPlanningData(client: PrismaClient = prisma) {
  console.log('--- Iniciando Seed de Planificación de Servicios y Catálogos ---');

  console.log(`Poblando catálogo de servicios (${SERVICIOS_CATALOGO_BASE.length} servicios)...`);
  for (const servicio of SERVICIOS_CATALOGO_BASE) {
    await client.servicioCatalogo.upsert({
      where: { codigo: servicio.codigo },
      update: {
        nombre: servicio.nombre,
        descripcion: servicio.descripcion,
        duracionEstimadaMinutos: servicio.duracionEstimadaMinutos,
        activo: servicio.activo
      },
      create: servicio
    });
  }
  console.log(`✓ ${SERVICIOS_CATALOGO_BASE.length} servicios de catálogo creados/actualizados.`);

  console.log(`Poblando plantas de destino autorizadas (${PLANTAS_DESTINO_BASE.length} plantas)...`);
  for (const planta of PLANTAS_DESTINO_BASE) {
    await client.plantaDestino.upsert({
      where: { id: planta.id },
      update: {
        nombre: planta.nombre,
        direccion: planta.direccion,
        comuna: planta.comuna,
        region: planta.region,
        autorizadaRiles: planta.autorizadaRiles,
        resolucionSanitaria: planta.resolucionSanitaria,
        activa: planta.activa
      },
      create: planta
    });
  }
  console.log(`✓ ${PLANTAS_DESTINO_BASE.length} plantas de destino creadas/actualizadas.`);

  console.log('--- Seed de Planificación completado con éxito ---');
}

async function main() {
  try {
    await seedPlanningData(prisma);
  } catch (error) {
    console.error('Error durante la ejecución del seed de planificación:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith('seed-planning.ts') || process.argv[1]?.endsWith('seed-planning.js')) {
  main();
}
