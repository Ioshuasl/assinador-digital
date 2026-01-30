import forge from 'node-forge';

export class NodeForgeAdapter {
  /**
   * Abre um arquivo PFX/PKCS12 e extrai suas informações
   */
  public parseP12(pfxBuffer: Buffer, password: string) {
    // Converte o Buffer do Node.js para o formato binário do Forge
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
    
    // Abre o PFX usando a senha (pode lançar erro se a senha for inválida)
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    // Busca os "sacos" (bags) que contém chaves e certificados
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

    // Pega o primeiro certificado e chave encontrados
    const pkBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    const certBag = certBags[forge.pki.oids.certBag]?.[0];

    if (!pkBag || !certBag) {
      throw new Error('Chave privada ou certificado não encontrados no arquivo PFX.');
    }

    return {
      key: pkBag.key as forge.pki.PrivateKey,
      cert: certBag.cert as forge.pki.Certificate,
      asn1: p12Asn1
    };
  }

  /**
   * Converte a chave privada do formato Forge para PEM (string)
   * Necessário para a biblioteca de assinatura.
   */
  public privateKeyToPem(privateKey: forge.pki.PrivateKey): string {
    return forge.pki.privateKeyToPem(privateKey);
  }
}