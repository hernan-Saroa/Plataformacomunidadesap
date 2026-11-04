import { describe, it, expect } from 'vitest';
import {
  mapearResponsable, mapearResponsables, filtrarResponsables, detalleOpcion, estadoResponsable,
  requiereReasignacion, resolverResponsableActual, ResponsableOpcion,
} from './responsablesIndicador';

const usuario = (over: any = {}, roles: string[] = ['RESUELVE_GESTION_LEGAL'], activo = true) => ({
  id: 'p-1',
  identification_number: '1098765432',
  full_name: 'Ana Lucía Abogada',
  email: 'ana.abogada@esap.edu.co',
  cargo: { nomCargo: 'Profesional Especializado' },
  dependencia: { nomDependencia: 'Oficina Jurídica' },
  user: { id_user: 'u-1', is_active: activo, roles: roles.map(code => ({ code })) },
  ...over,
});

const opcion = (id: string, nombre: string, extra: Partial<ResponsableOpcion> = {}): ResponsableOpcion => ({
  id, nombreCompleto: nombre, email: `${id}@esap.edu.co`, documento: `10${id}`, cargo: '', dependencia: '', roles: ['RESUELVE_GESTION_LEGAL'], ...extra,
});

describe('mapearResponsable', () => {
  it('incluye usuarios activos con rol del proceso legal', () => {
    expect(mapearResponsable(usuario())).toEqual(expect.objectContaining({
      id: 'u-1', nombreCompleto: 'Ana Lucía Abogada', documento: '1098765432',
      cargo: 'Profesional Especializado', dependencia: 'Oficina Jurídica',
    }));
  });

  it('acepta cualquier rol del proceso (jefe, secretariado, monitoreo)', () => {
    ['JEFE_GESTION_LEGAL', 'SECRETARIADO_GESTION_LEGAL', 'MONITOREO_GESTION_LEGAL']
      .forEach(rol => expect(mapearResponsable(usuario({}, [rol]))).not.toBeNull());
  });

  it('excluye usuarios inactivos', () => {
    expect(mapearResponsable(usuario({}, ['RESUELVE_GESTION_LEGAL'], false))).toBeNull();
  });

  it('excluye usuarios sin rol del proceso legal', () => {
    expect(mapearResponsable(usuario({}, ['DOCENTE']))).toBeNull();
    expect(mapearResponsable(usuario({}, []))).toBeNull();
  });

  it('excluye registros sin id de usuario o sin nombre', () => {
    expect(mapearResponsable(usuario({ user: { roles: [{ code: 'JEFE_GESTION_LEGAL' }] } }))).toBeNull();
    expect(mapearResponsable(usuario({ full_name: '', first_name: '', last_name: '' }))).toBeNull();
  });

  it('mapearResponsables ordena por nombre y tolera entradas inválidas', () => {
    const lista = mapearResponsables([
      usuario({ full_name: 'Zoila', user: { id_user: 'u-z', is_active: true, roles: [{ code: 'JEFE_GESTION_LEGAL' }] } }),
      usuario({ full_name: 'Álvaro', user: { id_user: 'u-a', is_active: true, roles: [{ code: 'JEFE_GESTION_LEGAL' }] } }),
    ]);
    expect(lista.map(r => r.nombreCompleto)).toEqual(['Álvaro', 'Zoila']);
    expect(mapearResponsables(undefined as any)).toEqual([]);
  });
});

describe('detalleOpcion', () => {
  it('muestra cargo y dependencia', () => {
    expect(detalleOpcion(opcion('1', 'A', { cargo: 'Jefe', dependencia: 'Jurídica' }))).toBe('Jefe · Jurídica');
  });
  it('usa el rol cuando no hay cargo', () => {
    expect(detalleOpcion(opcion('1', 'A', { dependencia: 'Jurídica' }))).toBe('Resuelve Gestión Legal · Jurídica');
  });
  it('queda vacío si no hay cargo, rol conocido ni dependencia', () => {
    expect(detalleOpcion(opcion('1', 'A', { roles: [] }))).toBe('');
  });
});

describe('filtrarResponsables', () => {
  const lista = [
    opcion('1', 'Carlos Pérez', { documento: '79123456', email: 'carlos.perez@esap.edu.co' }),
    opcion('2', 'Carlos Mendoza', { documento: '80999111', email: 'cmendoza@esap.edu.co' }),
    opcion('3', 'Ana Gómez', { documento: '1098765432', email: 'ana.gomez@esap.edu.co' }),
  ];

  it('sin búsqueda devuelve todos', () => {
    expect(filtrarResponsables(lista, '')).toHaveLength(3);
    expect(filtrarResponsables(lista, '   ')).toHaveLength(3);
  });
  it('busca por nombre sin distinguir mayúsculas ni tildes', () => {
    expect(filtrarResponsables(lista, 'perez').map(r => r.id)).toEqual(['1']);
    expect(filtrarResponsables(lista, 'GOMEZ').map(r => r.id)).toEqual(['3']);
    expect(filtrarResponsables(lista, 'carlos').map(r => r.id)).toEqual(['1', '2']);
  });
  it('busca por número de documento', () => {
    expect(filtrarResponsables(lista, '80999').map(r => r.id)).toEqual(['2']);
  });
  it('busca por correo institucional', () => {
    expect(filtrarResponsables(lista, 'cmendoza@').map(r => r.id)).toEqual(['2']);
  });
  it('sin coincidencias devuelve vacío', () => {
    expect(filtrarResponsables(lista, 'no existe')).toEqual([]);
  });
});

describe('estadoResponsable / requiereReasignacion', () => {
  const activos = [opcion('u-1', 'Ana Gómez')];

  it('VIGENTE cuando el id está entre los activos', () => {
    expect(estadoResponsable({ responsableId: 'u-1', responsable: 'Ana Gómez' }, activos)).toBe('VIGENTE');
    expect(requiereReasignacion({ responsableId: 'u-1', responsable: 'Ana Gómez' }, activos)).toBe(false);
  });
  it('INACTIVO cuando tiene id pero ya no está entre los activos', () => {
    expect(estadoResponsable({ responsableId: 'u-9', responsable: 'Retirado' }, activos)).toBe('INACTIVO');
    expect(requiereReasignacion({ responsableId: 'u-9', responsable: 'Retirado' }, activos)).toBe(true);
  });
  it('SIN_REFERENCIA para texto libre histórico', () => {
    expect(estadoResponsable({ responsableId: null, responsable: 'Dr Carlos perez' }, activos)).toBe('SIN_REFERENCIA');
    expect(requiereReasignacion({ responsableId: null, responsable: 'Dr Carlos perez' }, activos)).toBe(true);
  });
  it('SIN_ASIGNAR sin nombre o con el texto "Sin Asignar" (también requiere reasignación)', () => {
    expect(estadoResponsable({ responsable: '' }, activos)).toBe('SIN_ASIGNAR');
    expect(estadoResponsable({ responsable: 'Sin Asignar' }, activos)).toBe('SIN_ASIGNAR');
    expect(requiereReasignacion({ responsable: 'Sin Asignar' }, activos)).toBe(true);
  });
  it('si la lista aún no cargó (null) no marca nada', () => {
    expect(requiereReasignacion({ responsableId: 'u-9', responsable: 'X' }, null)).toBe(false);
    expect(requiereReasignacion({ responsableId: null, responsable: 'Texto libre' }, null)).toBe(false);
  });
  it('lista cargada pero vacía marca todo para reasignar', () => {
    expect(requiereReasignacion({ responsableId: 'u-1', responsable: 'Ana' }, [])).toBe(true);
  });
});

describe('resolverResponsableActual', () => {
  const activos = [opcion('u-1', 'Ana Gómez'), opcion('u-2', 'Carlos Pérez'), opcion('u-3', 'Carlos Pérez')];

  it('precarga por id', () => {
    expect(resolverResponsableActual({ responsableId: 'u-1', responsable: 'cualquier cosa' }, activos)?.id).toBe('u-1');
  });
  it('con id que ya no está activo no sugiere a nadie', () => {
    expect(resolverResponsableActual({ responsableId: 'u-9', responsable: 'Ana Gómez' }, activos)).toBeNull();
  });
  it('texto libre: sugiere solo si hay una única coincidencia exacta (sin tildes/mayúsculas)', () => {
    expect(resolverResponsableActual({ responsableId: null, responsable: 'ANA GOMEZ' }, activos)?.id).toBe('u-1');
  });
  it('texto libre ambiguo o inexistente no sugiere', () => {
    expect(resolverResponsableActual({ responsableId: null, responsable: 'Carlos Pérez' }, activos)).toBeNull();
    expect(resolverResponsableActual({ responsableId: null, responsable: 'Dr Carlos perez' }, activos)).toBeNull();
    expect(resolverResponsableActual({ responsableId: null, responsable: 'Sin Asignar' }, activos)).toBeNull();
  });
});
