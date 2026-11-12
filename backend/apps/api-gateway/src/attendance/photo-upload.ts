import {
  applyDecorators,
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Injectable,
  PayloadTooLargeException,
  PipeTransform,
  UnsupportedMediaTypeException,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  detectImageType,
  MAX_PHOTO_BYTES,
  PHOTO_TOO_LARGE_MESSAGE,
  PHOTO_TYPE_MESSAGE,
} from '@app/common';

/** Multer rejects oversized files with an English message; this replaces it. */
@Catch(PayloadTooLargeException)
class PhotoTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(HttpStatus.PAYLOAD_TOO_LARGE)
      .json({ statusCode: HttpStatus.PAYLOAD_TOO_LARGE, message: PHOTO_TOO_LARGE_MESSAGE });
  }
}

/** Rejects a missing or non-image file before it is sent on to attendance-service. */
@Injectable()
export class PhotoValidationPipe implements PipeTransform {
  transform(file?: Express.Multer.File): Express.Multer.File {
    if (!file) throw new BadRequestException('Foto wajib diambil dari kamera');
    if (!detectImageType(file.buffer)) throw new UnsupportedMediaTypeException(PHOTO_TYPE_MESSAGE);
    return file;
  }
}

/** One in-memory `photo` file per request; multer stops reading at the size limit. */
export function PhotoUpload() {
  return applyDecorators(
    UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_PHOTO_BYTES, files: 1 } })),
    UseFilters(PhotoTooLargeFilter),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['photo'],
        properties: {
          photo: { type: 'string', format: 'binary', description: 'JPEG or PNG, up to 2 MB' },
          note: { type: 'string', maxLength: 255 },
        },
      },
    }),
  );
}
