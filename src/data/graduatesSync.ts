/**
 * MÓDULO DE SINCRONIZACIÓN CON BACKOFFICE - GESTIÓN DE GRADUADOS
 * 
 * Este módulo simula la consulta a la base de datos del backoffice
 * donde se gestiona el registro de todos los graduados de ESAP
 * (Pregrado, Especialización y Maestría)
 */

export interface Graduate {
  id: string;
  documento: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string; // ✅ NUEVO: Nombre completo para validación
  fechaExpedicionDocumento?: string;
  fechaGrado: string;
  programa: string;
  tituloObtenido: string;
  promedio: number;
  sede: string;
  territorial: string;
}

// Base de datos simulada de graduados (sincronizada con backoffice)
const graduatesDatabase: Graduate[] = [
  // ✅ DATOS DE PRUEBA ACTUALIZADOS - ENERO 2026
  // 🎯 CASO PRINCIPAL DE TESTING
  {
    id: 'GRAD-2024-001',
    documento: '52987654',
    nombre: 'Laura Marcela',
    apellido: 'Rodríguez Gutiérrez',
    nombreCompleto: 'Laura Marcela Rodríguez Gutiérrez',
    fechaExpedicionDocumento: '2015-03-15',
    fechaGrado: '2024-12-01',
    programa: 'Administración Pública Territorial',
    tituloObtenido: 'Pregrado en Administración Pública Territorial',
    promedio: 4.5,
    sede: 'Bogotá',
    territorial: 'Cundinamarca'
  },
  // Caso secundario - Especialización
  {
    id: 'GRAD-2023-045',
    documento: '9876543210',
    nombre: 'Juan Carlos',
    apellido: 'Pérez Martínez',
    nombreCompleto: 'Juan Carlos Pérez Martínez',
    fechaExpedicionDocumento: '2010-07-20',
    fechaGrado: '2023-06-10',
    programa: 'Especialización en Gestión Pública',
    tituloObtenido: 'Especialización en Gestión Pública',
    promedio: 4.8,
    sede: 'Medellín',
    territorial: 'Antioquia'
  },
  {
    id: 'GRAD-2024-120',
    documento: '1122334455',
    nombre: 'Ana María',
    apellido: 'González López',
    nombreCompleto: 'Ana María González López',
    fechaExpedicionDocumento: '2012-11-30',
    fechaGrado: '2024-11-25',
    programa: 'Maestría en Administración y Políticas Públicas',
    tituloObtenido: 'Maestría en Administración y Políticas Públicas',
    promedio: 4.9,
    sede: 'Cali',
    territorial: 'Valle del Cauca'
  },
  {
    id: 'GRAD-2025-256',
    documento: '1020304050',
    nombre: 'Carlos Andrés',
    apellido: 'Gómez Rincón',
    nombreCompleto: 'Carlos Andrés Gómez Rincón',
    fechaExpedicionDocumento: '2018-05-10',
    fechaGrado: '2025-12-18',
    programa: 'Administración Pública Territorial',
    tituloObtenido: 'Pregrado en Administración Pública Territorial',
    promedio: 4.3,
    sede: 'Barranquilla',
    territorial: 'Atlántico'
  },
  {
    id: 'GRAD-2025-089',
    documento: '5566778899',
    nombre: 'Laura Sofía',
    apellido: 'Martínez Díaz',
    nombreCompleto: 'Laura Sofía Martínez Díaz',
    fechaExpedicionDocumento: '2016-09-22',
    fechaGrado: '2025-11-30',
    programa: 'Especialización en Alta Gerencia',
    tituloObtenido: 'Especialización en Alta Gerencia',
    promedio: 4.7,
    sede: 'Bucaramanga',
    territorial: 'Santander'
  },
  {
    id: 'GRAD-2024-312',
    documento: '3344556677',
    nombre: 'Diego Fernando',
    apellido: 'Torres Vargas',
    nombreCompleto: 'Diego Fernando Torres Vargas',
    fechaExpedicionDocumento: '2014-01-15',
    fechaGrado: '2024-06-28',
    programa: 'Maestría en Gobierno y Políticas Públicas',
    tituloObtenido: 'Maestría en Gobierno y Políticas Públicas',
    promedio: 4.85,
    sede: 'Bogotá',
    territorial: 'Cundinamarca'
  },
  // ✅ NUEVOS GRADUADOS DE PRUEBA - MÁS CASOS DIVERSOS
  {
    id: 'GRAD-2025-401',
    documento: '7788990011',
    nombre: 'Claudia Patricia',
    apellido: 'Jiménez Sánchez',
    nombreCompleto: 'Claudia Patricia Jiménez Sánchez',
    fechaExpedicionDocumento: '2017-08-12',
    fechaGrado: '2025-07-20',
    programa: 'Especialización en Gerencia Social',
    tituloObtenido: 'Especialización en Gerencia Social',
    promedio: 4.6,
    sede: 'Cartagena',
    territorial: 'Bolívar'
  },
  {
    id: 'GRAD-2024-589',
    documento: '4455667788',
    nombre: 'Andrés Felipe',
    apellido: 'Castro Moreno',
    nombreCompleto: 'Andrés Felipe Castro Moreno',
    fechaExpedicionDocumento: '2013-02-28',
    fechaGrado: '2024-03-15',
    programa: 'Administración Pública',
    tituloObtenido: 'Pregrado en Administración Pública',
    promedio: 4.4,
    sede: 'Pereira',
    territorial: 'Risaralda'
  },
  {
    id: 'GRAD-2023-712',
    documento: '2233445566',
    nombre: 'Paula Andrea',
    apellido: 'Hernández Ruiz',
    nombreCompleto: 'Paula Andrea Hernández Ruiz',
    fechaExpedicionDocumento: '2011-06-18',
    fechaGrado: '2023-12-10',
    programa: 'Maestría en Planeación para el Desarrollo',
    tituloObtenido: 'Maestría en Planeación para el Desarrollo',
    promedio: 4.75,
    sede: 'Manizales',
    territorial: 'Caldas'
  },
  {
    id: 'GRAD-2025-923',
    documento: '6677889900',
    nombre: 'José Miguel',
    apellido: 'Ramírez Ortiz',
    nombreCompleto: 'José Miguel Ramírez Ortiz',
    fechaExpedicionDocumento: '2019-04-05',
    fechaGrado: '2025-06-12',
    programa: 'Especialización en Gestión de Proyectos',
    tituloObtenido: 'Especialización en Gestión de Proyectos',
    promedio: 4.55,
    sede: 'Pasto',
    territorial: 'Nariño'
  },
  {
    id: 'GRAD-2024-834',
    documento: '8899001122',
    nombre: 'Sandra Milena',
    apellido: 'López Ríos',
    nombreCompleto: 'Sandra Milena López Ríos',
    fechaExpedicionDocumento: '2015-09-10',
    fechaGrado: '2024-08-22',
    programa: 'Administración Pública Territorial',
    tituloObtenido: 'Pregrado en Administración Pública Territorial',
    promedio: 4.65,
    sede: 'Ibagué',
    territorial: 'Tolima'
  },
  {
    id: 'GRAD-2023-445',
    documento: '3366778899',
    nombre: 'Ricardo Javier',
    apellido: 'Montoya Cardona',
    nombreCompleto: 'Ricardo Javier Montoya Cardona',
    fechaExpedicionDocumento: '2012-12-20',
    fechaGrado: '2023-11-18',
    programa: 'Maestría en Gobierno y Políticas Públicas',
    tituloObtenido: 'Maestría en Gobierno y Políticas Públicas',
    promedio: 4.8,
    sede: 'Armenia',
    territorial: 'Quindío'
  }
];

/**
 * FUNCIÓN DE VALIDACIÓN PÚBLICA
 * Valida si un graduado existe en la base de datos del backoffice
 * y si los datos proporcionados coinciden
 */
export function validateGraduateForPublicService(
  documentNumber: string,
  graduationDate: string,
  fullName: string
): { isValid: boolean; graduate?: Graduate; error?: string } {
  
  // Buscar por número de documento
  const graduate = graduatesDatabase.find(g => g.documento === documentNumber);
  
  if (!graduate) {
    return {
      isValid: false,
      error: 'No se encontró ningún graduado con ese número de documento'
    };
  }
  
  // Validar fecha de grado
  if (graduate.fechaGrado !== graduationDate) {
    return {
      isValid: false,
      error: 'La fecha de grado no coincide con nuestros registros'
    };
  }
  
  // Validar nombre completo
  if (graduate.nombreCompleto !== fullName) {
    return {
      isValid: false,
      error: 'El nombre completo no coincide con nuestros registros'
    };
  }
  
  return {
    isValid: true,
    graduate
  };
}