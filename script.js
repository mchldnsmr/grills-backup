/* ============================================================
   OUTDOOR GRILL SALES — script.js
   Page-specific interactions
   ============================================================ */

/* ─────────────────────────────────────────────
   CONTACT FORM (Formspree)
   The endpoint is read directly from the form's own
   action attribute (contact.html -> action="https://formspree.io/f/xgorezpy"),
   so there is only ONE place to ever update it.
   ───────────────────────────────────────────── */
function initContactForm() {
  const form = document.getElementById('appointment-form');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const submitBtn = form.querySelector('.form-submit');
    const successMsg = document.getElementById('form-success');

    // Use the form's own action URL as the single source of truth
    const endpoint = form.getAttribute('action');

    const originalLabel = submitBtn ? submitBtn.textContent : 'Send Request';
    if (submitBtn) {
      submitBtn.textContent = 'Sending...';
      submitBtn.disabled = true;
    }

    fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    })
      .then(response => {
        if (response.ok) {
          form.style.display = 'none';
          if (successMsg) successMsg.classList.add('show');
        } else {
          if (submitBtn) {
            submitBtn.textContent = originalLabel;
            submitBtn.disabled = false;
          }
          alert('Something went wrong. Please call us at 817-550-6038 or email michael@outdoorgrillsales.com');
        }
      })
      .catch(() => {
        if (submitBtn) {
          submitBtn.textContent = originalLabel;
          submitBtn.disabled = false;
        }
        alert('Something went wrong. Please call us at 817-550-6038 or email michael@outdoorgrillsales.com');
      });
  });
}

/* ─────────────────────────────────────────────
   MULTI-CATEGORY FILTER
   Works on both catalog.html and brands.html.
   Cards use space-separated data-category or data-type values
   e.g. data-category="grills smokers pizza"
   The filter checks if the selected category appears
   anywhere in that space-separated list.
   ───────────────────────────────────────────── */
function initCatalogFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (!filterBtns.length) return;

  // Catalog page uses .catalog-brand-card with data-category
  // Brands page uses .brand-card with data-type
  const cards = document.querySelectorAll('.catalog-brand-card, .brand-card, .explore-brand-card');
  if (!cards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.filter;

      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide cards
      cards.forEach(card => {
        // Read whichever attribute exists
        const cats = (card.dataset.category || card.dataset.type || '').split(' ');

        if (target === 'all' || cats.includes(target)) {
          card.style.display = 'flex';
          card.style.flexDirection = 'column';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ─────────────────────────────────────────────
   PRE-FILL CONTACT FORM FROM URL PARAMS
   e.g. contact.html?interest=Blaze+Grills
   ───────────────────────────────────────────── */
function initFormPrefill() {
  const params = new URLSearchParams(window.location.search);
  const interest = params.get('interest') || sessionStorage.getItem('ogs_product_interest');

  if (interest) {
    const notesField = document.getElementById('field-notes');
    if (notesField && notesField.value === '') {
      notesField.value = `I am interested in: ${interest}`;
    }

    const typeField = document.getElementById('field-type');
    if (typeField && interest.toLowerCase().includes('repair')) {
      typeField.value = 'Grill Repair';
    } else if (typeField && (interest.toLowerCase().includes('install') || interest.toLowerCase().includes('kitchen'))) {
      typeField.value = 'Outdoor Kitchen Install';
    }
  }
}

/* ─────────────────────────────────────────────
   ANIMATED COUNTERS (homepage stats)
   ───────────────────────────────────────────── */
function animateCounter(el, target, suffix, duration) {
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const val = Math.floor(ease * target);
    el.textContent = val + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const duration = parseInt(el.dataset.duration) || 1600;
        animateCounter(el, target, suffix, duration);
        io.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => io.observe(el));
}

/* ─────────────────────────────────────────────
   INIT ALL
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initContactForm();
  initCatalogFilter();
  initFormPrefill();
  initCounters();
});