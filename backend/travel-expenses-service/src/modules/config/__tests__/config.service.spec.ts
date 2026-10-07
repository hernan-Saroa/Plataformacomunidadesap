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
import { ConfigJornadaLaboralEntity } from '../../../entities/config/config-jornada-laboral.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateCampoFormularioDto } from '../../../dto/config/campo-formulario.dto';

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

  const mockJornadaRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
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
        { provide: getRepositoryToken(ConfigJornadaLaboralEntity), useValue: mockJornadaRepo },
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

  describe('DTO Transformation — opciones para SELECT', () => {
    it('debe transformar opciones como instancias OpcionCampoFormularioDto y serializar correctamente sin perder propiedades', () => {
      const raw = {
        clave: 'tipoCuenta',
        etiqueta: 'Tipo de Cuenta',
        tipoCampo: TipoCampoFormulario.SELECT,
        opciones: [
          { value: 'AHORROS', label: 'Cuenta de Ahorros' },
          { value: 'CORRIENTE', label: 'Cuenta Corriente' },
        ],
      };

      const dto = plainToInstance(CreateCampoFormularioDto, raw, {
        enableImplicitConversion: true,
      });

      expect(dto.opciones).toHaveLength(2);
      expect(dto.opciones![0].value).toBe('AHORROS');
      expect(dto.opciones![0].label).toBe('Cuenta de Ahorros');

      const jsonStr = JSON.stringify(dto.opciones);
      const parsed = JSON.parse(jsonStr);
      expect(parsed[0]).toEqual({ value: 'AHORROS', label: 'Cuenta de Ahorros' });
      expect(parsed[1]).toEqual({ value: 'CORRIENTE', label: 'Cuenta Corriente' });
    });
  });

  describe('Tipos de Documento Soporte — CRUD', () => {
    it('debe listar tipos de documento soporte activos por defecto o todos si se solicita', async () => {
      mockTipoDocRepo.find.mockResolvedValue([
        { codigo: 'RUT', nombre: 'RUT', activo: true },
      ]);

      const resActivos = await service.obtenerTodosTiposDocumentoSoporte(false);
      expect(mockTipoDocRepo.find).toHaveBeenCalledWith({
        where: { activo: true },
        order: { nombre: 'ASC' },
      });
      expect(resActivos).toHaveLength(1);

      await service.obtenerTodosTiposDocumentoSoporte(true);
      expect(mockTipoDocRepo.find).toHaveBeenCalledWith({
        where: {},
        order: { nombre: 'ASC' },
      });
    });

    it('debe crear un nuevo tipo de documento soporte con código normalizado', async () => {
      mockTipoDocRepo.findOne.mockResolvedValue(null);
      mockTipoDocRepo.create.mockImplementation((ent) => ent);
      mockTipoDocRepo.save.mockImplementation((ent) => Promise.resolve({ id: 'doc-1', ...ent }));

      const res = await service.crearTipoDocumentoSoporte({
        codigo: 'poliza_cumplimiento',
        nombre: 'Póliza de Cumplimiento',
        descripcion: 'Garantía del contrato',
        instruccionesValidacion: 'Verificar que la vigencia cubra las fechas de la comisión',
        camposAValidar: ['nombreComisionado', 'numeroDocumento'],
      });

      expect(res.codigo).toBe('POLIZA_CUMPLIMIENTO');
      expect(res.nombre).toBe('Póliza de Cumplimiento');
      expect(res.instruccionesValidacion).toBe('Verificar que la vigencia cubra las fechas de la comisión');
      expect(res.camposAValidar).toEqual(['nombreComisionado', 'numeroDocumento']);
    });

    it('debe actualizar un tipo de documento soporte existente', async () => {
      const existente = {
        id: 'doc-1',
        codigo: 'FACTURA',
        nombre: 'Factura',
        descripcion: 'Desc',
        instruccionesValidacion: 'Antigua instrucción',
        camposAValidar: [],
        activo: true,
      };
      mockTipoDocRepo.findOne.mockResolvedValue({ ...existente });
      mockTipoDocRepo.save.mockImplementation((ent) => Promise.resolve(ent));

      const actualizado = await service.actualizarTipoDocumentoSoporte('FACTURA', {
        nombre: 'Factura Electrónica Validada',
        instruccionesValidacion: 'Validar CUFE ante la DIAN',
        camposAValidar: ['entidadBancaria', 'numeroCuenta'],
      });

      expect(actualizado.nombre).toBe('Factura Electrónica Validada');
      expect(actualizado.instruccionesValidacion).toBe('Validar CUFE ante la DIAN');
      expect(actualizado.camposAValidar).toEqual(['entidadBancaria', 'numeroCuenta']);
    });

    it('debe desactivar un tipo de documento soporte al eliminar', async () => {
      const existente = {
        id: 'doc-1',
        codigo: 'CERT_BANCARIA',
        activo: true,
      };
      mockTipoDocRepo.findOne.mockResolvedValue({ ...existente });
      mockTipoDocRepo.save.mockImplementation((ent) => Promise.resolve(ent));

      await service.eliminarTipoDocumentoSoporte('CERT_BANCARIA');
      expect(mockTipoDocRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ codigo: 'CERT_BANCARIA', activo: false }),
      );
    });
  });
});

