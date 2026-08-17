const clothingHero = document.getElementById('clothingHero');

if (clothingHero && window.ClothingBanners) {
  const bannerBox = document.getElementById('clothingHeroBanner');
  const slidesViewport = document.getElementById('clothingHeroSlidesViewport');
  const slidesContainer = document.getElementById('clothingHeroSlides');
  const progressRoot = document.getElementById('clothingHeroProgress');
  const AUTOPLAY_MS = 6000;

  const {
    SLIDE_GRADIENTS,
    load: loadSlideData,
    applyFitToImg,
    getFilledSlideEntries,
    withDefaultClothingSlides
  } = window.ClothingBanners;

  let activeSlide = 0;
  let slideData = [];
  let displayEntries = [];
  let slides = [];
  let lines = [];
  let slideCount = 0;
  let autoplayTimer = null;
  let isPaused = false;
  let hoverRatio = 0;

  const SLIDE_TRANSITION = 'transform 0.55s cubic-bezier(0.25, 0.1, 0.25, 1)';
  const HOVER_SCRUB_TRANSITION = 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)';

  function slideShiftPx() {
    const viewport = slidesViewport || slidesContainer;
    return viewport?.clientWidth || 0;
  }

  function setSlideTransition(mode) {
    if (!slidesContainer) return;
    if (mode === 'hover') {
      slidesContainer.style.transition = HOVER_SCRUB_TRANSITION;
    } else if (mode === 'snap') {
      slidesContainer.style.transition = SLIDE_TRANSITION;
    } else {
      slidesContainer.style.transition = 'none';
    }
  }

  function applySlideTransform(index) {
    if (!slidesContainer) return;
    const shift = slideShiftPx();
    slidesContainer.style.transform = shift
      ? `translate3d(-${index * shift}px, 0, 0)`
      : `translate3d(-${index * 100}%, 0, 0)`;
  }

  function applyContinuousTransform(ratio) {
    if (!slidesContainer || slideCount <= 1) return;
    const shift = slideShiftPx();
    if (!shift) return;

    const maxIndex = slideCount - 1;
    const offset = ratio * maxIndex * shift;
    slidesContainer.style.transform = `translate3d(-${offset}px, 0, 0)`;
  }

  function updateIndicators(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });

    lines.forEach((line, i) => {
      const isActive = i === index;
      line.classList.toggle('active', isActive);
      line.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function nearestSlideIndex(ratio) {
    const maxIndex = Math.max(0, slideCount - 1);
    return Math.min(maxIndex, Math.max(0, Math.round(ratio * maxIndex)));
  }

  function bannerImageUrl(image) {
    if (!image) return '';
    if (image.startsWith('data:')) return image;
    const base = image.split('?')[0];
    return `${base}?t=${Date.now()}`;
  }

  function ensureSlideImg(slide) {
    let img = slide.querySelector('.clothing-hero-slide-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'clothing-hero-slide-img';
      img.alt = '';
      img.decoding = 'async';
      img.fetchPriority = 'high';
      slide.appendChild(img);
    }
    return img;
  }

  function applySlideImage(displayIndex) {
    const slide = slides[displayIndex];
    const data = displayEntries[displayIndex]?.slide;
    if (!slide || !data?.image) return;

    const img = ensureSlideImg(slide);
    img.src = bannerImageUrl(data.image);
    img.sizes = '(max-width: 960px) min(400px, 100vw), 400px';
    if (data.width && data.height) {
      img.width = data.width;
      img.height = data.height;
    } else {
      img.removeAttribute('width');
      img.removeAttribute('height');
    }
    img.hidden = false;
    applyFitToImg(img, data.fit);
    slide.classList.add('has-image');
  }

  function ensureSlideElements(count) {
    if (!slidesContainer || !progressRoot) return;

    slidesContainer.innerHTML = '';
    progressRoot.innerHTML = '';
    slides = [];
    lines = [];

    for (let index = 0; index < count; index += 1) {
      const sourceIndex = displayEntries[index]?.index ?? index;
      const slide = document.createElement('div');
      slide.className = `clothing-hero-slide${index === 0 ? ' active' : ''}`;
      slide.dataset.index = String(index);
      slide.style.setProperty('--slide-bg', SLIDE_GRADIENTS[sourceIndex % SLIDE_GRADIENTS.length]);
      slidesContainer.appendChild(slide);
      slides.push(slide);

      const line = document.createElement('button');
      line.type = 'button';
      line.className = `clothing-hero-line${index === 0 ? ' active' : ''}`;
      line.dataset.slide = String(index);
      line.setAttribute('role', 'tab');
      line.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      line.setAttribute('aria-label', `Баннер ${index + 1}`);
      progressRoot.appendChild(line);
      lines.push(line);
    }

    slideCount = count;
    progressRoot.hidden = count <= 1;
  }

  function bindLineEvents() {
    lines.forEach((line) => {
      line.addEventListener('click', () => {
        setActiveSlide(Number(line.dataset.slide));
        startAutoplay();
      });

      line.addEventListener('mouseenter', () => {
        setActiveSlide(Number(line.dataset.slide));
      });
    });
  }

  function refreshSlides(options = {}) {
    displayEntries = getFilledSlideEntries(slideData);
    const hasBanners = displayEntries.length > 0;

    clothingHero.classList.toggle('has-custom-banner', hasBanners);
    if (bannerBox) {
      bannerBox.hidden = !hasBanners;
      bannerBox.classList.toggle('has-custom-banner', hasBanners);
    }

    stopAutoplay();

    if (!hasBanners) {
      slides = [];
      lines = [];
      slideCount = 0;
      activeSlide = 0;
      hoverRatio = 0;
      if (slidesContainer) {
        slidesContainer.innerHTML = '';
        slidesContainer.style.transform = '';
      }
      if (progressRoot) {
        progressRoot.innerHTML = '';
        progressRoot.hidden = true;
      }
      return;
    }

    ensureSlideElements(displayEntries.length);
    bindLineEvents();

    for (let index = 0; index < displayEntries.length; index += 1) {
      applySlideImage(index);
    }

    const nextActive = options.resetActive === false
      ? Math.min(activeSlide, displayEntries.length - 1)
      : 0;

    setActiveSlide(nextActive, { animate: false });
  }

  function setActiveSlide(index, { animate = true } = {}) {
    if (index < 0 || index >= slideCount) return;

    const indexChanged = index !== activeSlide;
    activeSlide = index;
    hoverRatio = slideCount > 1 ? index / (slideCount - 1) : 0;

    setSlideTransition(animate ? 'snap' : 'none');
    applySlideTransform(index);

    if (indexChanged) {
      updateIndicators(index);
    }
  }

  function hoverRatioFromMouseEvent(e) {
    const target = slidesViewport || slidesContainer || bannerBox;
    if (!target) return hoverRatio;

    const rect = target.getBoundingClientRect();
    if (!rect.width) return hoverRatio;

    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  }

  function isInteractiveTarget(target) {
    return target.closest('.clothing-hero-line');
  }

  function nextSlide() {
    if (slideCount <= 1) {
      setActiveSlide(0);
      return;
    }

    setActiveSlide((activeSlide + 1) % slideCount);
  }

  function startAutoplay() {
    stopAutoplay();
    if (isPaused || slideCount <= 1) return;
    autoplayTimer = window.setInterval(nextSlide, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  const hoverTarget = bannerBox || slidesViewport || slidesContainer || clothingHero;

  hoverTarget.addEventListener('mousemove', (e) => {
    if (!slideCount || bannerBox?.hidden) return;
    if (isInteractiveTarget(e.target)) return;

    hoverRatio = hoverRatioFromMouseEvent(e);

    if (slideCount <= 1) {
      setActiveSlide(0, { animate: false });
      return;
    }

    setSlideTransition('hover');
    applyContinuousTransform(hoverRatio);

    const nearestIndex = nearestSlideIndex(hoverRatio);
    if (nearestIndex !== activeSlide) {
      activeSlide = nearestIndex;
      updateIndicators(nearestIndex);
    }
  });

  hoverTarget.addEventListener('mouseenter', () => {
    if (!slideCount || bannerBox?.hidden) return;
    isPaused = true;
    stopAutoplay();
    hoverRatio = slideCount > 1 ? activeSlide / (slideCount - 1) : 0;
  });

  hoverTarget.addEventListener('mouseleave', () => {
    if (!slideCount || bannerBox?.hidden) return;
    isPaused = false;
    const nearestIndex = nearestSlideIndex(hoverRatio);
    activeSlide = nearestIndex;
    setSlideTransition('snap');
    applySlideTransform(nearestIndex);
    updateIndicators(nearestIndex);
    startAutoplay();
  });

  const scrollBtn = clothingHero.querySelector('.clothing-hero-cta');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', (e) => {
      const target = document.getElementById('clothingWorks');
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function initClothingHero() {
    slideData = withDefaultClothingSlides(await loadSlideData());
    refreshSlides({ resetActive: true });
    startAutoplay();
  }

  window.addEventListener('clothing-banners-updated', async () => {
    slideData = withDefaultClothingSlides(await loadSlideData());
    refreshSlides({ resetActive: true });
    startAutoplay();
  });

  window.addEventListener('resize', () => {
    if (!slideCount) return;
    setSlideTransition('none');
    applySlideTransform(activeSlide);
  });

  initClothingHero();
}
