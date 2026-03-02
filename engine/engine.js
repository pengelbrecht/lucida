/* Slide deck engine — navigation + print scaling */

const slides = document.querySelectorAll('.slide');
const total = slides.length;
let current = 0;

function go(n) {
    if (total === 0 || n < 0 || n >= total) return;
    slides[current].classList.remove('active');
    current = n;
    slides[current].classList.add('active');
    document.getElementById('nav-counter').textContent = (current + 1) + ' / ' + total;
    document.getElementById('nav-fill').style.width = ((current + 1) / total * 100) + '%';
}

function next() { go(current + 1); }
function prev() { go(current - 1); }

document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    if (e.key === 'Home') { e.preventDefault(); go(0); }
    if (e.key === 'End') { e.preventDefault(); go(total - 1); }
});

go(0);

/* Print: scale each slide's content to fit 1280x720 */
window.addEventListener('beforeprint', () => {
    const W = 1280, H = 720;
    slides.forEach(s => {
        const inner = s.querySelector('.slide-inner');
        if (!inner) return;
        inner.style.transform = '';
        s.style.position = 'relative';
        s.style.opacity = '1';
        s.style.height = 'auto';
        s.style.overflow = 'visible';
        const pad = parseFloat(getComputedStyle(s).paddingTop) + parseFloat(getComputedStyle(s).paddingBottom);
        const availH = H - pad;
        const contentH = inner.scrollHeight;
        if (contentH > availH) {
            const scale = availH / contentH;
            inner.style.transform = `scale(${scale})`;
            inner.style.transformOrigin = 'top center';
        }
        s.style.position = '';
        s.style.opacity = '';
        s.style.height = '';
        s.style.overflow = '';
    });
});

window.addEventListener('afterprint', () => {
    slides.forEach(s => {
        const inner = s.querySelector('.slide-inner');
        if (inner) inner.style.transform = '';
    });
});
