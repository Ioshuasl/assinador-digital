import { PDFDocument } from 'pdf-lib';
import { AppError } from '../errors/AppError';
import crypto from 'crypto';

// Interface para o item do cache
interface CachedPdf {
  doc: PDFDocument;
  timestamp: number;
}

export class PreviewService {
  // Cache estático compartilhado entre instâncias do serviço
  // Chave: Hash MD5 do arquivo | Valor: Objeto PDFDocument carregado
  private static cache = new Map<string, CachedPdf>();
  
  // Configurações do Cache
  private static CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de vida
  private static MAX_CACHE_SIZE = 20; // Máximo de 20 PDFs grandes em memória

  constructor() {
    // Inicia a limpeza periódica do cache se ainda não estiver rodando
    this.startCacheCleanup();
  }

  /**
   * Gera um hash MD5 rápido para identificar se o arquivo é o mesmo
   * sem precisar confiar apenas no nome do arquivo.
   */
  private generateFileHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Gerencia a limpeza do cache para liberar memória RAM
   */
  private startCacheCleanup() {
    // Evita múltiplos intervalos rodando
    if ((PreviewService as any).cleanupInterval) return;

    (PreviewService as any).cleanupInterval = setInterval(() => {
      const now = Date.now();
      PreviewService.cache.forEach((value, key) => {
        if (now - value.timestamp > PreviewService.CACHE_TTL_MS) {
          PreviewService.cache.delete(key);
        }
      });
    }, 60000); // Roda a cada 1 minuto
  }

  /**
   * Tenta recuperar o documento do cache ou carrega do zero.
   * Gerencia o tamanho do cache removendo o item mais antigo se necessário.
   */
  private async getPdfDocument(buffer: Buffer): Promise<PDFDocument> {
    const hash = this.generateFileHash(buffer);

    // 1. Tenta pegar do Cache (Hit)
    if (PreviewService.cache.has(hash)) {
      const cached = PreviewService.cache.get(hash)!;
      cached.timestamp = Date.now(); // Renova o tempo de vida
      return cached.doc;
    }

    // 2. Se não existir, carrega (Miss) - Essa é a parte pesada
    // Se o cache estiver cheio, remove o item mais antigo (primeira chave do Map)
    if (PreviewService.cache.size >= PreviewService.MAX_CACHE_SIZE) {
      const firstKey = PreviewService.cache.keys().next().value;
      if (firstKey) PreviewService.cache.delete(firstKey);
    }

    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    
    // Salva no cache
    PreviewService.cache.set(hash, {
      doc: doc,
      timestamp: Date.now()
    });

    return doc;
  }

  /**
   * Se pageNumber for informado: Extrai a página e retorna um novo PDF.
   * Se pageNumber for undefined: Retorna o PDF completo original.
   */
  public async generatePreview(pdfBuffer: Buffer, pageNumber?: number): Promise<Buffer> {
    try {
      // Se não pediu página específica, retorna o buffer original direto (zero processamento)
      if (pageNumber === undefined) {
        return pdfBuffer;
      }

      // --- OTIMIZAÇÃO: Carrega o Doc (usando cache) ---
      const srcDoc = await this.getPdfDocument(pdfBuffer);
      
      const totalPages = srcDoc.getPageCount();
      const pageIndex = pageNumber - 1;

      if (pageIndex < 0 || pageIndex >= totalPages) {
        throw new AppError(`Página inválida. O documento possui ${totalPages} páginas.`);
      }

      // --- CRIAÇÃO DO PDF DE PREVIEW ---
      // Cria um novo PDF vazio para conter apenas a página desejada
      const newDoc = await PDFDocument.create();

      // Copia a página desejada do documento cacheado
      // copyPages é muito rápido pois copia apenas referências, não reprocessa o conteúdo
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