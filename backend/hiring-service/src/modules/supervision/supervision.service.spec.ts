import {
  admiteSupervisor,
  MAX_BYTES_CORREO,
  repartirEnElCorreo,
  textoDelCorreo,
} from './supervision.service';

/**
 * Actividad 8.2 de la matriz: la designación del supervisor.
 *
 * La matriz la sitúa en el puesto 2 de la etapa, antes de las garantías (8.4)
 * y la ARL (8.5), mientras que EFDS-1165 la enuncia «dado un contrato
 * legalizado» —que es justamente tener 8.4 y 8.5 aprobadas—. Exigir la
 * legalización volvería inalcanzable el puesto que la matriz le da, así que
 * manda la matriz y basta con el contrato perfeccionado.
 *
 * La desviación quedó anotada en la historia para que la Dirección de
 * Contratación decida cuál de las dos fuentes se corrige.
 */
describe('admiteSupervisor', () => {
  it('un contrato perfeccionado admite supervisor', () => {
    // El puesto 2 de la matriz: firmado por las dos partes, todavía sin
    // garantías aprobadas.
    expect(admiteSupervisor('PERFECCIONADO')).toBe(true);
  });

  it('un contrato legalizado también, porque ya pasó por el perfeccionamiento', () => {
    expect(admiteSupervisor('LEGALIZADO')).toBe(true);
  });

  it('no se designa antes de las firmas', () => {
    // Sin las dos firmas no hay contrato que vigilar: designar ahí sería
    // encargar la supervisión de algo que aún puede no llegar a existir.
    expect(admiteSupervisor('GENERADO')).toBe(false);
    expect(admiteSupervisor('ACEPTADO')).toBe(false);
  });

  it('tampoco sobre una minuta rechazada', () => {
    expect(admiteSupervisor('RECHAZADO')).toBe(false);
  });
});

/**
 * Criterio de EFDS-1169: «dado un contrato en ejecución, cuando el ordenador
 * del gasto reasigna el supervisor por acto administrativo, entonces el sistema
 * actualiza el supervisor activo y conserva el historial del anterior».
 *
 * Sobre cuándo puede hacerse, la historia y la matriz (9.3) dicen «en cualquier
 * momento», mientras que el criterio dice «en ejecución». Se sigue la matriz
 * —como en 8.2—: si el titular se va entre la designación y el acta de inicio,
 * exigir la ejecución dejaría el contrato con un supervisor que ya no está.
 */
describe('admiteSupervisor · reasignación', () => {
  it('un contrato en ejecución sigue admitiendo cambio de supervisor', () => {
    expect(admiteSupervisor('EJECUCION')).toBe(true);
  });

  it('y uno apenas suscrito también, como dice la matriz', () => {
    expect(admiteSupervisor('PERFECCIONADO')).toBe(true);
  });
});

/**
 * El correo de la designación (124): el acto y los documentos para el
 * supervisor, hasta lo que cabe en un correo.
 */
describe('repartirEnElCorreo', () => {
  const MB = 1024 * 1024;

  it('manda todo lo que cabe, en orden, con el acto primero', () => {
    const { caben, quedanFuera } = repartirEnElCorreo([
      { nombre: 'acto.pdf', tamano: 2 * MB },
      { nombre: 'contrato.pdf', tamano: 5 * MB },
    ]);
    expect(caben.map((d) => d.nombre)).toEqual(['acto.pdf', 'contrato.pdf']);
    expect(quedanFuera).toEqual([]);
  });

  it('lo que no cabe queda fuera sin detener a los que vienen detrás', () => {
    const { caben, quedanFuera } = repartirEnElCorreo([
      { nombre: 'acto.pdf', tamano: 1 * MB },
      { nombre: 'planos.pdf', tamano: 30 * MB },
      { nombre: 'estudio.pdf', tamano: 3 * MB },
    ]);
    expect(caben.map((d) => d.nombre)).toEqual(['acto.pdf', 'estudio.pdf']);
    expect(quedanFuera.map((d) => d.nombre)).toEqual(['planos.pdf']);
  });

  it('el límite es de 25 MB entre todos', () => {
    expect(MAX_BYTES_CORREO).toBe(25 * MB);
    const { caben } = repartirEnElCorreo([
      { nombre: 'a', tamano: 20 * MB },
      { nombre: 'b', tamano: 5 * MB },
      { nombre: 'c', tamano: 1 },
    ]);
    expect(caben.map((d) => d.nombre)).toEqual(['a', 'b']);
  });
});

describe('textoDelCorreo', () => {
  const base = {
    nombre: 'Ana Ruiz',
    contrato: 'CT-2026-014',
    objeto: 'Mantenimiento de sedes',
    radicado: 'PC-2026-0031',
    fechaDesignacion: '2026-10-21',
    mensaje: null,
    adjuntos: ['acto.pdf'],
    fuera: [],
  };

  it('dice qué contrato vigila, desde cuándo y qué lleva adjunto', () => {
    const { titulo, mensaje } = textoDelCorreo(base);
    expect(titulo).toBe('Designación como supervisor del contrato CT-2026-014');
    expect(mensaje).toContain('CT-2026-014');
    expect(mensaje).toContain('PC-2026-0031');
    expect(mensaje).toContain('2026-10-21');
    expect(mensaje).toContain('Objeto: Mantenimiento de sedes.');
    expect(mensaje).toContain('Adjuntos: acto.pdf.');
  });

  it('incluye lo que escribió quien designa', () => {
    const { mensaje } = textoDelCorreo({ ...base, mensaje: 'La reunión de inicio es el lunes.' });
    expect(mensaje).toContain('La reunión de inicio es el lunes.');
  });

  it('nombra lo que no cupo para que no crea que le llegó todo', () => {
    const { mensaje } = textoDelCorreo({ ...base, fuera: ['planos.pdf'] });
    expect(mensaje).toContain('No cupieron en el correo');
    expect(mensaje).toContain('planos.pdf');
  });
});
