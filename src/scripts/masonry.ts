// Row height and gap must match the CSS values in global.css:
// grid-auto-rows: 4px and gap: 0.5rem (8px)
const ROW_HEIGHT = 4;
const GAP = 8;

export function recalcGrid(grid: HTMLElement) {
  const imgs = grid.querySelectorAll<HTMLImageElement>('img');
  imgs.forEach(img => {
    const w = parseInt(img.getAttribute('data-w') ?? '0');
    const h = parseInt(img.getAttribute('data-h') ?? '0');
    if (!w || !h) return;
    const colWidth = img.offsetWidth;
    if (!colWidth) return;
    const renderedHeight = (colWidth * h) / w;
    const span = Math.ceil((renderedHeight + GAP) / (ROW_HEIGHT + GAP));
    img.style.gridRowEnd = `span ${span}`;
  });
}

export function initMasonry() {
  const grids = Array.from(
    document.querySelectorAll<HTMLElement>('.masonry-galleries')
  );

  grids.forEach(grid => recalcGrid(grid));

  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      grids.forEach(grid => recalcGrid(grid));
    }, 100);
  }, { passive: true });
}
