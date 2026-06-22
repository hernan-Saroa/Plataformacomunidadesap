import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class CleanUploadFileNameInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    if (req.file) {
      this.cleanFile(req.file);
    }
    if (req.files) {
      if (Array.isArray(req.files)) {
        req.files.forEach(f => this.cleanFile(f));
      } else {
        Object.keys(req.files).forEach(key => {
          const filesArray = req.files[key];
          if (Array.isArray(filesArray)) {
            filesArray.forEach(f => this.cleanFile(f));
          }
        });
      }
    }
    return next.handle();
  }

  private cleanFile(file: any) {
    if (file && file.originalname) {
      try {
        // Fix encoding issue where UTF-8 filename is parsed as Latin1/ISO-8859-1 by multer
        const original = file.originalname;
        const decoded = Buffer.from(original, 'latin1').toString('utf-8');
        
        // Only override if the decoded string has a different content and doesn't cause loss of data
        if (decoded !== original && !decoded.includes('')) {
          file.originalname = decoded;
        }
      } catch (e) {
        // Safe fallback in case of errors
      }
    }
  }
}
