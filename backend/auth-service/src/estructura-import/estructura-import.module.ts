import { Module } from '@nestjs/common';
import { EstructuraImportController } from './estructura-import.controller';
import { EstructuraImportService } from './estructura-import.service';
import { EstructuraExcelParserService } from './parsers/estructura-excel-parser.service';

@Module({
  controllers: [EstructuraImportController],
  providers: [EstructuraImportService, EstructuraExcelParserService],
})
export class EstructuraImportModule {}
