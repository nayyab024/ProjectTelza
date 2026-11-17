/* ==========================================================================
   Telza: shared script for the content pages (Case Studies, FAQ, Book a Demo).
   Each part only runs on the page that has the matching markup.
   1. Case studies: "Read Case Study" opens an accessible native <dialog>
   2. FAQ: the category list highlights the section in view
   3. Book a Demo: validation + submission (only sends when an endpoint is configured)
   ========================================================================== */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- 1. Case study dialogs ----------
     Links are real anchors (#case-healthcare, ...), so a case study can be opened from a URL and
     Back closes it. Without JS, or without <dialog> support, the case studies show inline. */
  function initCaseDialogs() {
    const dialogs = $$('dialog.ct-dialog');
    if (!dialogs.length) return;
    if (typeof HTMLDialogElement !== 'function') { document.documentElement.classList.add('ct-no-dialog'); return; }

    const byId = (id) => dialogs.find((d) => d.id === id);
    let opener = null;
    const open = (d) => {
      if (!d || d.open) return;
      dialogs.forEach((o) => o.open && o.close());
      d.showModal();
      d.scrollTop = 0;
    };
    // drop the #case-… hash and return focus to the button that opened the dialog
    const cleanup = (d) => {
      if (location.hash === '#' + d.id) history.replaceState(null, '', location.pathname + location.search);
      if (opener) { opener.focus({ preventScroll: true }); opener = null; }
    };
    const shut = (d) => { if (d.open) d.close(); cleanup(d); };

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-case]');
      if (!a) return;
      const d = byId(a.getAttribute('href').slice(1));
      if (!d) return;
      e.preventDefault();
      opener = a;
      history.pushState({ caseStudy: d.id }, '', '#' + d.id);
      open(d);
    });
    dialogs.forEach((d) => {
      $('[data-close]', d)?.addEventListener('click', () => shut(d));
      d.addEventListener('click', (e) => { if (e.target === d) shut(d); }); // backdrop
      $$('a[href^="#"]', d).forEach((a) => a.addEventListener('click', () => shut(d)));
      d.addEventListener('close', () => cleanup(d)); // Escape key
    });
    const fromHash = () => {
      const d = byId(location.hash.slice(1));
      if (d) open(d); else dialogs.forEach((o) => o.open && o.close());
    };
    window.addEventListener('popstate', fromHash);
    fromHash();
  }

  /* ---------- 2. FAQ category highlight ---------- */
  function initFaqNav() {
    const links = $$('.fq-nav a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    const groups = links.map((a) => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const setActive = (id) => links.forEach((a) => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      if (on && a.parentElement.scrollWidth > a.parentElement.clientWidth) a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
      const first = groups.find((g) => visible.get(g.id));
      if (first) setActive(first.id);
    }, { rootMargin: '-30% 0px -55% 0px' });
    groups.forEach((g) => io.observe(g));
    setActive(groups[0].id);
  }

  /* ---------- 3. Book a Demo form ----------
     The form only sends when data-endpoint holds a URL (e.g. your CRM, form service or API).
     Without one it validates the request and says clearly that nothing was sent. */
  function initDemoForm() {
    const form = $('[data-demo-form]');
    if (!form) return;
    const status = $('[data-demo-status]', form);
    const done = $('[data-demo-done]');
    const btn = $('button[type="submit"]', form);
    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const rules = {
      name: (v) => (v.trim().length < 2 ? 'Please enter your full name.' : ''),
      email: (v) => (!v.trim() ? 'Please enter your work email.' : !EMAIL.test(v.trim()) ? 'Please enter a valid email address, like name@company.com.' : ''),
      company: (v) => (!v.trim() ? 'Please enter your company name.' : ''),
      phone: (v) => {
        if (!v.trim()) return '';
        const digits = v.replace(/\D/g, '');
        return (!/^[+\d\s().-]+$/.test(v.trim()) || digits.length < 7 || digits.length > 15) ? 'Please enter a valid phone number, including the country code.' : '';
      },
      industry: (v) => (!v ? 'Please choose your industry.' : ''),
      solution: (v) => (!v ? 'Please choose the solution you are interested in.' : ''),
      message: (v) => (v.length > 2000 ? 'Please keep this under 2,000 characters.' : ''),
    };
    const field = (name) => form.elements[name];

    // coming from the Plans page (/book-a-demo/#plan-professional): note the chosen plan
    const PLANS = { starter: 'Starter', professional: 'Professional', enterprise: 'Enterprise' };
    const chosen = location.hash.match(/^#plan-(starter|professional|enterprise)$/);
    if (chosen && !field('message').value) field('message').value = `I'm interested in the ${PLANS[chosen[1]]} plan.`;
    const show = (name, msg) => {
      const el = field(name);
      const err = document.getElementById(`${el.id}-err`);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
      return !msg;
    };
    const check = (name) => show(name, rules[name](field(name).value));

    Object.keys(rules).forEach((name) => {
      const el = field(name);
      // validate on leaving a field; once a field has shown an error, re-check as the user types
      el.addEventListener('blur', () => { if (el.value || el.getAttribute('aria-invalid') === 'true') check(name); });
      el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true') check(name); });
      el.addEventListener('change', () => { if (el.tagName === 'SELECT') check(name); });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'dm-status';
      status.textContent = '';
      const bad = Object.keys(rules).filter((n) => !check(n));
      if (bad.length) {
        field(bad[0]).focus();
        status.className = 'dm-status is-error';
        status.textContent = bad.length === 1 ? 'Please fix the highlighted field.' : `Please fix the ${bad.length} highlighted fields.`;
        return;
      }

      const endpoint = (form.dataset.endpoint || '').trim();
      if (!endpoint) {
        // No backend connected: be honest instead of showing a fake confirmation.
        status.className = 'dm-status is-info';
        status.textContent = 'Thanks, your details look good. Online demo requests are not connected yet, so this form has not sent anything.';
        return;
      }

      btn.disabled = true;
      const label = btn.innerHTML;
      btn.textContent = 'Sending…';
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(String(res.status));
        const first = (data.name || '').trim().split(/\s+/)[0];
        $('[data-demo-name]', done).textContent = first ? `, ${first}` : '';
        form.hidden = true;
        done.hidden = false;
        done.focus();
      } catch (err) {
        status.className = 'dm-status is-error';
        status.textContent = 'Sorry, your request could not be sent. Please try again in a moment.';
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  }

  function boot() { initCaseDialogs(); initFaqNav(); initDemoForm(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
