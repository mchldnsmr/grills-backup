/* ============================================================
   OUTDOOR GRILL SALES: script.js
   Page-specific interactions
   ============================================================ */

/* ─────────────────────────────────────────────
   CONTACT FORM (Formspree)
   The endpoint is read directly from the form's own
   action attribute (contact.html -> action="https://formspree.io/f/xgorezpy"),
   so there is only ONE place to ever update it.

   Phone handling:
   - Live-formats the phone field to (817) 555-1234 as the user types,
     which makes a missing digit obvious.
   - Blocks submission unless a full 10-digit number is entered, so
     Michael never receives an incomplete phone number again.
   ───────────────────────────────────────────── */
function initContactForm() {
  const form = document.getElementById('appointment-form');
  if (!form) return;

  const phoneField = document.getElementById('field-phone');

  // Live-format the phone field to (817) 555-1234 and cap at 10 digits.
  if (phoneField) {
    phoneField.addEventListener('input', function () {
      let digits = phoneField.value.replace(/\D/g, '');
      // If someone pastes a leading country code "1", drop it before formatting
      if (digits.length === 11 && digits.charAt(0) === '1') {
        digits = digits.slice(1);
      }
      digits = digits.slice(0, 10);

      let formatted = digits;
      if (digits.length > 6) {
        formatted = '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6);
      } else if (digits.length > 3) {
        formatted = '(' + digits.slice(0, 3) + ') ' + digits.slice(3);
      } else if (digits.length > 0) {
        formatted = '(' + digits;
      }

      phoneField.value = formatted;
      // Clear any previous "please enter a full number" message once they edit
      phoneField.setCustomValidity('');
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Require a complete 10-digit phone number before anything else runs.
    if (phoneField) {
      const digitCount = phoneField.value.replace(/\D/g, '').length;
      const isComplete = digitCount === 10 ||
        (digitCount === 11 && phoneField.value.replace(/\D/g, '').charAt(0) === '1');

      if (!isComplete) {
        phoneField.setCustomValidity('Please enter a full 10-digit phone number.');
        phoneField.reportValidity();
        phoneField.focus();
        return;
      }
      phoneField.setCustomValidity('');
    }

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
   Used on explore.html (grills) and pellets.html.
   Cards use space-separated data-category or data-type values
   e.g. data-category="grills smokers pizza"
   The filter checks if the selected category appears
   anywhere in that space-separated list.

   SECTION HEADINGS:
   A page can group its cards under headings by wrapping each
   group in <div class="filter-section"> ... </div>. After
   filtering, any section left with zero visible cards is hidden
   too, so you never get an orphaned heading with nothing under
   it. Pages without .filter-section wrappers are unaffected.
   ───────────────────────────────────────────── */
function initCatalogFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  if (!filterBtns.length) return;

  const CARD_SELECTOR = '.catalog-brand-card, .brand-card, .explore-brand-card';
  const cards = document.querySelectorAll(CARD_SELECTOR);
  if (!cards.length) return;

  // Hide any grouped section that has no visible cards left in it
  function syncSectionHeadings() {
    document.querySelectorAll('.filter-section').forEach(section => {
      const sectionCards = section.querySelectorAll(CARD_SELECTOR);
      let hasVisible = false;
      sectionCards.forEach(card => {
        if (card.style.display !== 'none') hasVisible = true;
      });
      section.style.display = hasVisible ? '' : 'none';
    });
  }

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

      // Then hide any heading whose whole group just disappeared
      syncSectionHeadings();
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