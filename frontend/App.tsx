import React, { useState } from 'react';
import { PenTool, Files, Settings2, LayoutDashboard } from 'lucide-react';
import { Toaster } from 'sonner'; // <--- Importar Sonner
import SignerTab from './components/SignerTab';
import BatchTab from './components/BatchTab';
import ConverterTab from './components/ConverterTab';
import { AppTab } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('single');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Componente de Notificação Global */}
      <Toaster position="top-center" richColors closeButton />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">SignDoc</h1>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Enterprise Signature v1.0</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-1">
              <button 
                onClick={() => setActiveTab('single')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'single' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <LayoutDashboard className="w-4 h-4" /> Assinar Individual
              </button>
              <button 
                onClick={() => setActiveTab('batch')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'batch' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Files className="w-4 h-4" /> Lote de Assinaturas
              </button>
              <button 
                onClick={() => setActiveTab('utilities')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'utilities' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Settings2 className="w-4 h-4" /> Utilitários
              </button>
            </nav>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-900">API Local</p>
                <div className="flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden bg-white border-b border-slate-200 grid grid-cols-3 p-2 sticky top-16 z-40">
        <button onClick={() => setActiveTab('single')} className={`flex flex-col items-center p-2 rounded ${activeTab === 'single' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}>
          <PenTool className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Single</span>
        </button>
        <button onClick={() => setActiveTab('batch')} className={`flex flex-col items-center p-2 rounded ${activeTab === 'batch' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}>
          <Files className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Batch</span>
        </button>
        <button onClick={() => setActiveTab('utilities')} className={`flex flex-col items-center p-2 rounded ${activeTab === 'utilities' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}>
          <Settings2 className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Utils</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-slate-900">
            {activeTab === 'single' && 'Assinatura Individual'}
            {activeTab === 'batch' && 'Processamento em Lote'}
            {activeTab === 'utilities' && 'Utilitários de PDF'}
          </h2>
          <p className="text-slate-500 mt-1">
            {activeTab === 'single' && 'Posicione e assine documentos PDF com certificados digitais A1.'}
            {activeTab === 'batch' && 'Assine múltiplos documentos simultaneamente com um único clique.'}
            {activeTab === 'utilities' && 'Converta e otimize seus documentos PDF para padrões internacionais.'}
          </p>
        </div>

        {activeTab === 'single' && <SignerTab />}
        {activeTab === 'batch' && <BatchTab />}
        {activeTab === 'utilities' && <ConverterTab />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs">
          <p>© 2024 SignDoc Enterprise. Desenvolvido para máxima segurança e eficiência.</p>
          <div className="mt-2 flex justify-center gap-4">
             <span className="hover:text-white cursor-pointer transition-colors">Privacidade</span>
             <span className="hover:text-white cursor-pointer transition-colors">Documentação da API</span>
             <span className="hover:text-white cursor-pointer transition-colors">Suporte Técnico</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;