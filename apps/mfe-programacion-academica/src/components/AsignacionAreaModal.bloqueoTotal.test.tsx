// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AsignacionAreaModal } from './AsignacionAreaModal';
import { getCandidatosArea } from '../services/api/asignacionAreaApi';

vi.mock('../services/api/asignacionAreaApi', () => ({ getCandidatosArea: vi.fn(), asignarFranjas: vi.fn(), asignarMultiple: vi.fn() }));

/** EFDS-2449: con todos los candidatos bloqueados, alerta clara (no solo Confirmar deshabilitado). */
const base = {
  nombre: 'Docente', vinculacion: 'Ocasional', perfil: null,
  titulos: { pregrado: null, especializacion: null, maestria: null, doctorado: null, posdoctorado: null },
  nucleos: [], origenArea: 'rund', horasProgramadas: 0, horasImpacto: 64, tope: 304, avisos: [], asignable: false,
};
const venc = { regla: 'RN-10', tipo: 'VINCULACION', mensaje: 'El grupo termina el 2026-06-12, después del fin de vinculación del docente (2025-12-15)' };
const candidatos = [
  { ...base, documento: '1', cruce: false, motivos: [venc] },
  { ...base, documento: '2', cruce: false, motivos: [venc] },
  { ...base, documento: '3', cruce: false, motivos: [venc] },
  { ...base, documento: '4', cruce: true, motivos: [{ regla: 'RN-07', tipo: 'CRUCE', mensaje: 'El docente ya tiene una franja ocupada el lunes de 08:00 a 10:00' }] },
];
const bloqueoTotal = {
  titulo: 'Ningún docente del área «Estado y Poder» se puede asignar a este grupo.',
  accion: 'Revise la vinculación de los docentes en el RUND, cambie el horario del grupo o elija otras franjas o habilite docentes del área.',
  motivosFrecuentes: [{ clave: 'VINCULACION_VENCIDA', cantidad: 3, etiqueta: 'con la vinculación vencida' }, { clave: 'CRUCE', cantidad: 1, etiqueta: 'con cruce de horario' }],
  resumen: '3 con la vinculación vencida, 1 con cruce de horario.',
};
const grupo: any = { idGrupo: 'g1', numeroGrupo: 1, franjas: [], docentes: [], modalidad: 'virtual', horarioPorDefinir: true };
const respuesta = (extra: object) => ({
  grupo: 'g1', franjas: [], area: { codigo: 'AF-01', nombre: 'Estado y Poder', nucleoAsignatura: null }, candidatos, sugerido: null, mensaje: null,
  resumen: { total: 4, asignables: 0, bloqueados: 4 }, ...extra,
}) as any;

beforeEach(() => { vi.clearAllMocks(); });
afterEach(cleanup);

it('todos bloqueados: alerta con que no se puede asignar a nadie, qué hacer y los motivos con su conteo; cada tarjeta conserva su motivo', async () => {
  vi.mocked(getCandidatosArea).mockResolvedValue(respuesta({ bloqueoTotal, aviso: `${bloqueoTotal.titulo} ${bloqueoTotal.accion}` }));
  render(<AsignacionAreaModal grupo={grupo} asignatura="Teoría del Estado" cerrar={vi.fn()} retornarFoco={null} />);
  const alerta = await screen.findByRole('alert', { name: 'Ningún docente se puede asignar' });
  expect(within(alerta).getByText(bloqueoTotal.titulo)).toBeTruthy();
  expect(within(alerta).getByText(bloqueoTotal.accion)).toBeTruthy();
  expect(alerta.textContent).toContain('Motivos más frecuentes: 3 con la vinculación vencida, 1 con cruce de horario.');
  // El motivo de cada docente sigue en su tarjeta.
  expect(screen.getAllByText(/después del fin de vinculación del docente/)).toHaveLength(3);
  expect(screen.getByText(/ya tiene una franja ocupada el lunes/)).toBeTruthy();
  // Nadie se puede elegir y Confirmar sigue deshabilitado.
  for (const r of screen.getAllByRole('radio')) expect((r as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByRole('button', { name: 'Confirmar' }) as HTMLButtonElement).disabled).toBe(true);
});

it('si alguien se puede asignar no hay alerta de bloqueo total', async () => {
  const apto = { ...candidatos[0], asignable: true, motivos: [] };
  vi.mocked(getCandidatosArea).mockResolvedValue(respuesta({ candidatos: [apto, candidatos[1]], bloqueoTotal: null, aviso: null, resumen: { total: 2, asignables: 1, bloqueados: 1 } }));
  render(<AsignacionAreaModal grupo={grupo} asignatura="Teoría del Estado" cerrar={vi.fn()} retornarFoco={null} />);
  await waitFor(() => expect(screen.getAllByRole('radio').length).toBe(2));
  expect(screen.queryByRole('alert', { name: 'Ningún docente se puede asignar' })).toBeNull();
});

it('con un servidor anterior (sin bloqueoTotal) se sigue mostrando el aviso de texto', async () => {
  vi.mocked(getCandidatosArea).mockResolvedValue(respuesta({ aviso: 'Texto del aviso anterior' }));
  render(<AsignacionAreaModal grupo={grupo} asignatura="Teoría del Estado" cerrar={vi.fn()} retornarFoco={null} />);
  expect(await screen.findByText('Texto del aviso anterior')).toBeTruthy();
  expect(screen.queryByRole('alert', { name: 'Ningún docente se puede asignar' })).toBeNull();
});
