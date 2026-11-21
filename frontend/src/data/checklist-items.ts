export type CategoriaChecklist =
  | 'MOTOR_FLUIDOS'
  | 'CABINA_SEGURIDAD'
  | 'LUCES_ELECTRICO'
  | 'NEUMATICOS_FRENOS'
  | 'EQUIPAMIENTO_FAENA';

export interface ItemChecklist {
  id: string;
  categoria: CategoriaChecklist;
  numero: number;
  nombre: string;
  esCritico: boolean;
  estado: 'BUENO' | 'REGULAR' | 'MALO' | 'NO_APLICA';
  observaciones?: string;
}

export const CATEGORIAS_INFO: Record<CategoriaChecklist, { titulo: string; descripcion: string; total: number }> = {
  MOTOR_FLUIDOS: {
    titulo: '1. Motor, Transmisión y Fluidos',
    descripcion: 'Niveles de aceite, refrigerante, líquido de frenos, correas y fugas visibles.',
    total: 16
  },
  CABINA_SEGURIDAD: {
    titulo: '2. Cabina, Mandos e Instrumentación',
    descripcion: 'Cinturón, espejos, bocina, tacógrafo, extintor vigente, botiquín y conos.',
    total: 16
  },
  LUCES_ELECTRICO: {
    titulo: '3. Sistema Eléctrico y Luces',
    descripcion: 'Luces altas, bajas, intermitentes, freno, retroceso, baliza y pértiga.',
    total: 16
  },
  NEUMATICOS_FRENOS: {
    titulo: '4. Neumáticos, Frenos y Chasis',
    descripcion: 'Presión/desgaste, tuercas de rueda, freno de estacionamiento y de servicio.',
    total: 16
  },
  EQUIPAMIENTO_FAENA: {
    titulo: '5. Equipamiento de Faena y Estanque',
    descripcion: 'Estanque 12m³, válvulas, bomba de vacío, hidrojet, mangueras y acoples.',
    total: 16
  }
};

// 80 Ítems canónicos estructurados del Checklist F-GMT-MAN-004
export const CHECKLIST_ITEMS_INICIALES: ItemChecklist[] = [
  // 1. Motor y Fluidos (1-16)
  { id: 'item-1', categoria: 'MOTOR_FLUIDOS', numero: 1, nombre: 'Nivel de aceite de motor', esCritico: true, estado: 'BUENO' },
  { id: 'item-2', categoria: 'MOTOR_FLUIDOS', numero: 2, nombre: 'Nivel de líquido refrigerante', esCritico: true, estado: 'BUENO' },
  { id: 'item-3', categoria: 'MOTOR_FLUIDOS', numero: 3, nombre: 'Nivel de líquido de frenos', esCritico: true, estado: 'BUENO' },
  { id: 'item-4', categoria: 'MOTOR_FLUIDOS', numero: 4, nombre: 'Nivel de líquido hidráulico / dirección', esCritico: false, estado: 'BUENO' },
  { id: 'item-5', categoria: 'MOTOR_FLUIDOS', numero: 5, nombre: 'Ausencia de fugas de combustible', esCritico: true, estado: 'BUENO' },
  { id: 'item-6', categoria: 'MOTOR_FLUIDOS', numero: 6, nombre: 'Ausencia de fugas de aceite de motor', esCritico: true, estado: 'BUENO' },
  { id: 'item-7', categoria: 'MOTOR_FLUIDOS', numero: 7, nombre: 'Ausencia de fugas en radiador y mangueras', esCritico: true, estado: 'BUENO' },
  { id: 'item-8', categoria: 'MOTOR_FLUIDOS', numero: 8, nombre: 'Tensión y estado de correas de accesorios', esCritico: false, estado: 'BUENO' },
  { id: 'item-9', categoria: 'MOTOR_FLUIDOS', numero: 9, nombre: 'Tapa de estanque de combustible hermética', esCritico: true, estado: 'BUENO' },
  { id: 'item-10', categoria: 'MOTOR_FLUIDOS', numero: 10, nombre: 'Filtro de aire y visor de restricción', esCritico: false, estado: 'BUENO' },
  { id: 'item-11', categoria: 'MOTOR_FLUIDOS', numero: 11, nombre: 'Nivel de agua de limpiaparabrisas', esCritico: false, estado: 'BUENO' },
  { id: 'item-12', categoria: 'MOTOR_FLUIDOS', numero: 12, nombre: 'Nivel de aceite en caja de transmisión', esCritico: false, estado: 'BUENO' },
  { id: 'item-13', categoria: 'MOTOR_FLUIDOS', numero: 13, nombre: 'Estado de baterías y bornes limpios', esCritico: true, estado: 'BUENO' },
  { id: 'item-14', categoria: 'MOTOR_FLUIDOS', numero: 14, nombre: 'Corta corriente general operativo', esCritico: true, estado: 'BUENO' },
  { id: 'item-15', categoria: 'MOTOR_FLUIDOS', numero: 15, nombre: 'Escape y silenciador sin fugas', esCritico: false, estado: 'BUENO' },
  { id: 'item-16', categoria: 'MOTOR_FLUIDOS', numero: 16, nombre: 'Parada de emergencia de motor operativa', esCritico: true, estado: 'BUENO' },

  // 2. Cabina y Seguridad (17-32)
  { id: 'item-17', categoria: 'CABINA_SEGURIDAD', numero: 17, nombre: 'Cinturón de seguridad conductor y acompañante', esCritico: true, estado: 'BUENO' },
  { id: 'item-18', categoria: 'CABINA_SEGURIDAD', numero: 18, nombre: 'Bocina operativa y audible', esCritico: true, estado: 'BUENO' },
  { id: 'item-19', categoria: 'CABINA_SEGURIDAD', numero: 19, nombre: 'Alarma sonora de retroceso operativa', esCritico: true, estado: 'BUENO' },
  { id: 'item-20', categoria: 'CABINA_SEGURIDAD', numero: 20, nombre: 'Tacógrafo / sensor de velocidad operativo', esCritico: false, estado: 'BUENO' },
  { id: 'item-21', categoria: 'CABINA_SEGURIDAD', numero: 21, nombre: 'Extintor PQS 10kg vigente y con carga', esCritico: true, estado: 'BUENO' },
  { id: 'item-22', categoria: 'CABINA_SEGURIDAD', numero: 22, nombre: 'Extintor CO2 5kg vigente en cabina', esCritico: true, estado: 'BUENO' },
  { id: 'item-23', categoria: 'CABINA_SEGURIDAD', numero: 23, nombre: 'Botiquín de primeros auxilios completo', esCritico: false, estado: 'BUENO' },
  { id: 'item-24', categoria: 'CABINA_SEGURIDAD', numero: 24, nombre: 'Juego de triángulos / conos de seguridad (3 unidades)', esCritico: true, estado: 'BUENO' },
  { id: 'item-25', categoria: 'CABINA_SEGURIDAD', numero: 25, nombre: 'Cuñas de bloqueo de ruedas (2 unidades)', esCritico: true, estado: 'BUENO' },
  { id: 'item-26', categoria: 'CABINA_SEGURIDAD', numero: 26, nombre: 'Gata hidráulica y llave de ruedas', esCritico: false, estado: 'BUENO' },
  { id: 'item-27', categoria: 'CABINA_SEGURIDAD', numero: 27, nombre: 'Espejos retrovisores laterales e interiores limpios y sanos', esCritico: true, estado: 'BUENO' },
  { id: 'item-28', categoria: 'CABINA_SEGURIDAD', numero: 28, nombre: 'Parabrisas sin trizaduras que limiten visibilidad', esCritico: true, estado: 'BUENO' },
  { id: 'item-29', categoria: 'CABINA_SEGURIDAD', numero: 29, nombre: 'Plumas limpiaparabrisas en buen estado', esCritico: false, estado: 'BUENO' },
  { id: 'item-30', categoria: 'CABINA_SEGURIDAD', numero: 30, nombre: 'Documentos del camión al día (Permiso, Padrón, RT)', esCritico: true, estado: 'BUENO' },
  { id: 'item-31', categoria: 'CABINA_SEGURIDAD', numero: 31, nombre: 'Seguro obligatorio (SOAP) vigente', esCritico: true, estado: 'BUENO' },
  { id: 'item-32', categoria: 'CABINA_SEGURIDAD', numero: 32, nombre: 'Chalecos reflectantes reglamentarios en cabina', esCritico: true, estado: 'BUENO' },

  // 3. Sistema Eléctrico y Luces (33-48)
  { id: 'item-33', categoria: 'LUCES_ELECTRICO', numero: 33, nombre: 'Luces bajas delanteras operativas', esCritico: true, estado: 'BUENO' },
  { id: 'item-34', categoria: 'LUCES_ELECTRICO', numero: 34, nombre: 'Luces altas delanteras operativas', esCritico: true, estado: 'BUENO' },
  { id: 'item-35', categoria: 'LUCES_ELECTRICO', numero: 35, nombre: 'Luces de estacionamiento / posición', esCritico: false, estado: 'BUENO' },
  { id: 'item-36', categoria: 'LUCES_ELECTRICO', numero: 36, nombre: 'Intermitentes delanteros y traseros', esCritico: true, estado: 'BUENO' },
  { id: 'item-37', categoria: 'LUCES_ELECTRICO', numero: 37, nombre: 'Luces de emergencia (hazard / destellantes)', esCritico: true, estado: 'BUENO' },
  { id: 'item-38', categoria: 'LUCES_ELECTRICO', numero: 38, nombre: 'Luces de freno posteriores operativas', esCritico: true, estado: 'BUENO' },
  { id: 'item-39', categoria: 'LUCES_ELECTRICO', numero: 39, nombre: 'Luz de marcha atrás / retroceso blanca', esCritico: true, estado: 'BUENO' },
  { id: 'item-40', categoria: 'LUCES_ELECTRICO', numero: 40, nombre: 'Luz de patente posterior legible', esCritico: false, estado: 'BUENO' },
  { id: 'item-41', categoria: 'LUCES_ELECTRICO', numero: 41, nombre: 'Baliza estroboscópica ámbar operativa', esCritico: true, estado: 'BUENO' },
  { id: 'item-42', categoria: 'LUCES_ELECTRICO', numero: 42, nombre: 'Pértiga luminosa con banderola operativa', esCritico: true, estado: 'BUENO' },
  { id: 'item-43', categoria: 'LUCES_ELECTRICO', numero: 43, nombre: 'Focos faeneros traseros de trabajo', esCritico: false, estado: 'BUENO' },
  { id: 'item-44', categoria: 'LUCES_ELECTRICO', numero: 44, nombre: 'Cintas reflectantes reglamentarias 3M perímetro', esCritico: true, estado: 'BUENO' },
  { id: 'item-45', categoria: 'LUCES_ELECTRICO', numero: 45, nombre: 'Tablero de instrumentos iluminado y testigos operativos', esCritico: false, estado: 'BUENO' },
  { id: 'item-46', categoria: 'LUCES_ELECTRICO', numero: 46, nombre: 'Cables eléctricos canalizados sin sulfatación', esCritico: false, estado: 'BUENO' },
  { id: 'item-47', categoria: 'LUCES_ELECTRICO', numero: 47, nombre: 'Tomas de corriente de 12V / 24V cabina operativas', esCritico: false, estado: 'BUENO' },
  { id: 'item-48', categoria: 'LUCES_ELECTRICO', numero: 48, nombre: 'Indicador de nivel de combustible operativo', esCritico: true, estado: 'BUENO' },

  // 4. Neumáticos, Frenos y Chasis (49-64)
  { id: 'item-49', categoria: 'NEUMATICOS_FRENOS', numero: 49, nombre: 'Profundidad de dibujo neumáticos directrices (>3mm)', esCritico: true, estado: 'BUENO' },
  { id: 'item-50', categoria: 'NEUMATICOS_FRENOS', numero: 50, nombre: 'Profundidad de dibujo neumáticos tracción (>2mm)', esCritico: true, estado: 'BUENO' },
  { id: 'item-51', categoria: 'NEUMATICOS_FRENOS', numero: 51, nombre: 'Presión de inflado neumáticos correcta (110 PSI)', esCritico: true, estado: 'BUENO' },
  { id: 'item-52', categoria: 'NEUMATICOS_FRENOS', numero: 52, nombre: 'Ausencia de cortes, chichones o deformaciones en bandas', esCritico: true, estado: 'BUENO' },
  { id: 'item-53', categoria: 'NEUMATICOS_FRENOS', numero: 53, nombre: 'Tuercas de rueda completas y con torque verificado', esCritico: true, estado: 'BUENO' },
  { id: 'item-54', categoria: 'NEUMATICOS_FRENOS', numero: 54, nombre: 'Indicadores plásticos de tuerca floja instalados', esCritico: false, estado: 'BUENO' },
  { id: 'item-55', categoria: 'NEUMATICOS_FRENOS', numero: 55, nombre: 'Neumático de repuesto con soporte asegurado', esCritico: true, estado: 'BUENO' },
  { id: 'item-56', categoria: 'NEUMATICOS_FRENOS', numero: 56, nombre: 'Freno de servicio (pedal) con respuesta firme', esCritico: true, estado: 'BUENO' },
  { id: 'item-57', categoria: 'NEUMATICOS_FRENOS', numero: 57, nombre: 'Freno de estacionamiento (maxi-brake) bloquea efectivamente', esCritico: true, estado: 'BUENO' },
  { id: 'item-58', categoria: 'NEUMATICOS_FRENOS', numero: 58, nombre: 'Presión de estanques de aire comprimido (120 PSI)', esCritico: true, estado: 'BUENO' },
  { id: 'item-59', categoria: 'NEUMATICOS_FRENOS', numero: 59, nombre: 'Purgador de agua de estanques de aire operativo', esCritico: false, estado: 'BUENO' },
  { id: 'item-60', categoria: 'NEUMATICOS_FRENOS', numero: 60, nombre: 'Dirección sin juego excesivo ni ruidos anormales', esCritico: true, estado: 'BUENO' },
  { id: 'item-61', categoria: 'NEUMATICOS_FRENOS', numero: 61, nombre: 'Paquetes de resortes y ballestas sin fisuras', esCritico: true, estado: 'BUENO' },
  { id: 'item-62', categoria: 'NEUMATICOS_FRENOS', numero: 62, nombre: 'Amortiguadores delanteros y traseros sin fugas', esCritico: false, estado: 'BUENO' },
  { id: 'item-63', categoria: 'NEUMATICOS_FRENOS', numero: 63, nombre: 'Chasis y travesaños sin grietas visibles', esCritico: true, estado: 'BUENO' },
  { id: 'item-64', categoria: 'NEUMATICOS_FRENOS', numero: 64, nombre: 'Barra antiempotramiento trasera reglamentaria', esCritico: true, estado: 'BUENO' },

  // 5. Equipamiento de Faena y Estanque (65-80)
  { id: 'item-65', categoria: 'EQUIPAMIENTO_FAENA', numero: 65, nombre: 'Integridad estructural del estanque 12m³ (sin abolladuras)', esCritico: true, estado: 'BUENO' },
  { id: 'item-66', categoria: 'EQUIPAMIENTO_FAENA', numero: 66, nombre: 'Tapa escotilla superior (manhole) con empaquetadura sana', esCritico: true, estado: 'BUENO' },
  { id: 'item-67', categoria: 'EQUIPAMIENTO_FAENA', numero: 67, nombre: 'Seguros mariposa de tapa superior ajustados', esCritico: true, estado: 'BUENO' },
  { id: 'item-68', categoria: 'EQUIPAMIENTO_FAENA', numero: 68, nombre: 'Válvula de alivio / venteo de presión y vacío operativa', esCritico: true, estado: 'BUENO' },
  { id: 'item-69', categoria: 'EQUIPAMIENTO_FAENA', numero: 69, nombre: 'Bomba de vacío operativa (presión y succión nominal)', esCritico: true, estado: 'BUENO' },
  { id: 'item-70', categoria: 'EQUIPAMIENTO_FAENA', numero: 70, nombre: 'Nivel de aceite de lubricación bomba de vacío', esCritico: true, estado: 'BUENO' },
  { id: 'item-71', categoria: 'EQUIPAMIENTO_FAENA', numero: 71, nombre: 'Válvula de descarga trasera de 4 pulgadas hermética', esCritico: true, estado: 'BUENO' },
  { id: 'item-72', categoria: 'EQUIPAMIENTO_FAENA', numero: 72, nombre: 'Tapa ciega con acople rápido y cadena en descarga', esCritico: true, estado: 'BUENO' },
  { id: 'item-73', categoria: 'EQUIPAMIENTO_FAENA', numero: 73, nombre: 'Válvula de succión de 3 pulgadas con sello hermético', esCritico: true, estado: 'BUENO' },
  { id: 'item-74', categoria: 'EQUIPAMIENTO_FAENA', numero: 74, nombre: 'Equipo hidrojet de alta presión operativo', esCritico: false, estado: 'BUENO' },
  { id: 'item-75', categoria: 'EQUIPAMIENTO_FAENA', numero: 75, nombre: 'Mangueras de succión pesadas (4 tramos de 3m) sin cortes', esCritico: true, estado: 'BUENO' },
  { id: 'item-76', categoria: 'EQUIPAMIENTO_FAENA', numero: 76, nombre: 'Acoples rápidos tipo Camlock hembra y macho con empaques', esCritico: true, estado: 'BUENO' },
  { id: 'item-77', categoria: 'EQUIPAMIENTO_FAENA', numero: 77, nombre: 'Bandeja antiderrames inferior en válvulas limpia', esCritico: false, estado: 'BUENO' },
  { id: 'item-78', categoria: 'EQUIPAMIENTO_FAENA', numero: 78, nombre: 'Kit para control de derrames (paños absorbentes, pala)', esCritico: true, estado: 'BUENO' },
  { id: 'item-79', categoria: 'EQUIPAMIENTO_FAENA', numero: 79, nombre: 'Línea de puesta a tierra antiestática con pinza', esCritico: true, estado: 'BUENO' },
  { id: 'item-80', categoria: 'EQUIPAMIENTO_FAENA', numero: 80, nombre: 'Barandas de seguridad y escala antideslizante estanque', esCritico: true, estado: 'BUENO' },
];
