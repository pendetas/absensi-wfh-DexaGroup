import { HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

/** Error sent from a service over TCP; the gateway reuses statusCode as the HTTP status. */
export interface RpcErrorPayload {
  statusCode: number;
  message: string | string[];
}

export function rpcError(statusCode: HttpStatus, message: string | string[]): RpcException {
  const payload: RpcErrorPayload = { statusCode, message };
  return new RpcException(payload);
}

export function isRpcErrorPayload(value: unknown): value is RpcErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RpcErrorPayload).statusCode === 'number' &&
    'message' in value
  );
}
