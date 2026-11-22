import { GlobalWorkerOptions, getDocument, type PDFDocumentLoadingTask, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { assetUrl } from '../config';
import { log, warn } from '../log';

GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Страницы PDF. У каждой страницы одна постоянная <img>; при смене размера
 * сцены страница перерисовывается в новом разрешении, и в <img> подменяется src.
 * Храним JPEG-блобы, а не канвасы: 20 канвасов 2K съели бы сотни мегабайт видеопамяти.
 */
export class Slides {
  private doc: PDFDocumentProxy | null = null;
  private task: PDFDocumentLoadingTask | null = null;
  count = 0;
  /** ширина/высота первой страницы */
  aspect = 16 / 9;
  private imgs: HTMLImageElement[] = [];
  private renderedPx: number[] = [];
  private targetPx = 1280;
  private generation = 0;
  private priority = 0;
  private running = false;

  async load(data: ArrayBuffer, onProgress: (done: number, total: number) => void, targetPx: number) {
    const oldTask = this.task;
    this.task = getDocument({
      data,
      cMapUrl: assetUrl('pdfjs/cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: assetUrl('pdfjs/standard_fonts/'),
      wasmUrl: assetUrl('pdfjs/wasm/'),
      iccUrl: assetUrl('pdfjs/iccs/'),
    });
    this.doc = await this.task.promise;
    oldTask?.destroy();
    this.count = this.doc.numPages;
    const first = await this.doc.getPage(1);
    const vp = first.getViewport({ scale: 1 });
    this.aspect = vp.width / vp.height;
    // старые <img> оставляем для страниц, которые есть и в новом PDF: так карточки на сцене не ломаются
    this.imgs = Array.from({ length: this.count }, (_, i) => this.imgs[i] ?? this.makeImg(i));
    this.renderedPx = new Array(this.count).fill(0);
    this.targetPx = targetPx;
    this.generation++;
    for (let i = 0; i < this.count; i++) {
      await this.renderPage(i, this.generation);
      onProgress(i + 1, this.count);
    }
    log(`PDF: ${this.count} стр., ${Math.round(targetPx)}px`);
  }

  private makeImg(i: number) {
    const img = new Image();
    img.className = 'slide-img';
    img.alt = `Слайд ${i + 1}`;
    img.draggable = false;
    return img;
  }

  img(i: number): HTMLImageElement {
    return this.imgs[i];
  }

  /** Новый размер сцены: перерисовать всё, начиная с текущего слайда. */
  resize(targetPx: number, current: number) {
    targetPx = Math.round(targetPx);
    if (Math.abs(targetPx - this.targetPx) < 8) return;
    this.targetPx = targetPx;
    this.priority = current;
    this.generation++;
    this.pump();
  }

  /** Показали другой слайд — перерисовываем в первую очередь его. */
  focus(current: number) {
    this.priority = current;
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    try {
      for (;;) {
        const gen = this.generation;
        const todo = [...Array(this.count).keys()]
          .filter((i) => this.renderedPx[i] !== this.targetPx)
          .sort((a, b) => Math.abs(a - this.priority) - Math.abs(b - this.priority));
        if (!todo.length) break;
        await this.renderPage(todo[0], gen);
        // даём браузеру подышать между страницами, чтобы не тормозила анимация
        await new Promise((r) => setTimeout(r, 16));
      }
    } finally {
      this.running = false;
    }
  }

  private async renderPage(i: number, gen: number) {
    if (!this.doc) return;
    const px = this.targetPx;
    try {
      const page = await this.doc.getPage(i + 1);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: px / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.94));
      canvas.width = canvas.height = 0;
      if (!blob || gen !== this.generation) return;
      const url = URL.createObjectURL(blob);
      const pre = new Image();
      pre.src = url;
      await pre.decode().catch(() => {});
      const img = this.imgs[i];
      const oldUrl = img.src;
      img.src = url;
      if (oldUrl.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(oldUrl), 2000);
      this.renderedPx[i] = px;
    } catch (e) {
      warn(`Не отрисовалась страница ${i + 1}: ${(e as Error).message}`);
    }
  }
}
