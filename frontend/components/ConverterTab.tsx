
import React, { useState } from 'react';
// Added ShieldCheck to the imports from lucide-react
import { RefreshCw, FileCheck, Info, Download, ShieldCheck } from 'lucide-react';
import api, { downloadBlob } from '../services/api';
import { Button, Card, Label } from './UI';

const ConverterTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConvert = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await api.post('/api/v1/convert/pdfa', formData, { responseType: 'blob' });
      downloadBlob(response.data, `${file.name.replace('.pdf', '')}_PDFA.pdf`);
      alert('Conversão concluída!');
    } catch (error) {
      alert('Erro na conversão. Verifique se o PDF não está protegido por senha.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Conversor PDF/A</h2>
          <p className="text-slate-500 mt-2">Torne seus documentos prontos para arquivamento de longo prazo.</p>
        </div>

        <div className="space-y-6">
          <div>
            <Label>Arquivo PDF de Origem</Label>
            <input 
              type="file" 
              accept=".pdf" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <strong>O que é PDF/A?</strong>
              <p className="mt-1">É uma versão padronizada pela ISO para preservação digital de documentos eletrônicos. Ele garante que o PDF possa ser aberto e lido exatamente da mesma forma no futuro.</p>
            </div>
          </div>

          <Button 
            className="w-full h-12"
            onClick={handleConvert}
            isLoading={isProcessing}
            disabled={!file}
          >
            <FileCheck className="w-5 h-5" /> Converter para PDF/A
          </Button>
        </div>
      </Card>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="p-4 bg-white border border-slate-200 rounded-lg flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Download className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Documentos Baixados</p>
              <p className="text-sm font-bold">Sem Limites</p>
            </div>
         </div>
         <div className="p-4 bg-white border border-slate-200 rounded-lg flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-full">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Privacidade</p>
              <p className="text-sm font-bold">Processamento Local</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default ConverterTab;
