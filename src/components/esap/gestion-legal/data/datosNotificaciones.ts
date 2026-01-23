/**
 * DATOS NOTIFICACIONES
 * Datos de ejemplo para demostración de Buzón de Notificaciones
 */

export const notificacionesMock: any[] = [
  {
    id: 'NOT-001',
    consecutivo: 'NOT-2024-0001',
    tipo: 'personal',
    destinatario: 'Juan Carlos Pérez González',
    documento: 'Auto admisorio demanda laboral',
    radicado: '11001-33-33-001-2024-00123-00',
    fechaGeneracion: '2024-01-15',
    fechaNotificacion: '2024-01-18',
    estado: 'notificado',
    responsable: 'Secretaría Jurídica',
    evidencia: 'Acta de notificación personal firmada',
    sede: 'Sede Central Bogotá'
  },
  {
    id: 'NOT-002',
    consecutivo: 'NOT-2024-0002',
    tipo: 'electronica',
    destinatario: 'Constructora ABC S.A.S.',
    documento: 'Contestación de demanda contractual',
    radicado: '05001-23-31-000-2023-00456-01',
    fechaGeneracion: '2024-01-20',
    estado: 'pendiente',
    responsable: 'Dr. Carlos Eduardo Martínez',
    correo: 'juridico@constructoraabc.com',
    sede: 'Territorial Antioquia'
  },
  {
    id: 'NOT-003',
    consecutivo: 'NOT-2024-0003',
    tipo: 'edicto',
    destinatario: 'Laura Patricia Gómez Silva',
    documento: 'Auto de pruebas - proceso administrativo',
    radicado: '76001-23-33-000-2024-00789-00',
    fechaGeneracion: '2024-01-22',
    fechaFijacion: '2024-01-23',
    fechaDesfijacion: '2024-02-03',
    estado: 'pendiente',
    responsable: 'Secretaría Jurídica',
    lugarFijacion: 'Cartelera Oficina Jurídica - Territorial Valle',
    sede: 'Territorial Valle del Cauca'
  },
  {
    id: 'NOT-004',
    consecutivo: 'NOT-2024-0004',
    tipo: 'aviso',
    destinatario: 'María Fernanda Castro López',
    documento: 'Citación a diligencia de descargos',
    radicado: 'PD-2024-001',
    fechaGeneracion: '2024-01-19',
    fechaNotificacion: '2024-01-20',
    estado: 'notificado',
    responsable: 'Oficina de Control Interno Disciplinario',
    evidencia: 'Correo certificado recibido',
    sede: 'Sede Central Bogotá'
  }
];

export const estadisticasBuzonNotificaciones = {
  totalNotificaciones: 4,
  porEstado: {
    pendiente: 2,
    notificado: 2,
    devuelto: 0
  },
  porTipo: {
    personal: 1,
    electronica: 1,
    edicto: 1,
    aviso: 1
  }
};
