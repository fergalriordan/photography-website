import PhotoSwipeLightbox from 'photoswipe/lightbox';
import type { SlideData } from 'photoswipe';
import 'photoswipe/style.css';

/**
 * Fullscreen viewer (PhotoSwipe v5) over `imgs`, in the order given. Callers
 * pass the images captured before packing, so prev/next follows the data
 * arrays rather than the column-by-column order of the packed DOM.
 */
export function initLightbox(imgs: HTMLImageElement[]) {
  if (imgs.length === 0) return;

  // Width/height come from the attributes (the source photo's size from
  // src/data/), not the rendered tile. Tiles are cropped to 3:2 / 2:3 with
  // object-fit: cover, hence thumbCropped for the zoom in/out animation.
  const dataSource: SlideData[] = imgs.map((img) => ({
    src: img.src,
    msrc: img.src,
    width: Number(img.getAttribute('width')),
    height: Number(img.getAttribute('height')),
    alt: img.alt,
    element: img,
    thumbCropped: true,
    gallerySlug: img.dataset.gallerySlug,
    galleryLabel: img.dataset.galleryLabel,
  }));

  const lightbox = new PhotoSwipeLightbox({
    dataSource,
    pswpModule: () => import('photoswipe'),
    loop: false,
    bgOpacity: 0.95,
    closeOnVerticalDrag: true,
    preload: [1, 3],
    // Text glyphs styled in global.css instead of PhotoSwipe's icons; no zoom
    // button, and the counter is our own (bottom, auto-hiding) below.
    zoom: false,
    counter: false,
    closeSVG: '&times;',
    arrowPrevSVG: '&#8249;',
    arrowNextSVG: '&#8250;',
    // A tap beside the photo closes; a tap on it does nothing. (PhotoSwipe's
    // default toggles the controls, which would hide the arrows and close.)
    tapAction: (_point, e) => {
      if (!(e.target as Element).classList.contains('pswp__img')) lightbox.pswp?.close();
    },
    // Photos go edge to edge, except where the persistent gallery link is
    // shown (homepage collage): then the image needs clear space below it.
    // Phones are width-bound, so there the image keeps full width and gets
    // symmetric vertical padding to stay centred.
    paddingFn: (viewportSize, itemData) => {
      if (!itemData.gallerySlug) return { top: 0, bottom: 0, left: 0, right: 0 };
      if (viewportSize.x < 768) return { top: 56, bottom: 56, left: 0, right: 0 };
      const side = viewportSize.x * 0.05;
      return { top: 20, bottom: 56, left: side, right: side };
    },
  });

  lightbox.on('uiRegister', () => {
    // "3 / 20" at the bottom, shown on open and on every slide change, then
    // fading out after 2s.
    lightbox.pswp?.ui?.registerElement({
      name: 'bottom-counter',
      appendTo: 'root',
      order: 8,
      onInit: (el, pswp) => {
        el.setAttribute('aria-live', 'polite');
        let hideTimer: ReturnType<typeof setTimeout>;
        pswp.on('change', () => {
          el.textContent = `${pswp.currIndex + 1} / ${pswp.getNumItems()}`;
          el.classList.add('is-shown');
          clearTimeout(hideTimer);
          hideTimer = setTimeout(() => el.classList.remove('is-shown'), 2000);
        });
        pswp.on('close', () => {
          clearTimeout(hideTimer);
          el.classList.remove('is-shown');
        });
      },
    });

    // "<Label> Gallery →" under the photo, for images that carry
    // data-gallery-slug/label. It stays visible the whole time the lightbox
    // is open, fading in and out with it (unlike the auto-hiding counter).
    lightbox.pswp?.ui?.registerElement({
      name: 'gallery-link',
      tagName: 'a',
      appendTo: 'root',
      order: 9,
      onInit: (el, pswp) => {
        const link = el as HTMLAnchorElement;
        const update = () => {
          const { gallerySlug, galleryLabel } = pswp.currSlide?.data ?? {};
          link.hidden = !(gallerySlug && galleryLabel);
          if (gallerySlug && galleryLabel) {
            link.href = `/galleries/${gallerySlug}`;
            link.textContent = `${galleryLabel} Gallery →`;
          }
        };
        pswp.on('change', update);
        pswp.on('openingAnimationStart', () => link.classList.add('is-shown'));
        pswp.on('closingAnimationStart', () => link.classList.remove('is-shown'));
      },
    });
  });

  // Pin the page in place while open. `overflow: hidden` alone doesn't stop
  // touch scrolling on iOS Safari, so the page could drift behind the
  // lightbox. Unlocked on destroy, after the zoom-out has read the tile rects.
  let lockedScrollY = 0;

  lightbox.on('beforeOpen', () => {
    lockedScrollY = window.scrollY;
    Object.assign(document.body.style, {
      position: 'fixed', top: `-${lockedScrollY}px`, left: '0', right: '0', overflow: 'hidden',
    });
  });

  lightbox.on('destroy', () => {
    Object.assign(document.body.style, { position: '', top: '', left: '', right: '', overflow: '' });
    window.scrollTo({ top: lockedScrollY, behavior: 'instant' });
  });

  lightbox.init();

  imgs.forEach((img, i) => {
    img.addEventListener('click', () => lightbox.loadAndOpen(i));
  });
}
