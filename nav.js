/* ============================================================
   OUTDOOR GRILL SALES: nav.js
   ============================================================ */

const PREFERS_REDUCED_MOTION =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────
   ANNOUNCEMENT BANNER

   Measures the banner's rendered height and exposes it as a CSS
   variable so the nav and page shift down by exactly the right
   amount, including when the banner text wraps on narrow screens.

   PERFORMANCE NOTE: reading offsetHeight right after touching the
   DOM forces the browser to recalculate layout on the spot (a
   "forced reflow", which PageSpeed flagged in this file). Every
   measurement below is now deferred into requestAnimationFrame, so
   the read happens after the browser has already laid out, and the
   extra layout pass goes away.
   ───────────────────────────────────────────── */
function initAnnounceBanner() {
  const banner = document.getElementById('announce-banner');
  if (!banner) return;

  const style = window.getComputedStyle(banner);
  if (style.display === 'none') return;

  document.body.classList.add('has-banner');

  let lastHeight = -1;
  const setBannerHeight = () => {
    requestAnimationFrame(() => {
      const h = banner.offsetHeight;
      // Only write when the value actually changed. Writing the same
      // value back still invalidates layout for everything below.
      if (h !== lastHeight) {
        lastHeight = h;
        document.documentElement.style.setProperty('--banner-h', h + 'px');
      }
    });
  };

  setBannerHeight();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(setBannerHeight, 120);
  }, { passive: true });

  // Web fonts can change the banner's line height once they load
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(setBannerHeight);
  }
}

/* ─────────────────────────────────────────────
   NAV SCROLL BEHAVIOR
   Scroll handler is passive and does its DOM writes inside rAF so
   scrolling never triggers a synchronous layout.
   ───────────────────────────────────────────── */
function initNavScroll() {
  const nav = document.querySelector('nav');
  const progressBar = document.getElementById('progress-bar');
  const backTop = document.getElementById('back-top');
  if (!nav) return;

  let ticking = false;

  const update = () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;

    nav.classList.toggle('scrolled', scrolled > 60);

    if (progressBar) {
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      progressBar.style.width = pct + '%';
    }
    if (backTop) {
      backTop.classList.toggle('visible', scrolled > 400);
    }
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  update();
}

/* ─────────────────────────────────────────────
   HAMBURGER MENU
   ───────────────────────────────────────────── */
function initHamburger() {
  const hamburger = document.getElementById('nav-hamburger');
  const drawer = document.getElementById('nav-drawer');
  if (!hamburger || !drawer) return;

  const close = () => {
    hamburger.classList.remove('open');
    drawer.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  hamburger.setAttribute('aria-expanded', 'false');

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.contains('open');
    if (isOpen) {
      close();
    } else {
      hamburger.classList.add('open');
      drawer.classList.add('open');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }
  });

  drawer.querySelectorAll('a').forEach(link => link.addEventListener('click', close));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

/* ─────────────────────────────────────────────
   ACTIVE NAV LINK
   ───────────────────────────────────────────── */
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-drawer a').forEach(link => {
    // Never mark the CTA button as active, it should always stay orange
    if (link.classList.contains('nav-cta') || link.classList.contains('drawer-cta')) return;
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPage = href.split('/').pop();
    const isCurrent =
      linkPage === currentPage ||
      (currentPage === '' && linkPage === 'index.html') ||
      // Extensionless URLs on Cloudflare: /services matches services.html
      (currentPage !== '' && linkPage === currentPage + '.html');
    if (isCurrent) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ─────────────────────────────────────────────
   SCROLL REVEAL
   ───────────────────────────────────────────── */
function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  // Reduced motion: show everything immediately, observe nothing
  if (PREFERS_REDUCED_MOTION) {
    reveals.forEach(el => el.classList.add('visible'));
    return;
  }

  const isMobile = window.innerWidth <= 900;
  const threshold = isMobile ? 0.01 : 0.1;
  const rootMargin = isMobile ? '0px 0px -20px 0px' : '0px 0px -40px 0px';

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: threshold, rootMargin: rootMargin });

  reveals.forEach(el => io.observe(el));
}

/* ─────────────────────────────────────────────
   BACK TO TOP
   ───────────────────────────────────────────── */
function initBackTop() {
  const btn = document.getElementById('back-top');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: PREFERS_REDUCED_MOTION ? 'auto' : 'smooth' });
  });
}

/* ─────────────────────────────────────────────
   REVIEWS CAROUSEL
   One review visible at a time, auto-advancing, pause on hover.
   ───────────────────────────────────────────── */
function initReviewsCarousel() {
  const track = document.getElementById('reviews-track');
  const dots = document.querySelectorAll('.reviews-carousel-dot');
  if (!track) return;

  const cards = track.querySelectorAll('.review-card');
  const total = cards.length;
  if (!total) return;

  const DELAY = 6500;
  let current = 0;
  let autoTimer = null;

  function start() {
    if (PREFERS_REDUCED_MOTION) return;
    stop();
    autoTimer = setInterval(next, DELAY);
  }
  function stop() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  function goTo(n) {
    current = (n + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => {
      d.classList.toggle('active', i === current);
      d.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
    start();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  document.getElementById('reviews-next')?.addEventListener('click', next);
  document.getElementById('reviews-prev')?.addEventListener('click', prev);
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  const wrap = track.closest('.reviews-carousel-wrap');
  if (wrap) {
    wrap.addEventListener('mouseenter', stop);
    wrap.addEventListener('mouseleave', start);
    wrap.addEventListener('focusin', stop);
    wrap.addEventListener('focusout', start);
  }

  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
  });

  goTo(0);
  start();
}

/* ─────────────────────────────────────────────
   GALLERY CAROUSEL (featured-center coverflow)

   The active image is centered and full size. The previous image
   sits to its left and the next to its right, both scaled down and
   dimmed but clearly present. Auto-advances, pauses on hover and on
   keyboard focus, resets its timer after any manual interaction,
   and does not auto-advance under prefers-reduced-motion.
   ───────────────────────────────────────────── */
function initGalleryCarousel() {
  const stage = document.getElementById('gallery-stage');
  if (!stage) return;

  const slides = Array.from(stage.querySelectorAll('.gallery-slide'));
  const total = slides.length;
  if (!total) return;

  const dotsWrap = document.getElementById('gallery-dots');
  const carousel = stage.closest('.gallery-carousel');
  const DELAY = 4050;   // 10% faster than the previous 4500ms

  let current = 0;
  let autoTimer = null;

  // Build the pagination dots from the slides themselves
  const dots = [];
  if (dotsWrap) {
    slides.forEach((slide, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gallery-dot';
      b.setAttribute('aria-label', `Show gallery image ${i + 1} of ${total}`);
      b.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(b);
      dots.push(b);
    });
  }

  function start() {
    if (PREFERS_REDUCED_MOTION) return;
    stop();
    autoTimer = setInterval(next, DELAY);
  }
  function stop() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }

  function goTo(n) {
    current = (n + total) % total;
    const prevIndex = (current - 1 + total) % total;
    const nextIndex = (current + 1) % total;

    slides.forEach((slide, i) => {
      slide.classList.remove('is-active', 'is-prev', 'is-next');
      if (i === current) slide.classList.add('is-active');
      else if (i === prevIndex) slide.classList.add('is-prev');
      else if (i === nextIndex) slide.classList.add('is-next');
      // Only the featured image is exposed to assistive tech
      slide.setAttribute('aria-hidden', i === current ? 'false' : 'true');
    });

    dots.forEach((d, i) => d.classList.toggle('active', i === current));

    start();
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  document.getElementById('gallery-next')?.addEventListener('click', next);
  document.getElementById('gallery-prev')?.addEventListener('click', prev);

  if (carousel) {
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', start);
  }

  // Swipe on touch devices
  let touchStartX = 0;
  stage.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
  });

  // Arrow keys when the carousel has focus
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
  });

  goTo(0);
  start();
}

/* ─────────────────────────────────────────────
   INIT ALL
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initAnnounceBanner();
  initNavScroll();
  initHamburger();
  initActiveNav();
  initReveal();
  initBackTop();
  initReviewsCarousel();
  initGalleryCarousel();
});