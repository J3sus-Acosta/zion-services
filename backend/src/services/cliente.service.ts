import { prisma } from '../utils/prisma.js';
import {
  CreateEmpresaClienteInput,
  UpdateEmpresaClienteInput,
  CreateSucursalInput,
  UpdateSucursalInput,
  ClientePaginationQueryInput,
  formatRut
} from '../validators/cliente.validator.js';
import { logger } from '../utils/logger.js';

export class ClienteError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 400, code = 'CLIENTE_ERROR') {
    super(message);
    this.name = 'ClienteError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ClienteService {
  /**
   * 1. Listar Empresas Clientes con paginación, filtros y conteo de sucursales
   */
  static async listarEmpresas(params: ClientePaginationQueryInput) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.activo !== undefined) {
      where.activo = params.activo;
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.trim();
      where.OR = [
        { rut: { contains: q } },
        { razonSocial: { contains: q } },
        { nombreFantasia: { contains: q } }
      ];
    }

    const [total, empresas] = await Promise.all([
      prisma.empresaCliente.count({ where }),
      prisma.empresaCliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { razonSocial: 'asc' },
        include: {
          _count: {
            select: {
              sucursales: true
            }
          }
        }
      })
    ]);

    return {
      empresas,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 2. Obtener Empresa Cliente por ID con sus sucursales activas
   */
  static async obtenerEmpresaPorId(id: string) {
    const empresa = await prisma.empresaCliente.findUnique({
      where: { id },
      include: {
        sucursales: {
          where: { activo: true },
          orderBy: { nombre: 'asc' }
        },
        _count: {
          select: {
            sucursales: true,
            usuarios: true,
            solicitudes: true
          }
        }
      }
    });

    if (!empresa) {
      throw new ClienteError(`Empresa cliente con ID "${id}" no encontrada.`, 404, 'EMPRESA_NOT_FOUND');
    }

    return empresa;
  }

  /**
   * 3. Crear Empresa Cliente verificando unicidad de RUT
   */
  static async crearEmpresa(data: CreateEmpresaClienteInput) {
    const formatted = formatRut(data.rut);

    // Verificar unicidad de RUT
    const existente = await prisma.empresaCliente.findUnique({
      where: { rut: formatted }
    });

    if (existente) {
      throw new ClienteError(
        `Ya existe una empresa registrada con el RUT ${formatted}.`,
        409,
        'RUT_ALREADY_EXISTS'
      );
    }

    const empresa = await prisma.empresaCliente.create({
      data: {
        rut: formatted,
        razonSocial: data.razonSocial.trim(),
        nombreFantasia: data.nombreFantasia?.trim() || null,
        giro: data.giro?.trim() || null,
        tipo: data.tipo || 'SPOT',
        activo: data.activo !== undefined ? data.activo : true
      }
    });

    logger.info('Empresa cliente creada exitosamente', { id: empresa.id, rut: empresa.rut, razonSocial: empresa.razonSocial });
    return empresa;
  }

  /**
   * 4. Actualizar Empresa Cliente con validación de RUT único
   */
  static async actualizarEmpresa(id: string, data: UpdateEmpresaClienteInput) {
    const empresa = await prisma.empresaCliente.findUnique({
      where: { id }
    });

    if (!empresa) {
      throw new ClienteError(`Empresa cliente con ID "${id}" no encontrada.`, 404, 'EMPRESA_NOT_FOUND');
    }

    let rutParaActualizar: string | undefined = undefined;
    if (data.rut) {
      const formatted = formatRut(data.rut);
      if (formatted !== empresa.rut) {
        const existente = await prisma.empresaCliente.findUnique({
          where: { rut: formatted }
        });
        if (existente && existente.id !== id) {
          throw new ClienteError(
            `Ya existe otra empresa registrada con el RUT ${formatted}.`,
            409,
            'RUT_ALREADY_EXISTS'
          );
        }
        rutParaActualizar = formatted;
      }
    }

    const actualizada = await prisma.empresaCliente.update({
      where: { id },
      data: {
        rut: rutParaActualizar,
        razonSocial: data.razonSocial?.trim(),
        nombreFantasia: data.nombreFantasia !== undefined ? data.nombreFantasia?.trim() || null : undefined,
        giro: data.giro !== undefined ? data.giro?.trim() || null : undefined,
        tipo: data.tipo,
        activo: data.activo
      }
    });

    logger.info('Empresa cliente actualizada exitosamente', { id: actualizada.id, rut: actualizada.rut });
    return actualizada;
  }

  /**
   * 5. Eliminar (soft-delete) Empresa Cliente
   */
  static async eliminarEmpresa(id: string) {
    const empresa = await prisma.empresaCliente.findUnique({
      where: { id }
    });

    if (!empresa) {
      throw new ClienteError(`Empresa cliente con ID "${id}" no encontrada.`, 404, 'EMPRESA_NOT_FOUND');
    }

    const desactivada = await prisma.empresaCliente.update({
      where: { id },
      data: { activo: false }
    });

    logger.info('Empresa cliente desactivada (soft-delete)', { id: desactivada.id });
    return desactivada;
  }

  /**
   * 6. Listar Sucursales con filtros y paginación
   */
  static async listarSucursales(params: ClientePaginationQueryInput) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.empresaClienteId) {
      where.empresaClienteId = params.empresaClienteId;
    }

    if (params.activo !== undefined) {
      where.activo = params.activo;
    }

    if (params.search && params.search.trim() !== '') {
      const q = params.search.trim();
      where.OR = [
        { nombre: { contains: q } },
        { direccion: { contains: q } },
        { comuna: { contains: q } },
        { ciudad: { contains: q } }
      ];
    }

    const [total, sucursales] = await Promise.all([
      prisma.sucursalFaena.count({ where }),
      prisma.sucursalFaena.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
        include: {
          empresaCliente: {
            select: {
              id: true,
              rut: true,
              razonSocial: true,
              nombreFantasia: true
            }
          }
        }
      })
    ]);

    return {
      sucursales,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * 7. Obtener Sucursal por ID con información de la Empresa Cliente
   */
  static async obtenerSucursalPorId(id: string) {
    const sucursal = await prisma.sucursalFaena.findUnique({
      where: { id },
      include: {
        empresaCliente: true
      }
    });

    if (!sucursal) {
      throw new ClienteError(`Sucursal faena con ID "${id}" no encontrada.`, 404, 'SUCURSAL_NOT_FOUND');
    }

    return sucursal;
  }

  /**
   * 8. Crear Sucursal verificando existencia de la Empresa Cliente
   */
  static async crearSucursal(data: CreateSucursalInput) {
    const empresa = await prisma.empresaCliente.findUnique({
      where: { id: data.empresaClienteId }
    });

    if (!empresa) {
      throw new ClienteError(
        `La empresa cliente con ID "${data.empresaClienteId}" no existe.`,
        404,
        'EMPRESA_NOT_FOUND'
      );
    }

    const sucursal = await prisma.sucursalFaena.create({
      data: {
        empresaClienteId: data.empresaClienteId,
        nombre: data.nombre.trim(),
        direccion: data.direccion.trim(),
        comuna: data.comuna.trim(),
        ciudad: data.ciudad?.trim() || data.comuna.trim(),
        region: data.region.trim(),
        contactoNombre: data.contactoNombre?.trim() || null,
        contactoTelefono: data.contactoTelefono?.trim() || null,
        contactoEmail: data.contactoEmail?.trim() || null,
        activo: data.activo !== undefined ? data.activo : true
      },
      include: {
        empresaCliente: {
          select: {
            id: true,
            rut: true,
            razonSocial: true,
            nombreFantasia: true
          }
        }
      }
    });

    logger.info('Sucursal faena creada exitosamente', { id: sucursal.id, nombre: sucursal.nombre });
    return sucursal;
  }

  /**
   * 9. Actualizar Sucursal Faena
   */
  static async actualizarSucursal(id: string, data: UpdateSucursalInput) {
    const sucursal = await prisma.sucursalFaena.findUnique({
      where: { id }
    });

    if (!sucursal) {
      throw new ClienteError(`Sucursal faena con ID "${id}" no encontrada.`, 404, 'SUCURSAL_NOT_FOUND');
    }

    if (data.empresaClienteId && data.empresaClienteId !== sucursal.empresaClienteId) {
      const empresa = await prisma.empresaCliente.findUnique({
        where: { id: data.empresaClienteId }
      });
      if (!empresa) {
        throw new ClienteError(
          `La empresa cliente con ID "${data.empresaClienteId}" no existe.`,
          404,
          'EMPRESA_NOT_FOUND'
        );
      }
    }

    const actualizada = await prisma.sucursalFaena.update({
      where: { id },
      data: {
        empresaClienteId: data.empresaClienteId,
        nombre: data.nombre?.trim(),
        direccion: data.direccion?.trim(),
        comuna: data.comuna?.trim(),
        ciudad: data.ciudad?.trim(),
        region: data.region?.trim(),
        contactoNombre: data.contactoNombre !== undefined ? data.contactoNombre?.trim() || null : undefined,
        contactoTelefono: data.contactoTelefono !== undefined ? data.contactoTelefono?.trim() || null : undefined,
        contactoEmail: data.contactoEmail !== undefined ? data.contactoEmail?.trim() || null : undefined,
        activo: data.activo
      },
      include: {
        empresaCliente: {
          select: {
            id: true,
            rut: true,
            razonSocial: true,
            nombreFantasia: true
          }
        }
      }
    });

    logger.info('Sucursal faena actualizada exitosamente', { id: actualizada.id });
    return actualizada;
  }

  /**
   * 10. Eliminar (soft-delete) Sucursal Faena
   */
  static async eliminarSucursal(id: string) {
    const sucursal = await prisma.sucursalFaena.findUnique({
      where: { id }
    });

    if (!sucursal) {
      throw new ClienteError(`Sucursal faena con ID "${id}" no encontrada.`, 404, 'SUCURSAL_NOT_FOUND');
    }

    const desactivada = await prisma.sucursalFaena.update({
      where: { id },
      data: { activo: false }
    });

    logger.info('Sucursal faena desactivada (soft-delete)', { id: desactivada.id });
    return desactivada;
  }
}
