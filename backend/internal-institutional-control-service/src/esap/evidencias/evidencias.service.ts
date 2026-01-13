import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvidenciaDocumento, EstadoValidacion } from './entities/evidencia-documento.entity';
import { CreateEvidenciaDto } from './dto/create-evidencia.dto';
import { ValidarEvidenciaDto } from './dto/validar-evidencia.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

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
export class EvidenciasService {
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads/evidencias';

  constructor(
    @InjectRepository(EvidenciaDocumento)
    private readonly evidenciaRepository: Repository<EvidenciaDocumento>,
  ) {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Crea una nueva evidencia/documento
   */
  async create(
    file: MulterFile,
    createDto: CreateEvidenciaDto,
    subidoPor: string,
    subidoPorId?: number,
  ): Promise<EvidenciaDocumento> {
    // Validar que al menos una vinculación esté presente
    const vinculaciones = [
      createDto.hallazgoId,
      createDto.accionCorrectivaId,
      createDto.planMejoramientoId,
      createDto.auditoriaId,
    ].filter(Boolean);

    if (vinculaciones.length === 0) {
      throw new BadRequestException(
        'Debe especificar al menos una vinculación (hallazgoId, accionCorrectivaId, planMejoramientoId o auditoriaId)',
      );
    }

    if (vinculaciones.length > 1) {
      throw new BadRequestException(
        'Solo puede especificar una vinculación a la vez',
      );
    }

    // Generar ruta del archivo
    const rutaArchivo = this.generarRutaArchivo(
      file.originalname,
      createDto.hallazgoId,
      createDto.accionCorrectivaId,
      createDto.planMejoramientoId,
    );

    // Calcular hash del archivo
    const hashArchivo = await this.calcularHashArchivo(file.path);

    // Mover archivo a la ruta final
    const dir = path.dirname(rutaArchivo);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.renameSync(file.path, rutaArchivo);

    // Crear entidad
    const evidencia = this.evidenciaRepository.create({
      nombre: createDto.nombre,
      descripcion: createDto.descripcion,
      tipoDocumento: createDto.tipoDocumento,
      hallazgoId: createDto.hallazgoId || null,
      accionCorrectivaId: createDto.accionCorrectivaId || null,
      planMejoramientoId: createDto.planMejoramientoId || null,
      auditoriaId: createDto.auditoriaId || null,
      rutaArchivo,
      nombreArchivoOriginal: file.originalname,
      tipoMime: file.mimetype,
      tamanioBytes: file.size,
      hashArchivo,
      subidoPor,
      subidoPorId,
    });

    return this.evidenciaRepository.save(evidencia);
  }

  /**
   * Valida una evidencia (US-032)
   */
  async validar(
    id: string,
    validarDto: ValidarEvidenciaDto,
    validadoPor: string,
  ): Promise<EvidenciaDocumento> {
    const evidencia = await this.findOne(id);

    evidencia.estadoValidacion = validarDto.estadoValidacion;
    evidencia.validadoPor = validadoPor;
    evidencia.fechaValidacion = new Date();
    evidencia.observacionesValidacion = validarDto.observacionesValidacion;

    return this.evidenciaRepository.save(evidencia);
  }

  /**
   * Obtiene evidencias por acción correctiva
   */
  async findByAccion(accionId: string): Promise<EvidenciaDocumento[]> {
    return this.evidenciaRepository.find({
      where: { accionCorrectivaId: accionId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene evidencias por hallazgo
   */
  async findByHallazgo(hallazgoId: string): Promise<EvidenciaDocumento[]> {
    return this.evidenciaRepository.find({
      where: { hallazgoId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene evidencias por plan
   */
  async findByPlan(planId: string): Promise<EvidenciaDocumento[]> {
    return this.evidenciaRepository.find({
      where: { planMejoramientoId: planId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene evidencias por auditoría
   */
  async findByAuditoria(auditoriaId: string): Promise<EvidenciaDocumento[]> {
    return this.evidenciaRepository.find({
      where: { auditoriaId },
      order: { fechaSubida: 'DESC' },
    });
  }

  /**
   * Obtiene una evidencia por ID
   */
  async findOne(id: string): Promise<EvidenciaDocumento> {
    const evidencia = await this.evidenciaRepository.findOne({
      where: { id },
    });

    if (!evidencia) {
      throw new NotFoundException(`Evidencia con ID ${id} no encontrada`);
    }

    return evidencia;
  }

  /**
   * Elimina una evidencia
   */
  async remove(id: string): Promise<void> {
    const evidencia = await this.findOne(id);

    // Eliminar archivo físico
    if (fs.existsSync(evidencia.rutaArchivo)) {
      fs.unlinkSync(evidencia.rutaArchivo);
    }

    await this.evidenciaRepository.remove(evidencia);
  }

  // Métodos privados auxiliares
  private generarRutaArchivo(
    nombreOriginal: string,
    hallazgoId?: string,
    accionId?: string,
    planId?: string,
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(nombreOriginal);
    const nombreBase = path.basename(nombreOriginal, extension);
    const nombreUnico = `${nombreBase}_${timestamp}_${random}${extension}`;

    let ruta = this.uploadPath;
    if (accionId) {
      ruta = path.join(ruta, 'acciones', accionId);
    } else if (hallazgoId) {
      ruta = path.join(ruta, 'hallazgos', hallazgoId);
    } else if (planId) {
      ruta = path.join(ruta, 'planes', planId);
    } else {
      ruta = path.join(ruta, 'general');
    }

    if (!fs.existsSync(ruta)) {
      fs.mkdirSync(ruta, { recursive: true });
    }

    return path.join(ruta, nombreUnico);
  }

  private async calcularHashArchivo(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}
