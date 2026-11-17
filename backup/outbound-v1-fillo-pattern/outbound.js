/* ==========================================================================
   Telza: Outbound Calling product page
   1. Waveform bars           2. Campaign console (lanes cycle dialing → talking → outcome)
   3. Use-case picker (tabs)  4. Step slider (buttons, dots, drag/swipe, keyboard)
   5. Scroll motion (GSAP + ScrollTrigger): same approach and values as Fillo / AI Voice Agent;
      pinned call journey on mouse/trackpad screens (window.TELZA_STORY_MQ), lighter on touch.
   Shared behaviour (nav, accordion, reveals, CTA form) comes from script.js.
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STORY_MQ = window.TELZA_STORY_MQ
    || '(min-width: 768px) and (min-height: 420px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

  /* ---------- 1. Waveform bars ---------- */
  function initBars() {
    let seed = 11;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    $$('[data-ob-bars]').forEach((box) => {
      const n = parseInt(box.dataset.obBars, 10) || 20;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        const bar = document.createElement('i');
        const env = Math.sin(((i + 0.5) / n) * Math.PI);
        bar.style.setProperty('--h', `${Math.round(22 + env * 70 * (0.45 + rnd() * 0.55))}%`);
        bar.style.setProperty('--t', `${(0.45 + rnd() * 0.7).toFixed(2)}s`);
        bar.style.setProperty('--dl', `${(-rnd() * 1.2).toFixed(2)}s`);
        frag.appendChild(bar);
      }
      box.appendChild(frag);
    });
  }

  /* ---------- 2. Campaign console (illustrative) ---------- */
  function initConsole() {
    const box = $('[data-ob-console]');
    if (!box) return;
    const lanes = $$('[data-ob-lane]', box);
    const bar = $('[data-ob-progress]', box);
    const OUTCOMES = ['Qualified', 'Callback requested', 'Qualified', 'Voicemail · retry later', 'Appointment confirmed'];
    const OFFSET = [2, 0, 4, 5, 3]; // lanes start at different points of the cycle
    let tick = 0;
    const paint = () => {
      lanes.forEach((lane, i) => {
        const phase = (tick + OFFSET[i]) % 6; // 0-1 dialing · 2-3 talking · 4-5 outcome
        const state = phase < 2 ? 'dialing' : phase < 4 ? 'talking' : 'done';
        lane.dataset.state = state;
        $('.ob-chip', lane).textContent = state === 'dialing' ? 'Dialing' : state === 'talking' ? 'Talking' : OUTCOMES[i];
      });
      if (bar) bar.style.width = `${28 + ((tick * 6) % 64)}%`;
    };
    paint();
    if (reduceMotion) return;
    let timer = 0;
    let on = true;
    const sync = () => {
      const run = on && !document.hidden;
      if (run && !timer) timer = setInterval(() => { tick += 1; paint(); }, 1500);
      if (!run && timer) { clearInterval(timer); timer = 0; }
    };
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { on = e.isIntersecting; sync(); }).observe(box);
    document.addEventListener('visibilitychange', sync);
    sync();
  }

  /* ---------- 3. Use-case picker (accessible tabs) ---------- */
  function initUses() {
    const box = $('[data-ob-uses]');
    if (!box) return;
    const tabs = $$('[role="tab"]', box);
    const select = (i, focus) => {
      tabs.forEach((t, k) => {
        const sel = k === i;
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        t.tabIndex = sel ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !sel;
      });
      if (focus) tabs[i].focus();
    };
    box.closest('.ob-uses')?.classList.add('is-js');
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i, false));
      t.addEventListener('keydown', (e) => {
        const n = tabs.length;
        const map = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: n - 1 };
        if (!(e.key in map)) return;
        e.preventDefault();
        select((map[e.key] + n) % n, true);
      });
    });
    select(0, false);
  }

  /* ---------- 4. Step slider ---------- */
  function initSlider() {
    const vp = $('[data-ob-slider]');
    const track = vp && $('[data-ob-track]', vp);
    if (!track) return;
    const slides = $$('[data-ob-slide]', track);
    const dots = $$('[data-ob-dot]');
    const prev = $('[data-ob-prev]');
    const next = $('[data-ob-next]');
    const count = $('[data-ob-how-count]');
    let index = 0;
    let moved = false;
    const offsetOf = (i) => slides[i].offsetLeft - slides[0].offsetLeft;
    const go = (i) => {
      index = Math.max(0, Math.min(slides.length - 1, i));
      track.style.transform = `translate3d(${-offsetOf(index)}px, 0, 0)`;
      slides.forEach((s, k) => { s.classList.toggle('is-active', k === index); s.setAttribute('aria-hidden', k === index ? 'false' : 'true'); });
      dots.forEach((d, k) => d.setAttribute('aria-selected', k === index ? 'true' : 'false'));
      if (count) count.textContent = String(index + 1).padStart(2, '0');
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
    };
    prev?.addEventListener('click', () => go(index - 1));
    next?.addEventListener('click', () => go(index + 1));
    dots.forEach((d, k) => d.addEventListener('click', () => go(k)));
    slides.forEach((s, k) => s.addEventListener('click', () => { if (!moved && k !== index) go(k); }));
    vp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });
    let startX = 0;
    let dx = 0;
    let dragging = false;
    vp.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      dragging = true; moved = false; startX = e.clientX; dx = 0;
      vp.classList.add('is-dragging');
      vp.setPointerCapture?.(e.pointerId);
    });
    vp.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      if (Math.abs(dx) > 6) moved = true;
      const edge = (index === 0 && dx > 0) || (index === slides.length - 1 && dx < 0) ? 0.35 : 1;
      track.style.transform = `translate3d(${-offsetOf(index) + dx * edge}px, 0, 0)`;
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      vp.classList.remove('is-dragging');
      const threshold = Math.min(120, vp.clientWidth * 0.12);
      if (dx < -threshold) go(index + 1);
      else if (dx > threshold) go(index - 1);
      else go(index);
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
    window.addEventListener('resize', () => go(index));
    go(0);
  }

  /* ---------- Masked words (same technique as the homepage's headings) ---------- */
  function splitWords(h) {
    h.classList.add('ed');
    const words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach((word, i) => {
      const w = document.createElement('span');
      const inner = document.createElement('span');
      w.className = 'w';
      inner.textContent = word;
      w.appendChild(inner);
      h.appendChild(w);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
    return $$('.w > span', h);
  }
  function toLines(words) {
    const lines = [];
    let top = null;
    words.forEach((w) => {
      const t = Math.round(w.parentNode.getBoundingClientRect().top);
      if (top === null || Math.abs(t - top) > 6) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w);
    });
    return lines;
  }

  /* ---------- 5. Scroll motion ---------- */
  function initMotion() {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    if (!gsap || !ST || reduceMotion) return;
    gsap.registerPlugin(ST);
    const mm = gsap.matchMedia();

    // Every device with motion allowed
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tp = $('[data-ob-wave]');
      if (tp) gsap.fromTo(tp, { attr: { startOffset: 0 } }, { attr: { startOffset: -1800 }, ease: 'none', scrollTrigger: { trigger: '.ob-wave', start: 'top bottom', end: () => `+=${window.innerHeight * 2.2}`, scrub: 0.6 } });
      const intro = $('.ob-intro');
      if (intro) {
        gsap.timeline({ scrollTrigger: { trigger: intro, start: 'top 85%', end: 'top 25%', scrub: 0.8 } })
          .fromTo($$('.ob-line__in', intro), { yPercent: 110 }, { yPercent: 0, stagger: 0.15, duration: 0.6, ease: 'power3.out' })
          .fromTo($('.ob-intro__lead', intro), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4 }, 0.4)
          .fromTo($('.ob-mark', intro), { '--mk': '0%' }, { '--mk': '100%', duration: 0.5, ease: 'power2.inOut' }, 0.5)
          .fromTo($$('.ob-chips li', intro), { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.06, duration: 0.3 }, 0.6);
      }
      [['.ob-features__grid', '.ob-feature'], ['.ob-uses__tabs', '.ob-utab'], ['.ob-benefits__grid', '.ob-benefit']].forEach(([grid, item]) => {
        const g = $(grid);
        if (!g) return;
        gsap.fromTo($$(item, g), { y: 50, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, ease: 'power2.out', scrollTrigger: { trigger: g, start: 'top 90%', end: 'top 45%', scrub: 0.8 } });
      });
      // CTA: the homepage's "Get started" motion
      const cta = $('#cta .cta');
      const ctaTitle = cta && $('h2', cta);
      if (ctaTitle) {
        const words = splitWords(ctaTitle);
        const eyebrow = $('.eyebrow', cta);
        const lead = $(':scope > p:not(.form-msg)', cta);
        gsap.set(words, { y: 0, yPercent: 120, rotation: 3 });
        if (eyebrow) gsap.set(eyebrow, { autoAlpha: 0, y: 14 });
        if (lead) gsap.set(lead, { autoAlpha: 0, y: 26 });
        ST.create({
          trigger: cta, start: 'top 82%', once: true,
          onEnter: () => {
            const tl = gsap.timeline();
            if (eyebrow) tl.to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0);
            toLines(words).forEach((line, i) => tl.to(line, { y: 0, yPercent: 0, rotation: 0, duration: 1.15, ease: 'expo.out', stagger: 0.035 }, 0.08 + i * 0.14));
            if (lead) tl.to(lead, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 0.45);
          },
        });
      }
    });

    // Mouse/trackpad screens: hero entrance + tilt-away, pinned call journey, CTA tilt
    mm.add(STORY_MQ, () => {
      const root = document.documentElement;
      root.classList.add('ob-story-on');
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.ob-hero__title .ob-line__in', { yPercent: 110, duration: 1.1, stagger: 0.12 }, 0.1)
        .from('.ob-live, .ob-hero__lead, .ob-hero__cta, .ob-hero__trust', { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.4)
        .from('.ob-console', { y: 80, rotationY: -30, autoAlpha: 0, duration: 1.4, ease: 'expo.out' }, 0.25)
        .from('.ob-lane', { x: 30, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 0.7)
        .from('.ob-tag', { scale: 0.6, autoAlpha: 0, duration: 0.6, stagger: 0.12, ease: 'back.out(2)' }, 1);
      gsap.timeline({ scrollTrigger: { trigger: '.ob-hero', start: 'top top', end: 'bottom top', scrub: 0.8 } })
        .to('.ob-hero__stage', { y: 120, rotationX: 12, rotationY: 14, scale: 0.9, ease: 'none' }, 0)
        .to('.ob-hero__copy', { y: -80, ease: 'none' }, 0)
        .to('.ob-hero__word', { xPercent: -14, ease: 'none' }, 0);

      // Journey: pinned stage; steps light up while the call card plays the matching part of the call
      const journey = $('.ob-journey');
      const steps = $$('[data-ob-step]');
      const msgs = $$('[data-ob-msg]');
      const call = $('.ob-call');
      const status = $('[data-ob-status]');
      const timer = $('[data-ob-timer]');
      const STATUS = ['Campaign starting · inside calling window', 'Dialing…', 'Connected · personalised from CRM', 'Handling the reply', 'Outcome logged to CRM'];
      const TIME = ['--:--', '00:00', '00:09', '00:34', '01:12'];
      let shown = -1;
      const show = (i) => {
        if (i === shown) return;
        shown = i;
        steps.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-past', k < i); });
        msgs.forEach((m) => m.classList.toggle('is-in', parseInt(m.dataset.obMsg, 10) <= i + 1));
        if (status) status.textContent = STATUS[i];
        if (timer) timer.textContent = TIME[i];
        if (call) call.dataset.stage = String(i);
      };
      show(0);
      ST.create({
        trigger: journey, start: 'top top', end: 'bottom bottom',
        onUpdate: (self) => show(Math.min(steps.length - 1, Math.floor(self.progress * steps.length * 0.999 + 0.0001))),
      });
      gsap.fromTo('.ob-call', { y: 60, rotationX: 10, autoAlpha: 0 }, { y: 0, rotationX: 0, autoAlpha: 1, ease: 'power2.out', scrollTrigger: { trigger: journey, start: 'top 80%', end: 'top 20%', scrub: 0.8 } });

      const ctaBox = $('#cta .cta');
      if (ctaBox) {
        ctaBox.classList.add('ob-dz');
        gsap.fromTo(ctaBox, { '--dy': '80px', '--drx': '16deg', '--ds': 0.92 }, {
          '--dy': '0px', '--drx': '0deg', '--ds': 1, ease: 'power2.out',
          scrollTrigger: { trigger: '#cta', start: 'top bottom', end: 'top 35%', scrub: 1.2 },
        });
      }
      const refresh = () => ST.refresh();
      window.addEventListener('load', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      return () => {
        root.classList.remove('ob-story-on');
        steps.forEach((s) => s.classList.remove('is-on', 'is-past'));
        msgs.forEach((m) => m.classList.remove('is-in'));
        if (ctaBox) { ctaBox.classList.remove('ob-dz'); ['--dy', '--drx', '--ds'].forEach((v) => ctaBox.style.removeProperty(v)); }
        window.removeEventListener('load', refresh);
      };
    });
  }

  function boot() {
    initBars();
    initConsole();
    initUses();
    initSlider();
    initMotion();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
