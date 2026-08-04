(function initClothingBannersModule() {
const CLOTHING_STORAGE_KEY = 'portfolio_clothing_hero_banners';
const CLOTHING_DISPLAY = { width: 400, height: 360 };
const CLOTHING_RECOMMENDED = { width: 1600, height: 1440 };
const CLOTHING_SLIDE_COUNT = 4;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const DEFAULT_FIT = { scale: 1, x: 50, y: 50 };
const MIN_FIT_SCALE = 1;
const MAX_FIT_SCALE = 3;

const SLIDE_GRADIENTS = [
  'linear-gradient(145deg, #f5f1eb 0%, #ddd5c8 55%, #ebe6df 100%)',
  'linear-gradient(145deg, #efe8e0 0%, #c8bdb0 50%, #f7f4ef 100%)',
  'linear-gradient(145deg, #ece6de 0%, #b8afa3 45%, #f3efe9 100%)',
  'linear-gradient(145deg, #f0ebe4 0%, #d1c4b5 50%, #faf8f5 100%)'
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
  return Array(CLOTHING_SLIDE_COUNT).fill(null);
}

function normalizeSlides(raw) {
  if (!Array.isArray(raw)) return emptySlides();
  return emptySlides().map((_, index) => normalizeSlide(raw[index]));
}

function applyFitToImg(img) {
  if (!img) return;
  img.style.objectFit = 'cover';
  img.style.objectPosition = 'center center';
  img.style.transform = '';
  img.style.transformOrigin = '';
}

function applyFitToBackground(el) {
  if (!el) return;
  el.style.backgroundSize = 'cover';
  el.style.backgroundPosition = 'center center';
}

async function loadSlideData() {
  try {
    const response = await fetch('/api/clothing-hero-banners');
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
      const response = await fetch(`/api/clothing-hero-banners/${index}`, { method: 'DELETE' });
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

      const response = await fetch(`/api/clothing-hero-banners/${index}`, {
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

    window.dispatchEvent(new CustomEvent('clothing-banners-updated'));
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
  const expected = CLOTHING_RECOMMENDED.width / CLOTHING_RECOMMENDED.height;
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

window.ClothingBanners = {
  CLOTHING_STORAGE_KEY,
  CLOTHING_DISPLAY,
  CLOTHING_RECOMMENDED,
  CLOTHING_SLIDE_COUNT,
  MAX_FILE_SIZE,
  SLIDE_GRADIENTS,
  DEFAULT_FIT,
  MIN_FIT_SCALE,
  MAX_FIT_SCALE,
  load: loadSlideData,
  upload: uploadSlide,
  saveFit: saveSlideFit,
  remove: removeSlide,
  commitSlide,
  normalizeFit,
  applyFitToImg,
  applyFitToBackground,
  isRatioOk
};
})();
