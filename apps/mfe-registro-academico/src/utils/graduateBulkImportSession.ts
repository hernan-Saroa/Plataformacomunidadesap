import workerAsset from './graduateBulkImport.worker?worker&url';
import type {
  GraduateImportRequest,
  GraduateImportResponse,
  GraduateValidationProgress,
} from './graduateBulkWorkbook';

type Result = Extract<GraduateImportResponse, { type: 'validated' | 'batch' }>;

export const createGraduateImportSession = (onProgress: (progress: GraduateValidationProgress) => void) => {
  const assetUrl = new URL(workerAsset, import.meta.url);
  // El shell de desarrollo sirve los remotos en otros puertos.
  const bootstrapUrl = /^https?:$/.test(assetUrl.protocol) && assetUrl.origin !== window.location.origin
    ? URL.createObjectURL(new Blob([`import ${JSON.stringify(assetUrl.href)};`], { type: 'text/javascript' }))
    : undefined;
  let worker: Worker;
  try {
    worker = new Worker(bootstrapUrl ?? assetUrl, { type: 'module' });
  } catch (error) {
    if (bootstrapUrl) URL.revokeObjectURL(bootstrapUrl);
    throw error;
  }
  let pending: { resolve: (result: Result) => void; reject: (error: Error) => void } | undefined;
  let workerFailure: Error | undefined;

  const dispose = (error = new Error('Se canceló la lectura del archivo.')) => {
    if (workerFailure) return;
    workerFailure = error;
    worker.terminate();
    if (bootstrapUrl) URL.revokeObjectURL(bootstrapUrl);
    pending?.reject(error);
    pending = undefined;
  };

  worker.onmessage = ({ data }: MessageEvent<GraduateImportResponse>) => {
    if (data.type === 'progress') {
      onProgress(data.progress);
    } else if (data.type === 'error') {
      dispose(new Error(data.message));
    } else {
      pending?.resolve(data);
      pending = undefined;
    }
  };
  worker.onerror = worker.onmessageerror = () =>
    dispose(new Error('Se interrumpió el procesamiento del archivo. Puede seleccionarlo de nuevo.'));

  const request = (message: GraduateImportRequest) =>
    new Promise<Result>((resolve, reject) => {
      if (workerFailure) {
        reject(workerFailure);
        return;
      }
      pending = { resolve, reject };
      try {
        worker.postMessage(message);
      } catch (error) {
        pending = undefined;
        reject(error);
      }
    });

  return {
    dispose,
    async validate(file: File, programOptions: string[]) {
      const result = await request({ type: 'validate', file, programOptions });
      if (result.type !== 'validated') throw new Error('No se pudo validar el archivo.');
      return result.summary;
    },
    async getBatch(start: number, size: number) {
      const result = await request({ type: 'batch', start, size });
      if (result.type !== 'batch' || !result.rows.length) {
        throw new Error('No se pudo leer el siguiente lote del archivo.');
      }
      return result.rows;
    },
  };
};
