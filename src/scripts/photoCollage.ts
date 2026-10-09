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

    const eagerImgs = allImgs.filter(img => img.dataset.lazy !== 'true');
    const lazyImgs = allImgs.filter(img => img.dataset.lazy === 'true');

    let expanded = false;

    const colCount = () =>
      window.matchMedia('(min-width: 768px)').matches ? 4 : 2;

    const isPortrait = (img: HTMLImageElement) => img.classList.contains('portrait');

    // Append one group of tiles to `columns`, in data order, keeping the columns
    // level. For columns to end flush, every column must take the SAME number of
    // portraits and the SAME number of landscapes (the two tile heights differ,
    // so matching totals is the only way). Keep the largest multiple of `cols` of
    // each orientation and drop the leftover few that can't be divided evenly.
    // `heights` is carried in and mutated so a later group stacks on top of an
    // earlier one.
    const packGroup = (
      imgs: HTMLImageElement[],
      columns: HTMLDivElement[],
      heights: number[]
    ) => {
      const cols = columns.length;
      const portraits = imgs.filter(isPortrait);
      const landscapes = imgs.filter(img => !isPortrait(img));
      const perColPortrait = Math.floor(portraits.length / cols);
      const perColLandscape = Math.floor(landscapes.length / cols);
      const keep = new Set<HTMLImageElement>([
        ...portraits.slice(0, perColPortrait * cols),
        ...landscapes.slice(0, perColLandscape * cols),
      ]);

      const portraitLeft = new Array<number>(cols).fill(perColPortrait);
      const landscapeLeft = new Array<number>(cols).fill(perColLandscape);

      imgs.forEach(img => {
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
    };

    const layout = () => {
      const cols = colCount();

      const columns: HTMLDivElement[] = [];
      const heights: number[] = [];
      for (let i = 0; i < cols; i++) {
        const col = document.createElement('div');
        col.className = 'collage-col';
        columns.push(col);
        heights.push(0);
      }

      // Pack the eager tiles as their own group, so where each one lands depends
      // only on the eager set. Expanding then appends the lazy tiles *below*
      // them rather than re-flowing everything — the images already on screen
      // stay exactly where they were. Each group ends level on its own, so the
      // columns are still flush once both are placed.
      packGroup(eagerImgs, columns, heights);
      if (expanded) {
        packGroup(lazyImgs, columns, heights);
      }

      // Swap the freshly built columns in as the grid's only children. Lazy
      // tiles are simply left out while collapsed, so they stay detached.
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
