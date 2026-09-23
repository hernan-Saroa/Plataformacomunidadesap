import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { PTAResumenPrint } from './PTAResumenPrint';

/**
 * El Resumen Individual es un documento oficial: debe llevar la identificación
 * real del docente, no el id interno del sistema.
 *
 * Antes imprimía `userPersonId` tal cual — un UUID como
 * "9bd56f7b-381b-4320-8b0e-d24b1d39329a" — que no identifica a nadie. El
 * backend ya resuelve la cédula contra la ficha institucional y la publica en
 * el DTO con varios alias históricos.
 */
describe('PTAResumenPrint — identificación del docente', () => {
  const ptaBase = {
    id: '5922e6f7-0716-4d65-bee5-c1385f57da39',
    periodo: '2026-2',
    estado: 'Borrador',
    dedicacion: 'Tiempo Completo',
    tipo_vinculacion: 'OCASIONAL',
    semanas_vinculacion: 20,
    horas_asignables: 800,
    docente_nombre: 'ALIX ZULAY HURTADO SOTO',
    asignaturas: [
      { nombre: 'Economia De Lo Público I', creditos: 3, estudiantes: 100, total_horas: 144 },
    ],
  };

  const UUID = '9bd56f7b-381b-4320-8b0e-d24b1d39329a';

  const pintar = (pta: any, extra: Record<string, any> = {}) => {
    const { baseElement } = render(
      <PTAResumenPrint pta={pta} onClose={() => {}} userPersonId={UUID} userName="ALIX HURTADO" {...extra} />,
    );
    return baseElement.textContent || '';
  };

  it('nunca imprime el id interno cuando hay documento', () => {
    const texto = pintar({ ...ptaBase, documento_identidad: '1098765432' });

    expect(texto).toContain('1098765432');
    expect(texto).not.toContain(UUID);
  });

  it('prefiere el documento que entrega el portal', () => {
    const texto = pintar({ ...ptaBase, documento_identidad: '111' }, { userDocumento: '1098765432' });

    expect(texto).toContain('1098765432');
  });

  it('reconoce los alias históricos del DTO', () => {
    expect(pintar({ ...ptaBase, docente_identificacion: '222222' })).toContain('222222');
    expect(pintar({ ...ptaBase, cedula: '333333' })).toContain('333333');
    expect(pintar({ ...ptaBase, numero_documento: '444444' })).toContain('444444');
  });

  it('antepone el tipo de documento cuando se conoce', () => {
    const texto = pintar({ ...ptaBase, documento_identidad: '1098765432', tipo_documento: 'CC' });

    expect(texto).toContain('CC 1098765432');
  });

  it('usa el nombre institucional completo, no el corto de la sesión', () => {
    // La ficha dice "ALIX ZULAY HURTADO SOTO"; la sesión dice "ALIX HURTADO".
    const texto = pintar({ ...ptaBase, documento_identidad: '1098765432' });

    expect(texto).toContain('ALIX ZULAY HURTADO SOTO');
  });

  it('cae al nombre de la sesión si el DTO no trae nombre', () => {
    const { docente_nombre, ...sinNombre } = ptaBase;
    const texto = pintar({ ...sinNombre, documento_identidad: '1098765432' });

    expect(texto).toContain('ALIX HURTADO');
  });

  it('firma con la cédula del docente, no con el id interno', () => {
    const texto = pintar({ ...ptaBase, documento_identidad: '1098765432' });

    expect(texto).toContain('C.C. 1098765432');
    expect(texto).not.toContain(UUID.substring(0, 12));
  });

  it('no imprime el UUID interno cuando el documento no existe', () => {
    const texto = pintar(ptaBase);

    expect(texto).not.toContain(UUID);
  });

  it('traduce los códigos internos de vinculación y dedicación', () => {
    const texto = pintar({ ...ptaBase, tipo_vinculacion: 'CARRERA_003', dedicacion: 'TC' });

    expect(texto).toContain('Carrera profesoral (Acuerdo 003 de 2018)');
    expect(texto).toContain('Tiempo completo');
    expect(texto).not.toContain('CARRERA_003');
  });

  it('no convierte horas base ni aprobadores ausentes en datos aparentes', () => {
    const texto = pintar({ id: 'pta-incompleto', estado: 'Aprobado' });

    expect(texto).toContain('Horas disponibles no registradas');
    expect(texto).not.toContain('0% de carga');
    expect(texto).not.toContain('Grupo de Gestión Profesoral');
  });
});
