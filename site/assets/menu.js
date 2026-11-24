// Menu mobile : fermé = inert (ni clic, ni clavier, ni lecteur d'écran), Échap pour fermer, focus rendu au bouton
(function () {
    const btn = document.getElementById('menu-btn');
    const menu = document.getElementById('mobile-menu');
    if (!btn || !menu) return;
    function toggle(open, returnFocus) {
        menu.classList.toggle('opacity-0', !open);
        menu.classList.toggle('pointer-events-none', !open);
        menu.inert = !open;
        document.body.classList.toggle('menu-open', open);
        btn.setAttribute('aria-expanded', open);
        btn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        if (open) menu.querySelector('a')?.focus();
        else if (returnFocus) btn.focus();
    }
    btn.addEventListener('click', () => toggle(btn.getAttribute('aria-expanded') !== 'true', true));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggle(false, false)));
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') toggle(false, true);
    });
})();
