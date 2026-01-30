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

      // --- CAPTURA DE PARÂMETROS OPCIONAIS ---
      // Converte string para number, se existir.
      // Se não existir (undefined ou string vazia), passa undefined para usar o padrão do Service.
      const pageNumber = req.body.page ? Number(req.body.page) : undefined;
      const x = req.body.x ? Number(req.body.x) : undefined;
      const y = req.body.y ? Number(req.body.y) : undefined;

      // Validações de arquivo
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
        { pageNumber, x, y } // Passa o objeto de opções
      );

      // Tratamento do nome (mantém igual ao que já fizemos)
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

  // --- MÉTODO 2: PREVIEW DA PÁGINA (Atualizado: Opcional) ---
  public async preview(req: Request, res: Response, next: NextFunction) {
    try {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        // Se vier "page", converte para Number. Se não vier (vazio/null), fica undefined.
        const page = req.body.page ? Number(req.body.page) : undefined;

        if (!files || !files.pdf || !files.pdf[0]) {
            throw new AppError('Arquivo PDF é obrigatório.', 400);
        }

        const previewService = new PreviewService();
        
        // Passa o buffer e a página (que pode ser número ou undefined)
        const previewPdfBuffer = await previewService.generatePreview(files.pdf[0].buffer, page);

        // Define nome dinâmico para o arquivo
        const filename = page ? `preview_pag_${page}.pdf` : `preview_completo.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        // 'inline' permite visualizar no navegador. Mude para 'attachment' se quiser forçar download.
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        
        res.send(previewPdfBuffer);

    } catch (error) {
        next(error);
    }
  }

  // --- MÉTODO 3: ASSINATURA EM LOTE (Novo) ---
  public async signBatch(req: Request, res: Response, next: NextFunction) {
    try {
        const password = req.body.password;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        // Configurações visuais (opcionais, aplicam a todos os arquivos)
        const pageNumber = req.body.page ? Number(req.body.page) : undefined;
        const x = req.body.x ? Number(req.body.x) : undefined;
        const y = req.body.y ? Number(req.body.y) : undefined;

        // Validações
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
        const pdfFiles = files.pdfs; // Array de arquivos
        const signerService = new PdfSignerService();
        const zip = new AdmZip(); // Instancia o criador de ZIP

        // Processamento em Loop (Série)
        // Nota: Em produção, poderíamos usar Promise.all para paralelo, 
        // mas assinatura é CPU-bound, então série é mais seguro para não travar o servidor.
        for (const pdf of pdfFiles) {
            try {
                const signedBuffer = await signerService.signPdf(
                    pdf.buffer,
                    certFile.buffer,
                    password,
                    { pageNumber, x, y }
                );
                
                // Adiciona ao ZIP com o nome modificado
                zip.addFile(`assinado-${pdf.originalname}`, signedBuffer);
                
            } catch (err) {
                console.error(`Erro ao assinar arquivo ${pdf.originalname}:`, err);
                // Opcional: Adicionar um arquivo de log.txt dentro do zip explicando o erro
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