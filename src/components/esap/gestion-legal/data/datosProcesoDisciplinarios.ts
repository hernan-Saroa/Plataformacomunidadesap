/**
 * DATOS PROCESOS DISCIPLINARIOS
 * Datos de ejemplo para demostración de Juzgamiento Disciplinario
 */

export const procesoDisciplinariosMock: any[] = [
  {
    id: 'DISC-001',
    radicado: 'PD-2024-001',
    investigado: 'Anónimo (Reserva legal)',
    cargo: 'Profesional Universitario',
    hechos: 'Presuntas irregularidades en proceso de contratación',
    etapa: 'indagacion',
    fechaInicio: '2024-01-08',
    investigador: 'Dr. Carlos Eduardo Martínez',
    tipo: 'disciplinario',
    estado: 'activo',
    sede: 'Sede Central Bogotá',
    diasTranscurridos: 15
  },
  {
    id: 'DISC-002',
    radicado: 'PD-2023-045',
    investigado: 'Anónimo (Reserva legal)',
    cargo: 'Docente Hora Cátedra',
    hechos: 'Presunto incumplimiento de obligaciones contractuales',
    etapa: 'fallo',
    fechaInicio: '2023-08-15',
    fechaFallo: '2024-01-10',
    investigador: 'Dra. María Fernanda Rodríguez',
    tipo: 'disciplinario',
    estado: 'cerrado',
    fallo: 'archivo',
    sede: 'Territorial Antioquia',
    diasTranscurridos: 148
  },
  {
    id: 'DISC-003',
    radicado: 'PD-2024-002',
    investigado: 'Anónimo (Reserva legal)',
    cargo: 'Coordinador Territorial',
    hechos: 'Presunto uso indebido de recursos institucionales',
    etapa: 'investigacion',
    fechaInicio: '2024-01-12',
    investigador: 'Dr. Jorge Andrés López',
    tipo: 'disciplinario',
    estado: 'activo',
    sede: 'Territorial Valle del Cauca',
    diasTranscurridos: 11
  }
];

export const estadisticasJuzgamiento = {
  totalProcesos: 3,
  porEtapa: {
    valoracion: 0,
    indagacion: 1,
    investigacion: 1,
    juzgamiento: 0,
    fallo: 1
  },
  porTipo: {
    disciplinario: 3,
    fiscal: 0
  },
  promedioTiempo: 58
};
