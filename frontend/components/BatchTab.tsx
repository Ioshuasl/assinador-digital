import React, { useState } from 'react';
import { Files, Lock, ShieldCheck, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner'; // <--- Importar Toast
import api, { downloadBlob, extractErrorMessage } from '../services/api'; // <--- Importar helper
import { Button, Input, Label, Card } from './UI';

const BatchTab: React.FC = () => {
  const [pdfs, setPdfs] = useState<File[]>([]);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPdfs(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setPdfs(prev => prev.filter((_, i) => i !== index));
  };

  // --- ATUALIZADO: Processamento em Lote com Toasts ---
  const handleBatchProcess = async () => {
    if (pdfs.length === 0 || !certFile || !password) {
      toast.warning('Selecione os arquivos, o certificado e informe a senha.');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(`Processando ${pdfs.length} documentos...`);

    try {
      const formData = new FormData();
      formData.append('certificate', certFile);
      formData.append('password', password);
      pdfs.forEach(pdf => formData.append('pdfs', pdf));

      const response = await api.post('/api/v1/sign/batch', formData, { 
        responseType: 'blob' 
      });
      
      downloadBlob(response.data, `assinaturas_em_lote_${Date.now()}.zip`);
      toast.success('Lote processado e download iniciado!', { id: toastId });
    } catch (error) {
      // Extrai erro de validade do certificado (se houver)
      const message = await extractErrorMessage(error);
      toast.error(message, { id: toastId, duration: 5000 });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* (O restante do JSX permanece igual) */}
      <Card className="p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Files className="text-purple-600" /> Upload de Arquivos
        </h2>
        
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
            onClick={() => document.getElementById('batch-pdfs')?.click()}
          >
            <input 
              id="batch-pdfs"
              type="file" 
              multiple 
              accept=".pdf" 
              className="hidden" 
              onChange={handleFiles}
            />
            <Files className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 font-medium">Clique para selecionar múltiplos PDFs</p>
            <p className="text-xs text-slate-400 mt-1">Os documentos serão assinados na primeira página, canto inferior direito por padrão.</p>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
            {pdfs.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-sm">
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button onClick={() => removeFile(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <ShieldCheck className="text-emerald-600" /> Segurança
        </h2>

        <div className="space-y-6">
          <div>
            <Label>Certificado Digital (.pfx)</Label>
            <Input 
              type="file" 
              accept=".pfx" 
              onChange={(e) => setCertFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <Label>Senha do Certificado</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                type="password" 
                className="pl-10"
                placeholder="Senha de exportação"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
            <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4" /> Resumo do Lote
            </h4>
            <p className="text-xs text-blue-700">
              Você está prestes a assinar <strong>{pdfs.length}</strong> documentos. 
              O resultado será um arquivo .zip contendo todos os PDFs assinados individualmente.
            </p>
          </div>

          <Button 
            className="w-full h-12 text-lg" 
            variant="secondary"
            onClick={handleBatchProcess}
            isLoading={isProcessing}
            disabled={pdfs.length === 0 || !certFile || !password}
          >
            <Download className="w-5 h-5" /> Processar e Baixar ZIP
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default BatchTab;