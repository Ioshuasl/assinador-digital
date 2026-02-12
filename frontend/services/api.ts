import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://assinador-digital.api.ioshuavps.com.br';

const api = axios.create({
  baseURL: BASE_URL,
});

// Utility to download blobs
export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// --- NOVO: Utilitário para extrair erro de Blobs ---
// Como esperamos um Blob (PDF), se der erro o backend manda um JSON dentro do Blob.
// Precisamos converter esse Blob para texto para ler a mensagem.
export const extractErrorMessage = async (error: any): Promise<string> => {
  if (error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text();
      const json = JSON.parse(text);
      return json.message || 'Erro desconhecido no servidor.';
    } catch (e) {
      return 'Erro ao processar resposta do servidor.';
    }
  }
  return error.response?.data?.message || error.message || 'Erro inesperado.';
};

export default api;