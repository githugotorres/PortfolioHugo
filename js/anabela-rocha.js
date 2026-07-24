// ---------- Utilidades ----------
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ---------- Revelação por scroll (--reveal tipada, threshold:0 de propósito —
// o clip-path no estado escondido zera a razão de interseção geométrica) ----------
(function reveal() {
  const targets = $$(".reveal-target");
  if (!targets.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.style.setProperty("--reveal", 1));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.setProperty("--reveal", 1);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -10% 0px" }
  );
  targets.forEach((t) => io.observe(t));
})();

// ---------- Carrosséis estilo Instagram (scroll-snap nativo + setas) ----------
(function igCarousels() {
  $$(".ig-carousel").forEach((carousel) => {
    const track = $(".ig-track", carousel);
    const prevBtn = $(".ig-prev", carousel);
    const nextBtn = $(".ig-next", carousel);
    if (!track) return;

    const slides = $$(".ig-slide", track);
    if (!slides.length) return;

    function activeIndex() {
      return Math.round(track.scrollLeft / track.clientWidth);
    }

    function goTo(i) {
      const clamped = Math.max(0, Math.min(i, slides.length - 1));
      track.scrollTo({ left: clamped * track.clientWidth, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }

    prevBtn?.addEventListener("click", () => goTo(activeIndex() - 1));
    nextBtn?.addEventListener("click", () => goTo(activeIndex() + 1));
  });
})();
