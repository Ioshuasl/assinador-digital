import { NodeForgeAdapter } from '../../infra/crypto/Node-forgeAdapter';
import forge from 'node-forge';

// Interface estendida com dados exigidos pelo ITI/ICP-Brasil
export interface CertificateMetadata {
  privateKey: string;
  certificate: forge.pki.Certificate;
  commonName: string; // O nome do titular (ex: NOME:CPF)
  
  issuer: {
    commonName: string;
    organization: string; // Onde buscamos "ICP-Brasil"
    country: string;
  };
  
  validity: {
    notBefore: Date;
    notAfter: Date;
  };
  
  serialNumber: string;
  thumbprint: string; // Hash único do certificado (SHA-1 em Hex)
  crlDistributionPoints: string[]; // URLs para validar se foi revogado
}

export class PfxParserService {
  private adapter: NodeForgeAdapter;

  constructor() {
    this.adapter = new NodeForgeAdapter();
  }

  /**
   * Abre o PFX, valida a segurança criptográfica e extrai metadados completos.
   */
  public extractCertificateData(pfxBuffer: Buffer, password: string): CertificateMetadata {
    try {
      // 1. Decodifica o arquivo PFX/P12
      const p12Data = this.adapter.parseP12(pfxBuffer, password);
      const privateKeyPem = this.adapter.privateKeyToPem(p12Data.key);
      const cert = p12Data.cert;

      // 2. Extração do Sujeito (Titular)
      const commonName = cert.subject.getField('CN')?.value || 'Signatário Desconhecido';

      // 3. Extração do Emissor (Issuer) - CRÍTICO PARA ICP-BRASIL
      const issuerCN = cert.issuer.getField('CN')?.value || '';
      const issuerO = cert.issuer.getField('O')?.value || '';
      const issuerC = cert.issuer.getField('C')?.value || '';

      // 4. Extração das Datas (Validade Temporal)
      const notBefore = cert.validity.notBefore;
      const notAfter = cert.validity.notAfter;

      // 5. Extração de Identificadores
      const serialNumber = cert.serialNumber;
      
      // Gera o Thumbprint (Fingerprint) para identificação única (SHA-1 do DER)
      const der = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
      const md = forge.md.sha1.create();
      md.update(der);
      const thumbprint = md.digest().toHex().toUpperCase();

      // 6. Busca URL da LCR (CRL Distribution Points)
      const crlDistributionPoints = this.extractCrlDistributionPoints(cert);

      // --- VALIDAÇÕES TÉCNICAS (NORMATIVA ICP-BRASIL) ---

      // Validação de Algoritmo (SHA-256 exigido, SHA-1 é obsoleto/inseguro)
      const signatureOid = cert.signatureOid;
      const signatureAlgoName = forge.pki.oids[signatureOid];
      const isSecureHash = signatureAlgoName && (
        signatureAlgoName.includes('sha256') || 
        signatureAlgoName.includes('sha384') || 
        signatureAlgoName.includes('sha512')
      );

      if (!isSecureHash) {
        throw new Error(`Algoritmo inseguro detectado (${signatureAlgoName}). A ICP-Brasil exige SHA-256 ou superior.`);
      }

      // Validação do tamanho da chave RSA (Mínimo 2048 bits)
      const keyLength = (cert.publicKey as forge.pki.rsa.PublicKey).n.bitLength();
      if (keyLength < 2048) {
        throw new Error(`Chave fraca detectada (${keyLength} bits). O mínimo exigido é 2048 bits.`);
      }

      return {
        privateKey: privateKeyPem,
        certificate: cert,
        commonName: String(commonName),
        issuer: {
          commonName: String(issuerCN),
          organization: String(issuerO),
          country: String(issuerC)
        },
        validity: { notBefore, notAfter },
        serialNumber,
        thumbprint,
        crlDistributionPoints
      };

    } catch (error: any) {
      // Tratamento específico para senha errada (erro comum do node-forge)
      if (error.message && (error.message.includes('password') || error.message.includes('MAC verification failed'))) {
         throw new Error('A senha do certificado está incorreta.');
      }
      throw error;
    }
  }

  /**
   * Tenta extrair a URL da Lista de Certificados Revogados (Extensão 2.5.29.31)
   * O node-forge não possui um parser ASN.1 de alto nível para essa extensão específica,
   * então fazemos uma busca no valor bruto da extensão.
   */
  private extractCrlDistributionPoints(cert: forge.pki.Certificate): string[] {
    const urls: string[] = [];
    try {
      const ext = cert.getExtension('cRLDistributionPoints');
      if (ext && (ext as any).value) {
         // O valor da extensão é uma string de bytes (DER/ASN.1)
         const valueBytes = (ext as any).value;
         
         // Truque para extrair URLs sem um parser ASN.1 completo:
         // As URLs HTTP geralmente ficam visíveis no meio dos bytes binários.
         // Convertemos para string e usamos Regex.
         let rawString = '';
         for (let i = 0; i < valueBytes.length; i++) {
             const charCode = valueBytes.charCodeAt(i);
             // Filtra apenas caracteres imprimíveis para limpar a string
             if (charCode >= 32 && charCode <= 126) {
                 rawString += valueBytes.charAt(i);
             } else {
                 rawString += ' '; // Substitui bytes binários por espaço
             }
         }

         // Regex para encontrar URLs HTTP/HTTPS
         const urlRegex = /http[s]?:\/\/[^\s<>"']+/g;
         const found = rawString.match(urlRegex);
         
         if (found) {
             found.forEach(url => {
                 // Remove caracteres estranhos que possam ter vindo no final
                 const cleanUrl = url.replace(/\.crl.*/, '.crl'); 
                 if (cleanUrl.endsWith('.crl') && !urls.includes(cleanUrl)) {
                     urls.push(cleanUrl);
                 }
             });
         }
      }
    } catch (e) {
      console.warn('Falha ao extrair LCR (aviso não-bloqueante):', e);
    }
    return urls;
  }
}