// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PerfilDocenteCabezote } from './PerfilDocenteCabezote';

// Sin `globals: true` en vitest.config.ts, @testing-library/react no desmonta
// el render anterior por su cuenta.
afterEach(cleanup);

const PERFIL_GGP = {
  docente_id: 'docente-1',
  nombre_completo: 'MARIA LOPEZ RUIZ',
  documento_identidad: '1020304050',
  vinculacion: 'Planta',
  categoria: 'Asociado',
  territorial: 'Antioquia',
  estado: 'ACTIVO',
  puntaje_salarial: 145.5,
  ultima_evaluacion: 'Sobresaliente 2025-2',
  canal_origen: 'MASIVO',
  id_rund: 'RUND-001',
  periodo_carga: '2026-1',
  proteccion_datos: { acceso_completo: true, campos_sensibles: ['PUNTAJE_SALARIAL'], campos_enmascarados: [] },
};

const PERFIL_RESTRINGIDO = {
  ...PERFIL_GGP,
  documento_identidad: '******4050',
  puntaje_salarial: null,
  proteccion_datos: {
    acceso_completo: false,
    campos_sensibles: ['PUNTAJE_SALARIAL'],
    campos_enmascarados: ['PUNTAJE_SALARIAL'],
  },
};

describe('REQ-RUND-F002 — cabezote del perfil docente', () => {
  it('muestra los siete datos clave del perfil', () => {
    render(<PerfilDocenteCabezote docente={PERFIL_GGP} />);

    expect(screen.getByRole('heading', { name: 'MARIA LOPEZ RUIZ' })).toBeTruthy();
    ['Tipo de vinculación', 'Categoría', 'Territorial', 'Estado de vinculación', 'Puntaje salarial', 'Última evaluación']
      .forEach((etiqueta) => expect(screen.getByText(etiqueta)).toBeTruthy());
    expect(screen.getByText('Planta')).toBeTruthy();
    expect(screen.getByText('Asociado')).toBeTruthy();
    expect(screen.getByText('Antioquia')).toBeTruthy();
    expect(screen.getByText('145,5')).toBeTruthy();
    expect(screen.getByText('Sobresaliente 2025-2')).toBeTruthy();
    expect(screen.getByText('Registro RUND-001 · Periodo 2026-1')).toBeTruthy();
  });

  it('es de solo lectura: no renderiza campos editables ni acciones', () => {
    const { container } = render(<PerfilDocenteCabezote docente={PERFIL_GGP} />);

    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0);
    expect(container.querySelectorAll('button, a[href]')).toHaveLength(0);
    expect(container.querySelectorAll('[contenteditable="true"]')).toHaveLength(0);
    expect(screen.getByText('Solo lectura')).toBeTruthy();
  });

  it('nunca imprime la cédula del docente', () => {
    const { container } = render(<PerfilDocenteCabezote docente={PERFIL_GGP} />);

    expect(container.innerHTML).not.toContain('1020304050');
  });

  it('oculta el puntaje salarial y lo explica cuando el rol no tiene acceso', () => {
    const { container } = render(<PerfilDocenteCabezote docente={PERFIL_RESTRINGIDO} />);

    expect(screen.getByText('Información restringida')).toBeTruthy();
    expect(screen.getByText('El puntaje salarial es un dato sensible y permanece oculto para su rol.')).toBeTruthy();
    expect(container.innerHTML).not.toContain('145,5');
    expect(container.innerHTML).not.toContain('145.5');
  });

  it('no muestra el aviso de restricción a un rol autorizado', () => {
    render(<PerfilDocenteCabezote docente={PERFIL_GGP} />);

    expect(screen.queryByText('Información restringida')).toBeNull();
    expect(screen.queryByText('El puntaje salarial es un dato sensible y permanece oculto para su rol.')).toBeNull();
  });

  it('distingue un docente activo de uno inactivo', () => {
    const { unmount } = render(<PerfilDocenteCabezote docente={PERFIL_GGP} />);
    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0);
    unmount();

    render(<PerfilDocenteCabezote docente={{ ...PERFIL_GGP, estado: 'RETIRADO' }} />);
    expect(screen.getAllByText('Inactivo').length).toBeGreaterThan(0);
  });

  it('declara el origen de la última evaluación y su estado pendiente', () => {
    const { unmount } = render(<PerfilDocenteCabezote docente={PERFIL_GGP} />);
    expect(screen.getByText('Origen: carga masiva RUND')).toBeTruthy();
    unmount();

    render(<PerfilDocenteCabezote docente={{ ...PERFIL_GGP, ultima_evaluacion: null }} />);
    expect(screen.getByText('Sin evaluación registrada')).toBeTruthy();
    expect(screen.getByText('Pendiente del módulo de evaluación docente')).toBeTruthy();
  });

  it('usa una lista de definiciones accesible con una pareja por campo', () => {
    const { container } = render(<PerfilDocenteCabezote docente={PERFIL_GGP} />);

    const region = container.querySelector('section[aria-label="Cabezote del perfil docente"]');
    expect(region).toBeTruthy();
    expect(container.querySelectorAll('dl > div > dt')).toHaveLength(6);
    expect(container.querySelectorAll('dl > div > dd')).toHaveLength(6);
  });

  it('no rompe la vista cuando el perfil llega incompleto', () => {
    const { container } = render(<PerfilDocenteCabezote docente={{ nombre_completo: 'JUAN PEREZ' }} />);

    expect(screen.getByRole('heading', { name: 'JUAN PEREZ' })).toBeTruthy();
    expect(screen.getByText('Perfil del Registro Único Nacional Docente')).toBeTruthy();
    // Sin metadatos de permisos el puntaje permanece restringido.
    expect(screen.getAllByText('No registrado').length).toBe(3);
    expect(screen.getByText('Información restringida')).toBeTruthy();
    expect(container.querySelectorAll('dl > div')).toHaveLength(6);
  });

  it('no renderiza nada sin perfil', () => {
    const { container } = render(<PerfilDocenteCabezote docente={null} />);

    expect(container.innerHTML).toBe('');
  });
});
