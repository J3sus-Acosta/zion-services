import { Prisma, PrismaClient } from '@prisma/client';
import { prisma as defaultPrisma } from '../utils/prisma.js';

export interface RegistrarAuditoriaInput {
  usuarioId?: string | null;
  accion: string;
  recurso: string;
  recursoId?: string | null;
  detallesJson?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

export class AuditService {
  /**
   * Registra un evento de auditoría en la BD.
   * Admite recibir un cliente Prisma o una transacción (`tx`).
   */
  static async registrar(
    client: Prisma.TransactionClient | PrismaClient,
    evento: RegistrarAuditoriaInput
  ): Promise<void> {
    const prismaClient = client || defaultPrisma;
    await prismaClient.auditoriaEvento.create({
      data: {
        usuarioId: evento.usuarioId ?? null,
        accion: evento.accion,
        recurso: evento.recurso,
        recursoId: evento.recursoId ?? null,
        detallesJson: evento.detallesJson ?? Prisma.DbNull,
        ipAddress: evento.ipAddress ?? null,
      }
    });
  }
}
