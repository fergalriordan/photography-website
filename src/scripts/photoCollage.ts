import { initLightbox } from './lightbox';
import { packGroup } from './columnPacker';

export default function initPhotoCollage() {
  const init = () => {
    const grid = document.getElementById('photoGrid');
    if (!grid) return;

    // Capture every image once, in data order, before we move any into columns.
    // The lightbox keeps this order for prev/next navigation regardless of where
    // each tile ends up visually.
    const allImgs = Array.from(grid.querySelectorAll<HTMLImageElement>('img'));
    initLightbox(allImgs);

    const eagerImgs = allImgs.filter(img => img.dataset.lazy !== 'true');
    const lazyImgs = allImgs.filter(img => img.dataset.lazy === 'true');

    let expanded = false;

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

      // Pack the eager tiles as their own group, so where each one lands depends
      // only on the eager set. Expanding then appends the lazy tiles *below*
      // them rather than re-flowing everything — the images already on screen
      // stay exactly where they were. Each group ends level on its own, so the
      // columns are still flush once both are placed.
      const eager = packGroup(eagerImgs, columns, heights);
      const lazy = expanded ? packGroup(lazyImgs, columns, heights) : null;

      // Swap the freshly built columns in as the grid's only children. Lazy
      // tiles are simply left out while collapsed, so they stay detached.
      grid.replaceChildren(...columns);
      grid.classList.add('cols-ready');

      // Each group has to divide evenly on its own, or the collage ends ragged
      // — which is the on-screen signal. Name the numbers while authoring.
      if (import.meta.env.DEV) {
        for (const [name, r] of [['eager', eager], ['lazy', lazy]] as const) {
          if (r && (r.surplus.portrait || r.surplus.landscape)) {
            console.warn(
              `collage ${name}: ${r.surplus.portrait} portrait / ${r.surplus.landscape} ` +
              `landscape surplus at ${cols} columns — cut that many (or top up) to ` +
              `end flush; each orientation count needs to be a multiple of 4.`
            );
          }
        }
      }
    };

    layout();

    const btn = document.getElementById('showMoreBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        expanded = !expanded;
        layout();
        btn.textContent = expanded ? 'Show Less' : 'Show More';
        btn.setAttribute('aria-expanded', String(expanded));
        // Collapsing shrinks the page; if we were scrolled past the new bottom
        // the browser leaves the view stranded below all content (blank screen)
        // until the next scroll. Clamp back into bounds so the button stays put.
        if (!expanded) {
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          if (window.scrollY > maxScroll) {
            window.scrollTo({ top: Math.max(maxScroll, 0) });
          }
        }
      });
    }

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
