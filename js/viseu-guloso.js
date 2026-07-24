// ---------- Utilidades ----------
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ---------- Revelação por scroll (--reveal tipada; zero JS por frame, o browser interpola) ----------
(function reveal() {
  const targets = $$(".reveal-target");
  if (!targets.length) return;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.style.setProperty("--reveal", 1));
    return;
  }

  // threshold:0 de propósito — o clip-path do estado escondido zera a área de
  // interseção geométrica, por isso um threshold > 0 nunca seria atingido.
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

// ---------- Abrir o pacote de cromos ----------
(function packOpen() {
  const stage = $(".pack-stage");
  const btn = $("#pack-btn");
  if (!stage || !btn) return;

  btn.addEventListener("click", () => {
    stage.classList.add("is-open");
  });
})();
