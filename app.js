const sections = {
  home: { title: 'Главная', el: 'section-home' },
  supplements: { title: 'Фитнес-индустрия', el: 'section-supplements' },
  banners: { title: 'Мои Баннеры', el: 'section-banners' },
  clothing: { title: 'Одежда', el: 'section-clothing' },
  about: { title: 'О сайте', el: 'section-about' }
};

const aboutAnchors = new Set(['order', 'faq', 'privacy', 'about-author']);

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

  if (aboutAnchors.has(id)) {
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
  topNav.classList.add('open');
  navOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNav() {
  topNav.classList.remove('open');
  navOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

navLinks.forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(el.dataset.section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

menuToggle.addEventListener('click', openNav);
navOverlay.addEventListener('click', closeNav);

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

document.querySelectorAll('.about-page-nav-link, .footer-links a[href^="#"]').forEach((link) => {
  const anchorId = link.getAttribute('href')?.slice(1);
  if (!aboutAnchors.has(anchorId)) return;

  link.addEventListener('click', (event) => {
    event.preventDefault();
    scrollToAboutAnchor(anchorId);
    closeNav();
  });
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
