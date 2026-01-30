import { Request, Response, NextFunction } from 'express';
import { PdfAConverterService } from '../../core/services/PdfA-converterService';
import { AppError } from '../../core/errors/AppError';

export class ConverterController {
  
  public async convertToPdfA(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || !files.pdf || !files.pdf[0]) {
        throw new AppError('Arquivo PDF é obrigatório.', 400);
      }

      const originalFile = files.pdf[0];
      const converterService = new PdfAConverterService();

      // Chama o serviço
      const pdfABuffer = await converterService.convertToPdfA(originalFile.buffer);

      // Prepara o nome do arquivo
      const originalName = originalFile.originalname;
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
      const finalName = `${nameWithoutExt}-pdfa.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${finalName}"`);
      
      res.send(pdfABuffer);

    } catch (error) {
      next(error);
    }
  }
}