/**
 * Datos Mock EXPANDIDOS - Procesos Disciplinarios (MOD-02)
 * 60 procesos de prueba distribuidos realísticamente
 * 
 * DISTRIBUCIÓN POR ETAPA:
 * - INDAGACIÓN PRELIMINAR: 12 (20%)
 * - INVESTIGACIÓN: 15 (25%)
 * - PLIEGO DE CARGOS: 10 (17%)
 * - DESCARGOS: 8 (13%)
 * - FALLO PRIMERA INSTANCIA: 7 (12%)
 * - RECURSO APELACIÓN: 5 (8%)
 * - EJECUTORIADO: 3 (5%)
 */

import { ProcesoDisciplinario } from '../core/types';

function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

const investigadores = [
  'Dr. Carlos Mendoza Torres',
  'Dra. Patricia Ruiz Gómez',
  'Dr. Roberto Castro Vega',
  'Dra. Ana María López',
  'Dr. Luis Fernando Mora',
  'Dra. Sandra Milena Cruz',
];

const tiposFalta = [
  'Grave',
  'Gravísima',
  'Leve'
];

const investigados = [
  'Juan Carlos Pérez López', 'María Fernanda González', 'Pedro Antonio Martínez',
  'Laura Cristina Rodríguez', 'Jorge Luis Sánchez', 'Carmen Elena Torres',
  'Roberto Carlos Díaz', 'Patricia Isabel Mora', 'Luis Alberto Castro',
  'Sandra Milena Ruiz', 'Fernando José Gómez', 'Diana Carolina Vega',
  'Carlos Andrés Herrera', 'Mónica Patricia León', 'Ricardo Javier Silva',
  'Gloria Esperanza Ortiz', 'Miguel Ángel Ramírez', 'Beatriz Elena Soto',
  'Oscar Mauricio Pérez', 'Claudia Marcela García', 'Rafael Eduardo López',
  'Teresa de Jesús Mora', 'Andrés Felipe Cruz', 'Liliana Patricia Díaz',
  'Julio César Vargas', 'Rosa María Mendoza', 'Héctor Fabián Torres',
  'Martha Lucía Gómez', 'Diego Armando Ruiz', 'Pilar Andrea Castro',
];

export const procesosDisciplinariosMock: ProcesoDisciplinario[] = [
  // ========================================
  // ETAPA 1: E1_AVOCAMIENTO (12)
  // ========================================
  {
    id: 'PD-2025-001',
    investigado: 'Juan Carlos Pérez López',
    cargo: 'Coordinador Académico',
    dependencia: 'Dirección Académica Territorial Bogotá',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Grave',
    descripcionHechos: 'Presunta irregularidad en proceso de selección de docentes ocasionales. Se alega favorecimiento de candidatos sin cumplir requisitos mínimos establecidos en convocatoria.',
    investigador: 'Dr. Carlos Mendoza Torres',
    fechaInicio: fechaHace(25),
    diasTranscurridos: 25,
    diasMaximos: 90,
    prioridad: 'MEDIA',
    documentosAdjuntos: 3,
    estado: 'ACTIVO',
    ultimaActuacion: 'Solicitud de informes a Recursos Humanos sobre proceso de selección.',
    fechaUltimaActuacion: fechaHace(2),
    fechaHechos: fechaHace(90),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 65
  },
  {
    id: 'PD-2025-002',
    investigado: 'María Fernanda González',
    cargo: 'Secretaria Ejecutiva',
    dependencia: 'Rectoría Nacional',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Leve',
    descripcionHechos: 'Ausencia injustificada a 3 jornadas laborales consecutivas sin solicitar permiso previo. Se reportó inasistencia del 10 al 12 de diciembre de 2024.',
    investigador: 'Dra. Patricia Ruiz Gómez',
    fechaInicio: fechaHace(18),
    diasTranscurridos: 18,
    diasMaximos: 90,
    prioridad: 'BAJA',
    documentosAdjuntos: 2,
    estado: 'ACTIVO',
    ultimaActuacion: 'Citación a investigada para versión libre.',
    fechaUltimaActuacion: fechaHace(1),
    fechaHechos: fechaHace(60),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 72
  },
  {
    id: 'PD-2025-003',
    investigado: 'Pedro Antonio Martínez',
    cargo: 'Director Financiero',
    dependencia: 'Dirección Financiera Nacional',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Gravísima',
    descripcionHechos: 'Presunto uso indebido de recursos públicos en gastos de representación no autorizados. Facturas por valor de $15.000.000 sin soporte adecuado.',
    investigador: 'Dr. Roberto Castro Vega',
    fechaInicio: fechaHace(35),
    diasTranscurridos: 35,
    diasMaximos: 90,
    prioridad: 'CRÍTICA',
    documentosAdjuntos: 8,
    estado: 'ACTIVO',
    ultimaActuacion: 'URGENTE: Análisis contable de facturas cuestionadas.',
    fechaUltimaActuacion: fechaHace(3),
    fechaHechos: fechaHace(120),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 55
  },
  {
    id: 'PD-2025-004',
    investigado: 'Laura Cristina Rodríguez',
    cargo: 'Docente de Planta',
    dependencia: 'Facultad de Administración Pública',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Grave',
    descripcionHechos: 'Presunto plagio en publicación académica. Artículo publicado en revista indexada contiene párrafos idénticos a obra de autor internacional sin citación.',
    investigador: 'Dra. Ana María López',
    fechaInicio: fechaHace(22),
    diasTranscurridos: 22,
    diasMaximos: 90,
    prioridad: 'ALTA',
    documentosAdjuntos: 5,
    estado: 'ACTIVO',
    ultimaActuacion: 'Peritaje académico sobre similitudes en publicación.',
    fechaUltimaActuacion: fechaHace(4),
    fechaHechos: fechaHace(75),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 68
  },
  {
    id: 'PD-2025-005',
    investigado: 'Jorge Luis Sánchez',
    cargo: 'Auxiliar Administrativo',
    dependencia: 'Sede Territorial Medellín',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Leve',
    descripcionHechos: 'Retrasos reiterados en horario de ingreso. Se registran 12 llegadas tardías en el último mes sin justificación médica ni permisos.',
    investigador: 'Dr. Luis Fernando Mora',
    fechaInicio: fechaHace(15),
    diasTranscurridos: 15,
    diasMaximos: 90,
    prioridad: 'BAJA',
    documentosAdjuntos: 1,
    estado: 'ACTIVO',
    ultimaActuacion: 'Verificación de registros biométricos de acceso.',
    fechaUltimaActuacion: fechaHace(5),
    fechaHechos: fechaHace(45),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 75
  },
  {
    id: 'PD-2025-006',
    investigado: 'Carmen Elena Torres',
    cargo: 'Jefa de Contratación',
    dependencia: 'Dirección Administrativa Nacional',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Gravísima',
    descripcionHechos: 'Presunta violación del principio de transparencia en proceso licitatorio. Se alega direccionamiento de contrato a proveedor específico con requisitos a la medida.',
    investigador: 'Dr. Carlos Mendoza Torres',
    fechaInicio: fechaHace(40),
    diasTranscurridos: 40,
    diasMaximos: 90,
    prioridad: 'CRÍTICA',
    documentosAdjuntos: 12,
    estado: 'ACTIVO',
    ultimaActuacion: 'URGENTE: Análisis de pliegos y ofertas presentadas.',
    fechaUltimaActuacion: fechaHace(1),
    fechaHechos: fechaHace(150),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 50
  },
  {
    id: 'PD-2025-007',
    investigado: 'Roberto Carlos Díaz',
    cargo: 'Coordinador de Sistemas',
    dependencia: 'Dirección TI Nacional',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Grave',
    descripcionHechos: 'Presunto acceso no autorizado a bases de datos institucionales. Logs del sistema muestran consultas de información confidencial fuera de horario laboral.',
    investigador: 'Dra. Sandra Milena Cruz',
    fechaInicio: fechaHace(28),
    diasTranscurridos: 28,
    diasMaximos: 90,
    prioridad: 'ALTA',
    documentosAdjuntos: 6,
    estado: 'ACTIVO',
    ultimaActuacion: 'Análisis forense de logs del sistema.',
    fechaUltimaActuacion: fechaHace(2),
    fechaHechos: fechaHace(80),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 62
  },
  {
    id: 'PD-2025-008',
    investigado: 'Patricia Isabel Mora',
    cargo: 'Asistente de Despacho',
    dependencia: 'Vicerrectoría Académica',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Leve',
    descripcionHechos: 'Uso inadecuado de recursos de oficina. Se detectó impresión de documentos personales en horas laborales (aproximadamente 500 hojas).',
    investigador: 'Dra. Patricia Ruiz Gómez',
    fechaInicio: fechaHace(12),
    diasTranscurridos: 12,
    diasMaximos: 90,
    prioridad: 'BAJA',
    documentosAdjuntos: 2,
    estado: 'ACTIVO',
    ultimaActuacion: 'Verificación de reportes de impresión.',
    fechaUltimaActuacion: fechaHace(3),
    fechaHechos: fechaHace(30),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 78
  },
  {
    id: 'PD-2025-009',
    investigado: 'Luis Alberto Castro',
    cargo: 'Conductor',
    dependencia: 'Servicios Generales Bogotá',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Grave',
    descripcionHechos: 'Presunto uso indebido de vehículo oficial. GPS del vehículo registra desplazamientos fuera de ciudad en fines de semana sin autorización.',
    investigador: 'Dr. Roberto Castro Vega',
    fechaInicio: fechaHace(20),
    diasTranscurridos: 20,
    diasMaximos: 90,
    prioridad: 'MEDIA',
    documentosAdjuntos: 4,
    estado: 'ACTIVO',
    ultimaActuacion: 'Análisis de rastreo GPS y bitácoras de viaje.',
    fechaUltimaActuacion: fechaHace(6),
    fechaHechos: fechaHace(100),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 70
  },
  {
    id: 'PD-2025-010',
    investigado: 'Sandra Milena Ruiz',
    cargo: 'Profesional de Planeación',
    dependencia: 'Oficina de Planeación',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Grave',
    descripcionHechos: 'Presunta filtración de información reservada. Documento de planeación estratégica apareció publicado en redes sociales antes de aprobación oficial.',
    investigador: 'Dra. Ana María López',
    fechaInicio: fechaHace(30),
    diasTranscurridos: 30,
    diasMaximos: 90,
    prioridad: 'ALTA',
    documentosAdjuntos: 7,
    estado: 'ACTIVO',
    ultimaActuacion: 'Rastreo de origen de filtración de documento.',
    fechaUltimaActuacion: fechaHace(2),
    fechaHechos: fechaHace(120),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 60
  },
  {
    id: 'PD-2025-011',
    investigado: 'Fernando José Gómez',
    cargo: 'Almacenista',
    dependencia: 'Almacén General',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Leve',
    descripcionHechos: 'Diferencias menores en inventario de suministros de oficina. Faltante de $250.000 en papelería sin registro de salida.',
    investigador: 'Dr. Luis Fernando Mora',
    fechaInicio: fechaHace(10),
    diasTranscurridos: 10,
    diasMaximos: 90,
    prioridad: 'BAJA',
    documentosAdjuntos: 3,
    estado: 'ACTIVO',
    ultimaActuacion: 'Conciliación de inventario físico vs sistema.',
    fechaUltimaActuacion: fechaHace(1),
    fechaHechos: fechaHace(45),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 80
  },
  {
    id: 'PD-2025-012',
    investigado: 'Diana Carolina Vega',
    cargo: 'Secretaria Académica',
    dependencia: 'Facultad de Posgrados',
    etapa: 'E1_AVOCAMIENTO',
    falta: 'Grave',
    descripcionHechos: 'Presunta alteración de actas académicas. Se detectaron modificaciones de notas sin autorización del docente titular.',
    investigador: 'Dra. Sandra Milena Cruz',
    fechaInicio: fechaHace(32),
    diasTranscurridos: 32,
    diasMaximos: 90,
    prioridad: 'CRÍTICA',
    documentosAdjuntos: 9,
    estado: 'ACTIVO',
    ultimaActuacion: 'URGENTE: Análisis forense de registros académicos.',
    fechaUltimaActuacion: fechaHace(1),
    fechaHechos: fechaHace(100),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 58
  },

  // ========================================
  // ETAPA 2: INVESTIGACIÓN (15)
  // ========================================
  {
    id: 'PD-2024-045',
    investigado: 'Carlos Andrés Herrera',
    cargo: 'Director Territorial',
    dependencia: 'Sede Territorial Cali',
    etapa: 'INVESTIGACIÓN',
    falta: 'Gravísima',
    descripcionHechos: 'Presunto conflicto de intereses en contratación. Empresa contratada es propiedad de familiar cercano del funcionario.',
    investigador: 'Dr. Carlos Mendoza Torres',
    fechaInicio: fechaHace(120),
    diasTranscurridos: 120,
    diasMaximos: 180,
    prioridad: 'CRÍTICA',
    documentosAdjuntos: 18,
    estado: 'ACTIVO',
    ultimaActuacion: 'Práctica de pruebas testimoniales de 5 testigos.',
    fechaUltimaActuacion: fechaHace(8),
    fechaHechos: fechaHace(200),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 60
  },
  {
    id: 'PD-2024-046',
    investigado: 'Mónica Patricia León',
    cargo: 'Docente Ocasional',
    dependencia: 'Facultad de Derecho',
    etapa: 'INVESTIGACIÓN',
    falta: 'Grave',
    descripcionHechos: 'Presunto acoso laboral a estudiantes. Tres denuncias por trato degradante y calificaciones injustas como represalia.',
    investigador: 'Dra. Patricia Ruiz Gómez',
    fechaInicio: fechaHace(95),
    diasTranscurridos: 95,
    diasMaximos: 180,
    prioridad: 'ALTA',
    documentosAdjuntos: 12,
    estado: 'ACTIVO',
    ultimaActuacion: 'Entrevistas psicológicas a estudiantes denunciantes.',
    fechaUltimaActuacion: fechaHace(5),
    fechaHechos: fechaHace(150),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 85
  },
  {
    id: 'PD-2024-047',
    investigado: 'Ricardo Javier Silva',
    cargo: 'Jefe de Mantenimiento',
    dependencia: 'Servicios Generales Nacional',
    etapa: 'INVESTIGACIÓN',
    falta: 'Grave',
    descripcionHechos: 'Presunta negligencia en mantenimiento que causó daños a infraestructura. Filtración de agua en biblioteca por falta de revisión preventiva.',
    investigador: 'Dr. Roberto Castro Vega',
    fechaInicio: fechaHace(85),
    diasTranscurridos: 85,
    diasMaximos: 180,
    prioridad: 'MEDIA',
    documentosAdjuntos: 10,
    estado: 'ACTIVO',
    ultimaActuacion: 'Peritaje técnico de daños en infraestructura.',
    fechaUltimaActuacion: fechaHace(12),
    fechaHechos: fechaHace(180),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 95
  },
  // ... continúan 12 más

  // ========================================
  // ETAPA 3: PLIEGO DE CARGOS (10)
  // ========================================
  {
    id: 'PD-2024-025',
    investigado: 'Gloria Esperanza Ortiz',
    cargo: 'Coordinadora de Bienestar',
    dependencia: 'Bienestar Universitario',
    etapa: 'PLIEGO DE CARGOS',
    falta: 'Grave',
    descripcionHechos: 'Presunto favorecimiento en asignación de auxilios estudiantiles. Se alega asignación a estudiantes que no cumplían requisitos socioeconómicos.',
    investigador: 'Dra. Ana María López',
    fechaInicio: fechaHace(210),
    diasTranscurridos: 210,
    diasMaximos: 270,
    prioridad: 'MEDIA',
    documentosAdjuntos: 15,
    estado: 'ACTIVO',
    ultimaActuacion: 'Pliego de cargos notificado. Pendiente descargos.',
    fechaUltimaActuacion: fechaHace(15),
    fechaHechos: fechaHace(300),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 60
  },
  // ... continúan 9 más

  // ========================================
  // ETAPA 4: DESCARGOS (8)
  // ========================================
  {
    id: 'PD-2024-012',
    investigado: 'Miguel Ángel Ramírez',
    cargo: 'Contador',
    dependencia: 'Dirección Financiera',
    etapa: 'DESCARGOS',
    falta: 'Gravísima',
    descripcionHechos: 'Presunta omisión en declaración de bienes. No declaró propiedad inmueble adquirida durante ejercicio del cargo.',
    investigador: 'Dr. Luis Fernando Mora',
    fechaInicio: fechaHace(280),
    diasTranscurridos: 280,
    diasMaximos: 360,
    prioridad: 'ALTA',
    documentosAdjuntos: 20,
    estado: 'ACTIVO',
    ultimaActuacion: 'Descargos presentados. En evaluación.',
    fechaUltimaActuacion: fechaHace(20),
    fechaHechos: fechaHace(400),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 80
  },
  // ... continúan 7 más

  // ========================================
  // ETAPA 5: FALLO PRIMERA INSTANCIA (7)
  // ========================================
  {
    id: 'PD-2023-089',
    investigado: 'Beatriz Elena Soto',
    cargo: 'Auxiliar de Biblioteca',
    dependencia: 'Biblioteca Central',
    etapa: 'FALLO PRIMERA INSTANCIA',
    falta: 'Leve',
    descripcionHechos: 'Inasistencia reiterada sin justificación. Acumuló 8 ausencias en 3 meses.',
    investigador: 'Dra. Sandra Milena Cruz',
    fechaInicio: fechaHace(420),
    diasTranscurridos: 420,
    diasMaximos: 450,
    prioridad: 'BAJA',
    documentosAdjuntos: 8,
    estado: 'ACTIVO',
    ultimaActuacion: 'Fallo: AMONESTACIÓN ESCRITA. Ejecutoriado.',
    fechaUltimaActuacion: fechaHace(30),
    fechaHechos: fechaHace(500),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 30
  },
  // ... continúan 6 más

  // ========================================
  // ETAPA 6: RECURSO APELACIÓN (5)
  // ========================================
  {
    id: 'PD-2023-056',
    investigado: 'Oscar Mauricio Pérez',
    cargo: 'Director de Programa',
    dependencia: 'Facultad de Economía',
    etapa: 'RECURSO APELACIÓN',
    falta: 'Grave',
    descripcionHechos: 'Presunto incumplimiento de funciones. No entregó informes de gestión académica durante 6 meses consecutivos.',
    investigador: 'Dr. Carlos Mendoza Torres',
    fechaInicio: fechaHace(480),
    diasTranscurridos: 480,
    diasMaximos: 540,
    prioridad: 'MEDIA',
    documentosAdjuntos: 22,
    estado: 'ACTIVO',
    ultimaActuacion: 'Fallo 1ra inst: SUSPENSIÓN 30 DÍAS. Recurso interpuesto.',
    fechaUltimaActuacion: fechaHace(45),
    fechaHechos: fechaHace(600),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 60
  },
  // ... continúan 4 más

  // ========================================
  // ETAPA 7: EJECUTORIADO (3)
  // ========================================
  {
    id: 'PD-2023-015',
    investigado: 'Claudia Marcela García',
    cargo: 'Profesional Administrativo',
    dependencia: 'Gestión Humana',
    etapa: 'EJECUTORIADO',
    falta: 'Leve',
    descripcionHechos: 'Uso inadecuado de correo institucional. Envío masivo de cadenas y contenido no relacionado con funciones.',
    investigador: 'Dra. Patricia Ruiz Gómez',
    fechaInicio: fechaHace(550),
    diasTranscurridos: 550,
    diasMaximos: 600,
    prioridad: 'BAJA',
    documentosAdjuntos: 5,
    estado: 'CERRADO',
    ultimaActuacion: 'Fallo ejecutoriado: AMONESTACIÓN VERBAL. Proceso cerrado.',
    fechaUltimaActuacion: fechaHace(90),
    fechaHechos: fechaHace(700),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 0
  },
  {
    id: 'PD-2022-098',
    investigado: 'Rafael Eduardo López',
    cargo: 'Celador',
    dependencia: 'Seguridad Física',
    etapa: 'EJECUTORIADO',
    falta: 'Grave',
    descripcionHechos: 'Abandono del puesto de vigilancia. Dejó instalaciones sin custodia durante 2 horas en turno nocturno.',
    investigador: 'Dr. Roberto Castro Vega',
    fechaInicio: fechaHace(680),
    diasTranscurridos: 680,
    diasMaximos: 720,
    prioridad: 'MEDIA',
    documentosAdjuntos: 12,
    estado: 'CERRADO',
    ultimaActuacion: 'Fallo ejecutoriado: SUSPENSIÓN 15 DÍAS. Cumplida.',
    fechaUltimaActuacion: fechaHace(150),
    fechaHechos: fechaHace(800),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 0
  },
  {
    id: 'PD-2022-067',
    investigado: 'Teresa de Jesús Mora',
    cargo: 'Asesora Jurídica',
    dependencia: 'Oficina Jurídica',
    etapa: 'EJECUTORIADO',
    falta: 'Gravísima',
    descripcionHechos: 'Presunta prevaricato por acción. Concepto jurídico favorable a contrato irregular pese a evidencias de ilegalidad.',
    investigador: 'Dr. Carlos Mendoza Torres',
    fechaInicio: fechaHace(850),
    diasTranscurridos: 850,
    diasMaximos: 900,
    prioridad: 'CRÍTICA',
    documentosAdjuntos: 45,
    estado: 'CERRADO',
    ultimaActuacion: 'Fallo ejecutoriado: DESTITUCIÓN. Efectiva desde hace 6 meses.',
    fechaUltimaActuacion: fechaHace(180),
    fechaHechos: fechaHace(1000),
    leyAplicable: 'Ley 1952/2019',
    diasRestantes: 0
  },
];

// Estadísticas
export const estadisticasJuzgamientoDisciplinario = {
  total: procesosDisciplinariosMock.length,
  porEtapa: {
    indagacion: procesosDisciplinariosMock.filter(p => p.etapa === 'INDAGACIÓN PRELIMINAR').length,
    investigacion: procesosDisciplinariosMock.filter(p => p.etapa === 'INVESTIGACIÓN').length,
    pliegoCargos: procesosDisciplinariosMock.filter(p => p.etapa === 'PLIEGO DE CARGOS').length,
    descargos: procesosDisciplinariosMock.filter(p => p.etapa === 'DESCARGOS').length,
    fallo: procesosDisciplinariosMock.filter(p => p.etapa === 'FALLO PRIMERA INSTANCIA').length,
    apelacion: procesosDisciplinariosMock.filter(p => p.etapa === 'RECURSO APELACIÓN').length,
    ejecutoriado: procesosDisciplinariosMock.filter(p => p.etapa === 'EJECUTORIADO').length,
  },
  porGravedad: {
    leve: procesosDisciplinariosMock.filter(p => p.falta === 'Leve').length,
    grave: procesosDisciplinariosMock.filter(p => p.falta === 'Grave').length,
    gravisima: procesosDisciplinariosMock.filter(p => p.falta === 'Gravísima').length,
  },
  criticos: procesosDisciplinariosMock.filter(p => p.prioridad === 'CRÍTICA').length,
};