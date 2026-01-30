import { NodeForgeAdapter } from '../../infra/crypto/Node-forgeAdapter';
import forge from 'node-forge';

export class PfxParserService {
  private adapter: NodeForgeAdapter;

  constructor() {
    this.adapter = new NodeForgeAdapter();
  }

  public extractCertificateData(pfxBuffer: Buffer, password: string) {
    try {
      const p12Data = this.adapter.parseP12(pfxBuffer, password);
      const privateKeyPem = this.adapter.privateKeyToPem(p12Data.key);
      
      // --- NOVIDADE: Extração do Nome do Usuário (CN) ---
      const cert = p12Data.cert;
      // Busca o atributo "CommonName" (CN) ou usa "Desconhecido"
      const commonName = cert.subject.getField('CN')?.value || 'Signatário Desconhecido';

      return {
        privateKey: privateKeyPem,
        certificate: p12Data.cert,
        commonName: String(commonName) // Retornamos o nome para usar no carimbo
      };

    } catch (error: any) {
      if (error.message && (error.message.includes('password') || error.message.includes('MAC'))) {
        throw new Error('Senha do certificado incorreta.');
      }
      throw new Error('Erro ao processar o certificado digital: ' + error.message);
    }
  }
}