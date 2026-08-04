const fitnessHero = document.getElementById('fitnessHero');

if (fitnessHero && window.FitnessBanners) {
  const slidesContainer = fitnessHero.querySelector('.hero-slides');
  const slides = fitnessHero.querySelectorAll('.hero-slide');
  const dots = fitnessHero.querySelectorAll('.hero-dot');
  const slideCount = slides.length;
  const {
    load: loadSlideData,
    applyFitToImg
  } = window.FitnessBanners;

  let activeSlide = 0;
  let slideData = [null, null, null, null];

  function bannerImageUrl(image) {
    if (!image) return '';
    if (image.startsWith('data:')) return image;
    const base = image.split('?')[0];
    return `${base}?t=${Date.now()}`;
  }

  function ensureSlideImg(slide) {
    let img = slide.querySelector('.hero-slide-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'hero-slide-img';
      img.alt = '';
      slide.appendChild(img);
    }
    return img;
  }

  function applySlideImage(index) {
    const slide = slides[index];
    const data = slideData[index];

    if (data?.image) {
      const img = ensureSlideImg(slide);
      img.src = bannerImageUrl(data.image);
      img.hidden = false;
      applyFitToImg(img);
      slide.classList.add('has-image');
    } else {
      const img = slide.querySelector('.hero-slide-img');
      if (img) {
        img.removeAttribute('src');
        img.hidden = true;
      }
      slide.classList.remove('has-image');
    }
  }

  function refreshSlides() {
    slideData.forEach((_, index) => applySlideImage(index));
    fitnessHero.classList.toggle('has-custom-banner', slideData.some(Boolean));
  }

  function setActiveSlide(index) {
    if (index < 0 || index >= slideCount || index === activeSlide) return;

    activeSlide = index;

    if (slidesContainer) {
      slidesContainer.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
    }

    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function slideFromMouseEvent(e) {
    const rect = fitnessHero.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    return Math.min(slideCount - 1, Math.max(0, Math.floor(ratio * slideCount)));
  }

  function isInteractiveTarget(target) {
    return target.closest('.btn-hero, .hero-dot, .fitness-hero-btn');
  }

  fitnessHero.addEventListener('mousemove', (e) => {
    if (isInteractiveTarget(e.target)) return;
    setActiveSlide(slideFromMouseEvent(e));
  });

  dots.forEach((dot) => {
    dot.addEventListener('mouseenter', () => {
      setActiveSlide(Number(dot.dataset.slide));
    });
    dot.addEventListener('click', () => {
      setActiveSlide(Number(dot.dataset.slide));
    });
  });

  const scrollBtn = fitnessHero.querySelector('.fitness-hero-btn');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', (e) => {
      const target = document.getElementById('fitnessWorks');
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function initFitnessHero() {
    slideData = await loadSlideData();
    refreshSlides();
    setActiveSlide(0);
  }

  window.addEventListener('fitness-banners-updated', async () => {
    slideData = await loadSlideData();
    refreshSlides();
  });

  initFitnessHero();
}
