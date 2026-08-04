const hero = document.getElementById('hero');
const heroSlides = hero ? hero.querySelectorAll('.hero-slide') : [];
const heroDots = hero ? hero.querySelectorAll('.hero-dot') : [];

if (hero && window.HeroBanners) {
  const {
    HERO_SLIDE_COUNT,
    load: loadSlideData,
    applyFitToImg
  } = window.HeroBanners;

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
    const slide = heroSlides[index];
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
      slide.style.removeProperty('--slide-image');
      slide.classList.remove('has-image');
    }
  }

  function refreshSlides() {
    slideData.forEach((_, index) => applySlideImage(index));
    hero.classList.toggle('has-custom-banner', slideData.some(Boolean));
  }

  function setActiveSlide(index) {
    if (index < 0 || index >= HERO_SLIDE_COUNT || index === activeSlide) return;

    activeSlide = index;

    heroSlides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    heroDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function slideFromMouseEvent(e) {
    const rect = hero.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    return Math.min(HERO_SLIDE_COUNT - 1, Math.max(0, Math.floor(ratio * HERO_SLIDE_COUNT)));
  }

  function isInteractiveTarget(target) {
    return target.closest('.btn-hero, .hero-dot');
  }

  hero.addEventListener('mousemove', (e) => {
    if (isInteractiveTarget(e.target)) return;
    setActiveSlide(slideFromMouseEvent(e));
  });

  heroDots.forEach(dot => {
    dot.addEventListener('mouseenter', () => {
      setActiveSlide(Number(dot.dataset.slide));
    });
    dot.addEventListener('click', () => {
      setActiveSlide(Number(dot.dataset.slide));
    });
  });

  async function initHero() {
    slideData = await loadSlideData();
    refreshSlides();
    setActiveSlide(0);
    window.dispatchEvent(new CustomEvent('hero-ready'));
  }

  window.addEventListener('hero-banners-updated', async () => {
    slideData = await loadSlideData();
    refreshSlides();
    window.dispatchEvent(new CustomEvent('hero-ready'));
  });

  window.addEventListener('storage', async (e) => {
    if (e.key === window.HeroBanners.HERO_STORAGE_KEY) {
      slideData = await loadSlideData();
      refreshSlides();
    }
  });

  initHero();
}
