// ---------- Utilidades ----------
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ---------- Pausa as animações caras quando o separador não está visível ----------
(function pauseWhenHidden() {
  const toggle = () => document.body.classList.toggle("tab-hidden", document.hidden);
  document.addEventListener("visibilitychange", toggle);
  toggle();
})();

// ---------- Glow que segue o cursor (rigorosamente, sem atraso) ----------
(function cursorGlow() {
  if (prefersReducedMotion) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const glow = $("#cursor-glow");

  window.addEventListener("pointermove", (e) => {
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });
})();

// ---------- Hover cinético no nome (mudança de cor única, contida) ----------
(function heroNameHover() {
  const heroName = $("#hero-name");
  if (!heroName) return;

  // Envolve cada letra num span (progressive enhancement: sem JS, o nome fica legível na mesma)
  const rows = $$(".hero-name-row", heroName);
  let letterIndex = 0;
  rows.forEach((row) => {
    const word = row.dataset.word || row.textContent.trim();
    row.setAttribute("aria-hidden", "true");
    row.textContent = "";
    [...word].forEach((ch) => {
      const span = document.createElement("span");
      span.className = "hg-letter";
      span.textContent = ch;
      span.style.setProperty("--i", letterIndex++);
      row.appendChild(span);
    });
  });

  const letters = $$(".hg-letter", heroName);

  // Entrada em clip-path, letra a letra (independente do hover, que usa --d)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      setTimeout(() => heroName.classList.add("is-in"), 150);
    });
  });

  // Touch/teclado: sweep estático one-shot, sempre disponível independentemente do reduced-motion
  heroName.addEventListener("pointerdown", () => {
    heroName.classList.add("is-active");
    clearTimeout(heroName._activeTimer);
    heroName._activeTimer = setTimeout(() => heroName.classList.remove("is-active"), 600);
  });

  if (prefersReducedMotion || !window.matchMedia("(pointer: fine)").matches) return;

  let rects = [];
  function cacheRects() {
    rects = letters.map((el) => el.getBoundingClientRect());
  }
  heroName.addEventListener("pointerenter", cacheRects);

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(cacheRects, 150);
  });

  let ticking = false;
  let lastX = 0;
  let lastY = 0;

  function applyDistances() {
    letters.forEach((el, i) => {
      const r = rects[i];
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(lastX - cx, lastY - cy);
      const norm = Math.min(1, dist / 200);
      el.style.setProperty("--d", norm.toFixed(3));
    });
    ticking = false;
  }

  heroName.addEventListener("pointermove", (e) => {
    lastX = e.clientX;
    lastY = e.clientY;
    if (!ticking) {
      requestAnimationFrame(applyDistances);
      ticking = true;
    }
  });

  heroName.addEventListener("pointerleave", () => {
    letters.forEach((el) => el.style.setProperty("--d", 1));
  });
})();

// ---------- Alinha a 2ª linha do título pela 2ª palavra da 1ª linha (P de "portefólio" sob o M de "meu") ----------
(function alignHeroSecondRow() {
  const heroName = $("#hero-name");
  if (!heroName) return;
  const rows = $$(".hero-name-row", heroName);
  if (rows.length < 2) return;
  const [row1, row2] = rows;

  function align() {
    // Em ecrãs pequenos o CSS colapsa as duas linhas encostadas à esquerda (leitura vertical) —
    // não sobrepor isso com o alinhamento pela 2ª palavra, que só faz sentido no layout largo.
    if (!window.matchMedia("(min-width: 641px)").matches) {
      row2.style.marginLeft = "";
      return;
    }
    const firstWord = (row1.dataset.word || "").split(" ")[0] || "";
    const letters1 = $$(".hg-letter", row1);
    const target = letters1[firstWord.length + 1]; // salta a 1ª palavra + o espaço
    if (!target) return;
    row2.style.marginLeft = "0px";
    const heroLeft = heroName.getBoundingClientRect().left;
    const targetLeft = target.getBoundingClientRect().left;
    row2.style.marginLeft = `${Math.max(0, targetLeft - heroLeft)}px`;
  }

  align();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(align); // a Bebas Neue carrega à parte; realinha quando estiver pronta
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(align, 150);
  });
})();

// ---------- Barra de progresso do scroll + respiração da grelha ----------
(function scrollProgress() {
  const fill = $("#scroll-progress-fill");
  const gridLines = $(".grid-lines");
  if (!fill && !gridLines) return;

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (fill) fill.style.transform = `scaleX(${progress})`;
  }
  updateProgress();

  let scrollingTimer;
  function onScroll() {
    updateProgress();
    if (gridLines && !prefersReducedMotion) {
      gridLines.classList.add("is-scrolling");
      clearTimeout(scrollingTimer);
      scrollingTimer = setTimeout(() => gridLines.classList.remove("is-scrolling"), 300);
    }
  }

  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
})();

// ---------- Traço superior das secções: desenha-se ao entrar no ecrã ----------
(function sectionEdges() {
  const sections = $$("main > section");
  if (!sections.length) return;
  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    sections.forEach((el) => el.classList.add("is-inview"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-inview", entry.isIntersecting);
      });
    },
    { threshold: 0.15 }
  );
  sections.forEach((el) => io.observe(el));
})();

// ---------- Navbar mais opaca/vidro ao fazer scroll ----------
(function navScrollState() {
  const nav = $(".nav");
  if (!nav) return;

  let ticking = false;
  function onScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
})();

// ---------- Botão flutuante: voltar ao topo ----------
(function backToTop() {
  const btn = $("#back-to-top");
  if (!btn) return;

  let ticking = false;
  function onScroll() {
    btn.classList.toggle("is-visible", window.scrollY > 480);
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
  onScroll();

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });
})();

// ---------- Destaca o link da nav consoante a secção em vista ----------
(function navActiveSection() {
  const links = $$(".nav-links a");
  const logo = $(".nav-logo");
  if (!links.length || !("IntersectionObserver" in window)) return;

  const all = logo ? [...links, logo] : links;
  const map = new Map(links.map((a) => [a.getAttribute("href")?.slice(1), a]));
  if (logo) map.set("home", logo);

  const sections = $$("main > section[id]");
  if (!sections.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = map.get(entry.target.id);
        if (!link) return;
        all.forEach((a) => a.classList.remove("is-active"));
        link.classList.add("is-active");
      });
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  sections.forEach((s) => io.observe(s));
})();

// ---------- Copiar email de contacto ----------
(function copyEmail() {
  const btn = $("#copy-email");
  if (!btn || !navigator.clipboard) return;

  const original = btn.textContent;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.email);
    } catch {
      return;
    }
    btn.textContent = "// copiado ✓";
    btn.classList.add("is-copied");
    clearTimeout(btn._resetTimer);
    btn._resetTimer = setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("is-copied");
    }, 1800);
  });
})();

// ---------- Formulário de contacto (Formspree, submissão via fetch) ----------
(function contactForm() {
  const form = $("#contact-form");
  const statusEl = $("#contact-form-status");
  const submitBtn = $("#contact-form-submit");
  if (!form || !statusEl || !submitBtn) return;

  const successMessage = "Enviado. Vou ler e avaliar o teu pedido e dentro de 24 horas dou-te uma resposta.";
  const errorMessage = "Não consegui enviar. Tenta outra vez ou escreve diretamente para work.hugotorres@gmail.com";
  const submitLabel = submitBtn.textContent;

  function showStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-success", !isError);
    statusEl.classList.toggle("is-error", isError);
    statusEl.hidden = false;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!form.reportValidity()) return;

    // Honeypot: se o campo escondido vier preenchido, é um bot — não envia.
    if (form.elements["_gotcha"] && form.elements["_gotcha"].value) return;

    statusEl.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "A enviar...";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });

      if (!response.ok) throw new Error("submit failed");

      showStatus(successMessage, false);
      form.reset();
    } catch {
      showStatus(errorMessage, true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
    }
  });
})();

// ---------- Blur dinâmico ao fazer scroll (desfoca a subir, foca a descer) ----------
(function scrollFocusBlur() {
  if (prefersReducedMotion) return;
  if (!window.matchMedia("(pointer: fine)").matches) return;
  const target = $("#page-content");
  if (!target) return;

  let lastY = window.scrollY;
  let ticking = false;
  let resetTimer;

  function onScroll() {
    const currentY = window.scrollY;
    const delta = currentY - lastY;
    lastY = currentY;

    if (delta < 0) {
      const amount = Math.min(5, Math.abs(delta) * 0.25);
      target.style.willChange = "filter";
      target.style.filter = `blur(${amount}px)`;
    } else if (delta > 0) {
      target.style.filter = "blur(0px)";
    }

    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      target.style.filter = "blur(0px)";
      target.style.willChange = "auto";
    }, 180);

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
})();

// ---------- Reveal ao fazer scroll ----------
(function revealOnScroll() {
  const items = $$(".reveal");
  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  // Sem unobserve: ao sair da vista (scroll para cima ou para baixo) o elemento
  // volta ao estado inicial, e reaparece ao voltar a entrar — reveal reversível.
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    { threshold: 0.15 }
  );
  items.forEach((el) => io.observe(el));
})();

// ---------- Cards de projeto (conteúdo já vem no HTML, isto só liga o spotlight) ----------
(function projectCardSpotlight() {
  const cards = $$(".project-card");
  if (!cards.length) return;

  // Spotlight que segue o rato (rect cacheado, escrita agrupada por rAF).
  // O levantamento do card é só CSS (:hover) — nada aqui mexe em transform,
  // por isso não há tilt 3D nem conflito com a transição.
  if (!prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
    cards.forEach((card) => {
      let rect = null;
      let ticking = false;
      let lastEvent = null;

      function apply() {
        const px = (lastEvent.clientX - rect.left) / rect.width;
        const py = (lastEvent.clientY - rect.top) / rect.height;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
        ticking = false;
      }

      card.addEventListener("pointerenter", () => {
        rect = card.getBoundingClientRect();
      });

      card.addEventListener("pointermove", (e) => {
        lastEvent = e;
        if (!ticking) {
          requestAnimationFrame(apply);
          ticking = true;
        }
      });
    });
  }
})();

// ---------- Etiqueta do plano no card de projeto: leva ao plano certo, sem abrir o projeto ----------
(function projectPlanLinks() {
  const tags = $$(".project-tags[data-plano]");
  if (!tags.length) return;

  tags.forEach((tag) => {
    tag.setAttribute("role", "button");
    tag.setAttribute("tabindex", "0");

    function trigger(e) {
      e.preventDefault();
      e.stopPropagation();
      const target = document.getElementById(`plano-${tag.dataset.plano}`);
      if (!target) return;

      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "center" });

      target.classList.remove("is-highlighted");
      void target.offsetWidth; // força reflow, para o pulso repetir mesmo que o plano já estivesse destacado
      target.classList.add("is-highlighted");
      clearTimeout(target._highlightTimer);
      target._highlightTimer = setTimeout(() => target.classList.remove("is-highlighted"), 1600);
    }

    tag.addEventListener("click", trigger);
    tag.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") trigger(e);
    });
  });
})();

// ---------- Ano no footer ----------
$("#year") && ($("#year").textContent = new Date().getFullYear());
