import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '../config.service';
import { ConfigJornadaLaboralEntity } from '../../../entities/config/config-jornada-laboral.entity';
import { CampoFormularioEntity } from '../../../entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from '../../../entities/config/config-tipo-comisionado.entity';
import { TipoDocumentoSoporteEntity } from '../../../entities/config/tipo-documento-soporte.entity';
import { ConfigTipoComisionadoDocumentoEntity } from '../../../entities/config/config-tipo-comisionado-documento.entity';
import { NotificationClientService } from '../../../common/notification-client.service';
import {
  esRadicacionFueraDeJornada,
  fechaEfectivaRadicacion,
  contarDiasHabiles,
  esDiaHabil,
} from '../../../common/dias-habiles.util';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('ConfigService — Jornada Laboral y Días Hábiles', () => {
  let service: ConfigService;
  let jornadaRepo: any;

  const mockJornadaActiva: Partial<ConfigJornadaLaboralEntity> = {
    id: 1,
    codigo: 'DEFAULT',
    nombre: 'Jornada Laboral Institucional',
    horaInicio: '08:00',
    horaFin: '16:30',
    diasLaborales: [1, 2, 3, 4, 5],
    diasAnticipacionMinima: 14,
    diasUmbralAvance: 5,
    activo: true,
    descripcion: 'Jornada estándar',
  };

  beforeEach(async () => {
    jornadaRepo = {
      find: jest.fn().mockResolvedValue([mockJornadaActiva]),
      findOne: jest.fn().mockResolvedValue(mockJornadaActiva),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 2 })),
      save: jest.fn().mockImplementation(async (entity) => ({ ...entity, id: entity.id || 2 })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: getRepositoryToken(ConfigJornadaLaboralEntity),
          useValue: jornadaRepo,
        },
        {
          provide: getRepositoryToken(CampoFormularioEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(ConfigTipoComisionadoEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(TipoDocumentoSoporteEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(ConfigTipoComisionadoDocumentoEntity),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: NotificationClientService,
          useValue: { notifyTravelExpensesConfigChange: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  it('debe obtener la lista de jornadas configuradas', async () => {
    const list = await service.obtenerConfiguracionesJornada();
    expect(list).toHaveLength(1);
    expect(jornadaRepo.find).toHaveBeenCalled();
  });

  it('debe obtener la jornada activa actual', async () => {
    const activa = await service.obtenerJornadaLaboralActiva();
    expect(activa.codigo).toBe('DEFAULT');
    expect(activa.horaFin).toBe('16:30');
    expect(activa.diasAnticipacionMinima).toBe(14);
  });

  it('debe retornar fallback seguro si no existe jornada en BD', async () => {
    jornadaRepo.findOne.mockResolvedValueOnce(null);
    const activa = await service.obtenerJornadaLaboralActiva();
    expect(activa.codigo).toBe('DEFAULT');
    expect(activa.diasLaborales).toEqual([1, 2, 3, 4, 5]);
  });

  it('debe crear una nueva jornada y desactivar las demás si activo=true', async () => {
    jornadaRepo.findOne.mockResolvedValueOnce(null); // No existe previo con mismo código
    const nueva = await service.crearJornada(
      {
        codigo: 'JORNADA_ESPECIAL',
        nombre: 'Jornada Continua 17h',
        horaInicio: '07:30',
        horaFin: '17:00',
        diasLaborales: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
        diasAnticipacionMinima: 10,
        diasUmbralAvance: 3,
        activo: true,
      },
      'admin-test',
    );

    expect(jornadaRepo.update).toHaveBeenCalledWith({}, { activo: false });
    expect(nueva.codigo).toBe('JORNADA_ESPECIAL');
  });

  it('debe rechazar creación si ya existe el código', async () => {
    jornadaRepo.findOne.mockResolvedValueOnce(mockJornadaActiva);
    await expect(
      service.crearJornada({
        codigo: 'DEFAULT',
        nombre: 'Duplicado',
        horaInicio: '08:00',
        horaFin: '16:30',
        diasLaborales: [1, 2, 3, 4, 5],
        diasAnticipacionMinima: 14,
        diasUmbralAvance: 5,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('debe actualizar una jornada existente', async () => {
    jornadaRepo.findOne.mockResolvedValueOnce({ ...mockJornadaActiva, id: 1 });
    const actualizada = await service.actualizarJornada(1, {
      horaFin: '17:00',
      diasAnticipacionMinima: 12,
    });

    expect(actualizada.horaFin).toBe('17:00');
    expect(actualizada.diasAnticipacionMinima).toBe(12);
  });

  it('debe impedir eliminar la jornada activa', async () => {
    jornadaRepo.findOne.mockResolvedValueOnce({ ...mockJornadaActiva, id: 1, activo: true });
    await expect(service.eliminarJornada(1)).rejects.toThrow(BadRequestException);
  });

  it('debe permitir eliminar una jornada inactiva', async () => {
    jornadaRepo.findOne.mockResolvedValueOnce({ ...mockJornadaActiva, id: 2, activo: false });
    const res = await service.eliminarJornada(2);
    expect(res.success).toBe(true);
    expect(jornadaRepo.delete).toHaveBeenCalledWith(2);
  });
});

describe('Utilidades de Días Hábiles con Jornada Paramétrica', () => {
  it('aplica hora de corte configurable para radicación fuera de jornada', () => {
    // Viernes 2026-09-04 a las 16:45 hora Colombia (UTC 21:45)
    const fecha = new Date('2026-09-04T21:45:00.000Z');

    // Con corte por defecto (16:30): 16:45 está FUERA de jornada
    expect(esRadicacionFueraDeJornada(fecha)).toBe(true);

    // Con corte parametrizado a las 17:00: 16:45 está DENTRO de jornada
    expect(
      esRadicacionFueraDeJornada(fecha, new Set(), {
        horaInicio: '08:00',
        horaFin: '17:00',
        diasLaborales: [1, 2, 3, 4, 5],
      }),
    ).toBe(false);
  });

  it('aplica días laborales configurables (ej. Sábado laboral)', () => {
    // Sábado 2026-09-05
    const sabado = new Date('2026-09-05T15:00:00.000Z');

    // Por defecto Lunes a Viernes: Sábado no es hábil
    expect(esDiaHabil(sabado)).toBe(false);

    // Si la configuración incluye el Sábado (6)
    expect(esDiaHabil(sabado, new Set(), [1, 2, 3, 4, 5, 6])).toBe(true);
  });

  it('calcula fecha efectiva de radicación saltando al siguiente día laboral según parámetros', () => {
    // Viernes a las 17:00 (fuera de jornada si corte es 16:30)
    const viernesTarde = new Date('2026-09-04T22:00:00.000Z');

    // Si sábado NO es laboral: salta al Lunes 2026-09-07
    const efectNormal = fechaEfectivaRadicacion(viernesTarde, new Set(), {
      horaFin: '16:30',
      diasLaborales: [1, 2, 3, 4, 5],
    });
    expect(efectNormal).toBe('2026-09-07');

    // Si sábado SÍ es laboral: salta al Sábado 2026-09-05
    const efectConSabado = fechaEfectivaRadicacion(viernesTarde, new Set(), {
      horaFin: '16:30',
      diasLaborales: [1, 2, 3, 4, 5, 6],
    });
    expect(efectConSabado).toBe('2026-09-05');
  });

  it('cuenta días hábiles considerando los días laborales configurados', () => {
    // Del Viernes 2026-09-04 al Lunes 2026-09-07 en rango completo
    // Normal (Lun-Vie): Viernes y Lunes = 2 días
    const normales = contarDiasHabiles(
      '2026-09-04',
      '2026-09-07',
      new Set(),
      'rango_completo',
      [1, 2, 3, 4, 5],
    );
    expect(normales).toBe(2);

    // Con Sábado laboral: Viernes, Sábado y Lunes = 3 días
    const conSabados = contarDiasHabiles(
      '2026-09-04',
      '2026-09-07',
      new Set(),
      'rango_completo',
      [1, 2, 3, 4, 5, 6],
    );
    expect(conSabados).toBe(3);
  });
});
