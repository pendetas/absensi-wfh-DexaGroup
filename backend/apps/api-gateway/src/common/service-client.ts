import {
  GatewayTimeoutException,
  HttpException,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { isRpcErrorPayload } from '@app/common';

const logger = new Logger('ServiceClient');
const SERVICE_TIMEOUT_MS = 5000;

/**
 * Maps service failures to HTTP: rpcError(status) keeps its status,
 * ECONNREFUSED becomes 503, and no reply within 5 seconds becomes 504.
 */
export async function callService<TResult>(
  client: ClientProxy,
  pattern: string,
  data: unknown = {},
): Promise<TResult> {
  try {
    return await firstValueFrom(
      client.send<TResult>(pattern, data).pipe(timeout(SERVICE_TIMEOUT_MS)),
    );
  } catch (error) {
    if (isRpcErrorPayload(error)) {
      throw new HttpException(
        { statusCode: error.statusCode, message: error.message },
        error.statusCode,
      );
    }
    if (error instanceof TimeoutError) {
      throw new GatewayTimeoutException(`Layanan tidak merespons (${pattern})`);
    }
    if ((error as { code?: string })?.code === 'ECONNREFUSED') {
      throw new ServiceUnavailableException(
        'Layanan sedang tidak tersedia, coba beberapa saat lagi',
      );
    }
    logger.error(
      `Gagal memanggil ${pattern}`,
      error instanceof Error ? error.stack : JSON.stringify(error),
    );
    throw new InternalServerErrorException('Terjadi kesalahan pada server');
  }
}
