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

  // threshold:0 de propósito — o próprio clip-path do estado escondido zera a área
  // de interseção geométrica, por isso um threshold > 0 nunca seria atingido
  // (fica sempre escondido porque nunca revela, nunca revela porque está escondido).
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

// ---------- Vídeo: só decodifica/reproduz quando visível ----------
(function video() {
  const v = $("#ctad-video");
  if (!v) return;
  v.src = "assets/projects/ctad/Transição3Vertentes.mp4";

  if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      });
    },
    { threshold: 0.3 }
  );
  io.observe(v);
})();

// ---------- Spotlight que segue o cursor livremente por toda a página (rAF, gated a rato fino) ----------
(function spotlight() {
  if (prefersReducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const glow = $(".ctad-glow");
  if (!glow) return;

  let ticking = false;
  let lastEvent = null;

  function apply() {
    glow.style.setProperty("--sx", `${lastEvent.clientX}px`);
    glow.style.setProperty("--sy", `${lastEvent.clientY}px`);
    glow.style.opacity = 1;
    ticking = false;
  }

  window.addEventListener("pointermove", (e) => {
    lastEvent = e;
    if (!ticking) {
      requestAnimationFrame(apply);
      ticking = true;
    }
  });
})();
