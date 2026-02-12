import signer from 'node-signpdf';
import { 
  PDFDocument, 
  rgb, 
  StandardFonts, 
  PDFName, 
  PDFNumber, 
  PDFHexString, 
  PDFString,
  PDFArray,
  PDFDict,
  PDFRef
} from 'pdf-lib';
import { PfxParserService } from './Pfx-parserService';
import { AppError } from '../errors/AppError';

// --- CORES INSTITUCIONAIS ---
const COLOR_BLUE = rgb(0.0, 0.45, 0.70);
const COLOR_WHITE = rgb(1, 1, 1);
const COLOR_GRAY_BORDER = rgb(0.85, 0.85, 0.85);
const COLOR_TEXT_DARK = rgb(0.15, 0.15, 0.15);
const COLOR_TEXT_GRAY = rgb(0.5, 0.5, 0.5);

interface VisualOptions {
  pageNumber?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export class PdfSignerService {
  private pfxParser: PfxParserService;

  constructor() {
    this.pfxParser = new PfxParserService();
  }

  /**
   * Valida o certificado antes de qualquer operação.
   * Retorna o Common Name (Nome do titular) se válido.
   * Lança AppError se inválido ou expirado.
   */
  public validateCertificate(pfxBuffer: Buffer, password: string): string {
    const { commonName, validity } = this.pfxParser.extractCertificateData(pfxBuffer, password);

    const now = new Date();
    
    if (now < validity.notBefore) {
      throw new AppError(`O certificado ainda não é válido. Validade inicia em: ${validity.notBefore.toLocaleString()}`);
    }
    
    if (now > validity.notAfter) {
      throw new AppError(`O certificado expirou em: ${validity.notAfter.toLocaleString()}`);
    }

    return commonName;
  }

  private addSignaturePlaceholder(pdfDoc: PDFDocument, signatureLength: number = 16192) {
    const byteRangePlaceholder = [
      PDFNumber.of(0),
      PDFName.of('**********'),
      PDFName.of('**********'),
      PDFName.of('**********'),
    ];

    const signatureDict = pdfDoc.context.obj({
      Type: 'Sig',
      Filter: 'Adobe.PPKLite',
      SubFilter: 'adbe.pkcs7.detached',
      ByteRange: byteRangePlaceholder,
      Contents: PDFHexString.of('0'.repeat(signatureLength)),
      Reason: PDFString.of('Assinatura Digital ICP-Brasil'),
      M: PDFString.fromDate(new Date()),
    });

    const signatureRef = pdfDoc.context.register(signatureDict);

    const widgetDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      Rect: [0, 0, 0, 0],
      V: signatureRef,
      T: PDFString.of('Signature1'),
      F: 4,
      P: pdfDoc.getPages()[0].ref,
    });

    const widgetRef = pdfDoc.context.register(widgetDict);

    const pages = pdfDoc.getPages();
    pages[0].node.addAnnot(widgetRef);

    let acroForm = pdfDoc.catalog.get(PDFName.of('AcroForm'));
    if (!acroForm) {
      acroForm = pdfDoc.context.obj({ Fields: [] });
      pdfDoc.catalog.set(PDFName.of('AcroForm'), pdfDoc.context.register(acroForm));
    }

    let fields: PDFArray;
    if (acroForm instanceof PDFRef) {
        const lookup = pdfDoc.context.lookup(acroForm) as PDFDict;
        fields = lookup.get(PDFName.of('Fields')) as PDFArray;
    } else {
        fields = (acroForm as PDFDict).get(PDFName.of('Fields')) as PDFArray;
    }
    fields.push(widgetRef);
  }

  private async applyVisualStamp(
    pdfDoc: PDFDocument, 
    signerName: string, 
    options: VisualOptions
  ): Promise<void> {
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    if (totalPages === 0) throw new AppError('PDF vazio.');

    let pageIndex = options.pageNumber ? options.pageNumber - 1 : totalPages - 1;
    if (pageIndex < 0 || pageIndex >= totalPages) pageIndex = totalPages - 1;

    const page = pages[pageIndex];
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const boxWidth = options.width && options.width > 80 ? options.width : 300;
    const boxHeight = options.height && options.height > 30 ? options.height : 60;
    const drawX = options.x !== undefined ? options.x : 40;
    const drawY = options.y !== undefined ? options.y : 40;

    page.drawRectangle({
      x: drawX,
      y: drawY,
      width: boxWidth,
      height: boxHeight,
      color: COLOR_WHITE,
      borderColor: COLOR_GRAY_BORDER,
      borderWidth: 0.5,
    });

    const barWidth = 6;
    page.drawRectangle({
      x: drawX,
      y: drawY,
      width: barWidth,
      height: boxHeight,
      color: COLOR_BLUE,
    });

    const paddingLeft = 10;
    const textStartX = drawX + barWidth + paddingLeft;
    const maxTextWidth = boxWidth - barWidth - (paddingLeft * 2);
    let cleanName = signerName.replace(/[^\w\s]/gi, '').toUpperCase();
    
    let nameFontSize = Math.min(11, Math.max(6, boxHeight * 0.18));
    let nameWidth = fontBold.widthOfTextAtSize(cleanName, nameFontSize);
    while (nameWidth > maxTextWidth && nameFontSize > 5) {
        nameFontSize -= 0.5;
        nameWidth = fontBold.widthOfTextAtSize(cleanName, nameFontSize);
    }

    const labelSize = Math.max(5, nameFontSize * 0.85); 
    const metaSize = Math.max(4, nameFontSize * 0.70);

    const yName = drawY + (boxHeight * 0.65);
    const yLabel = drawY + (boxHeight * 0.45);
    const yDate = drawY + (boxHeight * 0.28);
    const yValid = drawY + (boxHeight * 0.12);

    page.drawText(cleanName, { x: textStartX, y: yName, size: nameFontSize, font: fontBold, color: COLOR_TEXT_DARK });
    page.drawText('Assinado Digitalmente', { x: textStartX, y: yLabel, size: labelSize, font: fontRegular, color: COLOR_BLUE });
    
    const dateNow = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    page.drawText(`Data: ${dateNow}`, { x: textStartX, y: yDate, size: metaSize, font: fontRegular, color: COLOR_TEXT_GRAY });

    if (boxHeight > 40) {
        page.drawText('Verifique em: verificador.iti.gov.br', { x: textStartX, y: yValid, size: metaSize * 0.9, font: fontRegular, color: COLOR_TEXT_GRAY });
    }
  }

  public async signPdf(pdfBuffer: Buffer, pfxBuffer: Buffer, password: string, options: VisualOptions = {}): Promise<Buffer> {
      try {
        // --- 1. VALIDAÇÃO CENTRALIZADA ---
        // Reaproveita a lógica de validação. Se falhar, lança erro aqui mesmo.
        const commonName = this.validateCertificate(pfxBuffer, password);

        // --- 2. CARREGAR E MODIFICAR O PDF ---
        const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
        
        await this.applyVisualStamp(pdfDoc, commonName, options);

        // --- 3. CRIAR O CAMPO DE ASSINATURA NATIVAMENTE ---
        this.addSignaturePlaceholder(pdfDoc);

        const pdfWithPlaceholderBytes = await pdfDoc.save({ useObjectStreams: false });
        const pdfWithPlaceholder = Buffer.from(pdfWithPlaceholderBytes);

        // --- 4. ASSINAR O PDF ---
        const signedPdf = signer.sign(pdfWithPlaceholder, pfxBuffer, { 
            passphrase: password,
            asn1StrictParsing: true 
        });

        return signedPdf;

      } catch (error) {
          console.error('Erro na assinatura:', error);
          if (error instanceof AppError) throw error;
          throw new AppError('Falha técnica ao assinar o PDF: ' + (error as Error).message);
      }
  }
}