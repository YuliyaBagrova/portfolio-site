(function initThemeApplier() {
  const SECTION_IDS = ['home', 'supplements', 'banners', 'clothing'];
  const THEME_SECTION_MAP = {
    home: 'home',
    supplements: 'supplements',
    banners: 'banners',
    clothing: 'clothing',
    about: 'home'
  };

  const NAV_THEME_KEYS = [];

  const themes = {};
  let activeSectionId = 'home';

  function getPublicHeader() {
    return document.querySelector('.app > .site-header');
  }

  function getSectionElement(sectionId) {
    return document.getElementById(`section-${sectionId}`);
  }

  function getSectionTextColor(theme) {
    return theme.cssVars['--theme-text-primary']
      || theme.cssVars['--text-primary']
      || theme.cssVars['--clothing-ink']
      || theme.cssVars['--fitness-white']
      || '#f0f2f5';
  }

  function clearThemeElement(el) {
    if (!el) return;
    el.classList.remove('has-custom-theme');
    el.style.removeProperty('background');
    el.style.removeProperty('color');

    const preserved = el.getAttribute('data-theme-keys');
    if (!preserved) return;

    preserved.split(',').filter(Boolean).forEach((key) => {
      el.style.removeProperty(key);
    });
    el.removeAttribute('data-theme-keys');
  }

  function applyThemeToElement(el, theme) {
    clearThemeElement(el);
    if (!el || !theme?.cssVars || !theme.isCustom) return;

    const keys = Object.keys(theme.cssVars);
    el.setAttribute('data-theme-keys', keys.join(','));

    keys.forEach((key) => {
      el.style.setProperty(key, theme.cssVars[key]);
    });

    el.style.setProperty('color', getSectionTextColor(theme));
    el.classList.add('has-custom-theme');

    const backgroundStyle = theme.backgroundStyle
      ?? window.ThemeUtils?.buildSectionBackground(theme.inputs, theme.cssVars);

    if (backgroundStyle) {
      el.style.background = backgroundStyle;
    }
  }

  function clearNavThemes(publicHeader) {
    if (!publicHeader) return;

    NAV_THEME_KEYS.forEach((key) => {
      publicHeader.style.removeProperty(key);
    });
    NAV_THEME_KEYS.length = 0;
  }

  function applyAllNavThemes(publicHeader) {
    if (!publicHeader) return;

    clearNavThemes(publicHeader);

    SECTION_IDS.forEach((sectionId) => {
      const theme = themes[sectionId];
      if (!theme) return;

      const textKey = `--theme-nav-text-${sectionId}`;
      const bgKey = `--theme-nav-active-bg-${sectionId}`;

      publicHeader.style.setProperty(textKey, theme.inputs.navText);
      publicHeader.style.setProperty(bgKey, theme.cssVars['--theme-nav-active-bg']);
      NAV_THEME_KEYS.push(textKey, bgKey);
    });

    const homeTheme = themes.home;
    if (homeTheme) {
      publicHeader.style.setProperty('--theme-nav-text-about', homeTheme.inputs.navText);
      publicHeader.style.setProperty(
        '--theme-nav-active-bg-about',
        homeTheme.cssVars['--theme-nav-active-bg']
      );
      NAV_THEME_KEYS.push('--theme-nav-text-about', '--theme-nav-active-bg-about');
    }
  }

  function applyAllSectionThemes() {
    const publicHeader = getPublicHeader();

    SECTION_IDS.forEach((sectionId) => {
      applyThemeToElement(getSectionElement(sectionId), themes[sectionId]);
    });

    if (themes.home?.isCustom) {
      applyThemeToElement(document.getElementById('section-about'), themes.home);
    } else {
      clearThemeElement(document.getElementById('section-about'));
    }

    applyAllNavThemes(publicHeader);
  }

  function resolveThemeSection(sectionId) {
    return THEME_SECTION_MAP[sectionId] || 'home';
  }

  function setActiveSectionTheme(sectionId) {
    activeSectionId = sectionId;
    const publicHeader = getPublicHeader();
    const themeKey = resolveThemeSection(sectionId);

    if (publicHeader) {
      publicHeader.dataset.themeSection = themeKey;
    }
  }

  async function loadThemes() {
    try {
      const response = await fetch('/api/section-themes');
      if (!response.ok) throw new Error('Не удалось загрузить палитры');
      const payload = await response.json();
      Object.assign(themes, payload.themes || {});
      applyAllSectionThemes();

      const hash = window.location.hash.slice(1);
      const validSections = new Set(['home', 'supplements', 'banners', 'clothing', 'about']);
      setActiveSectionTheme(validSections.has(hash) ? hash : activeSectionId || 'home');
    } catch (error) {
      console.warn('[theme-applier]', error.message);
    }
  }

  function getThemes() {
    return themes;
  }

  window.SectionThemes = {
    load: loadThemes,
    getThemes,
    setActiveSectionTheme,
    applyAllSectionThemes
  };

  window.addEventListener('section-themes-changed', loadThemes);
  document.addEventListener('DOMContentLoaded', loadThemes);
})();
