import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error - vite handles ?url imports
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractTextFromPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
  const pdf = await loadingTask.promise;
  try {
    let full = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = content.items as { str: string }[];
      full += items.map((it) => it.str).join(' ') + '\n';
    }
    return full;
  } finally {
    try {
      await pdf.destroy();
    } catch {
      /* noop */
    }
  }
}
