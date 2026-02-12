import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Rnd } from 'react-rnd';
import { FileUp, PenTool, Lock, ShieldCheck, ChevronLeft, ChevronRight, X, MousePointer2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { downloadBlob, extractErrorMessage } from '../services/api';
import { Button, Input, Label, Card } from './UI';
import { SignatureCoords } from '../types';

// Configuração do Worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ExtendedCoords extends SignatureCoords {
  width: number;
  height: number;
}

const SignerTab: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');

  const [coords, setCoords] = useState<ExtendedCoords | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedPage, setSelectedPage] = useState<number>(1);

  // Inicializamos com um tamanho padrão A4 para evitar colapso visual inicial
  const [pdfDimensions, setPdfDimensions] = useState({ width: 595, height: 842 });

  const containerRef = useRef<HTMLDivElement>(null);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setSelectedPage(1);
    setCoords(null);
    setTotalPages(0);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
  };

  const onPageLoadSuccess = (page: any) => {
    setPdfDimensions({ width: page.width, height: page.height });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('.react-draggable')) return;
    if (!containerRef.current || !pdfDimensions.width) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const initialPdfW = 300;
    const initialPdfH = 60;

    const screenW = (initialPdfW / pdfDimensions.width) * rect.width;
    const screenH = (initialPdfH / pdfDimensions.height) * rect.height;

    const newScreenX = clickX - (screenW / 2);
    const newScreenY = clickY - (screenH / 2);

    const pdfX = (newScreenX / rect.width) * pdfDimensions.width;
    const pdfY = pdfDimensions.height - ((newScreenY + screenH) / rect.height * pdfDimensions.height);

    setCoords({
      x: pdfX,
      y: pdfY,
      width: initialPdfW,
      height: initialPdfH,
      page: selectedPage
    });
  };

  const handleSign = async () => {
    if (!pdfFile || !certFile || !password) {
      toast.warning('Preencha todos os campos e selecione o certificado.');
      return;
    }
    if (!coords) {
      toast.warning('Clique no documento para posicionar a assinatura.');
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading('Enviando e assinando documento...');

    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('certificate', certFile);
      formData.append('password', password);
      formData.append('page', coords.page.toString());
      formData.append('x', Math.round(coords.x).toString());
      formData.append('y', Math.round(coords.y).toString());
      formData.append('width', Math.round(coords.width).toString());
      formData.append('height', Math.round(coords.height).toString());

      const response = await api.post('/api/v1/sign', formData, { responseType: 'blob' });
      downloadBlob(response.data, `${pdfFile.name.replace('.pdf', '')}_assinado.pdf`);
      toast.success('Documento assinado com sucesso!', { id: toastId });
    } catch (error) {
      console.error(error);
      const message = await extractErrorMessage(error);
      toast.error(message, { id: toastId, duration: 6000 });
    } finally {
      setIsProcessing(false);
    }
  };

  // Componente visual para loading suave (Skeleton)
  const PageSkeleton = () => (
    <div
      style={{
        width: '100%',
        aspectRatio: `${pdfDimensions.width} / ${pdfDimensions.height}`
      }}
      className="bg-white border border-slate-200 shadow-sm flex items-center justify-center animate-pulse"
    >
      <div className="flex flex-col items-center gap-2 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-blue-200" />
        <span className="text-xs font-medium">Carregando página...</span>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Painel de Configuração */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <PenTool className="text-blue-600" /> Assinar Documento
          </h2>

          <div className="space-y-4">
            <div>
              <Label>Documento PDF</Label>
              <div className="relative group">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="pdf-input"
                />
                <label
                  htmlFor="pdf-input"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <FileUp className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500" />
                  <span className="text-sm text-slate-600 text-center truncate max-w-[200px]">
                    {pdfFile ? pdfFile.name : 'Clique para selecionar'}
                  </span>
                </label>
              </div>
            </div>

            <div>
              <Label>Certificado Digital (.pfx)</Label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="file"
                  accept=".pfx,.p12"
                  onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md text-sm cursor-pointer file:hidden"
                />
              </div>
            </div>

            <div>
              <Label>Senha do Certificado</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  className="pl-10"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {coords && (
              <div className="pt-4 space-y-2 border-t border-slate-100 mt-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Posição da Assinatura</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>Página: <span className="font-mono font-bold text-blue-600">{coords.page}</span></div>
                  <div>X: <span className="font-mono">{Math.round(coords.x)}</span></div>
                  <div>Y: <span className="font-mono">{Math.round(coords.y)}</span></div>
                  <div>Tam: <span className="font-mono">{Math.round(coords.width)}x{Math.round(coords.height)}</span></div>
                </div>
              </div>
            )}

            <Button
              className="w-full mt-6"
              onClick={handleSign}
              isLoading={isProcessing}
              disabled={!pdfFile || !certFile || !password || !coords}
            >
              {!coords ? 'Posicione a assinatura no PDF' : 'Assinar Agora'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Painel de Preview e Edição */}
      <div className="lg:col-span-8">
        <Card className="min-h-[600px] flex flex-col overflow-hidden">
          {/* Header do Preview */}
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <MousePointer2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-700">Visualização do Documento</h3>
            </div>

            {pdfFile && totalPages > 0 && (
              <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button
                  disabled={selectedPage <= 1}
                  onClick={() => setSelectedPage(p => p - 1)}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <span className="text-sm font-bold text-slate-700 min-w-[3rem] text-center">
                  {selectedPage} / {totalPages}
                </span>
                <button
                  disabled={selectedPage >= totalPages}
                  onClick={() => setSelectedPage(p => p + 1)}
                  className="p-1 hover:bg-slate-100 rounded disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            )}
          </div>

          {/* Área do Canvas */}
          <div className="flex-1 bg-slate-200/50 p-8 flex justify-center items-start overflow-auto relative min-h-[500px]">

            {pdfFile ? (
              <div
                ref={containerRef}
                className="relative shadow-xl inline-block bg-white transition-all"
                onClick={handleCanvasClick}
                style={{
                  cursor: coords ? 'default' : 'crosshair',
                  // Mantém altura mínima para evitar pulos de layout
                  minHeight: containerRef.current ? (containerRef.current.offsetWidth * (pdfDimensions.height / pdfDimensions.width)) : '500px'
                }}
              >
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex flex-col items-center justify-center h-96 w-64 text-slate-400">
                      <Loader2 className="animate-spin w-8 h-8 mb-2" />
                      <span className="text-xs">Carregando PDF...</span>
                    </div>
                  }
                  error={<div className="text-red-500 p-4">Erro ao carregar PDF.</div>}
                >
                  {/* CORREÇÃO: Envolvemos Page em uma div com key para satisfazer o TypeScript */}
                  <div key={selectedPage} className="relative">
                    <Page
                      pageNumber={selectedPage}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onLoadSuccess={onPageLoadSuccess}
                      width={containerRef.current?.offsetWidth ? undefined : 600}
                      loading={<PageSkeleton />}
                    />

                    {/* Rnd (Carimbo) deve estar dentro da div com key para ser recriado junto com a página */}
                    {/* Rnd (Carimbo) dentro da div com key */}
                    {coords && coords.page === selectedPage && pdfDimensions.width > 0 && containerRef.current && (
                      <Rnd
                        bounds="parent"
                        minWidth={100}
                        minHeight={30}
                        lockAspectRatio={false} // <--- CORREÇÃO 1: Permite distorcer (esticar/achatar)

                        // <--- CORREÇÃO 2: Habilita explicitamente todas as direções
                        enableResizing={{
                          top: true, right: true, bottom: true, left: true,
                          topRight: true, bottomRight: true, bottomLeft: true, topLeft: true
                        }}

                        // <--- CORREÇÃO 3: Estiliza as alças para ficarem visíveis (UX melhor)
                        resizeHandleStyles={{
                          bottomRight: {
                            width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%', right: '-5px', bottom: '-5px'
                          },
                          bottomLeft: {
                            width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%', left: '-5px', bottom: '-5px'
                          },
                          topRight: {
                            width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%', right: '-5px', top: '-5px'
                          },
                          topLeft: {
                            width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%', left: '-5px', top: '-5px'
                          }
                        }}

                        size={{
                          width: `${(coords.width / pdfDimensions.width) * 100}%`,
                          height: `${(coords.height / pdfDimensions.height) * 100}%`,
                        }}
                        position={{
                          x: (coords.x / pdfDimensions.width) * containerRef.current.offsetWidth,
                          y: containerRef.current.offsetHeight - ((coords.y + coords.height) / pdfDimensions.height * containerRef.current.offsetHeight)
                        }}
                        onDragStop={(e, d) => {
                          if (!containerRef.current) return;
                          const rect = containerRef.current.getBoundingClientRect();
                          const newPdfX = (d.x / rect.width) * pdfDimensions.width;
                          const elemHeightPx = (coords.height / pdfDimensions.height) * rect.height;
                          const newPdfY = pdfDimensions.height - ((d.y + elemHeightPx) / rect.height * pdfDimensions.height);
                          setCoords(prev => prev ? ({ ...prev, x: newPdfX, y: newPdfY }) : null);
                        }}
                        onResizeStop={(e, direction, ref, delta, position) => {
                          if (!containerRef.current) return;
                          const rect = containerRef.current.getBoundingClientRect();

                          // Captura a nova largura e altura baseada no elemento DOM redimensionado
                          const newPdfW = (ref.offsetWidth / rect.width) * pdfDimensions.width;
                          const newPdfH = (ref.offsetHeight / rect.height) * pdfDimensions.height;

                          const newPdfX = (position.x / rect.width) * pdfDimensions.width;
                          const newPdfY = pdfDimensions.height - ((position.y + ref.offsetHeight) / rect.height * pdfDimensions.height);

                          setCoords(prev => prev ? ({
                            ...prev,
                            width: newPdfW,
                            height: newPdfH,
                            x: newPdfX,
                            y: newPdfY
                          }) : null);
                        }}
                        className="z-10 group animate-in fade-in duration-300"
                      >
                        <div className="w-full h-full bg-white/90 border border-slate-300 shadow-lg relative flex overflow-hidden cursor-move hover:ring-2 ring-blue-400 transition-all">
                          <button
                            onClick={(e) => { e.stopPropagation(); setCoords(null); }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all z-20 shadow-sm"
                            title="Remover assinatura"
                          >
                            <X size={12} />
                          </button>
                          <div className="w-[6px] h-full bg-[#0073b1] flex-shrink-0"></div>
                          <div className="flex-1 p-2 flex flex-col justify-center overflow-hidden">
                            <div className="absolute right-2 opacity-5 pointer-events-none">
                              <ShieldCheck size={coords.height * 0.8} />
                            </div>

                            {/* Ajustei o line-height (leading) para o texto não cortar se ficar muito achatado */}
                            <div
                              className="font-bold text-slate-900 leading-none uppercase whitespace-nowrap truncate"
                              style={{ fontSize: `${Math.max(10, coords.height * 0.25)}px` }}
                            >
                              SEU NOME AQUI
                            </div>
                            <div
                              className="text-[#0073b1] font-medium truncate leading-tight mt-1"
                              style={{ fontSize: `${Math.max(8, coords.height * 0.18)}px` }}
                            >
                              Assinado Digitalmente
                            </div>
                            {coords.height > 40 && (
                              <div
                                className="text-slate-400 mt-1 truncate leading-none"
                                style={{ fontSize: `${Math.max(6, coords.height * 0.15)}px` }}
                              >
                                {new Date().toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </Rnd>
                    )}
                  </div>
                </Document>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 mt-32">
                <FileUp className="w-16 h-16 mb-4 opacity-20" />
                <p>Nenhum documento carregado</p>
                <p className="text-xs mt-2 text-slate-500 italic">Selecione um PDF no painel ao lado</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignerTab;