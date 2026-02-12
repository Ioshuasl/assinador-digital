import { Request, Response, NextFunction } from 'express';
import { PdfSignerService } from '../../core/services/Pdf-signerService';
import { AppError } from '../../core/errors/AppError';
import { PreviewService } from '../../core/services/PreviewService';
import AdmZip from 'adm-zip';

export class SignerController {

  public async sign(req: Request, res: Response, next: NextFunction) {
    try {
      const password = req.body.password;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const pageNumber = req.body.page ? Number(req.body.page) : undefined;
      const x = req.body.x ? Number(req.body.x) : undefined;
      const y = req.body.y ? Number(req.body.y) : undefined;
      const width = req.body.width ? Number(req.body.width) : undefined;
      const height = req.body.height ? Number(req.body.height) : undefined;

      if (!files || !files.certificate || !files.certificate[0]) {
        throw new AppError('Arquivo do certificado (.pfx) é obrigatório.', 400);
      }
      if (!files || !files.pdf || !files.pdf[0]) {
        throw new AppError('Arquivo PDF original é obrigatório.', 400);
      }
      if (!password) {
        throw new AppError('A senha do certificado é obrigatória.', 400);
      }

      const certFile = files.certificate[0];
      const pdfFile = files.pdf[0];

      const signerService = new PdfSignerService();

      const signedPdfBuffer = await signerService.signPdf(
        pdfFile.buffer,
        certFile.buffer,
        password,
        { pageNumber, x, y, width, height }
      );

      const originalName = pdfFile.originalname;
      const lastDotIndex = originalName.lastIndexOf('.');
      const nameWithoutExt = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
      const ext = lastDotIndex !== -1 ? originalName.substring(lastDotIndex) : '.pdf';
      const finalName = `${nameWithoutExt}-assinado${ext}`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${finalName}"`);
      res.setHeader('Content-Length', signedPdfBuffer.length);
      res.send(signedPdfBuffer);

    } catch (error) {
      next(error);
    }
  }

  public async preview(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const page = req.body.page ? Number(req.body.page) : undefined;

      if (!files || !files.pdf || !files.pdf[0]) {
        throw new AppError('Arquivo PDF é obrigatório.', 400);
      }

      const previewService = new PreviewService();
      const previewPdfBuffer = await previewService.generatePreview(files.pdf[0].buffer, page);
      const filename = page ? `preview_pag_${page}.pdf` : `preview_completo.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.send(previewPdfBuffer);

    } catch (error) {
      next(error);
    }
  }

  // --- ATUALIZADO: ASSINATURA EM LOTE COM VALIDAÇÃO PRÉVIA ---
  public async signBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const password = req.body.password;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const pageNumber = req.body.page ? Number(req.body.page) : undefined;
      const x = req.body.x ? Number(req.body.x) : undefined;
      const y = req.body.y ? Number(req.body.y) : undefined;

      if (!files?.certificate?.[0]) {
        throw new AppError('Certificado (.pfx) é obrigatório.', 400);
      }
      if (!files?.pdfs || files.pdfs.length === 0) {
        throw new AppError('Envie pelo menos um PDF no campo "pdfs".', 400);
      }
      if (!password) {
        throw new AppError('Senha do certificado é obrigatória.', 400);
      }

      const certFile = files.certificate[0];
      const pdfFiles = files.pdfs;
      const signerService = new PdfSignerService();
      const zip = new AdmZip();

      // --- VALIDAÇÃO GERAL ---
      // Se o certificado estiver expirado, aborta TODO o processo aqui.
      // Isso envia um erro JSON (via errorMiddleware) que o frontend mostrará no Toast.
      signerService.validateCertificate(certFile.buffer, password);

      // Se passou da validação, processa os arquivos
      for (const pdf of pdfFiles) {
        try {
          const signedBuffer = await signerService.signPdf(
            pdf.buffer,
            certFile.buffer,
            password,
            { pageNumber, x, y }
          );

          zip.addFile(`assinado-${pdf.originalname}`, signedBuffer);

        } catch (err) {
          console.error(`Erro ao assinar arquivo ${pdf.originalname}:`, err);
          // Erros individuais (ex: PDF corrompido) ainda entram no ZIP como log
          // Erro de certificado não cairá aqui, pois já foi validado antes.
          zip.addFile(`erro-${pdf.originalname}.txt`, Buffer.from(`Falha ao assinar: ${err}`));
        }
      }

      const zipBuffer = zip.toBuffer();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="documentos_assinados.zip"');
      res.setHeader('Content-Length', zipBuffer.length);
      res.send(zipBuffer);

    } catch (error) {
      next(error);
    }
  }
}