import signer from 'node-signpdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { PfxParserService } from './Pfx-parserService';
import { AppError } from '../errors/AppError';

const { plainAddPlaceholder } = require('node-signpdf/dist/helpers');

// Interface para tipar as opções visuais
interface VisualOptions {
  pageNumber?: number; // Opcional
  x?: number;          // Opcional
  y?: number;          // Opcional
}

export class PdfSignerService {
  private pfxParser: PfxParserService;

  constructor() {
    this.pfxParser = new PfxParserService();
  }

  private async applyVisualStamp(
    pdfBuffer: Buffer, 
    signerName: string, 
    options: VisualOptions
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    if (totalPages === 0) {
      throw new AppError('O arquivo PDF parece estar vazio.');
    }

    // Lógica da Página:
    // Se o usuário não informou página, pega a ÚLTIMA (padrão de contratos).
    // Se informou, converte de base-1 (humana) para base-0 (array).
    let pageIndex = options.pageNumber ? options.pageNumber - 1 : totalPages - 1;

    // Validação de segurança
    if (pageIndex < 0 || pageIndex >= totalPages) {
      throw new AppError(`Página inválida. O documento possui ${totalPages} páginas.`);
    }

    const page = pages[pageIndex];
    
    // Configuração de Fontes e Cores
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Lógica de Posição (Coordenadas PDF começam no canto INFERIOR ESQUERDO)
    // Se não passar X ou Y, usa 40 como padrão (margem de segurança)
    const x = options.x !== undefined ? options.x : 40;
    const y = options.y !== undefined ? options.y : 40; 
    
    const boxHeight = 60;
    const boxWidth = 300;

    // 1. Desenha o fundo
    page.drawRectangle({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.96, 0.96, 0.96),
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });

    // 2. Prepara Textos
    const dateNow = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const textName = signerName.length > 40 ? signerName.substring(0, 40) + '...' : signerName;

    // 3. Escreve Textos (Offsets relativos ao X e Y escolhidos)
    page.drawText('ASSINADO DIGITALMENTE', {
      x: x + 10,
      y: y + 42,
      size: 8,
      font: font,
      color: rgb(0, 0.2, 0.6),
    });

    page.drawText(textName, {
      x: x + 10,
      y: y + 28,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Data: ${dateNow}`, {
      x: x + 10,
      y: y + 16,
      size: 8,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText('Valide este documento em: verificador.iti.gov.br', {
      x: x + 10,
      y: y + 6,
      size: 7,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Salva em modo de compatibilidade (PDF Clássico) para o node-signpdf ler
    const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
    return Buffer.from(pdfBytes);
  }

  public async signPdf(
    pdfBuffer: Buffer, 
    pfxBuffer: Buffer, 
    password: string,
    options: VisualOptions = {} // Recebe as opções aqui
  ): Promise<Buffer> {
    try {
      const { commonName } = this.pfxParser.extractCertificateData(pfxBuffer, password);

      // Passa as opções para o método visual
      const pdfWithStamp = await this.applyVisualStamp(pdfBuffer, commonName, options);

      const pdfWithPlaceholder = plainAddPlaceholder({
        pdfBuffer: pdfWithStamp,
        reason: 'Assinatura Digital ICP-Brasil',
        signatureLength: 16192,
      });

      const signedPdf = signer.sign(pdfWithPlaceholder, pfxBuffer, {
        passphrase: password,
      });

      return signedPdf;

    } catch (error: any) {
      console.error('Erro detalhado:', error);
      if (error.message && error.message.includes('xref')) {
         throw new AppError('Erro de compatibilidade PDF. Tente salvar como PDF/A.');
      }
      if (error instanceof AppError) throw error;
      throw new Error('Falha técnica ao assinar o PDF.');
    }
  }
}