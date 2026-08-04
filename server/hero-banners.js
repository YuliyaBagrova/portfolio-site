const { createBannerStorage } = require('./banner-storage');

function createHeroBannerStorage(rootDir) {
  return createBannerStorage(rootDir, {
    tableName: 'hero_banners',
    uploadsSubdir: 'hero',
    apiPrefix: '/api/hero-banners',
    slideCount: 4,
    filePrefix: 'slide',
    activity: {
      enabled: true,
      badge: 'Баннер',
      badgeClass: 'home',
      titleSave: (index) => `Баннер «Главная», слайд ${index + 1} обновлён`,
      titleDelete: (index) => `Баннер «Главная», слайд ${index + 1} удалён`
    }
  });
}

function createFitnessBannerStorage(rootDir) {
  return createBannerStorage(rootDir, {
    tableName: 'fitness_hero_banners',
    uploadsSubdir: 'fitness-hero',
    apiPrefix: '/api/fitness-hero-banners',
    slideCount: 4,
    filePrefix: 'slide'
  });
}

function createClothingBannerStorage(rootDir) {
  return createBannerStorage(rootDir, {
    tableName: 'clothing_hero_banners',
    uploadsSubdir: 'clothing-hero',
    apiPrefix: '/api/clothing-hero-banners',
    slideCount: 4,
    filePrefix: 'slide',
    activity: {
      enabled: true,
      useClothingLog: true,
      badge: 'Баннер',
      badgeClass: 'banner',
      titleSave: (index) => `Баннер «Одежда», слайд ${index + 1} обновлён`,
      titleDelete: (index) => `Баннер «Одежда», слайд ${index + 1} удалён`
    }
  });
}

module.exports = { createHeroBannerStorage, createFitnessBannerStorage, createClothingBannerStorage };
