const clothingHero = document.getElementById('clothingHero');

if (clothingHero && window.ClothingBanners) {
  const bannerBox = document.getElementById('clothingHeroBanner');
  const slidesViewport = document.getElementById('clothingHeroSlidesViewport');
  const slidesContainer = document.getElementById('clothingHeroSlides');
  const slides = clothingHero.querySelectorAll('.clothing-hero-slide');
  const lines = clothingHero.querySelectorAll('.clothing-hero-line');
  const slideCount = slides.length;
  const AUTOPLAY_MS = 6000;

  const {
    load: loadSlideData,
    applyFitToImg
  } = window.ClothingBanners;

  let activeSlide = 0;
  let slideData = [null, null, null, null];
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
    if (!slidesContainer) return;
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
    const maxIndex = slideCount - 1;
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

  function applySlideImage(index) {
    const slide = slides[index];
    const data = slideData[index];

    if (data?.image) {
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
      applyFitToImg(img);
      slide.classList.add('has-image');
    } else {
      const img = slide.querySelector('.clothing-hero-slide-img');
      if (img) {
        img.removeAttribute('src');
        img.hidden = true;
      }
      slide.classList.remove('has-image');
    }
  }

  function getSlidesWithImages() {
    return slideData
      .map((slide, index) => (slide?.image ? index : -1))
      .filter((index) => index >= 0);
  }

  function resolveActiveSlide(preferredIndex = activeSlide) {
    if (slideData[preferredIndex]?.image) return preferredIndex;

    const filledSlides = getSlidesWithImages();
    if (filledSlides.length) return filledSlides[0];

    return preferredIndex;
  }

  function refreshSlides(options = {}) {
    slideData.forEach((_, index) => applySlideImage(index));
    clothingHero.classList.toggle('has-custom-banner', slideData.some(Boolean));
    if (bannerBox) {
      bannerBox.classList.toggle('has-custom-banner', slideData.some(Boolean));
    }

    if (options.resetActive !== false) {
      setActiveSlide(resolveActiveSlide(activeSlide));
    }
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
    const filledSlides = getSlidesWithImages();

    if (!filledSlides.length) {
      setActiveSlide((activeSlide + 1) % slideCount);
      return;
    }

    if (filledSlides.length === 1) {
      setActiveSlide(filledSlides[0]);
      return;
    }

    const currentIndex = filledSlides.indexOf(activeSlide);
    const nextIndex = currentIndex >= 0
      ? filledSlides[(currentIndex + 1) % filledSlides.length]
      : filledSlides[0];

    setActiveSlide(nextIndex);
  }

  function startAutoplay() {
    stopAutoplay();
    if (isPaused || getSlidesWithImages().length <= 1) return;
    autoplayTimer = window.setInterval(nextSlide, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  lines.forEach((line) => {
    line.addEventListener('click', () => {
      setActiveSlide(Number(line.dataset.slide));
      startAutoplay();
    });

    line.addEventListener('mouseenter', () => {
      setActiveSlide(Number(line.dataset.slide));
    });
  });

  const hoverTarget = bannerBox || slidesViewport || slidesContainer || clothingHero;

  hoverTarget.addEventListener('mousemove', (e) => {
    if (isInteractiveTarget(e.target)) return;

    hoverRatio = hoverRatioFromMouseEvent(e);
    setSlideTransition('hover');
    applyContinuousTransform(hoverRatio);

    const nearestIndex = nearestSlideIndex(hoverRatio);
    if (nearestIndex !== activeSlide) {
      activeSlide = nearestIndex;
      updateIndicators(nearestIndex);
    }
  });

  hoverTarget.addEventListener('mouseenter', () => {
    isPaused = true;
    stopAutoplay();
    hoverRatio = slideCount > 1 ? activeSlide / (slideCount - 1) : 0;
  });

  hoverTarget.addEventListener('mouseleave', () => {
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
    slideData = await loadSlideData();
    refreshSlides({ resetActive: true });
    startAutoplay();
  }

  window.addEventListener('clothing-banners-updated', async () => {
    slideData = await loadSlideData();
    refreshSlides({ resetActive: true });
    startAutoplay();
  });

  window.addEventListener('resize', () => {
    setSlideTransition('none');
    applySlideTransform(activeSlide);
  });

  initClothingHero();
}
