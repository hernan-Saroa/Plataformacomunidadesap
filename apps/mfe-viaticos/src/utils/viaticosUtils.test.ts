import { describe, it, expect } from 'vitest';
import {
  calcularDiasComision,
  formatearDiasComision,
  sincronizarItinerarioFormulario,
  construirRutaGeneral,
  validarSecuenciaItinerario,
} from './viaticosUtils';
import { RutaItinerario } from '../types/viaticos';

describe('calcularDiasComision', () => {
  it('debe retornar 0.5 si es el mismo día (sin pernocta según formato GF-FO-023)', () => {
    expect(calcularDiasComision('2026-10-01', '2026-10-01')).toBe(0.5);
  });

  it('debe retornar 1.5 si es del 01-10 al 02-10 (1 noche + medio día retorno)', () => {
    expect(calcularDiasComision('2026-10-01', '2026-10-02')).toBe(1.5);
  });

  it('debe retornar 2.5 si es del 01-10 al 03-10 (2 noches + medio día retorno)', () => {
    expect(calcularDiasComision('2026-10-01', '2026-10-03')).toBe(2.5);
  });

  it('debe retornar 0 si faltan fechas o son inválidas', () => {
    expect(calcularDiasComision('', '2026-10-02')).toBe(0);
    expect(calcularDiasComision('invalida', '2026-10-02')).toBe(0);
  });
});

describe('formatearDiasComision', () => {
  it('formatea 1.5 como "1 día y medio"', () => {
    expect(formatearDiasComision(1.5)).toBe('1 día y medio');
  });

  it('formatea 2.5 como "2 días y medio"', () => {
    expect(formatearDiasComision(2.5)).toBe('2 días y medio');
  });

  it('formatea 0.5 como "Medio día"', () => {
    expect(formatearDiasComision(0.5)).toBe('Medio día');
  });

  it('formatea 1 como "1 día"', () => {
    expect(formatearDiasComision(1)).toBe('1 día');
  });

  it('formatea números enteros como "X días"', () => {
    expect(formatearDiasComision(3)).toBe('3 días');
    expect(formatearDiasComision(5)).toBe('5 días');
  });
});

describe('sincronizarItinerarioFormulario', () => {
  it('toma fechaInicio del primer tramo y fechaFin del último tramo', () => {
    const itinerario: RutaItinerario[] = [
      {
        id: 'r-1',
        origenCiudad: 'Bogotá D.C.',
        origenDepartamento: 'Bogotá D.C.',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-09-23',
        fechaLlegada: '2026-09-24',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '08:00',
      },
      {
        id: 'r-2',
        origenCiudad: 'Medellín',
        origenDepartamento: 'Antioquia',
        destinoCiudad: 'Cali',
        destinoDepartamento: 'Valle del Cauca',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-09-24',
        fechaLlegada: '2026-09-26',
        diasRuta: 2.5,
        horarioEstimadoMilitar: '14:30',
      },
    ];

    const sync = sincronizarItinerarioFormulario(itinerario);
    expect(sync.fechaInicio).toBe('2026-09-23');
    expect(sync.fechaFin).toBe('2026-09-26');
    expect(sync.origenCiudad).toBe('Bogotá D.C.');
    expect(sync.destinoCiudad).toBe('Cali');
    expect(sync.rutaGeneral).toBe('Bogotá D.C. → Medellín → Cali');
    expect(sync.horaEstimadaGeneral).toBe('08:00 h → 14:30 h');
  });

  it('calcula horaEstimadaGeneral para un único tramo', () => {
    const itinerario: RutaItinerario[] = [
      {
        id: 'r-1',
        origenCiudad: 'Bogotá D.C.',
        destinoCiudad: 'Cartagena',
        destinoDepartamento: 'Bolívar',
        tipoTrayecto: 'IDA_Y_VUELTA',
        fechaSalida: '2026-10-01',
        fechaLlegada: '2026-10-03',
        diasRuta: 2.5,
        horarioEstimadoMilitar: '06:45',
      },
    ];
    const sync = sincronizarItinerarioFormulario(itinerario);
    expect(sync.horaEstimadaGeneral).toBe('06:45 h');
    expect(sync.rutaGeneral).toBe('Bogotá D.C. → Cartagena');
  });
});

describe('validarSecuenciaItinerario', () => {
  it('valida correctamente tramos en orden cronológico', () => {
    const itinerario: RutaItinerario[] = [
      {
        id: '1',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-09-23',
        fechaLlegada: '2026-09-24',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '08:00',
      },
      {
        id: '2',
        origenCiudad: 'Medellín',
        destinoCiudad: 'Cali',
        destinoDepartamento: 'Valle del Cauca',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-09-24',
        fechaLlegada: '2026-09-25',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '14:00',
      },
    ];
    expect(validarSecuenciaItinerario(itinerario).valida).toBe(true);
  });

  it('rechaza si la fecha de inicio del tramo siguiente es inferior a la del tramo anterior', () => {
    const itinerario: RutaItinerario[] = [
      {
        id: '1',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-09-23',
        fechaLlegada: '2026-09-24',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '08:00',
      },
      {
        id: '2',
        origenCiudad: 'Medellín',
        destinoCiudad: 'Cali',
        destinoDepartamento: 'Valle del Cauca',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-09-22', // Inferior a la anterior
        fechaLlegada: '2026-09-25',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '14:00',
      },
    ];
    const res = validarSecuenciaItinerario(itinerario);
    expect(res.valida).toBe(false);
    expect(res.error).toContain('no puede ser inferior');
  });

  it('permite mismo día pero valida que la hora de la siguiente ruta no sea anterior', () => {
    const itinerario: RutaItinerario[] = [
      {
        id: '1',
        origenCiudad: 'Bogotá',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-09-23',
        fechaLlegada: '2026-09-23',
        diasRuta: 0.5,
        horarioEstimadoMilitar: '10:00',
      },
      {
        id: '2',
        origenCiudad: 'Medellín',
        destinoCiudad: 'Cali',
        destinoDepartamento: 'Valle del Cauca',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-09-23',
        fechaLlegada: '2026-09-23',
        diasRuta: 0.5,
        horarioEstimadoMilitar: '08:00', // Anterior al tramo de las 10:00 del mismo día
      },
    ];
    const res = validarSecuenciaItinerario(itinerario);
    expect(res.valida).toBe(false);
    expect(res.error).toContain('hora estimada');
  });
});

describe('ciudadesDeDepartamento', () => {
  it('encuentra ciudades con casing exacto, mayúsculas y sin acentos', async () => {
    const { ciudadesDeDepartamento } = await import('./viaticosUtils');
    expect(ciudadesDeDepartamento('Antioquia')).toContain('Medellín');
    expect(ciudadesDeDepartamento('ANTIOQUIA')).toContain('Medellín');
    expect(ciudadesDeDepartamento('antioquia')).toContain('Medellín');
    expect(ciudadesDeDepartamento('Bogota D.C.')).toContain('Bogotá D.C.');
    expect(ciudadesDeDepartamento('BOGOTÁ D.C.')).toContain('Bogotá D.C.');
    expect(ciudadesDeDepartamento('Valle del Cauca')).toContain('Cali');
    expect(ciudadesDeDepartamento('VALLE DEL CAUCA')).toContain('Cali');
    expect(ciudadesDeDepartamento('Atlantico')).toContain('Barranquilla');
  });
});

describe('Soporte de campo CDP en formulario de viáticos', () => {
  it('formInicialNuevaSolicitud incluye numeroCdp y fechaCdp vacíos por defecto', async () => {
    const { formInicialNuevaSolicitud } = await import('./viaticosUtils');
    const form = formInicialNuevaSolicitud();
    expect(form.numeroCdp).toBe('');
    expect(form.fechaCdp).toBe('');
  });

  it('mapearARequestCreacion incluye numeroCdp y fechaCdp saneados', async () => {
    const { formInicialNuevaSolicitud, mapearARequestCreacion } = await import('./viaticosUtils');
    const form = formInicialNuevaSolicitud();
    form.numeroCdp = ' CDP-2026-0042 ';
    form.fechaCdp = ' 2026-09-24 ';
    form.destinoCiudad = 'Medellín';
    form.destinoDepartamento = 'Antioquia';
    form.objetoComision = 'Revisión presupuestal';

    const mockComisionado: any = {
      id: 'com-1',
      numeroDocumento: '12345678',
      tipoComisionado: 'FUNCIONARIO',
      autorizacionHabeasData: true,
      ipRegistroHabeasData: '127.0.0.1',
    };

    const payload = mapearARequestCreacion(form, mockComisionado, 'usr-1');
    expect(payload.numeroCdp).toBe('CDP-2026-0042');
    expect(payload.fechaCdp).toBe('2026-09-24');
  });
});

describe('calcularTarifaTerminalAereoRuta', () => {
  it('identifica tarifa oficial por departamentoId (DANE Antioquia = 5)', async () => {
    const { calcularTarifaTerminalAereoRuta } = await import('./viaticosUtils');
    const tarifa = calcularTarifaTerminalAereoRuta('Antioquia', 'Medellín', 'IDA_Y_VUELTA', undefined, 5);
    expect(tarifa.valorMaximoPorTrayecto).toBe(162634);
    expect(tarifa.factorTrayecto).toBe(2);
    expect(tarifa.totalTramo).toBe(325268);
    expect(tarifa.ciudadAeropuerto).toContain('Rionegro');
  });

  it('identifica tarifa oficial por departamentoId (DANE Atlántico = 8) solo ida', async () => {
    const { calcularTarifaTerminalAereoRuta } = await import('./viaticosUtils');
    const tarifa = calcularTarifaTerminalAereoRuta('Atlántico', 'Barranquilla', 'SOLO_IDA', undefined, 8);
    expect(tarifa.valorMaximoPorTrayecto).toBe(130704);
    expect(tarifa.factorTrayecto).toBe(1);
    expect(tarifa.totalTramo).toBe(130704);
  });

  it('identifica tarifa oficial por nombre de departamento cuando no hay id (Valle del Cauca)', async () => {
    const { calcularTarifaTerminalAereoRuta } = await import('./viaticosUtils');
    const tarifa = calcularTarifaTerminalAereoRuta('Valle del Cauca', 'Cali', 'SOLO_IDA');
    expect(tarifa.valorMaximoPorTrayecto).toBe(186581);
    expect(tarifa.ciudadAeropuerto).toContain('Palmira');
  });

  it('retorna tarifa de Otros (50.689) para departamentos no listados explícitamente', async () => {
    const { calcularTarifaTerminalAereoRuta } = await import('./viaticosUtils');
    const tarifa = calcularTarifaTerminalAereoRuta('Cundinamarca', 'Girardot', 'IDA_Y_VUELTA', undefined, 25);
    expect(tarifa.valorMaximoPorTrayecto).toBe(50689);
    expect(tarifa.totalTramo).toBe(101378);
  });
});

describe('sincronizarItinerarioFormulario con transporte aéreo', () => {
  it('acumula automáticamente las tarifas de terminales aéreos en el itinerario', async () => {
    const { sincronizarItinerarioFormulario } = await import('./viaticosUtils');
    const itinerario: RutaItinerario[] = [
      {
        id: 'r-1',
        origenCiudad: 'Bogotá D.C.',
        origenDepartamento: 'Bogotá D.C.',
        destinoCiudad: 'Medellín',
        destinoDepartamento: 'Antioquia',
        destinoDepartamentoId: 5,
        tipoTransporte: 'AEREO',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-10-01',
        fechaLlegada: '2026-10-02',
        diasRuta: 1.5,
        horarioEstimadoMilitar: '08:00',
      },
      {
        id: 'r-2',
        origenCiudad: 'Medellín',
        origenDepartamento: 'Antioquia',
        destinoCiudad: 'Barranquilla',
        destinoDepartamento: 'Atlántico',
        destinoDepartamentoId: 8,
        tipoTransporte: 'AEREO',
        tipoTrayecto: 'IDA_Y_VUELTA',
        fechaSalida: '2026-10-02',
        fechaLlegada: '2026-10-04',
        diasRuta: 2.5,
        horarioEstimadoMilitar: '10:00',
      },
      {
        id: 'r-3',
        origenCiudad: 'Barranquilla',
        origenDepartamento: 'Atlántico',
        destinoCiudad: 'Santa Marta',
        destinoDepartamento: 'Magdalena',
        tipoTransporte: 'TERRESTRE',
        tipoTrayecto: 'SOLO_IDA',
        fechaSalida: '2026-10-04',
        fechaLlegada: '2026-10-05',
        diasRuta: 1,
        horarioEstimadoMilitar: '14:00',
      },
    ];

    const sync = sincronizarItinerarioFormulario(itinerario);
    expect(sync.tieneTransporteAereo).toBe(true);
    // r-1: Antioquia solo ida = 162634
    // r-2: Atlántico ida y vuelta = 130704 * 2 = 261408
    // r-3: Terrestre = 0
    // Total = 162634 + 261408 = 424042
    expect(sync.transporteTerminalesAereos).toBe(424042);
  });
});

