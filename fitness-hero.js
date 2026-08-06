const fitnessHero = document.getElementById('fitnessHero');
const fitnessHeroSlidesRoot = document.getElementById('fitnessHeroSlides');
const fitnessHeroDotsRoot = document.getElementById('fitnessHeroDots');

if (fitnessHero && fitnessHeroSlidesRoot && fitnessHeroDotsRoot && window.FitnessBanners) {
  const {
    SLIDE_GRADIENTS,
    load: loadSlideData,
    applyFitToImg,
    getFilledSlideEntries
  } = window.FitnessBanners;

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
    fitnessHeroSlidesRoot.innerHTML = '';
    fitnessHeroDotsRoot.innerHTML = '';

    heroSlides = [];
    heroDots = [];

    for (let index = 0; index < count; index += 1) {
      const slide = document.createElement('div');
      slide.className = 'hero-slide';
      slide.dataset.index = String(index);
      slide.style.setProperty('--slide-bg', SLIDE_GRADIENTS[index % SLIDE_GRADIENTS.length]);
      fitnessHeroSlidesRoot.appendChild(slide);
      heroSlides.push(slide);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hero-dot';
      dot.dataset.slide = String(index);
      dot.setAttribute('aria-label', `Баннер ${index + 1}`);
      fitnessHeroDotsRoot.appendChild(dot);
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

    fitnessHero.classList.toggle('has-custom-banner', displayEntries.length > 0);

    if (heroSlides.length) {
      fitnessHeroSlidesRoot.style.transform = `translate3d(-${Math.min(activeSlide, displayCount - 1) * 100}%, 0, 0)`;
    }

    applyActiveSlide(Math.min(activeSlide, displayCount - 1));
  }

  function applyActiveSlide(index) {
    if (index < 0 || index >= heroSlides.length) return;

    activeSlide = index;

    if (fitnessHeroSlidesRoot) {
      fitnessHeroSlidesRoot.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
    }

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
    const rect = fitnessHero.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    return Math.min(heroSlides.length - 1, Math.max(0, Math.floor(ratio * heroSlides.length)));
  }

  function isInteractiveTarget(target) {
    return target.closest('.btn-hero, .hero-dot, .fitness-hero-btn');
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

  fitnessHero.addEventListener('mousemove', (e) => {
    if (isInteractiveTarget(e.target)) return;
    setActiveSlide(slideFromMouseEvent(e));
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
  }

  window.addEventListener('fitness-banners-updated', async () => {
    slideData = await loadSlideData();
    refreshSlides();
  });

  initFitnessHero();
}
