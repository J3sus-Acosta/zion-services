import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // En desarrollo/test, reutilizar instancia global para evitar agotar conexiones
  const globalWithPrisma = global as typeof globalThis & {
    __prisma?: PrismaClient;
  };
  if (!globalWithPrisma.__prisma) {
    globalWithPrisma.__prisma = new PrismaClient();
  }
  prisma = globalWithPrisma.__prisma;
}

export { prisma };
