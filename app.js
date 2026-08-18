const sections = {
  home: { title: 'Главная', el: 'section-home' },
  supplements: { title: 'Фитнес-индустрия', el: 'section-supplements' },
  banners: { title: 'Мои Баннеры', el: 'section-banners' },
  clothing: { title: 'Одежда', el: 'section-clothing' },
  about: { title: 'О сайте', el: 'section-about' }
};

const aboutAnchorsFallback = new Set(['order', 'faq', 'privacy', 'about-author']);

function getAboutAnchorIds() {
  const root = document.getElementById('aboutPageRoot');
  if (!root) return new Set(aboutAnchorsFallback);

  const ids = [...root.querySelectorAll('.about-block[id]')].map((el) => el.id).filter(Boolean);
  return ids.length ? new Set(ids) : new Set(aboutAnchorsFallback);
}

function isAboutAnchor(id) {
  if (!id || sections[id]) return false;
  return getAboutAnchorIds().has(id);
}

const navLinks = document.querySelectorAll('[data-section]');
const topNav = document.getElementById('topNav');
const navOverlay = document.getElementById('navOverlay');
const menuToggle = document.getElementById('menuToggle');

function showSection(sectionId) {
  if (!sections[sectionId]) return;

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sections[sectionId].el).classList.add('active');

  document.querySelectorAll('.nav-link[data-section]').forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });

  document.title = `Портфолио — ${sections[sectionId].title}`;
  history.replaceState(null, '', `#${sectionId}`);
  closeNav();

  if (typeof window.SectionThemes?.setActiveSectionTheme === 'function') {
    window.SectionThemes.setActiveSectionTheme(sectionId);
  }

  if (sectionId === 'supplements' && typeof window.FitnessCatalog?.load === 'function') {
    window.FitnessCatalog.load();
  }
  if (sectionId === 'clothing' && typeof window.ClothingCatalog?.load === 'function') {
    window.ClothingCatalog.load();
  }
}

window.showSection = showSection;

function scrollToAboutAnchor(anchorId, updateHash = true) {
  showSection('about');

  requestAnimationFrame(() => {
    const target = document.getElementById(anchorId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  if (updateHash) {
    history.replaceState(null, '', `#${anchorId}`);
  }
}

function navigateFromHash() {
  const hash = window.location.hash.slice(1);
  const legacyMap = { dashboard: 'home' };
  const id = legacyMap[hash] || hash;

  if (isAboutAnchor(id)) {
    scrollToAboutAnchor(id, false);
    return;
  }

  if (sections[id]) {
    showSection(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  showSection('home');
}

function openNav() {
  if (!topNav) return;
  topNav.classList.add('open');
  navOverlay?.classList.add('open');
  menuToggle?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}

function closeNav() {
  if (!topNav) return;
  topNav.classList.remove('open');
  navOverlay?.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

navLinks.forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(el.dataset.section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

menuToggle?.addEventListener('click', openNav);
navOverlay?.addEventListener('click', closeNav);

window.addEventListener('resize', () => {
  if (window.innerWidth > 1100) closeNav();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  if (btn.closest('.fitness-filter-bar') || btn.closest('.clothing-filter-bar')) return;

  btn.addEventListener('click', () => {
    const bar = btn.closest('.filter-bar');
    bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

const hash = window.location.hash.slice(1);
navigateFromHash();

window.addEventListener('hashchange', navigateFromHash);

document.addEventListener('click', (event) => {
  const link = event.target.closest('.about-page-nav-link');
  if (!link) return;

  const root = document.getElementById('aboutPageRoot');
  if (!root?.contains(link)) return;

  const anchorId = link.getAttribute('href')?.slice(1);
  if (!anchorId) return;

  event.preventDefault();
  scrollToAboutAnchor(anchorId);
  closeNav();
});

window.addEventListener('about-page-updated', () => {
  const hash = window.location.hash.slice(1);
  if (isAboutAnchor(hash)) {
    scrollToAboutAnchor(hash, false);
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeNav();
});

/* ===== Image lightbox (click to enlarge) ===== */
const imageLightbox = document.getElementById('imageLightbox');
const imageLightboxImg = document.getElementById('imageLightboxImg');
const imageLightboxClose = document.getElementById('imageLightboxClose');

function openImageLightbox(src, alt = '', options = {}) {
  if (!imageLightbox || !imageLightboxImg || !src) return;
  imageLightboxImg.src = src;
  imageLightboxImg.alt = alt || '';
  imageLightbox.classList.toggle('is-full', Boolean(options.full));
  imageLightbox.hidden = false;
  requestAnimationFrame(() => imageLightbox.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
}

window.openImageLightbox = openImageLightbox;

function closeImageLightbox() {
  if (!imageLightbox || imageLightbox.hidden) return;
  imageLightbox.classList.remove('is-open', 'is-full');
  imageLightbox.hidden = true;
  imageLightboxImg.removeAttribute('src');
  if (!document.getElementById('topNav')?.classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

document.querySelectorAll('.zoomable-icon').forEach((el) => {
  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openImageLightbox(el.dataset.lightboxSrc, el.querySelector('img')?.alt);
  };

  el.addEventListener('click', open);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') open(e);
  });
});

if (imageLightbox) {
  imageLightbox.addEventListener('click', (e) => {
    if (e.target === imageLightbox || e.target === imageLightboxClose) {
      closeImageLightbox();
    }
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeImageLightbox();
});
