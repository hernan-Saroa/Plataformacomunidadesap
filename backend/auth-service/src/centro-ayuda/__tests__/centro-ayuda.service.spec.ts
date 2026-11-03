import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { CentroAyudaService, nombreLegible } from '../centro-ayuda.service';
import { OnlyOfficeService } from '../onlyoffice.service';
import { GuardarRecursoDto, GuardarSeccionDto } from '../dto/centro-ayuda.dto';

const SECCIONES: Record<number, any> = {
  1: { id: 1, nombre: 'Documentación completa', tipo: 'general', activo: true, orden: 1 },
  2: { id: 2, nombre: 'Video tutoriales', tipo: 'videos', activo: true, orden: 2 },
  3: { id: 3, nombre: 'Atajos de teclado', tipo: 'atajos', activo: true, orden: 3 },
  4: { id: 4, nombre: 'Manual de usuario', tipo: 'manual', activo: true, orden: 4 },
};

describe('CentroAyudaService', () => {
  let service: CentroAyudaService;
  let recursos: any;
  let secciones: any;
  let actualizacion: any;
  let busquedaDeNombre: any;
  let directorio: string;

  const dto = (datos: Partial<GuardarRecursoDto>): GuardarRecursoDto =>
    ({ idSeccion: 1, titulo: 'Recurso', ...datos }) as GuardarRecursoDto;

  const dtoSeccion = (datos: Partial<GuardarSeccionDto>): GuardarSeccionDto =>
    ({ nombre: 'Preguntas de nómina', icono: 'BookOpen', tipo: 'general', ...datos }) as GuardarSeccionDto;

  const subir = (nombre: string) => {
    const filename = `${Math.random().toString(36).slice(2)}-${nombre}`;
    writeFileSync(join(directorio, filename), 'contenido');
    return { filename, originalname: nombre, size: 9 };
  };

  beforeEach(() => {
    directorio = mkdtempSync(join(tmpdir(), 'centro-ayuda-'));
    process.env.CENTRO_AYUDA_STORAGE_PATH = directorio;

    actualizacion = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    busquedaDeNombre = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    recursos = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((datos) => ({ ...datos })),
      save: jest.fn().mockImplementation((r) => Promise.resolve({ id: r.id ?? 7, ...r })),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(actualizacion),
    };
    secciones = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockImplementation(({ where }) => Promise.resolve(SECCIONES[where.id] ?? null)),
      create: jest.fn().mockImplementation((datos) => ({ ...datos })),
      save: jest.fn().mockImplementation((s) => Promise.resolve(Array.isArray(s) ? s : { id: s.id ?? 9, ...s })),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn().mockReturnValue(busquedaDeNombre),
      manager: { query: jest.fn().mockResolvedValue([]) },
    };
    service = new CentroAyudaService(recursos, secciones, new OnlyOfficeService());
  });

  afterEach(() => {
    rmSync(directorio, { recursive: true, force: true });
    delete process.env.CENTRO_AYUDA_STORAGE_PATH;
  });

  describe('lo que ven los usuarios', () => {
    it('muestra solo las secciones visibles, en su orden, con sus recursos visibles', async () => {
      secciones.find.mockResolvedValue([SECCIONES[1], SECCIONES[2]]);
      recursos.find.mockResolvedValue([
        { id: 10, idSeccion: 2, titulo: 'Intro', activo: true },
        { id: 11, idSeccion: 1, titulo: 'Guía', activo: true },
      ]);
      const publicado = await service.listarPublicado();

      expect(secciones.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { activo: true }, order: { orden: 'ASC', nombre: 'ASC' } }),
      );
      expect(recursos.find.mock.calls[0][0].where.activo).toBe(true);
      expect(publicado.map((s) => s.nombre)).toEqual(['Documentación completa', 'Video tutoriales']);
      expect(publicado[0].recursos.map((r) => r.id)).toEqual([11]);
      expect(publicado[1].recursos.map((r) => r.id)).toEqual([10]);
    });

    it('una sección sin recursos sale vacía para mostrar "Contenido no disponible"', async () => {
      secciones.find.mockResolvedValue([SECCIONES[1]]);
      const [seccion] = await service.listarPublicado();
      expect(seccion.recursos).toEqual([]);
    });

    it('si el recurso no tiene archivo responde "Contenido no disponible por el momento"', async () => {
      recursos.findOne.mockResolvedValue({ id: 1, activo: true, archivoRuta: null, seccion: SECCIONES[1] });
      await expect(service.obtenerArchivo(1)).rejects.toThrow(
        new NotFoundException('Contenido no disponible por el momento'),
      );
    });

    it('no entrega archivos de una sección oculta ni de una que está en la papelera', async () => {
      const archivo = subir('guia.pdf');
      const base = { id: 1, activo: true, archivoRuta: archivo.filename, archivoNombre: 'guia.pdf' };

      recursos.findOne.mockResolvedValue({ ...base, seccion: { ...SECCIONES[1], activo: false } });
      await expect(service.obtenerArchivo(1)).rejects.toBeInstanceOf(NotFoundException);

      recursos.findOne.mockResolvedValue({ ...base, seccion: { ...SECCIONES[1], eliminadoEn: new Date() } });
      await expect(service.obtenerArchivo(1)).rejects.toBeInstanceOf(NotFoundException);

      recursos.findOne.mockResolvedValue({ ...base, seccion: SECCIONES[1] });
      await expect(service.obtenerArchivo(1)).resolves.toMatchObject({ nombre: 'guia.pdf' });
      expect(recursos.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, activo: true } }),
      );
    });

    it('marca los videos para reproducirlos y los documentos para OnlyOffice', async () => {
      secciones.find.mockResolvedValue([SECCIONES[1]]);
      recursos.find.mockResolvedValue([
        { id: 1, idSeccion: 1, titulo: 'Intro', archivoRuta: 'a.mp4', archivoNombre: 'intro.mp4', archivoTamano: '10', activo: true },
        { id: 2, idSeccion: 1, titulo: 'Guía', archivoRuta: 'b.docx', archivoNombre: 'guia.docx', archivoTamano: '20', activo: true },
      ]);
      const [{ recursos: [video, guia] }] = await service.listarPublicado();
      expect(video.archivo).toMatchObject({ esVideo: true, previsualizable: false, tamano: 10 });
      expect(guia.archivo).toMatchObject({ esVideo: false, previsualizable: true });
    });

    it('la configuración de OnlyOffice apunta al archivo dentro de la red interna', async () => {
      const archivo = subir('manual.pdf');
      recursos.findOne.mockResolvedValue({
        id: 3, activo: true, archivoRuta: archivo.filename, archivoNombre: 'manual.pdf', seccion: SECCIONES[4],
      });
      const config = await service.configOnlyOffice(3, { id: 'u1', nombre: 'Ana' });
      expect(config.document.url).toMatch(/\/centro-ayuda\/recursos\/3\/archivo$/);
      expect(config.documentType).toBe('pdf');
      expect(config.editorConfig.mode).toBe('view');
      // la descarga la da la ventana del visor; OnlyOffice no debe repetir el botón
      expect(config.document.permissions.download).toBe(false);
    });
  });

  describe('permisos de la administración', () => {
    it('responde qué acciones habilitan los permisos de los roles', async () => {
      secciones.manager.query.mockResolvedValue([
        { code: 'centro-ayuda.administracion.ver' },
        { code: 'centro-ayuda.recursos.crear' },
      ]);
      const permisos = await service.permisosDe(['editor_ayuda']);
      expect(permisos).toEqual({
        ver: true,
        crearSecciones: false,
        editarSecciones: false,
        eliminarSecciones: false,
        crearRecursos: true,
        editarRecursos: false,
        eliminarRecursos: false,
      });
      expect(secciones.manager.query.mock.calls[0][1][0]).toEqual(['EDITOR_AYUDA']);
    });

    it('sin roles no tiene ninguna acción', async () => {
      const permisos = await service.permisosDe([]);
      expect(Object.values(permisos).every((p) => p === false)).toBe(true);
      expect(secciones.manager.query).not.toHaveBeenCalled();
    });
  });

  describe('secciones', () => {
    it('una sección nueva queda al final', async () => {
      secciones.find.mockResolvedValue([{ ...SECCIONES[4] }]);
      const creada = await service.crearSeccion(dtoSeccion({}), 'admin');
      expect(creada).toMatchObject({ nombre: 'Preguntas de nómina', tipo: 'general', orden: 5, activo: true });
    });

    it('no admite dos secciones con el mismo nombre', async () => {
      busquedaDeNombre.getOne.mockResolvedValue({ id: 1, nombre: 'Documentación completa' });
      await expect(service.crearSeccion(dtoSeccion({ nombre: 'documentación completa' }), 'admin')).rejects.toThrow(
        new ConflictException('Ya existe una sección llamada «Documentación completa»'),
      );
    });

    it('al editar, su propio nombre no cuenta como repetido', async () => {
      await service.actualizarSeccion(1, dtoSeccion({ nombre: 'Documentación completa' }), 'admin');
      expect(busquedaDeNombre.andWhere).toHaveBeenCalledWith('s.id <> :excepto', { excepto: 1 });
    });

    it('no cambia el tipo de una sección que ya tiene recursos', async () => {
      recursos.count.mockResolvedValue(2);
      await expect(
        service.actualizarSeccion(2, dtoSeccion({ nombre: 'Video tutoriales', tipo: 'general' }), 'admin'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('guarda el orden que se elige', async () => {
      secciones.find.mockResolvedValueOnce([{ ...SECCIONES[1] }, { ...SECCIONES[2] }]);
      await service.ordenarSecciones([2, 1], 'admin');
      const guardadas = secciones.save.mock.calls[0][0];
      expect(guardadas.find((s: any) => s.id === 2).orden).toBe(1);
      expect(guardadas.find((s: any) => s.id === 1).orden).toBe(2);
    });

    it('no envía a la papelera una sección que todavía tiene recursos', async () => {
      recursos.count.mockResolvedValue(3);
      await expect(service.eliminarSeccion(1, 'admin')).rejects.toThrow(
        new ConflictException('La sección tiene 3 recursos. Muévalos a otra sección o elimínelos primero.'),
      );
      expect(secciones.softDelete).not.toHaveBeenCalled();
    });

    it('eliminar una sección vacía es un borrado suave que registra quién lo hizo', async () => {
      await service.eliminarSeccion(1, 'admin');
      expect(secciones.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1, eliminadoPor: 'admin' }));
      expect(secciones.softDelete).toHaveBeenCalledWith(1);
    });

    it('al restaurarla vuelve oculta', async () => {
      secciones.findOne.mockResolvedValue({ ...SECCIONES[1], activo: true, eliminadoEn: new Date() });
      const restaurada = await service.restaurarSeccion(1, 'admin');
      expect(secciones.restore).toHaveBeenCalledWith(1);
      expect(restaurada.activo).toBe(false);
    });
  });

  describe('recursos', () => {
    it('no se carga en una sección que no existe y borra el archivo subido', async () => {
      const archivo = subir('guia.pdf');
      await expect(service.crearRecurso(dto({ idSeccion: 99 }), archivo, 'admin')).rejects.toThrow(
        new BadRequestException('La sección elegida no existe'),
      );
      expect(existsSync(join(directorio, archivo.filename))).toBe(false);
    });

    it('eliminar es un borrado suave y conserva el archivo para poder restaurarlo', async () => {
      const archivo = subir('guia.pdf');
      recursos.findOne.mockResolvedValue({ id: 5, idSeccion: 1, archivoRuta: archivo.filename });
      await service.eliminarRecurso(5, 'admin');
      expect(recursos.save).toHaveBeenCalledWith(expect.objectContaining({ id: 5, eliminadoPor: 'admin' }));
      expect(recursos.softDelete).toHaveBeenCalledWith(5);
      expect(existsSync(join(directorio, archivo.filename))).toBe(true);
    });

    it('no se restaura si su sección sigue en la papelera', async () => {
      recursos.findOne.mockResolvedValue({ id: 5, idSeccion: 1, eliminadoEn: new Date() });
      secciones.findOne.mockResolvedValue({ ...SECCIONES[1], eliminadoEn: new Date() });
      await expect(service.restaurarRecurso(5, 'admin')).rejects.toThrow(
        new ConflictException('Restaure primero la sección «Documentación completa»'),
      );
      expect(recursos.restore).not.toHaveBeenCalled();
    });

    it('al restaurarlo vuelve oculto', async () => {
      recursos.findOne.mockResolvedValue({ id: 5, idSeccion: 1, activo: true, eliminadoEn: new Date() });
      const restaurado = await service.restaurarRecurso(5, 'admin');
      expect(recursos.restore).toHaveBeenCalledWith(5);
      expect(restaurado.activo).toBe(false);
    });
  });

  describe('ocultar y mostrar', () => {
    it('oculta un recurso sin tocar su contenido', async () => {
      recursos.findOne.mockResolvedValue({ id: 5, idSeccion: 1, titulo: 'Guía', contenido: 'Texto', activo: true });
      const oculto = await service.cambiarVisibilidadRecurso(5, false, 'admin');
      expect(oculto).toMatchObject({ activo: false, contenido: 'Texto', actualizadoPor: 'admin' });
    });

    it('mostrar un manual lo deja como el único vigente de su sección', async () => {
      recursos.findOne.mockResolvedValue({ id: 6, idSeccion: 4, titulo: 'Manual', activo: false });
      await service.cambiarVisibilidadRecurso(6, true, 'admin');
      expect(actualizacion.where).toHaveBeenCalledWith('id_seccion = :idSeccion', { idSeccion: 4 });
    });

    it('oculta una sección', async () => {
      const oculta = await service.cambiarVisibilidadSeccion(2, false, 'admin');
      expect(oculta.activo).toBe(false);
    });
  });

  describe('manual de usuario', () => {
    it('debe ser PDF', async () => {
      const archivo = subir('manual.docx');
      await expect(
        service.crearRecurso(dto({ idSeccion: 4, version: '2.1' }), archivo, 'admin'),
      ).rejects.toThrow(new BadRequestException('El manual de usuario debe ser un archivo PDF'));
    });

    it('exige la versión del sistema', async () => {
      const archivo = subir('manual.pdf');
      await expect(service.crearRecurso(dto({ idSeccion: 4 }), archivo, 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('al publicar uno, los demás manuales de su sección dejan de estar vigentes', async () => {
      const archivo = subir('manual.pdf');
      const creado = await service.crearRecurso(dto({ idSeccion: 4, version: '2.1' }), archivo, 'admin');
      expect(creado.version).toBe('2.1');
      expect(actualizacion.set).toHaveBeenCalledWith({ activo: false });
      expect(actualizacion.where).toHaveBeenCalledWith('id_seccion = :idSeccion', { idSeccion: 4 });
      expect(actualizacion.andWhere).toHaveBeenCalledWith('id <> :id', { id: 7 });
    });

    it('un manual oculto no apaga al vigente', async () => {
      const archivo = subir('manual.pdf');
      await service.crearRecurso(dto({ idSeccion: 4, version: '1.0', activo: false }), archivo, 'admin');
      expect(actualizacion.execute).not.toHaveBeenCalled();
    });
  });

  describe('reglas por tipo de sección', () => {
    it('un video necesita archivo o enlace', async () => {
      await expect(service.crearRecurso(dto({ idSeccion: 2 }), undefined, 'admin')).rejects.toThrow(
        'Cargue el archivo del video o indique su enlace',
      );
    });

    it('un video cargado debe ser de video', async () => {
      const archivo = subir('video.pdf');
      await expect(service.crearRecurso(dto({ idSeccion: 2 }), archivo, 'admin')).rejects.toThrow(
        'El video debe ser MP4, WebM u OGG',
      );
    });

    it('un atajo necesita la combinación de teclas', async () => {
      await expect(service.crearRecurso(dto({ idSeccion: 3 }), undefined, 'admin')).rejects.toThrow(
        'Indique la combinación de teclas del atajo',
      );
    });

    it('una sección general necesita archivo, enlace o texto', async () => {
      await expect(service.crearRecurso(dto({ idSeccion: 1 }), undefined, 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.crearRecurso(dto({ idSeccion: 1, contenido: 'Guarde a menudo' }), undefined, 'admin'),
      ).resolves.toMatchObject({ idSeccion: 1 });
    });

    it('al moverlo a otra sección se valida con las reglas de la nueva', async () => {
      recursos.findOne.mockResolvedValue({ id: 8, idSeccion: 1, titulo: 'Guía', contenido: 'Texto', activo: true });
      await expect(
        service.actualizarRecurso(8, dto({ idSeccion: 2, contenido: 'Texto' }), undefined, 'admin'),
      ).rejects.toThrow('Cargue el archivo del video o indique su enlace');
    });

    it('rechaza enlaces que no son http o https', async () => {
      await expect(
        service.crearRecurso(dto({ idSeccion: 1, enlace: 'javascript:alert(1)' }), undefined, 'admin'),
      ).rejects.toThrow('El enlace debe empezar por http:// o https://');
    });
  });

  describe('archivos en disco', () => {
    it('si la validación falla, borra el archivo recién subido', async () => {
      const archivo = subir('manual.docx');
      await expect(
        service.crearRecurso(dto({ idSeccion: 4, version: '1' }), archivo, 'admin'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(existsSync(join(directorio, archivo.filename))).toBe(false);
    });

    it('al reemplazar el archivo, borra el anterior', async () => {
      const anterior = subir('viejo.pdf');
      const nuevo = subir('nuevo.pdf');
      recursos.findOne.mockResolvedValue({
        id: 4, idSeccion: 4, titulo: 'Manual', version: '1', activo: false,
        archivoRuta: anterior.filename, archivoNombre: 'viejo.pdf',
      });
      await service.actualizarRecurso(4, dto({ idSeccion: 4, version: '2', activo: false }), nuevo, 'admin');
      expect(existsSync(join(directorio, anterior.filename))).toBe(false);
      expect(existsSync(join(directorio, nuevo.filename))).toBe(true);
    });

    it('no sale del directorio aunque la ruta guardada lo intente', async () => {
      recursos.findOne.mockResolvedValue({
        id: 6, activo: true, archivoRuta: '../../etc/passwd', archivoNombre: 'x.pdf', seccion: SECCIONES[1],
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
