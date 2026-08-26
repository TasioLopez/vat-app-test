'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { protectDutchDatesInText } from '@/lib/tp/date-line-breaks';

const TPDocumentRenderContext = createContext(false);

export function TPDocumentRenderProvider({ children }: { children: ReactNode }) {
  return (
    <TPDocumentRenderContext.Provider value={true}>{children}</TPDocumentRenderContext.Provider>
  );
}

export function useTPDocumentRender(): boolean {
  return useContext(TPDocumentRenderContext);
}

/** Apply date line-break protection when rendering the TP document (preview/PDF). */
export function useDocumentText(text: string): string {
  const forDocument = useTPDocumentRender();
  if (!forDocument || !text) return text;
  return protectDutchDatesInText(text);
}
