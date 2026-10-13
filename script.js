document.body.classList.add('js-ready');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// smooth-scroll instance (Lenis); stays null when reduced motion is requested or the CDN fails
let lenis = null;

/* ---------- light / dark theme toggle ---------- */
(function initThemeToggle() {

    const root = document.documentElement;
    const toggleBtn = document.getElementById('themeToggle');
    const icon = toggleBtn?.querySelector('.theme-toggle__icon');
    const stored = localStorage.getItem('theme');
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        if (toggleBtn) {
            const isLight = theme === 'light';
            toggleBtn.setAttribute('aria-pressed', String(isLight));
            toggleBtn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
            if (icon) icon.textContent = isLight ? '☀️' : '🌙';
        }
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    // tracked here rather than read from the DOM: the DOM update lands a frame
    // late inside the View Transition, so fast double-clicks would read stale state
    let currentTheme = stored ?? (systemPrefersLight ? 'light' : 'dark');
    applyTheme(currentTheme);

    toggleBtn?.addEventListener('click', () => {
        const next = currentTheme === 'light' ? 'dark' : 'light';
        currentTheme = next;
        const commit = () => {
            applyTheme(next);
            localStorage.setItem('theme', next);
        };

        if (!document.startViewTransition || prefersReducedMotion) {
            commit();
            return;
        }

        // circular reveal of the new theme, expanding from the toggle button
        const rect = toggleBtn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

        document.startViewTransition(commit).ready
            .then(() => {
                root.animate(
                    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                    { duration: 600, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
                );
            })
            // rapid re-clicks skip the in-flight transition; the theme still commits
            .catch(() => {});
    });
})();

/* ---------- 3D network background behind the hero (Vanta.js NET) ---------- */
(function initHeroBackground3D() {

    const container = document.getElementById('heroBg3d');
    const heroEl = document.getElementById('hero');

    if (!container || !heroEl || prefersReducedMotion || !(window.VANTA && window.THREE)) {
        return; // CDN blocked, reduced motion requested, or markup missing — leave the static grid as-is
    }

    function hexVarToNumber(varName, fallback) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        const match = value.match(/^#([0-9a-fA-F]{6})$/);
        return match ? parseInt(match[1], 16) : fallback;
    }

    function currentColors() {
        return {
            color: hexVarToNumber('--accent', 0x00e5c7),
            backgroundColor: hexVarToNumber('--bg', 0x0a0e14),
        };
    }

    let vantaEffect = null;

    function create() {
        if (vantaEffect) return;
        vantaEffect = window.VANTA.NET({
            el: container,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200,
            minWidth: 200,
            scale: 1.0,
            scaleMobile: 0.5,
            points: 10,
            maxDistance: 22,
            spacing: 16,
            showDots: true,
            ...currentColors(),
        });
    }

    function destroy() {
        vantaEffect?.destroy();
        vantaEffect = null;
    }

    create();

    document.addEventListener('themechange', () => {
        vantaEffect?.setOptions(currentColors());
    });

    // Stop the WebGL render loop while the hero is far out of view, resume on return.
    const observer = new IntersectionObserver(
        entries => entries.forEach(entry => (entry.isIntersecting ? create() : destroy())),
        { rootMargin: '200px 0px' }
    );
    observer.observe(heroEl);
})();

/* ---------- typing effect for the hero role line (human-paced) ---------- */
function typeLoop(el, lines, { typeSpeed = 45, deleteSpeed = 28, pause = 1600 } = {}) {

    if (prefersReducedMotion) {
        el.textContent = lines[0];
        return;
    }

    let lineIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let misfireArmed = true; // allow at most one "typo" per forward pass, so it reads as human, not glitchy

    const jitter = (base, spread) => base + (Math.random() * spread * 2 - spread);

    function tick() {

        const current = lines[lineIndex];
        let delay = deleting ? jitter(deleteSpeed, 10) : jitter(typeSpeed, 20);

        if (!deleting) {

            // occasionally "mistype" a nearby key then backspace-correct, like a real typist
            if (misfireArmed && charIndex > 3 && charIndex < current.length - 1 && Math.random() < 0.05) {
                misfireArmed = false;
                const wrongChar = String.fromCharCode(current.charCodeAt(charIndex) + 1);
                el.textContent = current.slice(0, charIndex) + wrongChar;
                setTimeout(() => {
                    el.textContent = current.slice(0, charIndex);
                    setTimeout(tick, jitter(typeSpeed, 20));
                }, 140);
                return;
            }

            charIndex++;
            el.textContent = current.slice(0, charIndex);

            // a beat longer after punctuation/spaces — how people actually type
            if (/[\s/,.]/.test(current[charIndex - 1] ?? '')) delay += 90;

            if (charIndex === current.length) {
                deleting = true;
                misfireArmed = true;
                setTimeout(tick, pause);
                return;
            }
        } else {
            charIndex--;
            el.textContent = current.slice(0, charIndex);
            if (charIndex === 0) {
                deleting = false;
                lineIndex = (lineIndex + 1) % lines.length;
            }
        }

        setTimeout(tick, delay);
    }

    tick();
}

typeLoop(document.getElementById('typeTarget'), [
    'SDET // Playwright + JavaScript',
    'API Automation & End-to-End Testing',
    'AI-Powered AWS Media / OTT QA',
]);

/* ---------- simulated test-run terminal (hero) ---------- */
function runTerminal(el) {

    if (!el) return;

    const lines = [
        { text: '$ npx playwright test --project=chromium', type: 'cmd' },
        { text: 'Running 42 tests using 6 workers', type: 'info' },
        { text: '✓ login.spec.ts › authenticates user via SSO (320ms)', type: 'pass' },
        { text: '✓ api.spec.ts › validates contract schema via Request Context (180ms)', type: 'pass' },
        { text: '✓ media.spec.ts › transcodes OTT asset via MediaConvert (640ms)', type: 'pass' },
        { text: '✓ moderation.spec.ts › Rekognition + Bedrock flag policy violation (410ms)', type: 'pass' },
        { text: '✓ ai-search.spec.ts › validates video semantic search ranking (530ms)', type: 'pass' },
        { text: '✓ regression.spec.ts › full smoke suite green (210ms)', type: 'pass' },
        { text: '42 passed (100%) in 8.4s', type: 'summary' },
    ];

    if (prefersReducedMotion) {
        el.innerHTML = lines.map(l => `<div class="terminal__line terminal__line--${l.type}" style="opacity:1">${l.text}</div>`).join('');
        return;
    }

    let i = 0;
    const jitter = (base, spread) => base + Math.random() * spread;

    // the typed command reads like someone actually hand-typing it;
    // everything after that is program output, so it prints as whole lines
    function typeCommandLine(text, done) {
        const div = document.createElement('div');
        div.className = 'terminal__line terminal__line--cmd';
        div.style.opacity = 1;
        const span = document.createElement('span');
        div.appendChild(span);
        const cursor = document.createElement('span');
        cursor.className = 'terminal__cursor';
        div.appendChild(cursor);
        el.appendChild(div);

        let c = 0;
        (function typeChar() {
            c++;
            span.textContent = text.slice(0, c);
            if (c < text.length) {
                setTimeout(typeChar, jitter(18, 40));
            } else {
                cursor.remove();
                setTimeout(done, 280);
            }
        })();
    }

    function addLine() {

        if (i >= lines.length) {
            el.insertAdjacentHTML('beforeend', '<span class="terminal__cursor"></span>');
            setTimeout(() => { el.innerHTML = ''; i = 0; addLine(); }, 4200);
            return;
        }

        const line = lines[i];

        if (line.type === 'cmd') {
            typeCommandLine(line.text, () => { i++; addLine(); });
            return;
        }

        const div = document.createElement('div');
        div.className = `terminal__line terminal__line--${line.type}`;
        div.textContent = line.text;
        el.appendChild(div);
        i++;
        setTimeout(addLine, line.type === 'pass' ? jitter(300, 220) : jitter(420, 260));
    }

    addLine();
}

runTerminal(document.getElementById('terminalBody'));

/* ---------- animated skill proficiency bars ---------- */
function animateSkillBars() {
    document.querySelectorAll('.skillbar').forEach(bar => {
        const fill = bar.querySelector('.skillbar__fill');
        const level = bar.dataset.level ?? '0';
        requestAnimationFrame(() => { fill.style.width = `${level}%`; });
    });
}

/* ---------- animated stat counters ---------- */
function animateCounters() {

    document.querySelectorAll('.stat__num').forEach(el => {

        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix ?? '';
        const isDecimal = String(target).includes('.');
        const duration = 1200;
        const start = performance.now();

        if (prefersReducedMotion) {
            el.textContent = target + suffix;
            return;
        }

        function frame(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = target * eased;
            el.textContent = (isDecimal ? value.toFixed(1) : Math.round(value)) + suffix;
            if (progress < 1) requestAnimationFrame(frame);
        }

        requestAnimationFrame(frame);
    });
}

/* ---------- split section titles into masked words ---------- */
const splitTitles = [];

if (!prefersReducedMotion && window.gsap && window.ScrollTrigger) {
    document.querySelectorAll('.section__title').forEach(title => {
        const text = title.textContent.trim();
        const words = text.split(/\s+/);

        title.textContent = '';
        title.setAttribute('aria-label', text);
        words.forEach((word, i) => {
            const mask = document.createElement('span');
            mask.className = 'word-mask';
            mask.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.className = 'word';
            inner.textContent = word;
            mask.appendChild(inner);
            title.appendChild(mask);
            if (i < words.length - 1) title.appendChild(document.createTextNode(' '));
        });

        // the words animate themselves; drop the generic fade so they aren't hidden twice
        title.removeAttribute('data-reveal');
        splitTitles.push(title);
    });
}

/* ---------- split hero name into letters (3D flip intro) ---------- */
const heroChars = [];
const heroNameEl = document.querySelector('.hero__name');

if (heroNameEl && !prefersReducedMotion && window.gsap && window.ScrollTrigger) {
    const text = heroNameEl.textContent.trim();
    heroNameEl.textContent = '';
    heroNameEl.setAttribute('aria-label', text);

    text.split(' ').forEach((word, wi, all) => {
        // each word stays unbreakable so letters never wrap mid-word
        const wordEl = document.createElement('span');
        wordEl.className = 'hero__word';
        wordEl.setAttribute('aria-hidden', 'true');
        [...word].forEach(ch => {
            const charEl = document.createElement('span');
            charEl.className = 'hero__char';
            charEl.textContent = ch;
            wordEl.appendChild(charEl);
            heroChars.push(charEl);
        });
        heroNameEl.appendChild(wordEl);
        if (wi < all.length - 1) heroNameEl.appendChild(document.createTextNode(' '));
    });

    heroNameEl.removeAttribute('data-reveal');
}

/* ---------- split About paragraphs into words (scroll-scrubbed highlight) ---------- */
const scrubParagraphs = [];

if (!prefersReducedMotion && window.gsap && window.ScrollTrigger) {
    document.querySelectorAll('.about__text').forEach(p => {
        // walk text nodes so inline <strong> emphasis survives the split
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);

        textNodes.forEach(node => {
            const frag = document.createDocumentFragment();
            node.textContent.split(/(\s+)/).forEach(part => {
                if (!part) return;
                if (/^\s+$/.test(part)) {
                    frag.appendChild(document.createTextNode(part));
                    return;
                }
                const wordEl = document.createElement('span');
                wordEl.className = 'scrub-word';
                wordEl.textContent = part;
                frag.appendChild(wordEl);
            });
            node.replaceWith(frag);
        });

        p.removeAttribute('data-reveal');
        scrubParagraphs.push(p);
    });
}

/* ---------- decode/scramble effect for section eyebrows ---------- */
function scrambleText(el) {
    const finalText = el.dataset.text ?? el.textContent;
    el.dataset.text = finalText;

    const glyphs = '!<>-_/[]{}=+*^?#01';
    const duration = 700;
    const start = performance.now();

    function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        const revealed = Math.floor(progress * finalText.length);
        let out = '';
        for (let i = 0; i < finalText.length; i++) {
            const ch = finalText[i];
            out += i < revealed || ch === ' ' ? ch : glyphs[Math.floor(Math.random() * glyphs.length)];
        }
        el.textContent = out;
        if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
}

/* ---------- cursor spotlight on cards ---------- */
if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.bento__card, .card, .testimonial').forEach(el => {
        el.classList.add('spotlight');
        el.addEventListener('pointermove', e => {
            const rect = el.getBoundingClientRect();
            el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            el.style.setProperty('--my', `${e.clientY - rect.top}px`);
        });
        el.addEventListener('pointerleave', () => {
            el.style.removeProperty('--mx');
            el.style.removeProperty('--my');
        });
    });
}

/* ---------- GSAP scroll reveals + nav highlighting ---------- */
if (window.gsap && window.ScrollTrigger) {

    gsap.registerPlugin(ScrollTrigger);

    if (!prefersReducedMotion) {

        splitTitles.forEach(title => {
            gsap.from(title.querySelectorAll('.word'), {
                yPercent: 110,
                duration: 0.8,
                ease: 'power4.out',
                stagger: 0.06,
                scrollTrigger: { trigger: title, start: 'top 85%' },
            });
        });

        document.querySelectorAll('.section__eyebrow').forEach(eyebrow => {
            eyebrow.setAttribute('aria-label', eyebrow.textContent.trim());
            ScrollTrigger.create({
                trigger: eyebrow,
                start: 'top 88%',
                once: true,
                onEnter: () => scrambleText(eyebrow),
            });
        });

        if (heroChars.length) {
            gsap.from(heroChars, {
                yPercent: 110,
                rotateX: -85,
                opacity: 0,
                duration: 0.9,
                ease: 'power4.out',
                stagger: 0.045,
                delay: 0.15,
            });
        }

        // light up About text word by word as it scrolls through the viewport.
        // Toggles a class (muted -> full ink) rather than fading from invisible,
        // so the resting state still meets text-contrast requirements.
        scrubParagraphs.forEach(p => {
            const words = p.querySelectorAll('.scrub-word');
            ScrollTrigger.create({
                trigger: p,
                start: 'top 80%',
                end: 'bottom 45%',
                onUpdate: self => {
                    const lit = Math.round(self.progress * words.length);
                    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
                },
            });
        });

        gsap.utils.toArray('[data-reveal]').forEach((el, i) => {
            gsap.to(el, {
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: 'power3.out',
                delay: el.closest('.hero') ? i * 0.08 + Math.random() * 0.06 : 0,
                scrollTrigger: {
                    trigger: el,
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                },
            });
        });

    } else {
        document.querySelectorAll('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    }

    ScrollTrigger.create({
        trigger: '#hero',
        start: 'top 60%',
        onEnter: animateCounters,
        onEnterBack: animateCounters,
        once: true,
    });

    ScrollTrigger.create({
        trigger: '#skills',
        start: 'top 70%',
        onEnter: animateSkillBars,
        onEnterBack: animateSkillBars,
        once: true,
    });

    // nav active-section highlight
    document.querySelectorAll('.section, #hero').forEach(section => {
        ScrollTrigger.create({
            trigger: section,
            start: 'top 55%',
            end: 'bottom 55%',
            onToggle: self => {
                if (!self.isActive) return;
                const id = section.id;
                document.querySelectorAll('[data-nav]').forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            },
        });
    });

    if (!prefersReducedMotion) {

        /* ----- Lenis smooth (inertia) scrolling, synced with ScrollTrigger ----- */
        if (window.Lenis) {
            lenis = new Lenis({ anchors: true, lerp: 0.1 });
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add(time => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);

            /* ----- marquee speeds up with scroll velocity and follows scroll direction ----- */
            const marqueeAnim = document.querySelector('.marquee__track')?.getAnimations?.()[0];
            if (marqueeAnim) {
                // start deep into the infinite loop so reversing never hits time 0,
                // where a backwards-playing animation would finish and stop
                marqueeAnim.currentTime = 38000 * 1000;

                let boost = 0;
                let direction = 1;
                lenis.on('scroll', e => {
                    boost = Math.min(Math.abs(e.velocity) * 0.15, 6);
                    if (e.direction) direction = e.direction;
                });
                gsap.ticker.add(() => {
                    marqueeAnim.playbackRate = direction * (1 + boost);
                    boost *= 0.92;
                });
            }
        }
    }

} else {
    // GSAP failed to load (offline, CDN blocked) — show content plainly, no animation.
    document.querySelectorAll('[data-reveal]').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    animateCounters();
    animateSkillBars();
}

/* ---------- project card 3D tilt ---------- */
if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {

    document.querySelectorAll('.card--tilt').forEach(card => {

        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `perspective(700px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-2px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(700px) rotateY(0deg) rotateX(0deg) translateY(0)';
        });
    });
}

/* ---------- magnetic buttons (subtle pull toward cursor + press feedback) ---------- */
if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {

    document.querySelectorAll('.btn, .nav__cta').forEach(btn => {

        let pressed = false;
        let lastX = 0;
        let lastY = 0;

        const apply = () => {
            const scale = pressed ? 0.96 : 1;
            btn.style.transform = `translate(${lastX}px, ${lastY}px) scale(${scale})`;
        };

        btn.addEventListener('mousemove', e => {
            const rect = btn.getBoundingClientRect();
            lastX = (e.clientX - rect.left - rect.width / 2) * 0.18;
            lastY = (e.clientY - rect.top - rect.height / 2) * 0.3;
            apply();
        });

        btn.addEventListener('mousedown', () => { pressed = true; apply(); });
        window.addEventListener('mouseup', () => { pressed = false; apply(); });

        btn.addEventListener('mouseleave', () => {
            pressed = false;
            btn.style.transform = '';
        });
    });
}

/* ---------- ambient hero parallax (eases toward the cursor, not instant) ---------- */
if (!prefersReducedMotion && window.matchMedia('(hover: hover)').matches) {

    const heroEl = document.getElementById('hero');
    const visual = document.querySelector('.hero__visual');
    const heroName = document.querySelector('.hero__name');

    if (heroEl && visual) {

        let targetX = 0, targetY = 0, curX = 0, curY = 0, started = false;

        function loop() {
            curX += (targetX - curX) * 0.06;
            curY += (targetY - curY) * 0.06;
            visual.style.transform = `translate3d(${curX * -16}px, ${curY * -10}px, 0)`;
            if (heroName) heroName.style.transform = `translate3d(${curX * 6}px, ${curY * 4}px, 0)`;
            requestAnimationFrame(loop);
        }

        // Lazily starts on the first real mousemove, not on page load — the hero's
        // scroll-reveal animation also sets transform on these elements, and starting
        // the parallax loop immediately would race it and cancel the slide-up reveal.
        heroEl.addEventListener('mousemove', e => {
            const rect = heroEl.getBoundingClientRect();
            targetX = (e.clientX - rect.left) / rect.width - 0.5;
            targetY = (e.clientY - rect.top) / rect.height - 0.5;
            if (!started) { started = true; loop(); }
        });

        heroEl.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });
    }
}

/* ---------- mobile nav toggle ---------- */
const navToggle = document.getElementById('navToggle');
const navLinksEl = document.querySelector('.nav__links');

navToggle?.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navLinksEl.style.display = expanded ? 'none' : 'flex';
    navLinksEl.style.position = 'fixed';
    navLinksEl.style.top = '64px';
    navLinksEl.style.left = '0';
    navLinksEl.style.right = '0';
    navLinksEl.style.flexDirection = 'column';
    navLinksEl.style.background = 'var(--nav-bg-solid)';
    navLinksEl.style.padding = '24px';
    navLinksEl.style.borderBottom = '1px solid var(--surface-border)';
});

document.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 680 && navLinksEl) {
            navLinksEl.style.display = 'none';
            navToggle.setAttribute('aria-expanded', 'false');
        }
    });
});

/* ---------- scroll progress bar + back-to-top button ---------- */
const scrollProgressBar = document.getElementById('scrollProgress');
const backToTopBtn = document.getElementById('backToTop');

const navEl = document.getElementById('nav');
let lastScrollTop = window.scrollY;

function onScrollUpdate() {

    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    if (scrollProgressBar) scrollProgressBar.style.width = `${pct}%`;
    if (backToTopBtn) backToTopBtn.classList.toggle('is-visible', scrollTop > window.innerHeight * 0.8);

    // hide the nav while scrolling down, bring it back on any scroll up;
    // never hide it near the top or while the mobile menu is open
    if (navEl) {
        const delta = scrollTop - lastScrollTop;
        const menuOpen = navToggle?.getAttribute('aria-expanded') === 'true';
        if (scrollTop < 120 || delta < -4 || menuOpen) {
            navEl.classList.remove('nav--hidden');
        } else if (delta > 4) {
            navEl.classList.add('nav--hidden');
        }
    }
    lastScrollTop = scrollTop;
}

window.addEventListener('scroll', onScrollUpdate, { passive: true });
onScrollUpdate();

backToTopBtn?.addEventListener('click', () => {
    if (lenis) {
        lenis.scrollTo(0);
    } else {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
});

/* ---------- staggered tag-chip pop-in ---------- */
document.querySelectorAll('.tags').forEach(tagGroup => {

    const chips = tagGroup.querySelectorAll('span');

    if (prefersReducedMotion || !(window.gsap && window.ScrollTrigger)) {
        return; // leave chips at their default visible styling
    }

    gsap.set(chips, { opacity: 0, scale: 0.7 });
    ScrollTrigger.create({
        trigger: tagGroup,
        start: 'top 88%',
        once: true,
        onEnter: () => gsap.to(chips, { opacity: 1, scale: 1, duration: 0.4, stagger: 0.045, ease: 'back.out(1.7)' }),
    });
});

/* ---------- copy-email button ---------- */
(function initCopyEmailButton() {

    const button = document.getElementById('copyEmailBtn');
    if (!button) return;

    const icon = button.querySelector('.icon-btn__icon');
    const originalIcon = icon.textContent;
    const originalLabel = button.getAttribute('aria-label');
    let resetTimer = null;

    // a visually-hidden live region so screen readers hear "copied", separate
    // from the icon swap, which assistive tech wouldn't otherwise announce
    const announcer = document.createElement('span');
    announcer.setAttribute('aria-live', 'polite');
    announcer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
    document.body.appendChild(announcer);

    button.addEventListener('click', async () => {

        const email = button.dataset.email;

        try {
            await navigator.clipboard.writeText(email);
        } catch {
            // Clipboard API unavailable (e.g. insecure context, older browser) —
            // fail silently; the adjacent mailto: link still works as the
            // primary way to reach out.
            return;
        }

        clearTimeout(resetTimer);
        icon.textContent = '✅';
        button.setAttribute('aria-label', 'Copied!');
        button.classList.add('icon-btn--confirmed');
        announcer.textContent = 'Email address copied to clipboard';

        resetTimer = setTimeout(() => {
            icon.textContent = originalIcon;
            button.setAttribute('aria-label', originalLabel);
            button.classList.remove('icon-btn--confirmed');
        }, 1500);
    });
})();
