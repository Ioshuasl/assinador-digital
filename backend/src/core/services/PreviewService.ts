import { PDFDocument } from 'pdf-lib';
import { AppError } from '../errors/AppError';

export class PreviewService {
  
  /**
   * Se pageNumber for informado: Extrai a página e retorna um novo PDF.
   * Se pageNumber for undefined: Retorna o PDF completo original.
   */
  public async generatePreview(pdfBuffer: Buffer, pageNumber?: number): Promise<Buffer> {
    try {
      // --- REGRA NOVA: Retorna tudo se não houver página ---
      if (pageNumber === undefined) {
        return pdfBuffer;
      }

      // Carrega o PDF original (ignora senha de leitura se houver)
      const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      // Ajusta base-1 (humano) para base-0 (array)
      const pageIndex = pageNumber - 1;

      if (pageIndex < 0 || pageIndex >= totalPages) {
        throw new AppError(`Página inválida. O documento possui ${totalPages} páginas.`);
      }

      // Cria um novo PDF vazio
      const newDoc = await PDFDocument.create();

      // Copia a página desejada
      const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
      newDoc.addPage(copiedPage);

      // Salva e retorna o buffer da página isolada
      const pdfBytes = await newDoc.save();
      return Buffer.from(pdfBytes);

    } catch (error) {
      console.error('Erro no preview:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Falha ao gerar preview do PDF.');
    }
  }
}