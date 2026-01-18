import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentoPlanMejoramiento } from './entities/documento-plan.entity';
import { PlanMejoramiento } from './entities/plan-mejoramiento.entity';
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
}
