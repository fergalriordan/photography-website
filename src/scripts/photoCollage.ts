import { initLightbox } from './lightbox';

// Relative tile heights for the two fixed aspect ratios (height / width):
// portrait 2:3 -> 1.5, landscape 3:2 -> 0.667. Column width is constant, so
// these are all the packer needs to keep columns level.
const HEIGHT_UNIT = { portrait: 3 / 2, landscape: 2 / 3 } as const;

export default function initPhotoCollage() {
  const init = () => {
    const grid = document.getElementById('photoGrid');
    if (!grid) return;

    // Capture every image once, in data order, before we move any into columns.
    // The lightbox keeps this order for prev/next navigation regardless of where
    // each tile ends up visually.
    const allImgs = Array.from(grid.querySelectorAll<HTMLImageElement>('img'));
    initLightbox('.collage-columns img');

    let expanded = false;

    const colCount = () =>
      window.matchMedia('(min-width: 768px)').matches ? 4 : 2;

    const isPortrait = (img: HTMLImageElement) => img.classList.contains('portrait');

    const layout = () => {
      const cols = colCount();

      // Active tiles: eager always, lazy only once expanded — in data order.
      const active = allImgs.filter(
        img => expanded || img.dataset.lazy !== 'true'
      );

      // For columns to end perfectly level, every column must hold the SAME
      // number of portraits and the SAME number of landscapes (the two tile
      // heights differ, so matching totals is the only way to guarantee a flush
      // bottom). Keep the largest multiple of `cols` of each orientation and
      // drop the leftover few (in data order) that can't be divided evenly.
      const portraits = active.filter(isPortrait);
      const landscapes = active.filter(img => !isPortrait(img));
      const perColPortrait = Math.floor(portraits.length / cols);
      const perColLandscape = Math.floor(landscapes.length / cols);
      const keep = new Set<HTMLImageElement>([
        ...portraits.slice(0, perColPortrait * cols),
        ...landscapes.slice(0, perColLandscape * cols),
      ]);

      const columns: HTMLDivElement[] = [];
      const heights: number[] = [];
      const portraitLeft: number[] = [];
      const landscapeLeft: number[] = [];
      for (let i = 0; i < cols; i++) {
        const col = document.createElement('div');
        col.className = 'collage-col';
        columns.push(col);
        heights.push(0);
        portraitLeft.push(perColPortrait);
        landscapeLeft.push(perColLandscape);
      }

      active.forEach(img => {
        if (!keep.has(img)) {
          // Excess tile for this column count — leave it out of the grid.
          img.style.display = 'none';
          return;
        }
        const portrait = isPortrait(img);
        const capacity = portrait ? portraitLeft : landscapeLeft;
        // Among columns that still need this orientation, pick the shortest so
        // the fill looks balanced while it grows. Final heights are identical.
        let target = -1;
        for (let i = 0; i < cols; i++) {
          if (capacity[i] > 0 && (target === -1 || heights[i] < heights[target])) {
            target = i;
          }
        }
        capacity[target] -= 1;
        heights[target] += portrait ? HEIGHT_UNIT.portrait : HEIGHT_UNIT.landscape;
        img.style.display = '';
        columns[target].appendChild(img);
      });

      // Swap the freshly built columns in as the grid's only children.
      grid.replaceChildren(...columns);
      grid.classList.add('cols-ready');
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
