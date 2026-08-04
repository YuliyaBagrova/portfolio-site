const SECTION_LABELS = {
  home: 'Главная',
  supplements: 'Фитнес-индустрия',
  banners: 'Мои Баннеры',
  clothing: 'Одежда'
};

const ALLOWED_SECTIONS = new Set(Object.keys(SECTION_LABELS));
const GRADIENT_MODES = new Set(['default', 'custom', 'off']);

const DEFAULT_INPUTS = {
  home: {
    background: '#0f1117',
    accent: '#6366f1',
    navText: '#818cf8',
    gradientMode: 'default',
    gradientColor: '#1e1b4b'
  },
  supplements: {
    background: '#0f1117',
    accent: '#f97316',
    navText: '#fdba74',
    gradientMode: 'default',
    gradientColor: '#12151e'
  },
  banners: {
    background: '#0b0c12',
    accent: '#ff4d9d',
    navText: '#ff4d9d',
    gradientMode: 'default',
    gradientColor: '#0a0b10'
  },
  clothing: {
    background: '#faf8f5',
    accent: '#1a1816',
    navText: '#f0f2f5',
    gradientMode: 'default',
    gradientColor: '#f6f2ec'
  }
};

function parseHex(hex) {
  const raw = String(hex || '').trim().replace('#', '');
  const full = raw.length === 3
    ? raw.split('').map((char) => char + char).join('')
    : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error('Неверный формат цвета');
  }

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16)
  };
}

function toHex(r, g, b) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function relativeLuminance(hex) {
  const { r, g, b } = parseHex(hex);
  const channels = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastText(bgHex) {
  return relativeLuminance(bgHex) > 0.179 ? '#1a1816' : '#f0f2f5';
}

function mixHex(hex1, hex2, ratio) {
  const first = parseHex(hex1);
  const second = parseHex(hex2);
  const amount = Math.max(0, Math.min(1, ratio));

  return toHex(
    first.r + (second.r - first.r) * amount,
    first.g + (second.g - first.g) * amount,
    first.b + (second.b - first.b) * amount
  );
}

function adjustHex(hex, amount) {
  const { r, g, b } = parseHex(hex);
  return toHex(r + amount, g + amount, b + amount);
}

function alphaHex(hex, alpha) {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeInput(value, fallback) {
  try {
    return toHex(...Object.values(parseHex(value)));
  } catch {
    return fallback;
  }
}

function normalizeInputs(sectionId, rawInputs = {}) {
  const defaults = DEFAULT_INPUTS[sectionId];
  const gradientMode = GRADIENT_MODES.has(rawInputs.gradientMode)
    ? rawInputs.gradientMode
    : defaults.gradientMode;

  return {
    background: normalizeInput(rawInputs.background, defaults.background),
    accent: normalizeInput(rawInputs.accent, defaults.accent),
    navText: normalizeInput(rawInputs.navText, defaults.navText),
    gradientMode,
    gradientColor: normalizeInput(
      rawInputs.gradientColor,
      defaults.gradientColor
    )
  };
}

function buildSectionBackground(inputs, cssVars = {}) {
  if (inputs.gradientMode === 'off') {
    return inputs.background;
  }

  if (inputs.gradientMode === 'custom') {
    const endColor = inputs.gradientColor
      || cssVars['--bg-secondary']
      || cssVars['--clothing-bg-soft']
      || inputs.background;
    return `linear-gradient(180deg, ${inputs.background} 0%, ${endColor} 100%)`;
  }

  return null;
}

function computeTheme(sectionId, rawInputs) {
  const inputs = normalizeInputs(sectionId, rawInputs);
  const { background, accent, navText } = inputs;
  const textPrimary = contrastText(background);
  const isLight = relativeLuminance(background) > 0.179;
  const textSecondary = mixHex(textPrimary, background, isLight ? 0.45 : 0.55);
  const textMuted = mixHex(textPrimary, background, isLight ? 0.62 : 0.68);
  const bgSecondary = mixHex(background, textPrimary, isLight ? 0.05 : 0.08);
  const bgCard = mixHex(background, textPrimary, isLight ? 0.03 : 0.1);
  const bgHover = mixHex(background, textPrimary, isLight ? 0.08 : 0.14);
  const border = alphaHex(textPrimary, isLight ? 0.12 : 0.18);
  const accentHover = adjustHex(accent, isLight ? -20 : 24);
  const accentGlow = alphaHex(accent, 0.25);
  const accentLight = alphaHex(accent, 0.25);
  const navActiveBg = alphaHex(navText, 0.18);

  const cssVars = {
    '--theme-section-bg': background,
    '--theme-text-primary': textPrimary,
    '--theme-text-secondary': textSecondary,
    '--theme-text-muted': textMuted,
    '--theme-nav-text': navText,
    '--theme-nav-hover-bg': alphaHex(textPrimary, isLight ? 0.06 : 0.08),
    '--theme-nav-active-bg': navActiveBg
  };

  if (sectionId === 'home') {
    Object.assign(cssVars, {
      '--bg-primary': background,
      '--bg-secondary': bgSecondary,
      '--bg-card': bgCard,
      '--bg-hover': bgHover,
      '--border': border,
      '--text-primary': textPrimary,
      '--text-secondary': textSecondary,
      '--text-muted': textMuted,
      '--accent': accent,
      '--accent-hover': accentHover,
      '--accent-light': accentLight,
      '--accent-glow': accentGlow
    });
  }

  if (sectionId === 'supplements') {
    Object.assign(cssVars, {
      '--bg-primary': background,
      '--bg-secondary': bgSecondary,
      '--bg-card': bgCard,
      '--bg-hover': bgHover,
      '--border': border,
      '--text-primary': textPrimary,
      '--text-secondary': textSecondary,
      '--text-muted': textMuted,
      '--fitness-orange': accent,
      '--fitness-orange-hot': adjustHex(accent, -28),
      '--fitness-orange-soft': mixHex(accent, textPrimary, 0.35),
      '--fitness-white': textPrimary,
      '--fitness-white-muted': alphaHex(textPrimary, 0.72)
    });
  }

  if (sectionId === 'clothing') {
    Object.assign(cssVars, {
      '--clothing-bg': background,
      '--clothing-bg-soft': mixHex(background, textPrimary, isLight ? 0.05 : 0.08),
      '--clothing-ink': textPrimary,
      '--clothing-ink-muted': textSecondary,
      '--clothing-ink-soft': textMuted,
      '--clothing-accent': accent,
      '--clothing-accent-soft': mixHex(accent, background, 0.45),
      '--clothing-line': border,
      '--clothing-card-bg': isLight ? '#ffffff' : bgCard,
      '--text-primary': textPrimary,
      '--text-secondary': textSecondary,
      '--text-muted': textMuted
    });
  }

  if (sectionId === 'banners') {
    Object.assign(cssVars, {
      '--banners-accent': accent,
      '--banners-accent-deep': adjustHex(accent, -24),
      '--banners-accent-soft': alphaHex(accent, 0.14),
      '--banners-accent-glow': alphaHex(accent, 0.35),
      '--banners-line': alphaHex(textPrimary, 0.09),
      '--banners-panel': alphaHex(mixHex(background, '#000000', 0.35), 0.72),
      '--text-primary': textPrimary,
      '--text-secondary': textSecondary,
      '--text-muted': textMuted
    });
  }

  return {
    section_id: sectionId,
    label: SECTION_LABELS[sectionId],
    inputs,
    cssVars,
    backgroundStyle: buildSectionBackground(inputs, cssVars)
  };
}

function parsePaletteJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  return JSON.parse(value);
}

function serializeTheme(sectionId, row) {
  const isCustom = Boolean(row?.palette_json);
  const storedInputs = {
    ...DEFAULT_INPUTS[sectionId],
    ...(parsePaletteJson(row?.palette_json) || {})
  };
  const theme = computeTheme(sectionId, storedInputs);

  return {
    ...theme,
    isCustom,
    updated_at: row?.updated_at || null
  };
}

module.exports = {
  SECTION_LABELS,
  ALLOWED_SECTIONS,
  GRADIENT_MODES,
  DEFAULT_INPUTS,
  computeTheme,
  normalizeInputs,
  buildSectionBackground,
  serializeTheme
};
