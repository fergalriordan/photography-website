import { initLightbox } from './lightbox';
import { packGroup } from './columnPacker';

/**
 * Gallery grid: the same flush-column packer the homepage collage uses, but
 * with a single group of photos and no "Show More" split.
 */
export default function initGalleryColumns() {
  const init = () => {
    const grid = document.querySelector<HTMLElement>('.photo-columns');
    if (!grid) return;

    // Only used to name the gallery in the dev-mode warning below.
    const label = grid.dataset.gallery ?? 'gallery';

    // Capture every image once, in data order, before we move any into columns,
    // and wire the lightbox up now so prev/next follows the order in
    // galleries.ts rather than the column-by-column order of the packed DOM.
    const imgs = Array.from(grid.querySelectorAll<HTMLImageElement>('img'));
    initLightbox('.photo-columns img');

    const colCount = () =>
      window.matchMedia('(min-width: 768px)').matches ? 4 : 2;

    const layout = () => {
      const cols = colCount();

      const columns: HTMLDivElement[] = [];
      const heights: number[] = [];
      for (let i = 0; i < cols; i++) {
        const col = document.createElement('div');
        col.className = 'photo-col';
        columns.push(col);
        heights.push(0);
      }

      const { surplus } = packGroup(imgs, columns, heights);

      grid.replaceChildren(...columns);
      grid.classList.add('cols-ready');

      // A gallery only ends flush if each orientation count divides evenly by
      // the column count. The ragged bottom already says so on screen; this
      // just names the numbers, since the fix is in the data array.
      if (import.meta.env.DEV && (surplus.portrait || surplus.landscape)) {
        console.warn(
          `${label}: ${surplus.portrait} portrait / ${surplus.landscape} landscape ` +
          `surplus at ${cols} columns — cut that many (or top up) to end flush; ` +
          `each orientation count needs to be a multiple of 4.`
        );
      }
    };

    layout();

    let lastCols = colCount();
    let resizeTimer: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (colCount() !== lastCols) {
          lastCols = colCount();
          layout();
        }
      }, 150);
    }, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
