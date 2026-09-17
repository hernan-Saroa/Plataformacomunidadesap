import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import {
  LaborFunctionsService,
  type LaborFunctionProfilePayload,
} from './labor-functions.service';
import { LaborCertificatePermissionsService } from '../auth/labor-certificate-permissions.service';
import { CertificatesService } from './certificates.service';

const MANAGE_FUNCTIONS_PERMISSION =
  'certificados-laborales.functions.manage';
const MANAGE_FUNCTIONS_DENIED_MESSAGE =
  'No tienes permiso para gestionar las funciones laborales.';

@Controller('certificates/labor-functions')
export class LaborFunctionsController {
  constructor(
    private readonly laborFunctionsService: LaborFunctionsService,
    private readonly permissionsService: LaborCertificatePermissionsService,
    private readonly certificatesService: CertificatesService,
  ) {}

  private async assertCanManage(req: any) {
    await this.permissionsService.assertRequestPermission(
      req,
      MANAGE_FUNCTIONS_PERMISSION,
      MANAGE_FUNCTIONS_DENIED_MESSAGE,
    );
  }

  private username(req: any, fallback?: string) {
    const header = req?.headers?.['x-user-username'];
    return (
      fallback ||
      (Array.isArray(header) ? header[0] : header) ||
      req?.user?.username ||
      ''
    );
  }

  @Get()
  async list(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.list({
      search,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  // Ruta estatica declarada antes de :id para que Nest no la tome como un id.
  @Get('selection')
  async listAllForSelection(
    @Req() req: any,
    @Query('search') search?: string,
  ) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.listAllForSelection({ search });
  }

  // Ruta estatica declarada antes de :id para que Nest no la tome como un id.
  @Get('person-lookup')
  async lookupPerson(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.lookupPerson(search || '', {
      limit: Number(limit) || 25,
      // Se reutiliza el pipeline real del certificado (seleccion + fuente
      // salarial + merge de codigos) para mostrar una sola vinculacion por
      // persona: exactamente la que sale impresa.
      selectPreferred: (requests) =>
        this.certificatesService.resolveRequestUsedForCertificate(
          requests as any,
        ),
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.findOne(id);
  }

  @Post()
  async create(
    @Body() body: LaborFunctionProfilePayload,
    @Req() req: any,
  ) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.create({
      ...body,
      updatedBy: this.username(req, body.updatedBy || body.updated_by),
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: LaborFunctionProfilePayload,
    @Req() req: any,
  ) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.update(id, {
      ...body,
      updatedBy: this.username(req, body.updatedBy || body.updated_by),
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.remove(id);
  }

  @Post('bulk/delete')
  async removeMany(
    @Body() body: { ids?: unknown },
    @Req() req: any,
  ) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.removeMany(body?.ids);
  }

  @Post('bulk/import')
  async bulk(
    @Body()
    body: {
      rows: LaborFunctionProfilePayload[];
      sourceSheet?: string;
      updatedBy?: string;
    },
    @Req() req: any,
  ) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.bulk(
      body.rows,
      this.username(req, body.updatedBy),
      body.sourceSheet,
    );
  }

  @Post('bulk/validate')
  async validateBulk(
    @Body()
    body: {
      rows: LaborFunctionProfilePayload[];
      sourceSheet?: string;
      updatedBy?: string;
    },
    @Req() req: any,
  ) {
    await this.assertCanManage(req);
    return await this.laborFunctionsService.validateBulk(
      body.rows,
      this.username(req, body.updatedBy),
      body.sourceSheet,
    );
  }
}
