import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { ReporteIndividualPTA } from './ReporteIndividualPTA';
import { getComponentesAprobacion } from '../../services/api/ptaApi';

vi.mock('../../services/api/ptaApi', () => ({ getComponentesAprobacion: vi.fn().mockResolvedValue({ success: false }) }));
afterEach(cleanup);

describe('aprobaciones del reporte R-01 (vista y exportación)', () => {
  it('retira la firma docente anterior durante la edición y la recupera al reenviar sin perder otros avales', () => {
    const pta = {
      docente_nombre: 'Docente Prueba', horas_investigacion: 32,
      fecha_envio_revision: '2026-10-20T10:00:00Z',
      firma_digital: { certificado_id: 'certificado-anterior' },
      componentes_aprobacion: [
        { componente: 'investigacion', estado: 'aprobado', horas: 32, aprobadorNombre: 'Aval conservado' },
      ],
    };
    const reporte = (estado: string, extra: any = {}) => <ReporteIndividualPTA pta={{ ...pta, estado, ...extra }} onClose={() => {}} />;
    const { rerender } = render(reporte('Aprobado'));
    expect(screen.getByText(/Enviado y firmado el/)).toBeTruthy();

    rerender(reporte('REVISION_DOCENTE_N1'));
    expect(screen.queryByText(/Enviado y firmado el/)).toBeNull();
    expect(screen.queryByText('Firma Digital Verificada')).toBeNull();
    expect(screen.queryByText('certificado-anterior')).toBeNull();
    expect(screen.getByText('Aval conservado')).toBeTruthy();

    rerender(reporte('Pendiente Jefatura', {
      fecha_envio_revision: '2026-10-28T10:00:00Z',
      firma_digital: { certificado_id: 'certificado-nuevo' },
    }));
    expect(screen.getByText(/Enviado y firmado el/).textContent).toContain('28');
    expect(screen.getByText('certificado-nuevo')).toBeTruthy();
    expect(screen.queryByText('certificado-anterior')).toBeNull();
    expect(screen.getByText('Aval conservado')).toBeTruthy();
  });

  it('actualiza la firma de una aprobación mientras el mismo reporte permanece abierto', async () => {
    const pta = { id: 'pta-1', estado: 'Pendiente Jefatura', horas_docencia: 384 };
    vi.mocked(getComponentesAprobacion).mockResolvedValueOnce({ success: true, data: [] });
    const { rerender } = render(<ReporteIndividualPTA pta={pta} onClose={() => {}} />);
    vi.mocked(getComponentesAprobacion).mockResolvedValueOnce({ success: true, data: [
      { componente: 'academica_territorial', estado: 'aprobado', horas: 384, aprobadorNombre: 'Aprobador simultáneo' },
    ] });
    rerender(<ReporteIndividualPTA pta={{ ...pta, estado: 'Aprobado' }} onClose={() => {}} />);
    expect(await screen.findByText('Aprobador simultáneo')).toBeTruthy();
  });
  it('no imprime firmas automáticas de Extensión y usa los ámbitos actuales', () => {
    const pta = {
      estado: 'Aprobado', horas_docencia: 384, horas_investigacion: 200, horas_extension: 0, horas_complementarias: 170, horas_asignables: 800,
      componentes_aprobacion: [
        { componente: 'academica_territorial', estado: 'aprobado', horas: 384, aprobadorNombre: 'Revisor territorial' },
        { componente: 'complementarias_gestion_profesoral', estado: 'aprobado', horas: 170, aprobadorNombre: 'Gestión Profesoral' },
        ...['ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento', 'ext_gobierno'].map(componente => ({
          componente, estado: 'aprobado', aprobadorNombre: 'Sistema', horas: 0, aplica: false, fechaAprobacion: '2026-08-05',
        })),
      ],
    };
    render(<ReporteIndividualPTA pta={pta} onClose={() => {}} />);
    const cards = screen.getByText('Aprobación por Componente').nextElementSibling as HTMLElement;
    expect(within(cards).getAllByText('No aplica')).toHaveLength(4);
    expect(within(cards).queryByText('Sistema')).toBeNull();
    expect(within(cards).getByText('Revisor territorial')).toBeTruthy();
    expect(within(cards).getByText('Gestión Profesoral')).toBeTruthy();
  });
});

describe('identificación institucional del reporte R-01', () => {
  it.each([
    ['PERIODO_DE_PRUEBA', 'Período de prueba'],
    ['CARRERA_003', 'Carrera profesoral (Acuerdo 003 de 2018)'],
    ['CARRERA_009', 'Carrera profesoral (Acuerdo 009 de 2004)'],
  ])('muestra una etiqueta legible para %s', (codigo, etiqueta) => {
    render(<ReporteIndividualPTA pta={{ tipo_vinculacion: codigo }} onClose={() => {}} />);
    expect(screen.getByText(etiqueta)).toBeTruthy();
    expect(screen.queryByText(codigo)).toBeNull();
  });

  it('no inventa datos institucionales cuando la ficha está incompleta', () => {
    const { baseElement } = render(<ReporteIndividualPTA pta={{ id: 'pta-sin-datos' }} onClose={() => {}} />);
    const texto = baseElement.textContent || '';

    expect(texto).not.toContain('SEDE CENTRAL');
    expect(texto).not.toContain('Profesor de Carrera');
    expect(texto).not.toContain('Asociado');
    expect(texto).not.toContain('2025-2');
    expect(texto).not.toContain('NaN');
    expect(texto).not.toContain('0.0%');
    expect(texto).toContain('Total programado: — de horas base no registradas');
    expect(screen.getAllByText('No registrado').length).toBeGreaterThanOrEqual(7);
    expect(screen.getByText('Núcleo Temático:', { exact: false }).parentElement?.textContent).toContain('No registrado');
  });

  it('no presume créditos, modalidad, rol ni cantidades ausentes', () => {
    const { baseElement } = render(<ReporteIndividualPTA pta={{
      horas_asignables: 800,
      asignaturas: [{ nombre: 'Asignatura real', total_horas: 0 }],
      investigacion_proyecto: { nombre: 'Proyecto real' },
      investigacion_actividades: [{ nombre: 'Actividad real', horas: 0 }],
    }} onClose={() => {}} />);
    const texto = baseElement.textContent || '';

    expect(texto).not.toContain('PRESENCIAL');
    expect(texto).not.toContain('Investigador');
    expect(texto).not.toContain('Proyecto de Investigación');
  });
});
