import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { QrVerificationService } from './qr-verification.service.js';

export interface DatosClienteDoc {
  razonSocial: string;
  rut: string;
  sucursalNombre?: string;
  direccion?: string;
  comuna?: string;
  ciudad?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
}

export interface DatosOperacionalesDoc {
  camionPatente?: string;
  conductorNombre?: string;
  conductorRut?: string;
  fechaHora?: string | Date;
  tipoResiduo?: string;
  volumenEstimado?: number;
  volumenReal?: number;
  unidad?: string;
  observaciones?: string;
}

export interface ServicioItemDoc {
  descripcion: string;
  cantidad: number;
  unidad?: string;
  observaciones?: string;
}

export interface DatosOrdenServicio {
  folio: string;
  ordenId?: string;
  fechaEmision: string | Date;
  cliente: DatosClienteDoc;
  operacion: DatosOperacionalesDoc;
  servicios?: ServicioItemDoc[];
  hash?: string;
}

export interface DatosGuiaDespacho {
  folio: string;
  numeroGuia?: string;
  ordenId?: string;
  fechaEmision: string | Date;
  resolucionSeremi?: string;
  cliente: DatosClienteDoc;
  operacion: DatosOperacionalesDoc;
  destinoAutorizado?: {
    nombre: string;
    rut?: string;
    direccion?: string;
    resolucion?: string;
  };
  hash?: string;
}

export interface DatosOrdenTrabajo {
  folio: string;
  ordenId?: string;
  fechaEmision: string | Date;
  cliente: DatosClienteDoc;
  operacion: DatosOperacionalesDoc;
  actividades?: string[];
  protocoloSeguridad?: string[];
  hash?: string;
}

export interface DatosActaRecepcion {
  folio: string;
  ordenId?: string;
  fechaEmision: string | Date;
  cliente: DatosClienteDoc;
  operacion: DatosOperacionalesDoc;
  receptorNombre?: string;
  receptorRut?: string;
  receptorCargo?: string;
  firmaTactilPath?: string;
  firmaTactilBuffer?: Buffer;
  firmaBase64?: string;
  conforme?: boolean;
  observacionesRecepcion?: string;
  hash?: string;
}

export interface DocumentoGeneradoResult {
  buffer: Buffer;
  hash: string;
  qrUrl: string;
}

// Colores oficiales Zion Services Design System
const ZION_COLORS = {
  primaryDark: '#0B192C',
  primaryMedium: '#1E3E62',
  accentSuccess: '#00875A',
  accentWarning: '#FF6500',
  textDark: '#1F2937',
  textMuted: '#4B5563',
  border: '#D1D5DB',
  bgLight: '#F3F4F6'
};

export class DocumentGeneratorService {
  /**
   * Guarda físicamente la firma táctil codificada en Base64 en el almacenamiento de subidas.
   */
  static async guardarFirmaTactil(firmaBase64: string, ordenId: string): Promise<string> {
    if (!firmaBase64 || typeof firmaBase64 !== 'string') {
      throw new Error('Firma táctil inválida o vacía.');
    }

    const matches = firmaBase64.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    const base64Data = matches ? matches[2] : firmaBase64;
    const extension = matches ? matches[1] : 'png';

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length < 10) {
      throw new Error('La imagen de firma táctil está vacía o es inválida.');
    }

    const targetDir = path.resolve(process.cwd(), 'uploads/firmas');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = `firma-${ordenId}-${Date.now()}.${extension}`;
    const absolutePath = path.join(targetDir, filename);
    await fs.promises.writeFile(absolutePath, buffer);

    return `uploads/firmas/${filename}`;
  }

  /**
   * 1. Genera el PDF oficial de Orden de Servicio (OS)
   */
  static async generarOrdenServicioPdf(datos: DatosOrdenServicio): Promise<DocumentoGeneradoResult> {
    const hash = datos.hash || QrVerificationService.calcularHashPayload({
      tipo: 'ORDEN_SERVICIO',
      folio: datos.folio,
      ordenId: datos.ordenId,
      fechaEmision: datos.fechaEmision,
      cliente: datos.cliente,
      operacion: datos.operacion
    });
    const qrUrl = QrVerificationService.generarQrUrl(hash);
    const qrBuffer = await QrVerificationService.generarQrBuffer(qrUrl);

    const buffer = await this.renderPdf((doc) => {
      this.drawHeader(doc, 'ORDEN DE SERVICIO OFICIAL', datos.folio, datos.fechaEmision);
      this.drawClienteSection(doc, datos.cliente, 125);
      this.drawOperacionSection(doc, datos.operacion, 240);
      this.drawServiciosTable(doc, datos.servicios || [], 355);
      this.drawFooterTrazabilidad(doc, hash, qrUrl, qrBuffer);
    });

    return { buffer, hash, qrUrl };
  }

  /**
   * 2. Genera el PDF oficial de Guía de Despacho de Residuos (GD)
   */
  static async generarGuiaDespachoPdf(datos: DatosGuiaDespacho): Promise<DocumentoGeneradoResult> {
    const hash = datos.hash || QrVerificationService.calcularHashPayload({
      tipo: 'GUIA_DESPACHO',
      folio: datos.folio,
      numeroGuia: datos.numeroGuia,
      fechaEmision: datos.fechaEmision,
      cliente: datos.cliente,
      operacion: datos.operacion
    });
    const qrUrl = QrVerificationService.generarQrUrl(hash);
    const qrBuffer = await QrVerificationService.generarQrBuffer(qrUrl);

    const buffer = await this.renderPdf((doc) => {
      this.drawHeader(doc, 'GUÍA DE DESPACHO DE RESIDUOS', datos.numeroGuia || datos.folio, datos.fechaEmision);
      this.drawClienteSection(doc, datos.cliente, 125, 'ORIGEN / GENERADOR');
      this.drawOperacionSection(doc, datos.operacion, 240);

      // Sección 3: Destino Autorizado y Marco Regulatorio
      let y = 355;
      doc.rect(36, y, 540, 20).fill(ZION_COLORS.primaryMedium);
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('3. DESTINO AUTORIZADO Y CUMPLIMIENTO SANITARIO', 44, y + 5);

      y += 28;
      const destino = datos.destinoAutorizado || {
        nombre: 'Planta de Tratamiento y Valorización Industrial Norte',
        rut: '77.888.999-0',
        direccion: 'Camino Lo Boza 1200, Pudahuel',
        resolucion: 'Res. Sanitaria N° 21.054/2022'
      };

      doc.fillColor(ZION_COLORS.textDark).fontSize(8).font('Helvetica-Bold');
      doc.text('Planta Destino:', 44, y);
      doc.font('Helvetica').text(destino.nombre, 120, y);

      doc.font('Helvetica-Bold').text('RUT Destino:', 330, y);
      doc.font('Helvetica').text(destino.rut || 'N/A', 400, y);

      y += 15;
      doc.font('Helvetica-Bold').text('Dirección:', 44, y);
      doc.font('Helvetica').text(destino.direccion || 'N/A', 120, y);

      doc.font('Helvetica-Bold').text('Resolución Destino:', 330, y);
      doc.font('Helvetica').text(destino.resolucion || 'N/A', 420, y);

      y += 25;
      doc.rect(36, y, 540, 48).fillAndStroke(ZION_COLORS.bgLight, ZION_COLORS.border);
      doc.fillColor(ZION_COLORS.textMuted).fontSize(7).font('Helvetica');
      doc.text(
        'Certificación de Transporte: Se certifica que los residuos declarados en esta guía son transportados en vehículos autorizados bajo la Resolución Sanitaria SEREMI Salud RM N° 14.821, dando estricto cumplimiento al D.S. 148/2003 (Reglamento de Residuos Peligrosos/Industriales) y a los requisitos de trazabilidad de la Ley N° 20.920 (Ley REP).',
        44,
        y + 6,
        { width: 524, align: 'justify' }
      );

      // Firmas Conductor y Receptor Destino
      y += 65;
      this.drawBoxFirmasGuia(doc, y, datos.operacion.conductorNombre);

      this.drawFooterTrazabilidad(doc, hash, qrUrl, qrBuffer);
    });

    return { buffer, hash, qrUrl };
  }

  /**
   * 3. Genera el PDF oficial de Orden de Trabajo en Terreno (OT)
   */
  static async generarOrdenTrabajoPdf(datos: DatosOrdenTrabajo): Promise<DocumentoGeneradoResult> {
    const hash = datos.hash || QrVerificationService.calcularHashPayload({
      tipo: 'ORDEN_TRABAJO',
      folio: datos.folio,
      ordenId: datos.ordenId,
      fechaEmision: datos.fechaEmision,
      cliente: datos.cliente,
      operacion: datos.operacion
    });
    const qrUrl = QrVerificationService.generarQrUrl(hash);
    const qrBuffer = await QrVerificationService.generarQrBuffer(qrUrl);

    const buffer = await this.renderPdf((doc) => {
      this.drawHeader(doc, 'ORDEN DE TRABAJO EN TERRENO', datos.folio, datos.fechaEmision);
      this.drawClienteSection(doc, datos.cliente, 125);
      this.drawOperacionSection(doc, datos.operacion, 240);

      let y = 355;
      doc.rect(36, y, 540, 20).fill(ZION_COLORS.primaryMedium);
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('3. PROTOCOLO OPERACIONAL Y CONTROL DE SEGURIDAD', 44, y + 5);

      y += 28;
      const actividades = datos.actividades && datos.actividades.length > 0 ? datos.actividades : [
        'Inspección visual del área de carga y faena de sucursal',
        'Acople de mangueras herméticas y verificación de sellos de válvulas',
        'Succión y carga de residuos según capacidad nominal autorizada',
        'Desacople, purga de líneas y limpieza preventiva de derrames',
        'Control de estanqueidad y cierre de válvulas de seguridad del camión cisterna'
      ];

      doc.fillColor(ZION_COLORS.textDark).fontSize(8).font('Helvetica-Bold');
      doc.text('Actividades Planificadas de Faena:', 44, y);
      y += 14;

      doc.font('Helvetica').fontSize(8);
      actividades.forEach((act) => {
        doc.text(`[✓] ${act}`, 50, y);
        y += 14;
      });

      y += 10;
      doc.rect(36, y, 540, 40).fillAndStroke(ZION_COLORS.bgLight, ZION_COLORS.border);
      doc.fillColor(ZION_COLORS.textMuted).fontSize(7).font('Helvetica');
      doc.text(
        'Protocolo de Seguridad Minera e Industrial: Conductor y operadores disponen de EPP completo (casco, antiparras, guantes nitrilo/cuero, calzado de seguridad dieléctrico, chaleco reflectante y traje tyvek si aplica). Prohibido fumar o usar fuentes de ignición en radio de 25 metros.',
        44,
        y + 6,
        { width: 524, align: 'justify' }
      );

      this.drawFooterTrazabilidad(doc, hash, qrUrl, qrBuffer);
    });

    return { buffer, hash, qrUrl };
  }

  /**
   * 4. Genera el PDF oficial de Acta de Recepción Conforme (ARC) con firma táctil estampada
   */
  static async generarActaRecepcionPdf(datos: DatosActaRecepcion): Promise<DocumentoGeneradoResult> {
    const hash = datos.hash || QrVerificationService.calcularHashPayload({
      tipo: 'ACTA_RECEPCION',
      folio: datos.folio,
      ordenId: datos.ordenId,
      fechaEmision: datos.fechaEmision,
      cliente: datos.cliente,
      operacion: datos.operacion,
      conforme: datos.conforme !== false
    });
    const qrUrl = QrVerificationService.generarQrUrl(hash);
    const qrBuffer = await QrVerificationService.generarQrBuffer(qrUrl);

    // Resolver buffer de firma si viene por ruta o base64
    let firmaBuffer: Buffer | null = datos.firmaTactilBuffer || null;
    if (!firmaBuffer && datos.firmaBase64) {
      const b64 = datos.firmaBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      firmaBuffer = Buffer.from(b64, 'base64');
    } else if (!firmaBuffer && datos.firmaTactilPath) {
      const fullPath = path.resolve(process.cwd(), datos.firmaTactilPath);
      if (fs.existsSync(fullPath)) {
        try {
          firmaBuffer = fs.readFileSync(fullPath);
        } catch {
          firmaBuffer = null;
        }
      }
    }

    const buffer = await this.renderPdf((doc) => {
      this.drawHeader(doc, 'ACTA DE RECEPCIÓN CONFORME (ARC)', datos.folio, datos.fechaEmision);
      this.drawClienteSection(doc, datos.cliente, 125);
      this.drawOperacionSection(doc, datos.operacion, 240);

      // Declaración de Conformidad
      let y = 355;
      doc.rect(36, y, 540, 20).fill(ZION_COLORS.accentSuccess);
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('3. DECLARACIÓN DE CONFORMIDAD DEL SERVICIO EN TERRENO', 44, y + 5);

      y += 28;
      const estadoConforme = datos.conforme !== false;
      doc.rect(36, y, 540, 48).fillAndStroke(ZION_COLORS.bgLight, ZION_COLORS.border);
      doc.fillColor(ZION_COLORS.textDark).fontSize(8).font('Helvetica');
      doc.text(
        `Por medio de la presente acta, el receptor debidamente individualizado declara que los servicios de extracción, retiro y transporte de residuos industriales han sido ejecutados a entera satisfacción, en conformidad con los estándares de seguridad, orden y limpieza estipulados.\n\nResultado: ${
          estadoConforme ? 'CONFORME (Servicio Aprobado en Terreno)' : 'DISCONFORME / CON OBSERVACIONES'
        }`,
        44,
        y + 6,
        { width: 524, align: 'justify' }
      );

      // Observaciones si existen
      if (datos.observacionesRecepcion) {
        y += 56;
        doc.fillColor(ZION_COLORS.textDark).fontSize(8).font('Helvetica-Bold');
        doc.text('Observaciones del Receptor:', 44, y);
        doc.font('Helvetica').text(datos.observacionesRecepcion, 160, y, { width: 400 });
      }

      // Sección de Firmas con Firma Táctil Estampada
      y = 470;
      this.drawSeccionFirmaTactil(doc, y, datos, firmaBuffer);

      this.drawFooterTrazabilidad(doc, hash, qrUrl, qrBuffer);
    });

    return { buffer, hash, qrUrl };
  }

  // -------------------------------------------------------------
  // MÉTODOS PRIVADOS DE MAQUETACIÓN VISUAL (PDFKIT)
  // -------------------------------------------------------------

  private static renderPdf(builder: (doc: InstanceType<typeof PDFDocument>) => void): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 36, bottom: 36, left: 36, right: 36 }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      try {
        builder(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private static drawHeader(
    doc: InstanceType<typeof PDFDocument>,
    tituloDocumento: string,
    folio: string,
    fecha: string | Date
  ): void {
    // Membrete Zion Services
    doc.fillColor(ZION_COLORS.primaryDark).fontSize(14).font('Helvetica-Bold');
    doc.text('ZION SERVICES SpA', 36, 36);

    doc.fillColor(ZION_COLORS.textMuted).fontSize(7).font('Helvetica');
    doc.text('RUT: 76.999.888-2 | Gestión Ambiental y Transporte de Residuos', 36, 54);
    doc.text('Res. Ex. SEREMI de Salud RM N° 14.821 (Vigente)', 36, 64);
    doc.text('Casa Matriz: Av. Presidente Eduardo Frei Montalva 9800, Quilicura', 36, 74);
    doc.text('Mesa Central: +56 2 2999 8800 | operaciones@zionservices.cl', 36, 84);

    // Cuadro Documento Oficial (Lado Derecho)
    doc.rect(350, 34, 226, 68).lineWidth(1.5).strokeColor(ZION_COLORS.primaryMedium).stroke();
    doc.rect(350, 34, 226, 20).fill(ZION_COLORS.primaryDark);

    doc.fillColor('#FFFFFF').fontSize(8.5).font('Helvetica-Bold');
    doc.text(tituloDocumento, 355, 40, { width: 216, align: 'center' });

    doc.fillColor(ZION_COLORS.accentWarning).fontSize(12).font('Helvetica-Bold');
    doc.text(`FOLIO: ${folio}`, 355, 60, { width: 216, align: 'center' });

    const fechaStr = fecha instanceof Date ? fecha.toLocaleDateString('es-CL') : new Date(fecha).toLocaleDateString('es-CL');
    doc.fillColor(ZION_COLORS.textDark).fontSize(8).font('Helvetica');
    doc.text(`Fecha Emisión: ${fechaStr}`, 355, 80, { width: 216, align: 'center' });

    // Línea separadora
    doc.moveTo(36, 112).lineTo(576, 112).lineWidth(1).strokeColor(ZION_COLORS.border).stroke();
  }

  private static drawClienteSection(
    doc: InstanceType<typeof PDFDocument>,
    cliente: DatosClienteDoc,
    y: number,
    titulo = '1. ANTECEDENTES DEL CLIENTE / GENERADOR'
  ): void {
    doc.rect(36, y, 540, 20).fill(ZION_COLORS.primaryMedium);
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
    doc.text(titulo, 44, y + 5);

    y += 28;
    doc.fillColor(ZION_COLORS.textDark).fontSize(8);

    doc.font('Helvetica-Bold').text('Razón Social:', 44, y);
    doc.font('Helvetica').text(cliente.razonSocial || 'N/A', 115, y);

    doc.font('Helvetica-Bold').text('RUT:', 370, y);
    doc.font('Helvetica').text(cliente.rut || 'N/A', 400, y);

    y += 16;
    doc.font('Helvetica-Bold').text('Sucursal/Faena:', 44, y);
    doc.font('Helvetica').text(cliente.sucursalNombre || 'Planta Principal', 115, y);

    doc.font('Helvetica-Bold').text('Comuna/Ciudad:', 370, y);
    doc.font('Helvetica').text(`${cliente.comuna || ''} ${cliente.ciudad ? `(${cliente.ciudad})` : ''}`.trim() || 'N/A', 445, y);

    y += 16;
    doc.font('Helvetica-Bold').text('Dirección:', 44, y);
    doc.font('Helvetica').text(cliente.direccion || 'N/A', 115, y);

    doc.font('Helvetica-Bold').text('Contacto:', 370, y);
    doc.font('Helvetica').text(cliente.contactoNombre || cliente.contactoTelefono || 'N/A', 415, y);
  }

  private static drawOperacionSection(
    doc: InstanceType<typeof PDFDocument>,
    op: DatosOperacionalesDoc,
    y: number
  ): void {
    doc.rect(36, y, 540, 20).fill(ZION_COLORS.primaryMedium);
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
    doc.text('2. ANTECEDENTES OPERATIVOS Y EQUIPO ASIGNADO', 44, y + 5);

    y += 28;
    doc.fillColor(ZION_COLORS.textDark).fontSize(8);

    doc.font('Helvetica-Bold').text('Camión / Patente:', 44, y);
    doc.font('Helvetica').text(op.camionPatente || 'N/A', 125, y);

    doc.font('Helvetica-Bold').text('Chofer / Conductor:', 310, y);
    doc.font('Helvetica').text(op.conductorNombre || 'N/A', 400, y);

    y += 16;
    doc.font('Helvetica-Bold').text('Tipo de Residuo:', 44, y);
    doc.font('Helvetica').text(op.tipoResiduo || 'Residuo Industrial Líquido/Sólido', 125, y);

    const fHora = op.fechaHora
      ? (op.fechaHora instanceof Date ? op.fechaHora.toLocaleString('es-CL') : new Date(op.fechaHora).toLocaleString('es-CL'))
      : 'N/A';
    doc.font('Helvetica-Bold').text('Fecha/Hora Ejecución:', 310, y);
    doc.font('Helvetica').text(fHora, 410, y);

    y += 16;
    doc.font('Helvetica-Bold').text('Volumen Estimado:', 44, y);
    doc.font('Helvetica').text(`${op.volumenEstimado ?? '-'} ${op.unidad || 'M3'}`, 135, y);

    doc.font('Helvetica-Bold').text('Volumen Real Retirado:', 310, y);
    doc.font('Helvetica').text(`${op.volumenReal ?? op.volumenEstimado ?? '-'} ${op.unidad || 'M3'}`, 415, y);
  }

  private static drawServiciosTable(
    doc: InstanceType<typeof PDFDocument>,
    servicios: ServicioItemDoc[],
    y: number
  ): void {
    doc.rect(36, y, 540, 20).fill(ZION_COLORS.primaryMedium);
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
    doc.text('3. DETALLE DE SERVICIOS Y TAREAS INCLUIDAS', 44, y + 5);

    y += 24;
    // Encabezado de tabla
    doc.rect(36, y, 540, 16).fill(ZION_COLORS.bgLight);
    doc.fillColor(ZION_COLORS.textDark).fontSize(8).font('Helvetica-Bold');
    doc.text('Item', 44, y + 4);
    doc.text('Descripción del Servicio Técnico', 80, y + 4);
    doc.text('Cantidad', 400, y + 4);
    doc.text('Unidad', 480, y + 4);

    y += 18;
    doc.font('Helvetica').fontSize(8);

    const items = servicios.length > 0 ? servicios : [
      { descripcion: 'Servicio de Succión, Retiro y Transporte de Residuos Industriales', cantidad: 1, unidad: 'Servicio' },
      { descripcion: 'Disposición Final Certificada en Planta Autorizada con Guía de Trazabilidad', cantidad: 1, unidad: 'Servicio' }
    ];

    items.forEach((item, idx) => {
      doc.text(`${idx + 1}`, 44, y);
      doc.text(item.descripcion, 80, y, { width: 300 });
      doc.text(`${item.cantidad}`, 400, y);
      doc.text(item.unidad || 'UND', 480, y);
      y += 18;
    });
  }

  private static drawBoxFirmasGuia(
    doc: InstanceType<typeof PDFDocument>,
    y: number,
    conductorNombre?: string
  ): void {
    // Caja Conductor
    doc.rect(50, y, 220, 50).strokeColor(ZION_COLORS.border).stroke();
    doc.lineCap('butt').moveTo(70, y + 36).lineTo(250, y + 36).stroke();
    doc.fillColor(ZION_COLORS.textDark).fontSize(7).font('Helvetica-Bold');
    doc.text('Firma y RUT Conductor Transportista', 50, y + 39, { width: 220, align: 'center' });
    if (conductorNombre) {
      doc.font('Helvetica').fontSize(7).text(conductorNombre, 50, y + 25, { width: 220, align: 'center' });
    }

    // Caja Receptor Planta Destino
    doc.rect(310, y, 220, 50).strokeColor(ZION_COLORS.border).stroke();
    doc.lineCap('butt').moveTo(330, y + 36).lineTo(510, y + 36).stroke();
    doc.fillColor(ZION_COLORS.textDark).fontSize(7).font('Helvetica-Bold');
    doc.text('Firma y Timbre Receptor / Planta Destino', 310, y + 39, { width: 220, align: 'center' });
  }

  private static drawSeccionFirmaTactil(
    doc: InstanceType<typeof PDFDocument>,
    y: number,
    datos: DatosActaRecepcion,
    firmaBuffer: Buffer | null
  ): void {
    doc.rect(36, y, 540, 20).fill(ZION_COLORS.primaryMedium);
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
    doc.text('4. FIRMA ELECTRÓNICA DE RECEPCIÓN Y CONFORMIDAD', 44, y + 5);

    y += 28;
    // Caja izquierda: Firma del Conductor
    doc.rect(44, y, 240, 95).strokeColor(ZION_COLORS.border).stroke();
    doc.fillColor(ZION_COLORS.textDark).fontSize(7.5).font('Helvetica-Bold');
    doc.text('OPERADOR / CONDUCTOR ZION:', 50, y + 6);
    doc.font('Helvetica').text(datos.operacion.conductorNombre || 'Conductor Autorizado', 50, y + 18);
    if (datos.operacion.conductorRut) {
      doc.text(`RUT: ${datos.operacion.conductorRut}`, 50, y + 28);
    }
    doc.lineCap('butt').moveTo(60, y + 78).lineTo(260, y + 78).stroke();
    doc.text('Firma Conductor ZION', 44, y + 82, { width: 240, align: 'center' });

    // Caja derecha: Firma Táctil del Cliente
    doc.rect(300, y, 266, 95).strokeColor(ZION_COLORS.primaryMedium).stroke();
    doc.fillColor(ZION_COLORS.textDark).fontSize(7.5).font('Helvetica-Bold');
    doc.text('RECEPTOR / CLIENTE EN FAENA:', 308, y + 6);
    doc.font('Helvetica').text(datos.receptorNombre || datos.cliente.contactoNombre || 'Representante en Faena', 308, y + 18);
    if (datos.receptorRut) {
      doc.text(`RUT: ${datos.receptorRut}`, 308, y + 28);
    }
    if (datos.receptorCargo) {
      doc.text(`Cargo: ${datos.receptorCargo}`, 308, y + 38);
    }

    // Si viene la imagen de firma táctil, estamparla
    if (firmaBuffer) {
      try {
        doc.image(firmaBuffer, 350, y + 25, { width: 140, height: 45, fit: [140, 45] });
      } catch {
        // En caso de fallo de renderizado de imagen, dibujar línea sustituta
        doc.lineCap('butt').moveTo(320, y + 75).lineTo(540, y + 75).stroke();
      }
    } else {
      doc.lineCap('butt').moveTo(320, y + 75).lineTo(540, y + 75).stroke();
    }

    doc.font('Helvetica-Bold').fontSize(7);
    doc.text('Firma Táctil Estampada en Terreno', 300, y + 82, { width: 266, align: 'center' });
  }

  private static drawFooterTrazabilidad(
    doc: InstanceType<typeof PDFDocument>,
    hash: string,
    qrUrl: string,
    qrBuffer: Buffer
  ): void {
    const footerY = 675;
    // Línea separadora
    doc.moveTo(36, footerY).lineTo(576, footerY).lineWidth(0.8).strokeColor(ZION_COLORS.border).stroke();

    // Texto de verificación (lado izquierdo)
    doc.fillColor(ZION_COLORS.primaryDark).fontSize(8).font('Helvetica-Bold');
    doc.text('DOCUMENTO ELECTRÓNICO OFICIAL - ZION SERVICES', 36, footerY + 8);

    doc.fillColor(ZION_COLORS.textMuted).fontSize(6.5).font('Helvetica');
    doc.text(
      'Este documento ha sido generado electrónicamente y cuenta con validez legal y trazabilidad completa según la Ley N° 19.799 sobre Documentos Electrónicos y Firma Electrónica. Para verificar su autenticidad e integridad inalterable, escanee el código QR adjunto o ingrese la clave hash en:',
      36,
      footerY + 19,
      { width: 440, align: 'justify' }
    );

    doc.fillColor(ZION_COLORS.primaryMedium).fontSize(6.5).font('Helvetica-Bold');
    doc.text(qrUrl, 36, footerY + 41, { width: 440 });

    doc.fillColor(ZION_COLORS.textMuted).fontSize(6.5).font('Helvetica');
    doc.text(`Hash SHA-256: ${hash}`, 36, footerY + 53, { width: 440 });

    // Estampado de Código QR (lado derecho)
    try {
      doc.image(qrBuffer, 495, footerY + 6, { width: 68, height: 68 });
    } catch {
      // Fallback visual si la imagen no puede estampar
      doc.rect(495, footerY + 6, 68, 68).strokeColor(ZION_COLORS.border).stroke();
      doc.text('QR', 520, footerY + 30);
    }
  }
}
