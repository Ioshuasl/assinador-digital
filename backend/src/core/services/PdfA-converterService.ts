import { 
  PDFDocument, 
  PDFName, 
  PDFDict, 
  PDFArray, 
  PDFString, 
  StandardFonts,
  PDFHexString
} from 'pdf-lib';
import crypto from 'crypto'; // Usamos o crypto nativo do Node para gerar o ID
import { AppError } from '../errors/AppError';

export class PdfAConverterService {

  public async convertToPdfA(pdfBuffer: Buffer): Promise<Buffer> {
    try {
      // 1. Carrega original
      const srcDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      
      // 2. Cria documento novo
      const pdfDoc = await PDFDocument.create();

      // 3. Copia páginas
      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await pdfDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((page) => pdfDoc.addPage(page));

      // 4. Metadados de Informação (Info Dictionary)
      pdfDoc.setTitle('Documento PDF/A');
      pdfDoc.setAuthor('Assinador API');
      pdfDoc.setProducer('Node.js PDF/A Converter');
      pdfDoc.setCreator('Assinador API');
      const now = new Date();
      pdfDoc.setCreationDate(now);
      pdfDoc.setModificationDate(now);

      // --- CORREÇÃO 1: ID DO ARQUIVO (Trailer ID) ---
      // Gera um hash MD5 único baseado na data e conteúdo aleatório
      const idHash = crypto.createHash('md5').update(now.toISOString() + Math.random()).digest('hex');
      const id = PDFHexString.of(idHash);
      // Força a inserção do ID no contexto do PDF
      pdfDoc.context.trailerInfo.ID = pdfDoc.context.obj([id, id]);

      // --- CORREÇÃO 2: METADADOS XMP (Uncompressed) ---
      // O XML precisa ser exato. Ajustamos o xpacket e os namespaces.
      const metadataXML = `
<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.6-c015 81.159809, 2016/11/11-01:42:16">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>1</pdfaid:part>
      <pdfaid:conformance>B</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:title>
        <rdf:Alt>
          <rdf:li xml:lang="x-default">Documento PDF/A</rdf:li>
        </rdf:Alt>
      </dc:title>
      <dc:creator>
        <rdf:Seq>
          <rdf:li>Assinador API</rdf:Seq>
        </rdf:Seq>
      </dc:creator>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreateDate>${now.toISOString()}</xmp:CreateDate>
      <xmp:ModifyDate>${now.toISOString()}</xmp:CreateDate>
      <xmp:MetadataDate>${now.toISOString()}</xmp:CreateDate>
      <xmp:CreatorTool>Assinador API</xmp:CreatorTool>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>
`.trim();

      // MUDANÇA CRÍTICA: Usamos .stream() em vez de .flateStream() para não comprimir (erro ProhibitedMetadataFilterEntry)
      const metadataStream = pdfDoc.context.stream(metadataXML, {
        Type: PDFName.of('Metadata'),
        Subtype: PDFName.of('XML'),
      });
      const metadataRef = pdfDoc.context.register(metadataStream);
      pdfDoc.catalog.set(PDFName.of('Metadata'), metadataRef);

      // --- CORREÇÃO 3: OUTPUT INTENT (Cores) ---
      // Resolve "MissingOutputConditionIdentifier" e tenta mitigar "UnsupportedDeviceColorSpace"
      // Criamos um dicionário explícito com strings tipadas corretamente.
      
      const outputIntent = pdfDoc.context.obj({
        Type: PDFName.of('OutputIntent'),
        S: PDFName.of('GTS_PDFA1'),
        OutputConditionIdentifier: PDFString.of('sRGB IEC61966-2.1'),
        OutputCondition: PDFString.of('sRGB IEC61966-2.1'), // Adicionado para redundância
        RegistryName: PDFString.of('http://www.color.org'),
        Info: PDFString.of('sRGB IEC61966-2.1'),
        // NOTA: Para conformidade de cor 100% estrita no AvePDF, é necessário embutir o Stream do perfil ICC.
        // Como não temos o arquivo .icc aqui, omitimos a chave 'DestOutputProfile'.
        // Isso passará na validação estrutural, mas pode gerar aviso de cor dependendo do validador.
      });
      
      const outputIntentRef = pdfDoc.context.register(outputIntent);
      pdfDoc.catalog.set(
        PDFName.of('OutputIntents'),
        pdfDoc.context.obj([outputIntentRef])
      );

      // Salva sem compressão de objetos (máxima compatibilidade legacy)
      const pdfBytes = await pdfDoc.save({ useObjectStreams: false });

      return Buffer.from(pdfBytes);

    } catch (error) {
      console.error('Erro na conversão PDF/A:', error);
      throw new AppError('Falha técnica ao converter o arquivo para PDF/A.');
    }
  }
}