import {
  PDFDocument,
  PDFName,
  PDFHexString,
  PDFDict,
} from 'pdf-lib';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { AppError } from '../errors/AppError';

export class PdfAConverterService {
  private readonly TEMP_DIR = path.resolve(__dirname, '../../temp');
  private readonly ASSETS_DIR = path.resolve(__dirname, '../../assets');

  /* ===========================
   * PUBLIC API
   * =========================== */

  public async convertToPdfA(pdfBuffer: Buffer): Promise<Buffer> {
    this.validateInput(pdfBuffer);
    const files = this.createTempFiles();

    try {
      fs.writeFileSync(files.input, pdfBuffer);

      try {
        return await this.convertWithGhostscript(files);
      } catch (error) {
        console.warn('[PdfA] Ghostscript falhou. Tentando fallback...', error);
      }

      return await this.convertWithPdfLib(pdfBuffer);

    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[PdfA] Erro fatal:', error);
      throw new AppError('Falha ao converter PDF para PDF/A.', 500);
    } finally {
      this.cleanupFiles(files);
    }
  }

  /* ===========================
   * GHOSTSCRIPT
   * =========================== */

  private async convertWithGhostscript(files: TempFiles): Promise<Buffer> {
    const gsExe = this.getGhostscriptExecutable();
    
    // Caminhos absolutos dos assets originais
    const iccProfilePath = path.join(this.ASSETS_DIR, 'sRGB2014.icc');
    const defTemplatePath = path.join(this.ASSETS_DIR, 'PDFA_def.ps');

    if (!fs.existsSync(iccProfilePath) || !fs.existsSync(defTemplatePath)) {
      throw new Error(`Assets não encontrados em: ${this.ASSETS_DIR}`);
    }

    // 1. Prepara o PDFA_def.ps dinâmico na pasta temp
    const safeIccPath = this.fixPath(iccProfilePath);
    this.createDynamicDefFile(defTemplatePath, files.def, safeIccPath);

    // 2. Sanitiza caminhos para o comando (barras normais /)
    const safeAssetsDir = this.fixPath(this.ASSETS_DIR);
    const safeDefPath = this.fixPath(files.def);
    const safeOutputPath = this.fixPath(files.output);
    const safeTempDir = this.fixPath(this.TEMP_DIR);

    // 3. Monta argumentos (SEM ASPAS para evitar o erro "Unterminated quote")
    const staticArgs = [
      '-dSAFER',
      `--permit-file-read=${safeAssetsDir}/`,  // Sem aspas
      `--permit-file-read=${safeTempDir}/`,    // Sem aspas
      '-dBATCH',
      '-dNOPAUSE',
      '-sDEVICE=pdfwrite',
      '-dPDFA=1',
      '-dPDFACompatibilityPolicy=1',
      '-dOverrideICC=true',
      '-sColorConversionStrategy=UseDeviceIndependentColor',
      '-sProcessColorModel=DeviceRGB',
      `-sOutputICCProfile=${safeIccPath}`,     // Sem aspas
      `-sOutputFile=${safeOutputPath}`         // Sem aspas
    ].join('\n');

    fs.writeFileSync(files.args, staticArgs, 'utf-8');

    const env = { ...process.env };
    delete env.GS_LIB;
    delete env.GS_FONTPATH;

    console.log(`[Ghostscript] ${gsExe} @${files.args} "${safeDefPath}" "${files.input}"`);

    return new Promise((resolve, reject) => {
      const child = spawn(
        gsExe,
        [
          `@${files.args}`,
          safeDefPath,    // O path do arquivo PS
          files.input     // O path do PDF de entrada
        ],
        { env }
      );

      let log = '';
      child.stdout.on('data', d => log += d.toString());
      child.stderr.on('data', d => log += d.toString());

      child.on('close', code => {
        if (code !== 0) {
          return reject(new Error(`Ghostscript falhou (Code ${code}). Log: ${log}`));
        }
        if (!fs.existsSync(files.output)) {
          return reject(new Error('Ghostscript finalizou mas não gerou o arquivo de saída.'));
        }
        resolve(fs.readFileSync(files.output));
      });

      child.on('error', (err) => reject(err));
    });
  }

  /**
   * Lê o template PDFA_def.ps, injeta o caminho correto do ICC e salva em temp.
   */
  private createDynamicDefFile(templatePath: string, outputPath: string, iccPath: string) {
    let content = fs.readFileSync(templatePath, 'utf-8');
    
    // Substitui o placeholder pelo caminho sanitizado
    content = content.replace('[[ICC_PROFILE_PATH]]', iccPath);
    
    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  /* ===========================
   * FALLBACK — PDF-LIB
   * =========================== */

  private async convertWithPdfLib(pdfBuffer: Buffer): Promise<Buffer> {
    const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pdfDoc = await PDFDocument.create();
    const pages = await pdfDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    pages.forEach(p => pdfDoc.addPage(p));
    this.applyPdfAMetadata(pdfDoc);
    this.removeTransparency(pdfDoc);
    const bytes = await pdfDoc.save({ useObjectStreams: false });
    return Buffer.from(bytes);
  }

  private applyPdfAMetadata(pdfDoc: PDFDocument) {
    const now = new Date();
    pdfDoc.setCreationDate(now);
    pdfDoc.setModificationDate(now);
    const id = PDFHexString.of(crypto.createHash('md5').update(now.toISOString()).digest('hex'));
    pdfDoc.context.trailerInfo.ID = pdfDoc.context.obj([id, id]);

    const metadataXML = `
      <?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
      <x:xmpmeta xmlns:x="adobe:ns:meta/">
        <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
          <rdf:Description rdf:about=""
            xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/"
            xmlns:xmp="http://ns.adobe.com/xap/1.0/">
            <pdfaid:part>1</pdfaid:part>
            <pdfaid:conformance>B</pdfaid:conformance>
            <xmp:CreateDate>${now.toISOString()}</xmp:CreateDate>
          </rdf:Description>
        </rdf:RDF>
      </x:xmpmeta>
      <?xpacket end="w"?>`.trim();

    const stream = pdfDoc.context.stream(metadataXML, {
      Type: PDFName.of('Metadata'),
      Subtype: PDFName.of('XML'),
    });

    stream.dict.delete(PDFName.of('Filter'));
    pdfDoc.catalog.set(PDFName.of('Metadata'), pdfDoc.context.register(stream));
    pdfDoc.catalog.set(PDFName.of('MarkInfo'), pdfDoc.context.obj({ Marked: true }));
  }

  private removeTransparency(pdfDoc: PDFDocument) {
    pdfDoc.context.enumerateIndirectObjects().forEach(([_, obj]) => {
      if (!(obj instanceof PDFDict)) return;
      if (obj.has(PDFName.of('SMask'))) obj.delete(PDFName.of('SMask'));
      const group = obj.lookup(PDFName.of('Group'));
      if (group instanceof PDFDict && group.get(PDFName.of('S')) === PDFName.of('Transparency')) {
        obj.delete(PDFName.of('Group'));
      }
    });
  }

  /* ===========================
   * UTILS
   * =========================== */

  private validateInput(buffer: Buffer) {
    if (!buffer || buffer.length === 0) throw new AppError('Arquivo PDF vazio ou inválido.', 400);
  }

  private createTempFiles(): TempFiles {
    if (!fs.existsSync(this.TEMP_DIR)) fs.mkdirSync(this.TEMP_DIR, { recursive: true });
    
    const ts = Date.now();
    const id = `${ts}-${Math.floor(Math.random() * 1000)}`;
    
    return {
      input: path.join(this.TEMP_DIR, `input-${id}.pdf`),
      output: path.join(this.TEMP_DIR, `output-${id}.pdf`),
      args: path.join(this.TEMP_DIR, `args-${id}.txt`),
      def: path.join(this.TEMP_DIR, `PDFA_def-${id}.ps`),
    };
  }

  private cleanupFiles(files: TempFiles) {
    Object.values(files).forEach(f => {
      try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {}
    });
  }

  private fixPath(p: string): string {
    return p.split(path.sep).join('/');
  }

  private getGhostscriptExecutable(): string {
    return process.platform === 'win32' ? 'gswin64c' : 'gs';
  }
}

interface TempFiles {
  input: string;
  output: string;
  args: string;
  def: string;
}