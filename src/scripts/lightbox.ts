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
    // Lay slides out in the lightbox's own box (fixed, 100% tall), the same
    // box the gallery link is positioned in, rather than PhotoSwipe's default
    // window.innerHeight, so the photo and the link can't disagree.
    getViewportSizeFn: (_options, pswp) => ({
      x: document.documentElement.clientWidth,
      y: (pswp as { element?: HTMLElement }).element?.clientHeight || window.innerHeight,
    }),
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

  // Hold the page still while open. PhotoSwipe already stops touch and wheel
  // scrolling over its overlay (touch-action: none, its wheel handler);
  // `overflow: hidden` on <html> covers the rest (keyboard, scrollbar) and
  // keeps the scroll position, so there's nothing to restore. Don't pin the
  // body with position: fixed: that collapses the page's height, and iOS
  // Safari answers by expanding its toolbar mid-open, after PhotoSwipe has
  // laid the photo out for the taller screen — leaving it low, over the link.
  // Hiding the overflow removes a desktop browser's scrollbar, so the page
  // and the fixed header are padded by its width (see
  // --locked-scrollbar-width in global.css) to stop them shifting sideways;
  // 0 on overlay scrollbars. Unlocked on destroy, after the zoom-out.
  const root = document.documentElement;

  lightbox.on('beforeOpen', () => {
    root.style.setProperty('--locked-scrollbar-width', `${window.innerWidth - root.clientWidth}px`);
    root.style.overflow = 'hidden';
  });

  lightbox.on('destroy', () => {
    root.style.removeProperty('--locked-scrollbar-width');
    root.style.overflow = '';
  });

  // PhotoSwipe ignores viewport resizes during its opening animation and then
  // treats the new size as already handled, so a resize in that window (e.g.
  // a mobile toolbar moving) would leave the photo laid out for the old size.
  // Re-lay out once it has opened; a no-op when nothing changed.
  lightbox.on('openingAnimationEnd', () => lightbox.pswp?.updateSize(true));

  lightbox.init();

  imgs.forEach((img, i) => {
    img.addEventListener('click', () => lightbox.loadAndOpen(i));
  });
}
