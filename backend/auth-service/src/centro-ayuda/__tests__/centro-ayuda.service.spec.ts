import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CentroAyudaService, nombreLegible } from '../centro-ayuda.service';
import { OnlyOfficeService } from '../onlyoffice.service';
import { GuardarRecursoDto } from '../dto/centro-ayuda.dto';

describe('CentroAyudaService', () => {
  let service: CentroAyudaService;
  let repo: any;
  let queryBuilder: any;
  let directorio: string;

  const dto = (datos: Partial<GuardarRecursoDto>): GuardarRecursoDto =>
    ({ titulo: 'Recurso', ...datos }) as GuardarRecursoDto;

  const subir = (nombre: string) => {
    const filename = `${Math.random().toString(36).slice(2)}-${nombre}`;
    writeFileSync(join(directorio, filename), 'contenido');
    return { filename, originalname: nombre, size: 9 };
  };

  beforeEach(() => {
    directorio = mkdtempSync(join(tmpdir(), 'centro-ayuda-'));
    process.env.CENTRO_AYUDA_STORAGE_PATH = directorio;

    queryBuilder = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((datos) => ({ ...datos })),
      save: jest.fn().mockImplementation((r) => Promise.resolve({ id: r.id ?? 7, ...r })),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    service = new CentroAyudaService(repo, new OnlyOfficeService());
  });

  afterEach(() => {
    rmSync(directorio, { recursive: true, force: true });
    delete process.env.CENTRO_AYUDA_STORAGE_PATH;
  });

  describe('lo que ven los usuarios', () => {
    it('solo lista los recursos activos', async () => {
      await service.listarActivos();
      expect(repo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { activo: true } }),
      );
    });

    it('si el recurso no tiene archivo responde "Contenido no disponible por el momento"', async () => {
      repo.findOne.mockResolvedValue({ id: 1, activo: true, archivoRuta: null });
      await expect(service.obtenerArchivo(1)).rejects.toThrow(
        new NotFoundException('Contenido no disponible por el momento'),
      );
    });

    it('no entrega archivos de recursos inactivos', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.obtenerArchivo(1)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1, activo: true } });
    });

    it('marca los videos para reproducirlos y los documentos para OnlyOffice', async () => {
      repo.find.mockResolvedValue([
        { id: 1, categoria: 'videos', titulo: 'Intro', archivoRuta: 'a.mp4', archivoNombre: 'intro.mp4', archivoTamano: '10', activo: true },
        { id: 2, categoria: 'documentacion', titulo: 'Guía', archivoRuta: 'b.docx', archivoNombre: 'guia.docx', archivoTamano: '20', activo: true },
      ]);
      const [video, guia] = await service.listarActivos();
      expect(video.archivo).toMatchObject({ esVideo: true, previsualizable: false, tamano: 10 });
      expect(guia.archivo).toMatchObject({ esVideo: false, previsualizable: true });
    });

    it('la configuración de OnlyOffice apunta al archivo dentro de la red interna', async () => {
      const archivo = subir('manual.pdf');
      repo.findOne.mockResolvedValue({
        id: 3, activo: true, archivoRuta: archivo.filename, archivoNombre: 'manual.pdf',
      });
      const config = await service.configOnlyOffice(3, { id: 'u1', nombre: 'Ana' });
      expect(config.document.url).toMatch(/\/centro-ayuda\/recursos\/3\/archivo$/);
      expect(config.documentType).toBe('pdf');
      expect(config.editorConfig.mode).toBe('view');
    });
  });

  describe('manual de usuario', () => {
    it('debe ser PDF', async () => {
      const archivo = subir('manual.docx');
      await expect(
        service.crear(dto({ categoria: 'manual', version: '2.1' }), archivo, 'admin'),
      ).rejects.toThrow(new BadRequestException('El manual de usuario debe ser un archivo PDF'));
    });

    it('exige la versión del sistema', async () => {
      const archivo = subir('manual.pdf');
      await expect(service.crear(dto({ categoria: 'manual' }), archivo, 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('al cargar uno activo, los demás manuales dejan de estar vigentes', async () => {
      const archivo = subir('manual.pdf');
      const creado = await service.crear(
        dto({ categoria: 'manual', version: '2.1' }),
        archivo,
        'admin',
      );
      expect(creado.version).toBe('2.1');
      expect(queryBuilder.set).toHaveBeenCalledWith({ activo: false });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('id <> :id', { id: 7 });
    });

    it('un manual inactivo no apaga al vigente', async () => {
      const archivo = subir('manual.pdf');
      await service.crear(dto({ categoria: 'manual', version: '1.0', activo: false }), archivo, 'admin');
      expect(queryBuilder.execute).not.toHaveBeenCalled();
    });
  });

  describe('reglas por categoría', () => {
    it('un video necesita archivo o enlace', async () => {
      await expect(service.crear(dto({ categoria: 'videos' }), undefined, 'admin')).rejects.toThrow(
        'Cargue el archivo del video o indique su enlace',
      );
    });

    it('un video cargado debe ser de video', async () => {
      const archivo = subir('video.pdf');
      await expect(service.crear(dto({ categoria: 'videos' }), archivo, 'admin')).rejects.toThrow(
        'El video debe ser MP4, WebM u OGG',
      );
    });

    it('un atajo necesita la combinación de teclas', async () => {
      await expect(service.crear(dto({ categoria: 'atajos' }), undefined, 'admin')).rejects.toThrow(
        'Indique la combinación de teclas del atajo',
      );
    });

    it('documentación, cursos y prácticas necesitan archivo, enlace o texto', async () => {
      await expect(service.crear(dto({ categoria: 'cursos' }), undefined, 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.crear(dto({ categoria: 'practicas', contenido: 'Guarde a menudo' }), undefined, 'admin'),
      ).resolves.toMatchObject({ categoria: 'practicas' });
    });

    it('rechaza enlaces que no son http o https', async () => {
      await expect(
        service.crear(dto({ categoria: 'cursos', enlace: 'javascript:alert(1)' }), undefined, 'admin'),
      ).rejects.toThrow('El enlace debe empezar por http:// o https://');
    });
  });

  describe('archivos en disco', () => {
    it('si la validación falla, borra el archivo recién subido', async () => {
      const archivo = subir('manual.docx');
      await expect(
        service.crear(dto({ categoria: 'manual', version: '1' }), archivo, 'admin'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(existsSync(join(directorio, archivo.filename))).toBe(false);
    });

    it('al reemplazar el archivo, borra el anterior', async () => {
      const anterior = subir('viejo.pdf');
      const nuevo = subir('nuevo.pdf');
      repo.findOne.mockResolvedValue({
        id: 4, categoria: 'manual', titulo: 'Manual', version: '1', activo: false,
        archivoRuta: anterior.filename, archivoNombre: 'viejo.pdf',
      });
      await service.actualizar(4, dto({ categoria: 'manual', version: '2', activo: false }), nuevo, 'admin');
      expect(existsSync(join(directorio, anterior.filename))).toBe(false);
      expect(existsSync(join(directorio, nuevo.filename))).toBe(true);
    });

    it('al eliminar el recurso, borra su archivo', async () => {
      const archivo = subir('guia.pdf');
      repo.findOne.mockResolvedValue({ id: 5, archivoRuta: archivo.filename });
      await service.eliminar(5);
      expect(repo.delete).toHaveBeenCalledWith(5);
      expect(existsSync(join(directorio, archivo.filename))).toBe(false);
    });

    it('no sale del directorio aunque la ruta guardada lo intente', async () => {
      repo.findOne.mockResolvedValue({
        id: 6, activo: true, archivoRuta: '../../etc/passwd', archivoNombre: 'x.pdf',
      });
      await expect(service.obtenerArchivo(6)).rejects.toThrow(
        'El archivo ya no está disponible en el servidor',
      );
    });
  });

  it('corrige los nombres con tildes que multer entrega en latin1', () => {
    const danado = Buffer.from('Guía de inicio.pdf', 'utf8').toString('latin1');
    expect(nombreLegible(danado)).toBe('Guía de inicio.pdf');
    expect(nombreLegible('Guía de inicio.pdf')).toBe('Guía de inicio.pdf');
  });
});
