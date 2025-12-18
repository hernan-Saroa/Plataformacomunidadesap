import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Documento, TipoDocumento, EtapaDocumento } from './entities/documento.entity';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocumentosService {
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads/control-interno';

  constructor(
    @InjectRepository(Documento)
    private readonly documentoRepository: Repository<Documento>,
  ) {
    // Crear directorio de uploads si no existe
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Calcula el hash SHA256 de un archivo
   */
  private async calcularHashArchivo(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Genera una ruta única para el archivo
   */
  generarRutaArchivo(nombreArchivo: string, auditoriaId?: string, etapa?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(nombreArchivo);
    const nombreBase = path.basename(nombreArchivo, extension);
    const nombreUnico = `${nombreBase}_${timestamp}_${random}${extension}`;

    // Estructura: uploads/control-interno/[auditoria]/[etapa]/archivo
    let ruta = this.uploadPath;
    if (auditoriaId) {
      ruta = path.join(ruta, `auditoria-${auditoriaId}`);
      if (etapa) {
        ruta = path.join(ruta, etapa);
      }
    }
    
    // Crear directorios si no existen
    if (!fs.existsSync(ruta)) {
      fs.mkdirSync(ruta, { recursive: true });
    }

    return path.join(ruta, nombreUnico);
  }

  /**
   * Obtiene todos los documentos con filtros opcionales
   */
  async findAll(filters?: {
    auditoriaId?: string;
    hallazgoId?: string;
    planMejoramientoId?: string;
    tipoDocumento?: string;
    etapa?: string;
    search?: string;
  }): Promise<Documento[]> {
    const query = this.documentoRepository.createQueryBuilder('documento')
      .leftJoinAndSelect('documento.auditoria', 'auditoria')
      .leftJoinAndSelect('documento.hallazgo', 'hallazgo')
      .leftJoinAndSelect('documento.planMejoramiento', 'planMejoramiento')
      .orderBy('documento.createdAt', 'DESC');

    if (filters?.auditoriaId) {
      query.andWhere('documento.auditoriaId = :auditoriaId', { auditoriaId: filters.auditoriaId });
    }

    if (filters?.hallazgoId) {
      query.andWhere('documento.hallazgoId = :hallazgoId', { hallazgoId: filters.hallazgoId });
    }

    if (filters?.planMejoramientoId) {
      query.andWhere('documento.planMejoramientoId = :planMejoramientoId', { 
        planMejoramientoId: filters.planMejoramientoId 
      });
    }

    if (filters?.tipoDocumento) {
      query.andWhere('documento.tipoDocumento = :tipoDocumento', { tipoDocumento: filters.tipoDocumento });
    }

    if (filters?.etapa) {
      query.andWhere('documento.etapa = :etapa', { etapa: filters.etapa });
    }

    if (filters?.search) {
      query.andWhere(
        '(documento.nombre ILIKE :search OR documento.descripcion ILIKE :search OR documento.nombreArchivo ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return query.getMany();
  }

  /**
   * Obtiene un documento por ID
   */
  async findOne(id: string): Promise<Documento> {
    const documento = await this.documentoRepository.findOne({
      where: { id },
      relations: ['auditoria', 'hallazgo', 'planMejoramiento', 'versionAnterior'],
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }

    return documento;
  }

  /**
   * Crea un nuevo documento (después de subir el archivo)
   */
  async create(createDto: CreateDocumentoDto, filePath: string): Promise<Documento> {
    // Calcular hash del archivo
    const hashArchivo = await this.calcularHashArchivo(filePath);

    // Verificar si ya existe un documento con el mismo hash (duplicado)
    const existente = await this.documentoRepository.findOne({
      where: { hashArchivo },
    });

    if (existente) {
      // Si existe, crear nueva versión
      const nuevaVersion = this.documentoRepository.create({
        ...createDto,
        rutaArchivo: filePath,
        hashArchivo,
        version: existente.version + 1,
        versionAnteriorId: existente.id,
        comprimido: false,
        sincronizadoServidorG: false,
      });

      return this.documentoRepository.save(nuevaVersion);
    }

    // Crear nuevo documento
    const documento = this.documentoRepository.create({
      ...createDto,
      rutaArchivo: filePath,
      hashArchivo,
      version: 1,
      comprimido: false,
      sincronizadoServidorG: false,
    });

    return this.documentoRepository.save(documento);
  }

  /**
   * Actualiza un documento existente
   */
  async update(id: string, updateDto: UpdateDocumentoDto): Promise<Documento> {
    const documento = await this.findOne(id);

    if (updateDto.nombre) documento.nombre = updateDto.nombre;
    if (updateDto.descripcion !== undefined) documento.descripcion = updateDto.descripcion;
    if (updateDto.tipoDocumento) documento.tipoDocumento = updateDto.tipoDocumento as TipoDocumento;
    if (updateDto.etapa !== undefined) documento.etapa = updateDto.etapa as EtapaDocumento;
    if (updateDto.auditoriaId !== undefined) documento.auditoriaId = updateDto.auditoriaId;
    if (updateDto.hallazgoId !== undefined) documento.hallazgoId = updateDto.hallazgoId;
    if (updateDto.planMejoramientoId !== undefined) documento.planMejoramientoId = updateDto.planMejoramientoId;

    return this.documentoRepository.save(documento);
  }

  /**
   * Elimina un documento
   */
  async delete(id: string): Promise<void> {
    const documento = await this.findOne(id);

    // Eliminar archivo físico si existe
    if (fs.existsSync(documento.rutaArchivo)) {
      try {
        fs.unlinkSync(documento.rutaArchivo);
      } catch (error) {
        console.error(`Error al eliminar archivo ${documento.rutaArchivo}:`, error);
      }
    }

    await this.documentoRepository.remove(documento);
  }

  /**
   * Obtiene el historial de versiones de un documento
   */
  async getHistorialVersiones(documentoId: string): Promise<Documento[]> {
    const documento = await this.findOne(documentoId);
    const historial: Documento[] = [documento];

    // Buscar versiones anteriores
    let versionAnterior = documento.versionAnterior;
    while (versionAnterior) {
      const anterior = await this.documentoRepository.findOne({
        where: { id: versionAnterior.id },
        relations: ['versionAnterior'],
      });
      if (anterior) {
        historial.unshift(anterior);
        versionAnterior = anterior.versionAnterior;
      } else {
        break;
      }
    }

    return historial;
  }

  /**
   * Obtiene documentos por auditoría y etapa
   */
  async getDocumentosPorEtapa(auditoriaId: string, etapa: EtapaDocumento): Promise<Documento[]> {
    return this.documentoRepository.find({
      where: {
        auditoriaId,
        etapa,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Marca un documento como sincronizado con servidor G:
   */
  async marcarSincronizado(id: string, rutaServidorG: string): Promise<Documento> {
    const documento = await this.findOne(id);
    documento.sincronizadoServidorG = true;
    documento.rutaServidorG = rutaServidorG;
    documento.fechaSincronizacion = new Date();
    return this.documentoRepository.save(documento);
  }
}

