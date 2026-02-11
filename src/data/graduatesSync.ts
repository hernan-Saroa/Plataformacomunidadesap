/**
 * Datos de graduados sincronizados
 */

export interface Graduate {
  id: string;
  nombre: string;
  documento: string;
  programa: string;
  fechaGrado: string;
  estado: string;
}

export function validateGraduateForPublicService(documento: string): Graduate | null {
  // Mock de graduados
  const graduados: Graduate[] = [
    {
      id: '1',
      nombre: 'Juan Pérez',
      documento: '1234567890',
      programa: 'Administración Pública',
      fechaGrado: '2020-06-15',
      estado: 'Graduado'
    },
    {
      id: '2',
      nombre: 'María González',
      documento: '0987654321',
      programa: 'Gestión Pública',
      fechaGrado: '2021-12-10',
      estado: 'Graduado'
    }
  ];

  return graduados.find(g => g.documento === documento) || null;
}
