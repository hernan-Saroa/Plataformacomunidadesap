import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentoPlanMejoramiento } from './entities/documento-plan.entity';
import { PlanMejoramiento } from './entities/plan-mejoramiento.entity';
import { AccionCorrectiva } from './entities/accion-correctiva.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Tipo para el archivo subido
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Injectable()
export class DocumentosPlanService {
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads/evidencias/planes';

  constructor(
    @InjectRepository(DocumentoPlanMejoramiento)
    private readonly documentoRepository: Repository<DocumentoPlanMejoramiento>,
    @InjectRepository(PlanMejoramiento)
    private readonly planRepository: Repository<PlanMejoramiento>,
    @InjectRepository(AccionCorrectiva)
    private readonly accionRepository: Repository<AccionCorrectiva>,
  ) {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Crea un nuevo documento para un plan de mejoramiento
   */
  async create(
    file: MulterFile,
    planId: string,
    nombre: string,
    descripcion?: string,
    tipoDocumento: string = 'documento_plan',
    subidoPor: string = 'system',
    subidoPorId?: number,
  ): Promise<DocumentoPlanMejoramiento> {
    // Verificar que el plan existe
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan de mejoramiento con ID ${planId} no encontrado`);
    }

    // Generar ruta del archivo
    const rutaArchivo = this.generarRutaArchivo(file.originalname, planId);

    // Mover archivo a la ruta final
    const dir = path.dirname(rutaArchivo);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(file.path, rutaArchivo);

    // Crear entidad
    const documento = this.documentoRepository.create({
      planMejoramientoId: planId,
      nombre: nombre || file.originalname,
      descripcion,
      tipoDocumento,
      rutaArchivo,
      nombreArchivoOriginal: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      subidoPor,
      subidoPorId,
    });

    return await this.documentoRepository.save(documento);
  }

  /**
   * Crea un documento para una acción correctiva específica
   */
  async createParaAccion(
    file: MulterFile,
    planId: string,
    accionId: string,
    nombre: string,
    descripcion?: string,
    tipoDocumento: string = 'evidencia_accion',
    subidoPor: string = 'system',
    subidoPorId?: number,
  ): Promise<DocumentoPlanMejoramiento> {
    // Verificar que el plan existe
    const plan = await this.planRepository.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan de mejoramiento con ID ${planId} no encontrado`);
    }

    // Verificar que la acción existe y pertenece al plan
    const accion = await this.accionRepository.findOne({ 
      where: { id: accionId, planId } 
    });
    if (!accion) {
      throw new NotFoundException(`Acción correctiva con ID ${accionId} no encontrada en el plan ${planId}`);
    }

    // Generar ruta del archivo
    const rutaArchivo = this.generarRutaArchivoAccion(file.originalname, planId, accionId);

    // Mover archivo a la ruta final
    const dir = path.dirname(rutaArchivo);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(file.path, rutaArchivo);

    // Crear entidad con asociación a la acción
    const documento = this.documentoRepository.create({
      planMejoramientoId: planId,
      accionId: accionId,
      nombre: nombre || file.originalname,
      descripcion,
      tipoDocumento,
      rutaArchivo,
      nombreArchivoOriginal: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      subidoPor,
      subidoPorId,
      estadoValidacion: 'PENDIENTE_REVISION',
      solicitaNuevaEvidencia: false,
    });

    return await this.documentoRepository.save(documento);
  }

  /**
   * Obtiene documentos de una acción correctiva específica
   */
  async findByAccion(planId: string, accionId: string): Promise<DocumentoPlanMejoramiento[]> {
    return await this.documentoRepository.find({
      where: { planMejoramientoId: planId, accionId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene todos los documentos de un plan agrupados por acción
   */
  async findByPlanAgrupados(planId: string): Promise<{
    documentosGenerales: DocumentoPlanMejoramiento[];
    documentosPorAccion: { accionId: string; documentos: DocumentoPlanMejoramiento[] }[];
  }> {
    const documentos = await this.documentoRepository.find({
      where: { planMejoramientoId: planId },
      order: { fechaSubida: 'DESC' },
    });

    const documentosGenerales = documentos.filter(d => !d.accionId);
    const documentosConAccion = documentos.filter(d => d.accionId);

    // Agrupar por acción
    const agrupados: { [key: string]: DocumentoPlanMejoramiento[] } = {};
    documentosConAccion.forEach(doc => {
      if (doc.accionId) {
        if (!agrupados[doc.accionId]) {
          agrupados[doc.accionId] = [];
        }
        agrupados[doc.accionId].push(doc);
      }
    });

    return {
      documentosGenerales,
      documentosPorAccion: Object.entries(agrupados).map(([accionId, docs]) => ({
        accionId,
        documentos: docs,
      })),
    };
  }

  /**
   * Valida un documento (auditor)
   */
  async validarDocumento(
    documentoId: string,
    estadoValidacion: 'ACEPTADA' | 'CON_OBSERVACIONES' | 'RECHAZADA',
    validadoPor: string,
    comentariosAuditor?: string,
    solicitaNuevaEvidencia: boolean = false,
  ): Promise<DocumentoPlanMejoramiento> {
    const documento = await this.findOne(documentoId);

    documento.estadoValidacion = estadoValidacion;
    documento.validadoPor = validadoPor;
    documento.comentariosAuditor = comentariosAuditor;
    documento.fechaValidacion = new Date();
    documento.solicitaNuevaEvidencia = solicitaNuevaEvidencia;

    return await this.documentoRepository.save(documento);
  }

  /**
   * Obtiene todos los documentos de un plan
   */
  async findByPlan(planId: string): Promise<DocumentoPlanMejoramiento[]> {
    return await this.documentoRepository.find({
      where: { planMejoramientoId: planId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene un documento por ID
   */
  async findOne(id: string): Promise<DocumentoPlanMejoramiento> {
    const documento = await this.documentoRepository.findOne({ where: { id } });
    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }
    return documento;
  }

  /**
   * Elimina un documento
   */
  async remove(id: string): Promise<void> {
    const documento = await this.findOne(id);

    // Eliminar archivo físico
    if (fs.existsSync(documento.rutaArchivo)) {
      fs.unlinkSync(documento.rutaArchivo);
    }

    // Eliminar registro de la base de datos
    await this.documentoRepository.remove(documento);
  }

  /**
   * Genera la ruta del archivo
   */
  private generarRutaArchivo(originalName: string, planId: string): string {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeName}_${timestamp}_${randomStr}${ext}`;
    return path.join(this.uploadPath, 'planes', planId, fileName);
  }

  /**
   * Genera la ruta del archivo para una acción específica
   */
  private generarRutaArchivoAccion(originalName: string, planId: string, accionId: string): string {
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const safeName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${safeName}_${timestamp}_${randomStr}${ext}`;
    return path.join(this.uploadPath, 'planes', planId, 'acciones', accionId, fileName);
  }
}
