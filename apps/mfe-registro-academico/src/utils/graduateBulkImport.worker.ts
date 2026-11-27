import { createGraduateImportHandler } from './graduateBulkWorkbook';
import type { GraduateImportRequest } from './graduateBulkWorkbook';

const onRequest = createGraduateImportHandler((response) => self.postMessage(response));
self.onmessage = (event: MessageEvent<GraduateImportRequest>) => void onRequest(event.data);
