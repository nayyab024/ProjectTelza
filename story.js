/* ==========================================================================
   Telza: scroll story (homepage hero → AI Solutions)
   1. createOrb(): canvas AI voice orb (wavy particle sphere + waveform rings)
   2. initStory(): GSAP ScrollTrigger hand-off. The SAME orb travels from the
      hero into the AI Solutions section (desktop, motion allowed). Elsewhere the
      orb just lives in the hero. Runs after script.js (defer order).
   ========================================================================== */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. AI voice orb renderer ---------- */
  function createOrb(canvas) {
    const ctx = canvas.getContext('2d');
    const NB = 7; // alpha buckets per colour (batched drawing = fast)
    let size = 0;
    let pts = new Float32Array(0);
    let dust = [];
    let raf = 0;
    let running = false;
    const drive = { yaw: 0, energy: 1 }; // set from scroll progress (story chapter)
    const t0 = performance.now();
    const buckets = Array.from({ length: NB * 2 }, () => []);

    const resize = () => {
      const css = Math.round(canvas.clientWidth) || 600;
      // detail by device tier: full sphere on desktop, lighter on tablets, lightest on phones
      const vwNow = window.innerWidth;
      const dpr = Math.min(window.devicePixelRatio || 1, vwNow < 768 ? 1.5 : 2);
      const n = vwNow >= 1025 ? 5200 : vwNow >= 768 ? 3200 : 2000;
      if (css === size && canvas.width === Math.round(css * dpr) && pts.length === n * 2) return;
      size = css;
      canvas.width = Math.round(css * dpr);
      canvas.height = Math.round(css * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // evenly spread points (Fibonacci sphere) so the poles don't bunch up
      const golden = Math.PI * (3 - Math.sqrt(5));
      const list = [];
      for (let i = 0; i < n; i++) {
        const yy = 1 - (2 * (i + 0.5)) / n;
        list.push(Math.acos(yy), (i * golden) % (Math.PI * 2));
      }
      pts = Float32Array.from(list);
      dust = Array.from({ length: 120 }, () => ({
        th: Math.acos(2 * Math.random() - 1),
        ph: Math.random() * Math.PI * 2,
        r: 1.12 + Math.random() * 0.5,
        a: 0.15 + Math.random() * 0.45,
        sp: 0.05 + Math.random() * 0.1,
      }));
      if (!running) draw(2.4);
    };

    function draw(t) {
      const c = size / 2;
      const R = size * 0.28;
      const f = size * 1.7;
      const pulse = (0.55 + 0.45 * Math.sin(t * 2.1) * Math.sin(t * 0.63 + 1)) * drive.energy; // "speaking"
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';

      // ambient glow + soft inner core
      let g = ctx.createRadialGradient(c, c, R * 0.15, c, c, R * 1.6);
      g.addColorStop(0, `rgba(20, 201, 184, ${0.09 + 0.05 * pulse})`);
      g.addColorStop(0.55, 'rgba(20, 201, 184, 0.045)');
      g.addColorStop(1, 'rgba(20, 201, 184, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      g = ctx.createRadialGradient(c, c, 0, c, c, R * 0.55);
      g.addColorStop(0, `rgba(200, 255, 240, ${0.08 + 0.07 * pulse})`);
      g.addColorStop(1, 'rgba(57, 255, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, R * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // particle sphere with travelling waves and bright ribbons
      const yaw = t * 0.17 + drive.yaw;
      const pitch = 0.42 + Math.sin(t * 0.13) * 0.12;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const amp = 0.07 + 0.05 * pulse;
      buckets.forEach((b) => { b.length = 0; });
      for (let k = 0; k < pts.length; k += 2) {
        const th = pts[k];
        const ph = pts[k + 1];
        const wave = Math.sin(3 * ph + t * 0.9 + th * 2.2) * Math.cos(2 * th - t * 0.7);
        const r = R * (1 + amp * wave);
        const st = Math.sin(th);
        const x = r * st * Math.cos(ph);
        const y = r * Math.cos(th);
        const z = r * st * Math.sin(ph);
        const x1 = x * cy - z * sy;
        const z1 = x * sy + z * cy;
        const y1 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        const p = f / (f - z2);
        const depth = (z2 / R + 1) / 2;
        const band = Math.max(0, Math.sin(4 * th + 2 * ph - t * 0.8));
        const rim = 1 - Math.min(1, Math.abs(z2) / r);
        const a = 0.08 + 0.34 * depth * depth + 0.6 * band * band * (0.35 + 0.65 * depth) + 0.55 * rim * rim * rim;
        const bi = Math.min(NB - 1, Math.floor(a * NB));
        buckets[(wave > 0.45 ? NB : 0) + bi].push(c + x1 * p, c + y1 * p);
      }
      const ps = size > 420 ? 1.45 : 1.15;
      buckets.forEach((b, i) => {
        if (!b.length) return;
        const green = i >= NB;
        const alpha = ((i % NB) + 0.8) / NB;
        ctx.fillStyle = green ? `rgba(57, 255, 20, ${alpha})` : `rgba(20, 201, 184, ${alpha})`;
        ctx.beginPath();
        for (let q = 0; q < b.length; q += 2) ctx.rect(b[q], b[q + 1], ps, ps);
        ctx.fill();
      });

      // waveform rings orbiting the sphere
      const rings = [
        { tilt: 0.28, speed: 0.22, rr: 1.34, col: '20, 201, 184', off: 0 },
        { tilt: -0.55, speed: -0.15, rr: 1.48, col: '57, 255, 20', off: 2.1 },
        { tilt: 1.2, speed: 0.1, rr: 1.22, col: '20, 201, 184', off: 4.2 },
      ];
      ctx.lineWidth = 1;
      rings.forEach((ring, k) => {
        const rot = t * ring.speed + ring.off;
        const ct = Math.cos(ring.tilt);
        const stt = Math.sin(ring.tilt);
        const cr = Math.cos(rot);
        const sr = Math.sin(rot);
        let dotX = 0;
        let dotY = 0;
        ctx.beginPath();
        for (let s = 0; s <= 180; s++) {
          const ang = (s / 180) * Math.PI * 2;
          const w = 1 + 0.035 * Math.sin(ang * 9 + t * 2.6 + k * 1.7) * (0.5 + pulse);
          const x = R * ring.rr * w * Math.cos(ang);
          const zr = R * ring.rr * w * Math.sin(ang);
          const y = -zr * stt;
          const z = zr * ct;
          const x2 = x * cr - z * sr;
          const z2 = x * sr + z * cr;
          const p = f / (f - z2);
          const px = c + x2 * p;
          const py = c + y * p;
          if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          if (s === Math.floor(((t * 12 + k * 60) % 180))) { dotX = px; dotY = py; }
        }
        ctx.strokeStyle = `rgba(${ring.col}, ${0.2 + 0.14 * pulse})`;
        ctx.stroke();
        ctx.fillStyle = `rgba(${ring.col}, .95)`;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // floating dust
      ctx.fillStyle = 'rgba(57, 255, 20, .5)';
      dust.forEach((d) => {
        const ph = d.ph + t * d.sp;
        const st = Math.sin(d.th);
        const x = R * d.r * st * Math.cos(ph);
        const z = R * d.r * st * Math.sin(ph);
        const y = R * d.r * Math.cos(d.th);
        const p = f / (f - z);
        ctx.globalAlpha = d.a * (0.4 + 0.6 * ((z / (R * d.r) + 1) / 2));
        ctx.fillRect(c + x * p, c + y * p, 1.4, 1.4);
      });
      ctx.globalAlpha = 1;
    }

    const frame = (now) => {
      draw((now - t0) / 1000);
      raf = running ? requestAnimationFrame(frame) : 0;
    };
    return {
      resize,
      setDrive(yaw, energy) { drive.yaw = yaw; drive.energy = energy; if (!running) draw(2.4); },
      start() { if (running || reduceMotion) return; running = true; raf = requestAnimationFrame(frame); },
      stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    };
  }

  /* ---------- Editorial typography helpers ---------- */
  // Key words in headings get the brand gradient (not motion, so it also applies with reduced motion)
  const KW = /\b(AI|[Aa]utomat(?:ion|ed|ing|e)|[Vv]oices?|[Ii]ntelligence)\b/;
  function highlightKeywords() {
    $$('.hero__title, section h2, .cap__big').forEach((h) => {
      if (h.dataset.kw || $('.text-gradient', h)) return; // one accent per heading
      h.dataset.kw = '1';
      if (h.classList.contains('split-words')) { // already split into words by script.js
        $$('.w > span', h).forEach((s) => { if (KW.test(s.textContent)) s.classList.add('kw'); });
        return;
      }
      const walk = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walk.nextNode()) nodes.push(walk.currentNode);
      nodes.forEach((node) => {
        if (node.parentElement.closest('.text-gradient, .kw')) return;
        const parts = node.textContent.split(new RegExp(KW.source, 'g'));
        if (parts.length < 2) return;
        const frag = document.createDocumentFragment();
        parts.forEach((part, i) => {
          if (!part) return;
          if (i % 2) { const s = document.createElement('span'); s.className = 'kw'; s.textContent = part; frag.appendChild(s); }
          else frag.appendChild(document.createTextNode(part));
        });
        node.replaceWith(frag);
      });
    });
  }

  // Split a heading into masked words (.w > .w__i). Inline children (gradient / keyword spans)
  // pass their class to each of their words. Reuses script.js's split when present.
  function splitEd(h) {
    if (!h) return [];
    h.classList.add('ed');
    if (h.classList.contains('split-words') || h.dataset.ed) return $$('.w > span', h);
    h.dataset.ed = '1';
    const out = document.createDocumentFragment();
    const addWords = (text, cls, target) => {
      text.split(/(\s+)/).forEach((tok) => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { target.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        const i = document.createElement('span');
        w.className = 'w';
        i.className = cls ? `w__i ${cls}` : 'w__i';
        i.textContent = tok;
        w.appendChild(i);
        target.appendChild(w);
      });
    };
    // inline accents (gradient / keyword spans) pass their class to each word;
    // structural wrappers (e.g. the hero's headline lines) are kept and filled recursively
    const fill = (src, target) => {
      Array.from(src.childNodes).forEach((n) => {
        if (n.nodeType === 3) addWords(n.textContent, '', target);
        else if (n.nodeType === 1) {
          if (/\b(text-gradient|kw)\b/.test(n.className)) addWords(n.textContent, n.className, target);
          else { const c = n.cloneNode(false); fill(n, c); target.appendChild(c); }
        }
      });
    };
    fill(h, out);
    h.textContent = '';
    h.appendChild(out);
    return $$('.w > span', h);
  }

  // Group words into visual lines (measured when the reveal starts, so fonts/layout are final)
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

  // y:0 matters: GSAP would otherwise read the CSS translateY(110%) of split titles as a px offset
  const HIDE = { y: 0, yPercent: 120, rotation: 3 };
  // Line-by-line masked rise; words inside a line follow closely
  function revealLines(gsap, words) {
    const tl = gsap.timeline();
    toLines(words).forEach((line, i) => {
      tl.to(line, { y: 0, yPercent: 0, rotation: 0, duration: 1.15, ease: 'expo.out', stagger: 0.035 }, i * 0.14);
    });
    return tl;
  }

  /* ---------- 2. Cinematic homepage story: one shared orb across the page ---------- */
  // Scroll map (desktop): hero pinned → headline splits apart while the orb glides into the capability chapter
  // → chapter pinned: four scenes change around the SAME orb, which swaps sides, turns and breathes
  // → the orb shrinks to centre and leaves with the chapter → the SAME element returns into the CTA.
  // Mouse/trackpad screens of any size from 768×420 CSS px (laptops at any scaling or zoom level, widescreens).
  // Touch tablets and phones keep the lightweight static versions. Defined once in script.js.
  const DESKTOP = window.TELZA_STORY_MQ || '(min-width: 768px) and (min-height: 420px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

  function initStory() {
    const orb = $('[data-orb]');
    const anchor = $('[data-orb-anchor]');
    const canvas = orb && $('canvas', orb);
    if (!orb || !anchor || !canvas || !canvas.getContext) return;
    const renderer = createOrb(canvas);
    renderer.resize();

    // Render only while the orb is on screen and the tab is visible
    let onScreen = true;
    const sync = () => (onScreen && !document.hidden ? renderer.start() : renderer.stop());
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); }).observe(canvas);
    }
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('resize', () => renderer.resize());
    sync();

    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    window.__telzaStory = true;
    if (!gsap || !ST) { // libraries unavailable: static composition, orb stays in the hero
      document.documentElement.classList.remove('story-on'); // undo the early class set in index.html
      return;
    }
    gsap.registerPlugin(ST);

    const hero = $('#hero');
    const cap = $('[data-cap]');
    const ctaSpot = $('[data-orb-cta]');
    if (!hero || !cap) return;

    const mm = gsap.matchMedia();
    mm.add(DESKTOP, () => {
      const root = document.documentElement;
      root.classList.add('story-on');

      const stage = document.createElement('div');
      stage.className = 'orb-stage';
      stage.setAttribute('aria-hidden', 'true');
      stage.innerHTML = '<div class="orb-exit"><div class="orb-shift"><div class="orb-pos"><div class="orb-scale"><div class="orb-fx"><div class="orb-stage__glow"></div></div></div></div></div></div>';
      const exitW = $('.orb-exit', stage);
      const shift = $('.orb-shift', stage);
      const pos = $('.orb-pos', stage);
      const scaleEl = $('.orb-scale', stage);
      const fx = $('.orb-fx', stage);
      const glow = $('.orb-stage__glow', stage);
      fx.appendChild(orb);
      document.body.appendChild(stage);
      renderer.resize();

      const vw = () => document.documentElement.clientWidth;
      const vh = () => window.innerHeight;
      const S = 600;
      const heroSpot = () => {
        const a = anchor.getBoundingClientRect();
        const h = hero.getBoundingClientRect();
        return { x: a.left + a.width / 2, y: a.top - h.top + a.height / 2, s: a.width / S };
      };
      const capSize = () => Math.min(vh() * 0.62, 580);
      const capX = (i) => vw() / 2 + (i % 2 === 0 ? 1 : -1) * Math.min(vw() * 0.25, 380); // even scenes: orb right
      const capY = () => vh() * 0.55;

      /* --- Hero --- */
      const title = $('.hx__title', hero);
      const words = splitEd(title);
      const lines = $$('.hx__line', title);
      const top = $('.hx__top', hero);
      const foot = $('.hx__foot', hero);
      const hint = $('.hx__scroll', hero);
      const fades = $$('.hx__top .hx__fade, .hx__foot .hx__fade', hero);
      const floats = $('.hero-floats', hero);
      const bg = $('.hero__bg', hero);

      // Load intro (the only time-based part): headline lines rise as the orb forms
      gsap.set(words, HIDE);
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from(orb, { scale: 0.8, autoAlpha: 0, duration: 1.6, ease: 'expo.out' }, 0)
        .add(() => revealLines(gsap, words), 0.15)
        .from(fades, { y: 22, autoAlpha: 0, duration: 1, stagger: 0.08 }, 0.6)
        .from(floats.children, { autoAlpha: 0, scale: 0.9, duration: 0.8, stagger: 0.1 }, 0.8);

      // Phase 1: hero pinned. The headline splits apart line by line, callouts scatter,
      // and the orb glides from the centre into the chapter's first scene.
      gsap.timeline({
        scrollTrigger: { trigger: hero, start: 'top top', end: () => `+=${Math.round(vh())}`, pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true },
      })
        .fromTo(pos,
          { xPercent: -50, yPercent: -50, x: () => heroSpot().x, y: () => heroSpot().y, scale: () => heroSpot().s },
          { x: () => capX(0), y: capY, scale: () => capSize() / S, ease: 'power2.inOut', duration: 1 }, 0)
        .to(lines, { xPercent: (i) => (i % 2 ? 30 : -30), autoAlpha: 0, ease: 'power2.in', duration: 0.7, stagger: 0.05 }, 0)
        .to(top, { y: -30, autoAlpha: 0, ease: 'power2.in', duration: 0.4 }, 0)
        .to([foot, hint], { y: 40, autoAlpha: 0, ease: 'power2.in', duration: 0.4 }, 0)
        .to(floats, { scale: 1.3, autoAlpha: 0, ease: 'power2.in', duration: 0.55 }, 0)
        .to(bg, { autoAlpha: 0.25, ease: 'none', duration: 1 }, 0)
        .fromTo(glow, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, ease: 'power1.out', duration: 1 }, 0);

      /* --- Capability chapter --- */
      const head = $('.cap__head', cap);
      const scenes = $$('[data-cap-scene]', cap);
      const bgWords = $$('[data-cap-word]', cap);
      const count = $('[data-cap-count]', cap);
      const bar = $('[data-cap-bar]', cap);
      const parts = scenes.map((sc) => ({
        el: sc,
        words: splitEd($('.cap__big', sc)),
        rest: $$('.cap__label, .cap__p, .cap__link', sc),
        chip: $('.cap__chip', sc),
      }));
      gsap.set(bgWords, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      gsap.set(bgWords[0], { autoAlpha: 1 });
      scenes.forEach((sc, i) => gsap.set(sc, { autoAlpha: i ? 0 : 1 }));
      parts.slice(1).forEach((pt) => { gsap.set(pt.words, HIDE); gsap.set([...pt.rest, pt.chip], { autoAlpha: 0 }); });

      // Scene 1 arrives with the chapter (the orb is already waiting at its spot)
      const p0 = parts[0];
      gsap.timeline({ scrollTrigger: { trigger: cap, start: 'top 85%', end: 'top 10%', scrub: 0.8 } })
        .fromTo(p0.words, HIDE, { y: 0, yPercent: 0, rotation: 0, stagger: 0.05, duration: 0.5, ease: 'power3.out' }, 0)
        .fromTo(p0.rest, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.4 }, 0.2)
        .fromTo(p0.chip, { y: 50, autoAlpha: 0, scale: 0.9 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.5 }, 0.35)
        .fromTo(bgWords[0], { xPercent: -38 }, { xPercent: -50, ease: 'none', duration: 1 }, 0)
        .fromTo(head, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4 }, 0.1);

      const HOLD = 1;
      const T = 1;
      const OUT = 1.2;
      const N = scenes.length;
      const TOTAL = HOLD * N + T * (N - 1) + OUT;
      const sceneAt = (t) => {
        let idx = 0;
        for (let i = 0; i < N - 1; i++) if (t >= HOLD + i * (T + HOLD) + T / 2) idx = i + 1;
        return idx;
      };
      const main = gsap.timeline({
        scrollTrigger: {
          trigger: cap, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
          onUpdate: (self) => {
            const t = self.progress * TOTAL;
            const idx = sceneAt(t);
            if (count) count.textContent = String(idx + 1).padStart(2, '0');
            if (bar) bar.style.transform = `scaleX(${((idx + 1) / N).toFixed(3)})`;
            renderer.setDrive(self.progress * 3.4, 1 + 0.5 * Math.sin(Math.min(1, self.progress * 1.15) * Math.PI));
          },
        },
      });
      for (let i = 0; i < N - 1; i++) {
        const ts = HOLD + i * (T + HOLD);
        const cur = parts[i];
        const nxt = parts[i + 1];
        main
          // current scene lifts away
          .to(cur.el, { y: -50, autoAlpha: 0, ease: 'power2.in', duration: T * 0.45 }, ts)
          .to(bgWords[i], { x: () => -vw() * 0.12, autoAlpha: 0, ease: 'power1.in', duration: T * 0.6 }, ts)
          // the orb swaps sides, turning and breathing on the way
          .to(shift, { x: () => capX(i + 1) - capX(0), ease: 'power2.inOut', duration: T }, ts)
          .to(fx, { rotation: (i + 1) * 40, ease: 'power1.inOut', duration: T }, ts)
          .to(fx, { scale: 1.12, ease: 'sine.out', duration: T * 0.5 }, ts)
          .to(fx, { scale: 1, ease: 'sine.in', duration: T * 0.5 }, ts + T * 0.5)
          // next scene arrives
          .set(nxt.el, { autoAlpha: 1, y: 0 }, ts + T * 0.4)
          .fromTo(bgWords[i + 1], { x: () => vw() * 0.12, autoAlpha: 0 }, { x: 0, autoAlpha: 1, ease: 'power2.out', duration: T * 0.6 }, ts + T * 0.4)
          .fromTo(nxt.words, HIDE, { y: 0, yPercent: 0, rotation: 0, stagger: 0.04, duration: T * 0.45, ease: 'power3.out' }, ts + T * 0.45)
          .fromTo(nxt.rest, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.06, duration: T * 0.35 }, ts + T * 0.6)
          .fromTo(nxt.chip, { y: 50, autoAlpha: 0, scale: 0.9 }, { y: 0, autoAlpha: 1, scale: 1, duration: T * 0.4 }, ts + T * 0.6);
      }
      const tOut = HOLD * N + T * (N - 1);
      main
        // outro: last scene and header clear, the orb shrinks to the centre, ready to leave with the chapter
        .to(parts[N - 1].el, { y: -50, autoAlpha: 0, ease: 'power2.in', duration: OUT * 0.4 }, tOut)
        .to(bgWords[N - 1], { scale: 1.15, autoAlpha: 0, ease: 'power1.in', duration: OUT * 0.6 }, tOut)
        .to(head, { y: -24, autoAlpha: 0, duration: OUT * 0.4 }, tOut)
        .to(shift, { x: () => vw() / 2 - capX(0), y: () => vh() * 0.5 - capY(), ease: 'power2.inOut', duration: OUT }, tOut)
        .to(scaleEl, { scale: 0.42, ease: 'power2.inOut', duration: OUT }, tOut)
        .to(fx, { rotation: N * 40 + 30, ease: 'power1.inOut', duration: OUT }, tOut);

      // Phase 3: the sticky stage releases; the orb leaves with the chapter (1:1 with the page)
      gsap.fromTo(exitW, { y: 0 }, {
        y: () => -vh(),
        ease: 'none',
        scrollTrigger: {
          trigger: cap, start: 'bottom bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true,
          onLeave: () => gsap.set(stage, { autoAlpha: 0 }),
          onEnterBack: () => gsap.set(stage, { autoAlpha: 1 }),
          onLeaveBack: () => gsap.set(stage, { autoAlpha: 1 }),
        },
      });

      // Phase 4: the SAME orb returns: moved into the CTA's landing spot and risen into place by scroll
      let inCta = false;
      const toCta = () => { if (inCta || !ctaSpot) return; inCta = true; ctaSpot.appendChild(orb); renderer.resize(); renderer.setDrive(0, 1.2); };
      const toStage = () => { if (!inCta) return; inCta = false; fx.appendChild(orb); renderer.resize(); };
      if (ctaSpot) {
        ST.create({ trigger: '#cta', start: 'top bottom', onEnter: toCta, onLeaveBack: toStage });
        gsap.fromTo(ctaSpot, { y: 160, scale: 0.5, rotation: -30, autoAlpha: 0 }, {
          y: 0, scale: 1, rotation: 0, autoAlpha: 1, ease: 'power2.out',
          scrollTrigger: { trigger: '#cta', start: 'top bottom', end: 'top 25%', scrub: 1 },
        });
      }

      // Positions depend on fonts and on the product showcase's height
      const refresh = () => ST.refresh();
      window.addEventListener('load', refresh);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);

      return () => {
        // Leaving desktop: put the orb back into the hero and drop the stage
        anchor.appendChild(orb);
        stage.remove();
        renderer.setDrive(0, 1);
        root.classList.remove('story-on');
        window.removeEventListener('load', refresh);
        requestAnimationFrame(() => renderer.resize());
      };
    });
  }
  /* ---------- 3. Editorial typography for key storytelling headings ---------- */
  // Only a handful of headings get the masked line reveal; everything else keeps the site's simple reveal.
  const ED_BLOCKS = [
    { head: '#voice-agents .split__content', title: '.section-title', lead: '.section-lead', strip: false }, // column keeps its fade
    { head: '#products .ps__intro', title: '.section-title', lead: '#products .ps__aside', strip: true },
    { head: '#features .section-head', title: '.section-title', lead: '.section-lead', strip: true },
    { head: '#ecosystem .sys-head__main', title: '.section-title', lead: '#ecosystem .sys-head__aside', strip: true },
    { head: '#how-it-works .section-head', title: '.section-title', lead: '.section-lead', strip: true },
    { head: '#cta .cta', title: 'h2', lead: '#cta .cta > p:not(.form-msg)', strip: false }, // box keeps its own fade
  ];

  function initTypography() {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    if (!gsap || !ST) return;
    gsap.registerPlugin(ST);

    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const stripped = [];
      ED_BLOCKS.forEach((b) => {
        const head = $(b.head);
        const title = head && $(b.title, head);
        if (!head || !title) return;
        const words = splitEd(title);
        const eyebrow = $('.eyebrow', head);
        const lead = b.lead.startsWith('#') ? $(b.lead) : $(b.lead, head);
        // GSAP takes over from the CSS reveal on these elements
        if (b.strip) {
          [head, lead].forEach((el) => {
            if (el && el.classList.contains('reveal')) { el.classList.remove('reveal', 'is-visible'); stripped.push(el); }
          });
          gsap.set([head, lead].filter(Boolean), { clearProps: 'opacity,transform,transition' });
        }
        gsap.set(words, { ...HIDE, transition: 'none' });
        if (eyebrow) gsap.set(eyebrow, { autoAlpha: 0, y: 14 });
        if (lead) gsap.set(lead, { autoAlpha: 0, y: 26 });
        ST.create({
          trigger: head,
          start: 'top 82%',
          once: true,
          onEnter: () => {
            const tl = gsap.timeline();
            if (eyebrow) tl.to(eyebrow, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0);
            tl.add(revealLines(gsap, words), 0.08);
            if (lead) tl.to(lead, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out' }, 0.45);
          },
        });
      });

      // Oversized background words drift slowly against the scroll
      const drift = (sel, trigger, from, to) => {
        const el = $(sel);
        const tr = $(trigger);
        if (!el || !tr) return;
        gsap.fromTo(el, { xPercent: from }, { xPercent: to, ease: 'none', scrollTrigger: { trigger: tr, start: 'top bottom', end: 'bottom top', scrub: 1.2, invalidateOnRefresh: true } });
      };
      drift('.bgtype--hero', '#hero', 0, -16);
      drift('.bgtype--ps', '#products', -12, 8);

      return () => {
        // motion turned off: put the simple reveal back and show everything
        stripped.forEach((el) => el.classList.add('reveal', 'is-visible'));
      };
    });
  }

  /* ---------- 4. Depth & atmosphere ---------- */
  // Lightweight particle field: pre-rendered glow sprites at three depths. Each depth scrolls
  // at its own speed, so the field reads as layered space behind the page.
  function createParticles(canvas, count) {
    const ctx = canvas.getContext('2d');
    const sprite = (rgb) => {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, `rgba(${rgb},1)`);
      gr.addColorStop(0.22, `rgba(${rgb},.5)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 32, 32);
      return c;
    };
    const SPR = [sprite('20,201,184'), sprite('57,255,20'), sprite('225,255,250')];
    // far → near: slower, smaller, dimmer ... faster, larger, softer
    const DEPTH = [
      { speed: 0.04, size: [3, 6], alpha: [0.3, 0.55], drift: 4 },
      { speed: 0.11, size: [6, 10], alpha: [0.35, 0.6], drift: 7 },
      { speed: 0.24, size: [12, 20], alpha: [0.16, 0.3], drift: 11 },
    ];
    const rnd = (a, b) => a + Math.random() * (b - a);
    let w = 0;
    let h = 0;
    let parts = [];
    let raf = 0;
    let last = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (parts.length) return;
      parts = Array.from({ length: count }, () => {
        const r = Math.random();
        const d = DEPTH[r < 0.55 ? 0 : r < 0.87 ? 1 : 2];
        const c = Math.random();
        const ang = Math.random() * Math.PI * 2;
        return {
          x: Math.random(), y: Math.random(), d,
          s: rnd(d.size[0], d.size[1]), a: rnd(d.alpha[0], d.alpha[1]),
          spr: SPR[c < 0.6 ? 0 : c < 0.85 ? 1 : 2],
          vx: Math.cos(ang) * d.drift, vy: Math.sin(ang) * d.drift - d.drift * 0.4, // slight upward lift
          ph: Math.random() * 6.28,
        };
      });
    };
    const frame = (t) => {
      const dt = Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      const sy = window.scrollY;
      const H = h + 40;
      parts.forEach((p) => {
        p.x = (p.x + (p.vx * dt) / w + 1) % 1;
        p.y = (p.y + (p.vy * dt) / h + 1) % 1;
        const y = ((((p.y * H - sy * p.d.speed) % H) + H) % H) - 20;
        ctx.globalAlpha = p.a * (0.7 + 0.3 * Math.sin(t * 0.0009 + p.ph));
        ctx.drawImage(p.spr, p.x * w - p.s / 2, y - p.s / 2, p.s, p.s);
      });
      raf = requestAnimationFrame(frame);
    };
    return {
      resize,
      start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } },
      stop() { cancelAnimationFrame(raf); raf = 0; },
    };
  }

  // Background scene per section: three glows [x, y, scale, opacity] (viewport fractions) + rings [x, y, opacity]
  const SCENES = {
    hero: { g: [[0.8, 0.28, 1, 1], [0.12, 0.92, 0.8, 0.55], [0.5, 0.62, 1.1, 0.45]], r: [0.72, 0.42, 0] },
    sol: { g: [[0.5, 0.42, 1.1, 0.75], [0.86, 0.82, 0.7, 0.45], [0.18, 0.3, 1, 0.7]], r: [0.5, 0.45, 0.45] },
    core: { g: [[0.3, 0.5, 1.15, 1], [0.82, 0.22, 0.75, 0.4], [0.62, 0.82, 1.3, 0.75]], r: [0.3, 0.5, 0.85] },
    prod: { g: [[0.2, 0.78, 1, 0.75], [0.74, 0.55, 1, 0.85], [0.5, 0.18, 1.2, 0.55]], r: [0.5, 0.6, 0.25] },
    right: { g: [[0.78, 0.48, 1, 0.9], [0.14, 0.2, 0.7, 0.4], [0.3, 0.86, 1.2, 0.55]], r: [0.76, 0.5, 0] },
    left: { g: [[0.22, 0.5, 1, 0.85], [0.86, 0.76, 0.8, 0.55], [0.7, 0.18, 1.1, 0.5]], r: [0.24, 0.5, 0] },
    grid: { g: [[0.5, 0.12, 1.3, 0.65], [0.14, 0.76, 0.9, 0.6], [0.86, 0.6, 1, 0.55]], r: [0.5, 0.5, 0.3] },
    eco: { g: [[0.5, 0.55, 1.2, 0.7], [0.8, 0.3, 0.8, 0.5], [0.2, 0.7, 1, 0.6]], r: [0.5, 0.55, 0.6] },
    calm: { g: [[0.5, 0.3, 1, 0.45], [0.2, 0.85, 0.8, 0.35], [0.8, 0.7, 1, 0.4]], r: [0.5, 0.5, 0] },
    cta: { g: [[0.5, 0.55, 1.4, 1], [0.5, 0.62, 1, 0.75], [0.5, 0.4, 1.3, 0.6]], r: [0.5, 0.55, 0.7] },
  };
  const SECTION_SCENES = {
    hero: 'hero', solutions: 'core', products: 'prod', 'voice-agents': 'right', inbound: 'left',
    outbound: 'right', whatsapp: 'left', features: 'grid', ecosystem: 'eco', industries: 'calm', 'how-it-works': 'grid',
    integrations: 'eco', testimonials: 'calm', faq: 'calm', cta: 'cta',
  };

  function initDepth() {
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    if (!gsap || !ST || !$('#hero')) return;
    gsap.registerPlugin(ST);
    const mm = gsap.matchMedia();

    // A. Atmosphere (all screen sizes, motion allowed)
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const root = document.documentElement;
      root.classList.add('depth-on');
      const atmos = document.createElement('div');
      atmos.className = 'atmos';
      atmos.setAttribute('aria-hidden', 'true');
      atmos.innerHTML = '<div class="atmos__glow atmos__glow--teal"></div><div class="atmos__glow atmos__glow--green"></div><div class="atmos__glow atmos__glow--deep"></div>'
        + '<canvas class="atmos__particles"></canvas>'
        + '<div class="atmos__rings"><span class="atmos__ring atmos__ring--1"></span><span class="atmos__ring atmos__ring--2"></span></div>';
      document.body.prepend(atmos);
      const glows = $$('.atmos__glow', atmos);
      const rings = $('.atmos__rings', atmos);

      let current = 'hero';
      const applyScene = (name, dur = 2.2) => {
        const sc = SCENES[name];
        if (!sc) return;
        current = name;
        const W = window.innerWidth;
        const H = window.innerHeight;
        glows.forEach((g, i) => {
          const [x, y, s, o] = sc.g[i];
          gsap.to(g, { x: x * W, y: y * H, scale: s, autoAlpha: o, duration: dur, ease: 'sine.inOut', overwrite: 'auto' });
        });
        gsap.to(rings, { x: (sc.r[0] - 0.5) * W, y: (sc.r[1] - 0.5) * H, autoAlpha: sc.r[2], duration: dur * 1.1, ease: 'sine.inOut', overwrite: 'auto' });
      };
      // start at the hero scene, fading in
      glows.forEach((g, i) => { const [x, y, s] = SCENES.hero.g[i]; gsap.set(g, { x: x * window.innerWidth, y: y * window.innerHeight, scale: s * 0.85 }); });
      applyScene('hero', 2.6);
      // gradient transitions: the scene changes as each section takes over the viewport
      Object.keys(SECTION_SCENES).forEach((id) => {
        const sec = document.getElementById(id);
        if (!sec) return;
        ST.create({ trigger: sec, start: 'top 55%', end: 'bottom 55%', onToggle: (self) => { if (self.isActive) applyScene(SECTION_SCENES[id]); } });
      });
      // rings turn slowly with the whole page scroll (plus their own CSS spin)
      gsap.fromTo(rings, { rotation: -8 }, { rotation: 38, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 2 } });

      // particles
      const canvas = $('.atmos__particles', atmos);
      const vwNow = window.innerWidth;
      const field = createParticles(canvas, vwNow < 768 ? 24 : vwNow < 1025 ? 44 : 70);
      field.resize();
      const vis = () => (document.hidden ? field.stop() : field.start());
      const onResize = () => { field.resize(); applyScene(current, 0.6); };
      document.addEventListener('visibilitychange', vis);
      window.addEventListener('resize', onResize);
      vis();

      return () => {
        field.stop();
        document.removeEventListener('visibilitychange', vis);
        window.removeEventListener('resize', onResize);
        atmos.remove();
        root.classList.remove('depth-on');
      };
    });

    // B. Scroll-driven 3D depth on a few blocks (desktop only): visuals are the near layer,
    // copy sits further back, feature grid and CTA tilt into place in perspective
    mm.add(DESKTOP, () => {
      const tagged = [];
      const tag = (el, ...cls) => { el.classList.add('dz', ...cls); tagged.push([el, cls]); };
      $$('#voice-agents .split, #inbound .split, #outbound .split, #whatsapp .split').forEach((split) => {
        const visual = $('.split__visual', split);
        const copy = $('.split__content', split);
        const range = { trigger: split, start: 'top bottom', end: 'bottom top', scrub: 1.2 };
        if (visual) {
          tag(visual);
          gsap.timeline({ scrollTrigger: range })
            .fromTo(visual, { '--dy': '90px', '--drx': '14deg', '--ds': 0.93 }, { '--dy': '0px', '--drx': '0deg', '--ds': 1, ease: 'power1.out', duration: 0.5 })
            .to(visual, { '--dy': '-60px', '--drx': '-6deg', ease: 'power1.in', duration: 0.5 });
        }
        if (copy) {
          tag(copy, 'dz--y');
          gsap.fromTo(copy, { '--dy': '36px' }, { '--dy': '-36px', ease: 'none', scrollTrigger: range });
        }
      });
      const tilt = (el, from, trigger) => {
        if (!el) return;
        tag(el);
        gsap.fromTo(el, from, { '--dy': '0px', '--drx': '0deg', '--ds': 1, ease: 'power2.out', scrollTrigger: { trigger: trigger || el, start: 'top bottom', end: 'top 35%', scrub: 1.2 } });
      };
      tilt($('#features .bento'), { '--dy': '70px', '--drx': '12deg', '--ds': 0.96 });
      tilt($('#cta .cta'), { '--dy': '80px', '--drx': '16deg', '--ds': 0.92 }, $('#cta'));

      return () => tagged.forEach(([el, cls]) => {
        el.classList.remove('dz', ...cls);
        ['--dy', '--drx', '--ds'].forEach((p) => el.style.removeProperty(p));
      });
    });
  }

  function boot() {
    highlightKeywords();
    initStory();
    initTypography();
    initDepth();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
