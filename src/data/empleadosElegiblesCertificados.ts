/**
 * Datos mock de empleados elegibles para certificados laborales
 */

export const EMPLEADOS_ELEGIBLES = [
  {
    id: '1',
    nombre: 'Juan Pérez',
    documento: '1234567890',
    cargo: 'Profesional Especializado',
    estado: 'Activo'
  },
  {
    id: '2',
    nombre: 'María González',
    documento: '0987654321',
    cargo: 'Analista',
    estado: 'Activo'
  }
];

export const DATOS_LABORALES: Record<string, any> = {
  '1': {
    fechaIngreso: '2020-01-15',
    salario: 5000000,
    dependencia: 'Dirección Administrativa',
    tipoContrato: 'Indefinido'
  },
  '2': {
    fechaIngreso: '2021-03-10',
    salario: 4500000,
    dependencia: 'Dirección Financiera',
    tipoContrato: 'Término Fijo'
  }
};
