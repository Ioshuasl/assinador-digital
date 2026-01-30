import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../core/errors/AppError';

export function errorMiddleware(
  err: Error,
  request: Request,
  response: Response,
  next: NextFunction
) {
  // Se for um erro conhecido (gerado por nós), retorna a mensagem limpa
  if (err instanceof AppError) {
    return response.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // Se for um erro inesperado, loga no console para o desenvolvedor ver e retorna genérico
  console.error('Internal Server Error:', err);

  return response.status(500).json({
    status: 'error',
    message: 'Internal server error - Algo deu errado no processamento.',
  });
}