import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, MinLength, MaxLength, IsIn, ArrayMinSize, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMantenimientoDto {
  @ApiProperty({ example: 'id-sede-uuid', description: 'Sede a la que pertenece la solicitud' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  idSede: string;

  @ApiPropertyOptional({ example: 'id-espacio-uuid', description: 'Espacio fisico asociado (catálogo de espacios)' })
  @IsString()
  @IsOptional()
  @IsUUID()
  idEspacio?: string;

  @ApiProperty({ example: 'Dirección Académica', description: 'Nombre del area solicitante' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(150)
  nombreAreaSolicitante: string;

  @ApiPropertyOptional({ example: 'uuid-area', description: 'Identificador opcional de la dependencia en auth.dependencias' })
  @IsString()
  @IsOptional()
  @IsUUID()
  idAreaSolicitante?: string;

  @ApiProperty({ example: '2', description: 'Piso o nivel de la ubicación' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  piso: string;

  @ApiProperty({ example: 'Aula 204 u Oficina 301', description: 'Salon, oficina o ubicación específica' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  salon: string;

  @ApiPropertyOptional({ example: 'Frente al ascensor, edificio principal', description: 'Detalle adicional de ubicación' })
  @IsString()
  @IsOptional()
  ubicacionDetalle?: string;

  @ApiProperty({ example: 'CORRECTIVO', description: 'Tipo de mantenimiento (hasta EFDS-1732 se usa este campo)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tipoMantenimiento: string;

  @ApiProperty({
    example: 'FISICA',
    description: 'Clasificación OBLIGATORIA EFDS-1731. FISICA = UMI (plomería, cerrajería). TECNOLOGICA = TI (HDMI, cómputo, impresora).',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['FISICA', 'TECNOLOGICA'])
  tipoAtencion: 'FISICA' | 'TECNOLOGICA';

  @ApiProperty({ example: 'Falla en el sistema de aire acondicionado del Aula 204', description: 'Descripción de la solicitud' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  descripcion: string;

  @ApiPropertyOptional({ example: 'http://storage/evidencia1.jpg', description: 'Evidencia inicial opcional (URL externa legacy)' })
  @IsString()
  @IsOptional()
  evidenciaInicialUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['<uuid-evidencia1>', '<uuid-evidencia2>'],
    description: 'IDs de evidencias subidas previamente por el endpoint /mantenimiento/evidencias/upload y pendientes de ligar a la solicitud',
  })
  @IsOptional()
  @IsString({ each: true })
  @IsUUID(undefined, { each: true })
  uploadedEvidenciaIds?: string[];

  @ApiPropertyOptional({ example: 47, description: 'EFDS-1732 FASE 2 (opcional entrega 1): Identificador FK del catalogo_item (CATEGORIA_SERVICIO). Valores oficiales 47..54 (CS_001..CS_008). Obligatorio en v2 cuando se alinee la linea base 745 casos.' })
  @IsNumber()
  @IsOptional()
  idCategoria?: number;

  @ApiPropertyOptional({ example: 83, description: 'Subcategoria (opcional): idCatalogo catalogo_item con metadata.parentCodigo = CATEGORIA_PRINCIPAL.codigo del campo idCategoria. Agrega detalle sin alterar las 8 categorias oficiales.' })
  @IsNumber()
  @IsOptional()
  idSubcategoria?: number;

  @ApiPropertyOptional({ example: 'MEDIA', description: 'Prioridad: BAJA, MEDIA, ALTA, URGENTE' })
  @IsString()
  @IsOptional()
  prioridad?: string;
}

export class RemitirATIDto {
  @ApiProperty({
    example: 'Equipo de cómputo: usuario se equivocó de clasificación física, pertenece a TI.',
    description: 'Motivo OBLIGATORIO de la remisión (min 10 caracteres). Queda en la trazabilidad para Gestión de Calidad.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  motivo: string;

  @ApiPropertyOptional({
    example: 'INC-2026-01425',
    description: 'Consecutivo del ticket TI recibido por correo (opcional: se puede llenar después manualmente).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  consecutivoCruzadoTi?: string;

  @ApiPropertyOptional({
    example: 'EMAIL_SIN_INTEGRAR',
    description: 'Canal usado para enviar la solicitud a TI. Futuro: GRAPH_TI / MESA_SERVICIOS / WEBHOOK',
  })
  @IsOptional()
  @IsIn(['EMAIL_SIN_INTEGRAR', 'MANUAL'])
  canalRemision?: string;
}

export class UpdateMantenimientoEstadoDto {
  @ApiProperty({ example: 'EN_ANALISIS', description: 'Nuevo estado de la solicitud' })
  @IsString()
  @IsNotEmpty()
  estado: string;

  @ApiPropertyOptional({ example: 'Ing. Carlos Pérez' })
  @IsString()
  @IsOptional()
  responsableAsignado?: string;

  @ApiPropertyOptional({ example: 'Se completó el cambio de gas y filtro' })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({ example: '2026-09-18' })
  @IsString()
  @IsOptional()
  fechaEjecucion?: string;
}

// ---------------------------------------------------------------------------
// EFDS-1735 RF-INF-006: Valoración en campo y registro de insumos
// ---------------------------------------------------------------------------

export class IniciarValoracionDto {
  @ApiPropertyOptional({
    description:
      'Opcional: si Encargado UMI inicia la valoración en nombre de un técnico, enviar el código del técnico asignado. Si no envía, usa el responsable actual.',
  })
  @IsString()
  @IsOptional()
  tecnicoCodigoForzado?: string;
}

export class ValoracionInsumoDto {
  @ApiPropertyOptional({ example: 'MAT-PLM-0042', description: 'Código opcional del catálogo maestro (si existe).' })
  @IsString()
  @IsOptional()
  codigoInsumo?: string;

  @ApiProperty({ example: 'Tubería PVC 4" (pulgada)', description: 'Nombre material o repuesto (min 2 chars).' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  nombre: string;

  @ApiProperty({ example: 4.0, description: 'Cantidad (mayor que 0).' })
  @IsNumber()
  @IsNotEmpty()
  cantidad: number;

  @ApiProperty({
    example: 'm',
    description: 'Unidad de medida: un (unidad), m (metro), m2, kg, L (litro), cj (caja), paq (paquete), rol, glb, otro.',
  })
  @IsString()
  @IsIn(['un', 'm', 'm2', 'kg', 'L', 'cj', 'paq', 'rol', 'glb', 'otro'])
  unidadMedida: 'un' | 'm' | 'm2' | 'kg' | 'L' | 'cj' | 'paq' | 'rol' | 'glb' | 'otro';

  @ApiProperty({ example: 32000, description: 'Costo unitario en COP (mayor o igual a 0).' })
  @IsNumber()
  @IsOptional()
  costoUnitarioCop?: number;

  @ApiProperty({
    example: 'DISPONIBLE_EN_BODEGA',
    description:
      'DISPONIBLE_EN_BODEGA = pasa a EN_PROGRESO. NO_DISPONIBLE_A_SOLICITAR = pasa a EN_ESPERA_DE_INSUMOS y extiende SLA.',
  })
  @IsString()
  @IsIn(['DISPONIBLE_EN_BODEGA', 'NO_DISPONIBLE_A_SOLICITAR'])
  disponibilidad: 'DISPONIBLE_EN_BODEGA' | 'NO_DISPONIBLE_A_SOLICITAR';

  @ApiPropertyOptional({
    example: 5,
    description:
      'OBLIGATORIO si disponibilidad = NO_DISPONIBLE_A_SOLICITAR. Días hábiles/calendario estimados para llegar el material. Extiende SLA automáticamente.',
  })
  @IsNumber()
  @IsOptional()
  tiempoAdquisicionDias?: number;
}

export class GuardarValoracionCompletaDto {
  @ApiProperty({
    example:
      'Se inspeccionó tubería lavamanos Aula 204. Fuga en codo de 1/2 pulgada por corrosión interna. Se requiere cambio completo de codo, teflón y silicona selladora.',
    description: 'Diagnóstico técnico luego de la visita de inspección (min 10 chars).',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  diagnostico: string;

  @ApiProperty({
    example:
      'Cambio de codo PVC 1/2" en lavamanos Aula 204. Prueba de hermeticidad. Limpieza del área.',
    description: 'Trabajos concretos a realizar identificados en la visita (min 10 chars).',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  alcanceIdentificado: string;

  @ApiProperty({ example: 2.5, description: 'Tiempo estimado de ejecución en horas (>= 0.25 h).' })
  @IsNumber()
  tiempoEstimadoHoras: number;

  @ApiProperty({
    example: 'BAJO',
    description: 'Riesgo detectado para la operación. CS_002/CS_008 pueden llegar a ALTO.',
  })
  @IsString()
  @IsIn(['BAJO', 'MEDIO', 'ALTO'])
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO';

  @ApiPropertyOptional({
    example: false,
    description: 'Obligatorio si categoría = CS_002 Eléctricas. Si la ejecución necesita apagado de breaker.',
  })
  @IsOptional()
  requiereApagadoElectrico?: boolean | null;

  @ApiPropertyOptional({
    example:
      'No hay disponibilidad para el codo PVC 1/2 pulgada en bodega general; se solicita compra por oficina de compras.',
    description: 'Notas adicionales técnicas opcionales.',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiPropertyOptional({
    type: [Object],
    example: [
      {
        nombreOriginal: 'IMG_20260921_094410.jpg',
        urlPresigned: 'https://minio....',
        tamanoBytes: 1425000,
      },
    ],
    description:
      'Arreglo de evidencias de la visita (0 a 5 archivos). Se sube primero por /evidencias/upload y luego se ligan aquí.',
  })
  @IsOptional()
  evidencias?: Array<Record<string, any>>;

  @ApiProperty({
    type: [ValoracionInsumoDto],
    description:
      'Listado de materiales y repuestos necesarios. Puede ser vacío (si la labor no requiere insumos, sólo mano de obra).',
  })
  @ValidateNested({ each: true })
  @Type(() => ValoracionInsumoDto)
  insumos: ValoracionInsumoDto[];
}

export class ConfirmarRecepcionInsumosDto {
  @ApiPropertyOptional({
    example:
      'Recepción de materiales: 1 codo PVC 1/2", rollo teflón 12 m, silicona selladora neutra 280ml. Entregado proveedor Ferretería La 38.',
    description: 'Observaciones opcionales de recepción por parte del Encargado UMI.',
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
