export default function initPhotoCarousel() {
  const slides = Array.from(document.querySelectorAll<HTMLElement>('[data-slide-index]'));
  const indicators = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-indicator-index]'));
  const prevBtn = document.querySelector<HTMLButtonElement>('[data-arrow="prev"]');
  const nextBtn = document.querySelector<HTMLButtonElement>('[data-arrow="next"]');

  if (!slides.length) return;

  let current = 0;
  let timer: ReturnType<typeof setInterval>;

  const showSlide = (index: number) => {
    slides.forEach((slide, i) => {
      slide.classList.toggle('opacity-100', i === index);
      slide.classList.toggle('opacity-0', i !== index);
    });
    indicators.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
    current = index;

    clearInterval(timer);
    autoSlide();
  };

  const autoSlide = () => {
    timer = setInterval(() => {
      showSlide((current + 1) % slides.length);
    }, 5000);
  };

  indicators.forEach((btn, i) => {
    btn.addEventListener('click', () => showSlide(i));
  });

  prevBtn?.addEventListener('click', () => {
    showSlide((current - 1 + slides.length) % slides.length);
  });

  nextBtn?.addEventListener('click', () => {
    showSlide((current + 1) % slides.length);
  });

  autoSlide();
}
