// Relative tile heights for the two fixed aspect ratios (height / width):
// portrait 2:3 -> 1.5, landscape 3:2 -> 0.667. Column width is constant, so
// these are all the packer needs to keep columns level.
export const HEIGHT_UNIT = { portrait: 3 / 2, landscape: 2 / 3 } as const;

export const isPortrait = (img: HTMLImageElement) => img.classList.contains('portrait');

export interface PackResult {
  /**
   * Tiles beyond the largest evenly-divisible block. Non-zero means the grid
   * ends ragged and the data array needs pruning (or topping up).
   */
  surplus: { portrait: number; landscape: number };
}

/**
 * Append one group of tiles to `columns`, in data order, keeping the columns
 * level. For columns to end flush, every column must take the SAME number of
 * portraits and the SAME number of landscapes (the two tile heights differ,
 * so matching totals is the only way). `heights` is carried in and mutated so
 * a later group stacks on top of an earlier one.
 *
 * Every tile is placed — nothing is ever hidden. Tiles beyond the largest
 * evenly-divisible block can't be levelled by definition, so they go last,
 * each into the shortest column, and the grid ends ragged. That raggedness is
 * deliberate: it's the visible signal that a collection needs pruning or one
 * more photo. Hiding the surplus instead would keep the grid tidy while
 * quietly dropping photos off the site.
 */
export function packGroup(
  imgs: HTMLImageElement[],
  columns: HTMLDivElement[],
  heights: number[]
): PackResult {
  const cols = columns.length;
  const portraits = imgs.filter(isPortrait);
  const landscapes = imgs.filter(img => !isPortrait(img));
  const perColPortrait = Math.floor(portraits.length / cols);
  const perColLandscape = Math.floor(landscapes.length / cols);
  const levelled = new Set<HTMLImageElement>([
    ...portraits.slice(0, perColPortrait * cols),
    ...landscapes.slice(0, perColLandscape * cols),
  ]);

  const portraitLeft = new Array<number>(cols).fill(perColPortrait);
  const landscapeLeft = new Array<number>(cols).fill(perColLandscape);

  const shortest = () => {
    let target = 0;
    for (let i = 1; i < cols; i++) {
      if (heights[i] < heights[target]) target = i;
    }
    return target;
  };

  const place = (img: HTMLImageElement, target: number) => {
    heights[target] += isPortrait(img) ? HEIGHT_UNIT.portrait : HEIGHT_UNIT.landscape;
    // The collage's lazy tiles start hidden in the markup; placing one reveals it.
    img.style.display = '';
    columns[target].appendChild(img);
  };

  const surplus: HTMLImageElement[] = [];

  imgs.forEach(img => {
    if (!levelled.has(img)) {
      surplus.push(img);
      return;
    }
    const capacity = isPortrait(img) ? portraitLeft : landscapeLeft;
    // Among columns that still need this orientation, pick the shortest so
    // the fill looks balanced while it grows. Final heights are identical.
    let target = -1;
    for (let i = 0; i < cols; i++) {
      if (capacity[i] > 0 && (target === -1 || heights[i] < heights[target])) {
        target = i;
      }
    }
    capacity[target] -= 1;
    place(img, target);
  });

  // The surplus goes below the levelled block, so everything above it is
  // already exactly what the grid will look like once the counts come out
  // even — the ragged tail is only the photos still to resolve.
  surplus.forEach(img => place(img, shortest()));

  return {
    surplus: {
      portrait: portraits.length - perColPortrait * cols,
      landscape: landscapes.length - perColLandscape * cols,
    },
  };
}
