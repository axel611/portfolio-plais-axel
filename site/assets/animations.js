// Animations et interactions du portfolio (24/11/2026). Tout reste lisible sans JS.
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const header = document.getElementById('site-header');
    const bar = document.getElementById('scroll-progress');
    const frise = document.querySelector('.frise');
    let fill = null;
    if (frise) { fill = document.createElement('span'); fill.className = 'frise-fill'; fill.setAttribute('aria-hidden', 'true'); frise.prepend(fill); }

    // Barre de lecture, en-tête et frise : une seule boucle par image
    let ticking = false;
    function update() {
        ticking = false;
        const y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
        if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
        if (header) header.classList.toggle('is-scrolled', y > 40);
        if (fill) {
            const r = frise.getBoundingClientRect();
            const p = Math.max(0, Math.min(1, (window.innerHeight * 0.6 - r.top) / r.height));
            fill.style.transform = 'scaleY(' + p + ')';
        }
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Apparitions au scroll
    const items = document.querySelectorAll('[data-reveal]');
    items.forEach(el => { if (el.dataset.delay) el.style.setProperty('--reveal-delay', el.dataset.delay + 'ms'); });
    if (reduce || !('IntersectionObserver' in window)) {
        items.forEach(el => el.classList.add('is-visible'));
    } else {
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        items.forEach(el => io.observe(el));
    }

    // Bouton « Copier » l'e-mail
    document.querySelectorAll('.copy-mail').forEach(btn => {
        btn.addEventListener('click', async () => {
            let ok = false;
            try { await navigator.clipboard.writeText(btn.dataset.copy); ok = true; }
            catch (e) {
                // Repli pour les navigateurs sans API presse-papiers (page non sécurisée)
                const t = document.createElement('textarea');
                t.value = btn.dataset.copy; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
                document.body.append(t); t.select();
                try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
                t.remove();
            }
            btn.textContent = ok ? 'Copié ✓' : 'Copie impossible';
            btn.classList.toggle('is-done', ok);
            setTimeout(() => { btn.textContent = 'Copier'; btn.classList.remove('is-done'); }, 2000);
        });
    });

    // Boîte de dialogue partagée (photos en grand, aperçu du CV)
    function openDialog(build, extraClass) {
        const d = document.createElement('dialog');
        d.className = 'lb-dialog' + (extraClass ? ' ' + extraClass : '');
        const close = document.createElement('button');
        close.type = 'button'; close.className = 'lb-close'; close.textContent = 'Fermer ✕';
        close.addEventListener('click', () => d.close());
        d.append(close, build());
        d.addEventListener('click', e => { if (e.target === d) d.close(); });
        d.addEventListener('close', () => d.remove());
        document.body.append(d);
        d.showModal();
        close.focus();
    }

    // Photos des pages projets : clic pour afficher en grand avec légende
    if (!frise) {
        document.querySelectorAll('main img').forEach(img => {
            if (img.closest('a') || img.naturalWidth && img.naturalWidth < 120) return;
            img.classList.add('lb-zoomable');
            img.tabIndex = 0;
            img.setAttribute('role', 'button');
            const fig = img.closest('figure');
            const cap = (fig && fig.querySelector('figcaption') ? [...fig.querySelector('figcaption').childNodes].map(n => n.textContent.trim()).filter(Boolean).join(' · ') : '') || img.alt;
            const show = () => openDialog(() => {
                const f = document.createElement('figure');
                const big = document.createElement('img');
                big.src = img.currentSrc || img.src; big.alt = img.alt;
                const c = document.createElement('figcaption'); c.textContent = cap;
                f.append(big, c); return f;
            });
            img.addEventListener('click', show);
            img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
        });
    }

    // Aperçu du CV sans quitter le site (ordinateur)
    document.querySelectorAll('.cv-preview').forEach(btn => {
        btn.addEventListener('click', () => openDialog(() => {
            const f = document.createElement('iframe');
            f.src = btn.dataset.pdf; f.title = 'Aperçu du CV d’Axel Plais';
            return f;
        }, 'cv-dialog'));
    });
})();

// ===== Aperçu 24/11 : menu pilule, titre, alternance =====
(function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Menu pilule : le vert reste sur la section active ; au survol, un contour
    // « présélectionne » le lien ; au clic, le vert glisse vers le lien choisi.
    const pill = document.querySelector('.nav-pill');
    if (pill) {
        const ind = pill.querySelector('.nav-indicator');
        const hov = document.createElement('span');
        hov.className = 'nav-hover'; hov.setAttribute('aria-hidden', 'true');
        ind.after(hov);
        const links = [...pill.querySelectorAll('.nav-link')];
        // active = section visible (ScrollSpy) ; lock = lien cliqué, prioritaire pendant le défilement
        let active = links.find(a => a.classList.contains('is-active')) || null;
        let lock = null, lockTimer = null;
        const place = (el, a) => { el.style.left = a.offsetLeft + 'px'; el.style.width = a.offsetWidth + 'px'; };
        const current = () => lock || active;
        // La pastille verte part du lien actuel, glisse vers le nouveau,
        // en gardant sa hauteur : animation lente et fluide (0,5 s).
        let pos = null, anim = null;
        const moveTo = a => {
            if (!a) { ind.style.opacity = '0'; return; }
            const to = { l: a.offsetLeft, w: a.offsetWidth };
            ind.style.opacity = '1';
            if (pos && pos.l === to.l && pos.w === to.w) return;
            let from = pos;
            if (anim) { const cs = getComputedStyle(ind); from = { l: parseFloat(cs.left), w: parseFloat(cs.width) }; anim.cancel(); anim = null; }
            ind.style.left = to.l + 'px'; ind.style.width = to.w + 'px';
            pos = to;
            if (!from || !ind.animate) return;
            // Glissement simple : la pastille garde sa hauteur, elle s'allonge juste un peu en route
            const extra = Math.min(28, Math.abs(to.l - from.l) * .12);
            const midW = (from.w + to.w) / 2 + extra, midL = (from.l + to.l) / 2 - extra / 2;
            anim = ind.animate([
                { left: from.l + 'px', width: from.w + 'px' },
                { left: midL + 'px', width: midW + 'px', offset: .5 },
                { left: to.l + 'px', width: to.w + 'px' }
            ], { duration: 500, easing: 'cubic-bezier(.65, 0, .35, 1)' });
            anim.onfinish = () => { anim = null; };
        };
        const sync = () => {
            const c = current();
            links.forEach(a => a.classList.toggle('is-active', a === c));
            moveTo(c);
        };
        links.forEach(a => {
            a.addEventListener('mouseenter', () => {
                links.forEach(l => l.classList.toggle('is-hot', l === a && l !== current()));
                if (a === current()) { hov.classList.remove('is-on'); return; }
                // Pas de glissement du contour : il apparaît directement autour du lien
                hov.style.transition = 'none'; place(hov, a); hov.offsetWidth; hov.style.transition = '';
                hov.classList.add('is-on');
            });
            a.addEventListener('click', () => {
                hov.classList.remove('is-on'); a.classList.remove('is-hot');
                if (!a.getAttribute('href').startsWith('#')) {
                    // Changement de page : la pastille repartira de ce lien sur la page suivante
                    const c = current();
                    try { if (c) sessionStorage.setItem('navFrom', c.textContent.trim()); } catch (e) {}
                    return;
                }
                // Pendant le défilement, on ignore les sections traversées
                lock = a; clearTimeout(lockTimer);
                const release = () => { if (lock) active = lock; lock = null; window.removeEventListener('scrollend', release); sync(); };
                window.addEventListener('scrollend', release);
                lockTimer = setTimeout(release, 1800);
                sync();
            });
        });
        // ScrollSpy : le lien de la section visible devient actif (liens internes uniquement)
        const atBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        const spied = links.filter(a => a.getAttribute('href').startsWith('#'));
        const targets = spied.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
        if ('IntersectionObserver' in window && targets.length) {
            const spy = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (!e.isIntersecting || atBottom()) return;
                    active = spied.find(a => a.getAttribute('href') === '#' + e.target.id) || null;
                    if (!lock) sync();
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            targets.forEach(t => spy.observe(t));
            // Bas de page : le pied (Contact) ne remonte jamais jusqu'au milieu de l'écran, on l'active à la main
            const last = spied[spied.length - 1];
            window.addEventListener('scroll', () => {
                if (!lock && active !== last && atBottom()) { active = last; sync(); }
            }, { passive: true });
        }
        pill.addEventListener('mouseleave', () => { links.forEach(l => l.classList.remove('is-hot')); hov.classList.remove('is-on'); });
        window.addEventListener('resize', () => moveTo(current()));
        // Arrivée depuis une autre page : on part du lien d'origine puis on glisse
        let fromName = null;
        try { fromName = sessionStorage.getItem('navFrom'); sessionStorage.removeItem('navFrom'); } catch (e) {}
        const fromLink = fromName && links.find(l => l.textContent.trim() === fromName);
        if (fromLink) { moveTo(fromLink); setTimeout(() => moveTo(current()), 350); }
        else moveTo(current());
    }

    // Phrase d'accroche découpée en mots (apparition en cascade)
    document.querySelectorAll('.blur-words').forEach(p => {
        if (reduce) return;
        let i = 0;
        const walk = node => [...node.childNodes].forEach(n => {
            if (n.nodeType === 3) {
                const frag = document.createDocumentFragment();
                n.textContent.split(/(\s+)/).forEach(w => {
                    if (!w) return;
                    if (/^\s+$/.test(w)) { frag.append(w); return; }
                    const s = document.createElement('span'); s.className = 'bw'; s.style.setProperty('--i', i++); s.textContent = w; frag.append(s);
                });
                n.replaceWith(frag);
            } else if (n.nodeType === 1 && n.tagName !== 'SUP') walk(n);
            else if (n.nodeType === 1) { n.classList.add('bw'); n.style.setProperty('--i', i - 1); }
        });
        walk(p);
    });

    // Ligne qui alterne : mobilité durable, motorisation, gestion de projet
    document.querySelectorAll('.rotator').forEach(r => {
        const items = [...r.children];
        if (reduce || items.length < 2) return;
        let k = 0;
        setInterval(() => {
            const cur = items[k]; k = (k + 1) % items.length; const next = items[k];
            cur.classList.add('is-out'); cur.classList.remove('is-on');
            next.classList.remove('is-out'); next.classList.add('is-on');
            setTimeout(() => cur.classList.remove('is-out'), 650);
        }, 2600);
    });

})();
