import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '../config.service';
import {
  CampoFormularioEntity,
  TipoCampoFormulario,
  GrupoCampoFormulario,
} from '../../../entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from '../../../entities/config/config-tipo-comisionado.entity';
import { TipoDocumentoSoporteEntity } from '../../../entities/config/tipo-documento-soporte.entity';
import { ConfigTipoComisionadoDocumentoEntity } from '../../../entities/config/config-tipo-comisionado-documento.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ConfigService — Gestión de Campos Dinámicos y Parametrización', () => {
  let service: ConfigService;

  const mockCampoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockTipoDocRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockConfigDocRepo = {
    find: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: getRepositoryToken(CampoFormularioEntity), useValue: mockCampoRepo },
        { provide: getRepositoryToken(ConfigTipoComisionadoEntity), useValue: mockConfigRepo },
        { provide: getRepositoryToken(TipoDocumentoSoporteEntity), useValue: mockTipoDocRepo },
        { provide: getRepositoryToken(ConfigTipoComisionadoDocumentoEntity), useValue: mockConfigDocRepo },
      ],
    }).compile();

    service = module.get<ConfigService>(ConfigService);
  });

  describe('crearCampoFormulario', () => {
    it('debe crear un nuevo campo exitosamente', async () => {
      mockCampoRepo.findOne.mockResolvedValue(null);
      const dto = {
        clave: 'areaSolicitante',
        etiqueta: 'Área Solicitante',
        tipoCampo: TipoCampoFormulario.TEXT,
        orden: 10,
        activo: true,
      };
      const entityCreada = { id: 'uuid-1', ...dto };
      mockCampoRepo.create.mockReturnValue(entityCreada);
      mockCampoRepo.save.mockResolvedValue(entityCreada);

      const res = await service.crearCampoFormulario(dto as any);
      expect(res).toEqual(entityCreada);
      expect(mockCampoRepo.findOne).toHaveBeenCalledWith({ where: { clave: 'areaSolicitante' } });
      expect(mockCampoRepo.save).toHaveBeenCalledWith(entityCreada);
    });

    it('debe rechazar la creación si la clave ya existe', async () => {
      mockCampoRepo.findOne.mockResolvedValue({ id: 'uuid-existente', clave: 'objetoComision' });

      await expect(
        service.crearCampoFormulario({
          clave: 'objetoComision',
          etiqueta: 'Objeto',
          tipoCampo: TipoCampoFormulario.TEXT,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('actualizarCampoFormulario — Cambio de tipo y estado activo', () => {
    it('debe permitir cambiar de tipo TEXT a SELECT con opciones dinámicas', async () => {
      const campoExistente: CampoFormularioEntity = {
        id: 'uuid-1',
        clave: 'tipoVehiculo',
        etiqueta: 'Tipo de Vehículo',
        tipoCampo: TipoCampoFormulario.TEXT,
        placeholder: null,
        opciones: null,
        grupo: GrupoCampoFormulario.COMISION,
        orden: 5,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      mockCampoRepo.findOne.mockResolvedValue({ ...campoExistente });
      mockCampoRepo.save.mockImplementation((ent) => Promise.resolve(ent));

      const actualizacion = {
        tipoCampo: TipoCampoFormulario.SELECT,
        opciones: [
          { value: 'PROPIO', label: 'Vehículo Propio' },
          { value: 'OFICIAL', label: 'Vehículo Institucional ESAP' },
        ],
      };

      const resultado = await service.actualizarCampoFormulario('tipoVehiculo', actualizacion as any);

      expect(resultado.tipoCampo).toBe(TipoCampoFormulario.SELECT);
      expect(resultado.opciones).toHaveLength(2);
      expect(resultado.opciones![0].value).toBe('PROPIO');
      expect(mockCampoRepo.save).toHaveBeenCalled();
    });

    it('debe permitir desactivar un campo cambiando activo a false', async () => {
      const campoExistente: CampoFormularioEntity = {
        id: 'uuid-2',
        clave: 'rubroPresupuestal',
        etiqueta: 'Rubro Presupuestal',
        tipoCampo: TipoCampoFormulario.TEXT,
        placeholder: null,
        opciones: null,
        grupo: GrupoCampoFormulario.COMISION,
        orden: 8,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      mockCampoRepo.findOne.mockResolvedValue({ ...campoExistente });
      mockCampoRepo.save.mockImplementation((ent) => Promise.resolve(ent));

      const resultado = await service.actualizarCampoFormulario('rubroPresupuestal', {
        activo: false,
      });

      expect(resultado.activo).toBe(false);
      expect(mockCampoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ clave: 'rubroPresupuestal', activo: false }),
      );
    });

    it('debe permitir reordenar el campo cambiando su orden visual', async () => {
      const campoExistente: CampoFormularioEntity = {
        id: 'uuid-3',
        clave: 'justificacionUrgencia',
        etiqueta: 'Justificación de Urgencia',
        tipoCampo: TipoCampoFormulario.TEXTAREA,
        placeholder: null,
        opciones: null,
        grupo: GrupoCampoFormulario.COMISION,
        orden: 20,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      mockCampoRepo.findOne.mockResolvedValue({ ...campoExistente });
      mockCampoRepo.save.mockImplementation((ent) => Promise.resolve(ent));

      const resultado = await service.actualizarCampoFormulario('justificacionUrgencia', {
        orden: 2,
      });

      expect(resultado.orden).toBe(2);
    });

    it('debe lanzar NotFoundException si el campo a actualizar no existe', async () => {
      mockCampoRepo.findOne.mockResolvedValue(null);

      await expect(
        service.actualizarCampoFormulario('claveInexistente', { etiqueta: 'Nueva' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('eliminarCampoFormulario', () => {
    it('debe marcar el campo como inactivo (soft delete)', async () => {
      const campo: CampoFormularioEntity = {
        id: 'uuid-4',
        clave: 'campoAEliminar',
        etiqueta: 'Campo Obsol',
        tipoCampo: TipoCampoFormulario.TEXT,
        placeholder: null,
        opciones: null,
        grupo: null,
        orden: 99,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      mockCampoRepo.findOne.mockResolvedValue({ ...campo });
      mockCampoRepo.save.mockImplementation((ent) => Promise.resolve(ent));

      await service.eliminarCampoFormulario('campoAEliminar');

      expect(mockCampoRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ clave: 'campoAEliminar', activo: false }),
      );
    });
  });
});
