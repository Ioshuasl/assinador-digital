
export interface SignatureCoords {
  x: number;
  y: number;
  page: number;
}

export interface FileState {
  file: File | null;
  previewUrl: string | null;
}

export type AppTab = 'single' | 'batch' | 'utilities';
