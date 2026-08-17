const hero = document.getElementById('hero');
const heroSlidesRoot = document.getElementById('heroSlides');
const heroDotsRoot = document.getElementById('heroDots');

if (hero && heroSlidesRoot && heroDotsRoot && window.HeroBanners) {
  const {
    SLIDE_GRADIENTS,
    load: loadSlideData,
    applyFitToImg,
    getFilledSlideEntries,
    withDefaultHeroSlides
  } = window.HeroBanners;

  let activeSlide = 0;
  let slideData = [];
  let displayEntries = [];
  let heroSlides = [];
  let heroDots = [];

  function bannerImageUrl(image) {
    if (!image) return '';
    if (image.startsWith('data:')) return image;
    const base = image.split('?')[0];
    return `${base}?t=${Date.now()}`;
  }

  function ensureSlideElements(count) {
    heroSlidesRoot.innerHTML = '';
    heroDotsRoot.innerHTML = '';

    heroSlides = [];
    heroDots = [];

    for (let index = 0; index < count; index += 1) {
      const slide = document.createElement('div');
      slide.className = 'hero-slide';
      slide.dataset.index = String(index);
      slide.style.setProperty('--slide-bg', SLIDE_GRADIENTS[index % SLIDE_GRADIENTS.length]);
      heroSlidesRoot.appendChild(slide);
      heroSlides.push(slide);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hero-dot';
      dot.dataset.slide = String(index);
      dot.setAttribute('aria-label', `Баннер ${index + 1}`);
      heroDotsRoot.appendChild(dot);
      heroDots.push(dot);
    }
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

  function applySlideImage(displayIndex) {
    const slide = heroSlides[displayIndex];
    const entry = displayEntries[displayIndex];
    const data = entry?.slide;

    if (data?.image) {
      const img = ensureSlideImg(slide);
      img.src = bannerImageUrl(data.image);
      img.hidden = false;
      applyFitToImg(img, data.fit);
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
    displayEntries = getFilledSlideEntries(slideData);
    const displayCount = Math.max(1, displayEntries.length);

    ensureSlideElements(displayCount);
    bindDotEvents();

    for (let index = 0; index < displayCount; index += 1) {
      applySlideImage(index);
    }

    hero.classList.toggle('has-custom-banner', displayEntries.length > 0);
    applyActiveSlide(Math.min(activeSlide, displayCount - 1));
  }

  function applyActiveSlide(index) {
    if (index < 0 || index >= heroSlides.length) return;

    activeSlide = index;

    heroSlides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    heroDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  function setActiveSlide(index) {
    if (index < 0 || index >= heroSlides.length || index === activeSlide) return;
    applyActiveSlide(index);
  }

  function slideFromMouseEvent(e) {
    const rect = hero.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    return Math.min(heroSlides.length - 1, Math.max(0, Math.floor(ratio * heroSlides.length)));
  }

  function isInteractiveTarget(target) {
    return target.closest('.btn-hero, .hero-dot');
  }

  function bindDotEvents() {
    heroDots.forEach((dot) => {
      dot.addEventListener('mouseenter', () => {
        setActiveSlide(Number(dot.dataset.slide));
      });
      dot.addEventListener('click', () => {
        setActiveSlide(Number(dot.dataset.slide));
      });
    });
  }

  hero.addEventListener('mousemove', (e) => {
    if (isInteractiveTarget(e.target)) return;
    setActiveSlide(slideFromMouseEvent(e));
  });

  async function initHero() {
    slideData = withDefaultHeroSlides(await loadSlideData());
    refreshSlides();
    window.dispatchEvent(new CustomEvent('hero-ready'));
  }

  window.addEventListener('hero-banners-updated', async () => {
    slideData = withDefaultHeroSlides(await loadSlideData());
    refreshSlides();
    window.dispatchEvent(new CustomEvent('hero-ready'));
  });

  window.addEventListener('storage', async (e) => {
    if (e.key === window.HeroBanners.HERO_STORAGE_KEY) {
      slideData = withDefaultHeroSlides(await loadSlideData());
      refreshSlides();
    }
  });

  initHero();
}
