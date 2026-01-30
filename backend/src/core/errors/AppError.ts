export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    
    // Correção necessária quando se estende classes nativas no TypeScript/JS moderno
    Object.setPrototypeOf(this, AppError.prototype);
  }
}