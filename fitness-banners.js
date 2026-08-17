(function initFitnessBannersModule() {
const FITNESS_STORAGE_KEY = 'portfolio_fitness_hero_banners';
const FITNESS_RECOMMENDED = { width: 3840, height: 1200 };
const FITNESS_SLIDE_COUNT = 4;
const FITNESS_MAX_SLIDES = 10;
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const DEFAULT_FIT = { scale: 1, x: 50, y: 50 };
const DEFAULT_FITNESS_SLIDES = [
  { image: '/assets/fitness-hero/slide-0.png', fit: { ...DEFAULT_FIT } },
  { image: '/assets/fitness-hero/slide-1.png', fit: { ...DEFAULT_FIT } },
  { image: '/assets/fitness-hero/slide-2.png', fit: { ...DEFAULT_FIT } },
  { image: '/assets/fitness-hero/slide-3.png', fit: { ...DEFAULT_FIT } }
];
const MIN_FIT_SCALE = 1;
const MAX_FIT_SCALE = 3;

const SLIDE_GRADIENTS = [
  'linear-gradient(135deg, #ea580c 0%, #9a3412 45%, #0f1117 100%)',
  'linear-gradient(135deg, #f97316 0%, #c2410c 40%, #1a120b 100%)',
  'linear-gradient(135deg, #fb923c 0%, #ea580c 35%, #0f1117 100%)',
  'linear-gradient(135deg, #fdba74 0%, #ea580c 40%, #1c1410 100%)'
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeFit(fit) {
  return {
    scale: clamp(Number(fit?.scale) || DEFAULT_FIT.scale, MIN_FIT_SCALE, MAX_FIT_SCALE),
    x: clamp(Number(fit?.x ?? DEFAULT_FIT.x), 0, 100),
    y: clamp(Number(fit?.y ?? DEFAULT_FIT.y), 0, 100)
  };
}

function normalizeSlide(slide) {
  if (!slide?.image) return null;
  return {
    ...slide,
    fit: normalizeFit(slide.fit)
  };
}

function emptySlides() {
  return [];
}

function normalizeSlides(raw) {
  if (!Array.isArray(raw)) return emptySlides();

  const slides = [];
  raw.forEach((slide, index) => {
    slides[index] = normalizeSlide(slide);
  });

  while (slides.length > 0 && slides[slides.length - 1] == null) {
    slides.pop();
  }

  return slides;
}

function getFilledSlideEntries(slides) {
  return slides
    .map((slide, index) => (slide ? { index, slide } : null))
    .filter(Boolean);
}

function getDefaultFitnessSlides() {
  return DEFAULT_FITNESS_SLIDES.map((slide) => normalizeSlide(slide));
}

function withDefaultFitnessSlides(slides) {
  if (getFilledSlideEntries(slides).length) return slides;
  return getDefaultFitnessSlides();
}

function getNextFreeIndex(slides) {
  for (let index = 0; index < FITNESS_MAX_SLIDES; index += 1) {
    if (!slides[index]) return index;
  }
  return -1;
}

function applyFitToImg(img, fit) {
  if (!img) return;
  const f = normalizeFit(fit);
  img.style.objectFit = 'cover';
  img.style.objectPosition = `${f.x}% ${f.y}%`;
  img.style.transform = `scale(${f.scale})`;
  img.style.transformOrigin = `${f.x}% ${f.y}%`;
}

function applyFitToBackground(el, fit) {
  if (!el) return;
  const f = normalizeFit(fit);
  el.style.backgroundSize = f.scale === 1 ? 'cover' : `${f.scale * 100}%`;
  el.style.backgroundPosition = `${f.x}% ${f.y}%`;
}

async function loadSlideData() {
  try {
    const response = await fetch('/api/fitness-hero-banners');
    if (response.ok) {
      const data = await response.json();
      return normalizeSlides(data.slides);
    }
  } catch {
    /* API недоступен */
  }

  return emptySlides();
}

async function saveSlide(slideData, index, options = {}) {
  const slide = slideData[index];

  if (window.location.protocol === 'file:') {
    throw new Error('Откройте сайт через http://localhost:3000 (Docker), чтобы загружать баннеры.');
  }

  try {
    if (!slide?.image) {
      const response = await fetch(`/api/fitness-hero-banners/${index}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось удалить баннер');
      }
    } else {
      const payload = {
        width: slide.width,
        height: slide.height,
        fit: normalizeFit(slide.fit)
      };

      if (options.includeImage !== false) {
        payload.image = slide.image;
      }

      const response = await fetch(`/api/fitness-hero-banners/${index}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить баннер на сервере');
      }

      if (data.slide) {
        slideData[index] = normalizeSlide(data.slide);
      }
    }

    window.dispatchEvent(new CustomEvent('fitness-banners-updated'));
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Сервер недоступен. Запустите Docker: docker compose up -d');
    }
    throw error;
  }
}

function isValidImageFile(file) {
  if (/^image\/(jpeg|png|webp)$/i.test(file.type || '')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
}

function isRatioOk(width, height) {
  const expected = FITNESS_RECOMMENDED.width / FITNESS_RECOMMENDED.height;
  const actual = width / height;
  return Math.abs(expected - actual) / expected <= 0.15;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

function getDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
    img.src = dataUrl;
  });
}

async function uploadSlide(slideData, index, file) {
  if (!isValidImageFile(file)) {
    throw new Error('Поддерживаются только JPG, PNG и WebP.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Файл слишком большой. Максимальный размер — 15 МБ.');
  }

  const dataUrl = await readFile(file);
  const { width, height } = await getDimensions(dataUrl);

  slideData[index] = {
    image: dataUrl,
    width,
    height,
    fit: { ...DEFAULT_FIT }
  };

  await saveSlide(slideData, index);

  return {
    width,
    height,
    ratioOk: isRatioOk(width, height),
    image: slideData[index].image,
    fit: slideData[index].fit
  };
}

async function saveSlideFit(slideData, index, fit) {
  if (!slideData[index]?.image) {
    throw new Error('Сначала загрузите изображение.');
  }

  slideData[index].fit = normalizeFit(fit);
  await saveSlide(slideData, index, { includeImage: false });
  return slideData[index].fit;
}

async function removeSlide(slideData, index) {
  slideData[index] = null;
  await saveSlide(slideData, index);
}

async function commitSlide(slideData, index, slide) {
  slideData[index] = slide;
  await saveSlide(slideData, index);
  return slideData[index];
}

async function appendSlide(slideData, slide) {
  const index = getNextFreeIndex(slideData);
  if (index < 0) {
    throw new Error(`Максимум ${FITNESS_MAX_SLIDES} баннеров`);
  }

  while (slideData.length <= index) {
    slideData.push(null);
  }

  slideData[index] = slide;
  await saveSlide(slideData, index);
  return index;
}

async function createSlide(slide) {
  const slideData = await loadSlideData();
  const index = await appendSlide(slideData, slide);
  return { ok: true, index, slide: slideData[index] };
}

window.FitnessBanners = {
  FITNESS_STORAGE_KEY,
  FITNESS_RECOMMENDED,
  FITNESS_SLIDE_COUNT,
  FITNESS_MAX_SLIDES,
  SLIDE_GRADIENTS,
  DEFAULT_FIT,
  DEFAULT_SLIDES: DEFAULT_FITNESS_SLIDES,
  MIN_FIT_SCALE,
  MAX_FIT_SCALE,
  MAX_FILE_SIZE,
  load: loadSlideData,
  withDefaultFitnessSlides,
  upload: uploadSlide,
  saveFit: saveSlideFit,
  remove: removeSlide,
  commitSlide,
  appendSlide,
  createSlide,
  getFilledSlideEntries,
  getNextFreeIndex,
  normalizeFit,
  applyFitToImg,
  applyFitToBackground,
  isRatioOk
};
})();
