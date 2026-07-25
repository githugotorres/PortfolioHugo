// ---------- Utilidades ----------
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ---------- Pausa as animações caras (blobs, glow) quando o separador não está visível ----------
(function pauseWhenHidden() {
  const toggle = () => document.body.classList.toggle("tab-hidden", document.hidden);
  document.addEventListener("visibilitychange", toggle);
  toggle();
})();

// ---------- Glow que segue o cursor (rigorosamente, sem atraso) ----------
(function cursorGlow() {
  if (prefersReducedMotion) return;
  const glow = $("#cursor-glow");

  window.addEventListener("pointermove", (e) => {
    glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });
})();

// ---------- Preencher o projeto a partir do id no URL ----------
(function renderProjectPage() {
  const id = Number(new URLSearchParams(location.search).get("id"));
  const project = typeof PROJECTS !== "undefined" && PROJECTS[id - 1];

  if (!project) {
    location.replace("projetos.html");
    return;
  }

  document.title = `${project.title} — Hugo Torres`;
  $("#project-page-kicker").textContent = `// Projeto ${String(id).padStart(2, "0")}`;
  $("#project-page-title").textContent = project.title;
  $("#project-page-desc").textContent = project.description;

  const tagsEl = $("#project-page-tags");
  if (tagsEl && project.tags) {
    tagsEl.innerHTML = project.tags.map((t) => `<span>${t}</span>`).join("");
  }

  if (project.media) {
    $("#project-page")?.classList.add("has-media");
    renderMediaHero(project.media);
    renderGallery(project.media.gallery || []);
  }
})();

// ---------- Marca + vídeo + paleta (só quando o projeto tem media) ----------
function renderMediaHero(media) {
  const el = $("#project-media-hero");
  if (!el) return;

  let html = "";
  if (media.mark) {
    html += `<div class="media-mark reveal"><img src="${media.mark}" alt="" loading="lazy"></div>`;
  }
  if (media.video) {
    html += `
      <div class="project-video glass reveal" style="transition-delay: 100ms;">
        <video id="project-video" muted loop playsinline preload="none" aria-label="Vídeo de apresentação da marca"></video>
        <button type="button" class="video-play-btn" id="video-play-btn" aria-label="Reproduzir vídeo">&#9658;</button>
      </div>
    `;
  }
  if (media.palette) {
    html += `<div class="palette-swatches reveal" style="transition-delay: 180ms;">${media.palette
      .map((c) => `<span class="palette-swatch" style="background:${c}"></span>`)
      .join("")}</div>`;
  }
  el.innerHTML = html;

  // Elementos já estão no ecrã ao carregar (sem scroll necessário) — dispara a entrada uma vez
  const revealNow = () => $$(".reveal", el).forEach((r) => r.classList.add("is-visible"));
  if (prefersReducedMotion) {
    revealNow();
  } else {
    requestAnimationFrame(() => requestAnimationFrame(revealNow));
  }

  const video = $("#project-video");
  const playBtn = $("#video-play-btn");
  if (video && media.video) {
    video.src = media.video;

    if (prefersReducedMotion) {
      playBtn.style.display = "flex";
      playBtn.addEventListener("click", () => {
        video.play();
        playBtn.style.display = "none";
      });
    } else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) video.play().catch(() => {});
            else video.pause();
          });
        },
        { threshold: 0.3 }
      );
      io.observe(video);
    } else {
      video.play().catch(() => {});
    }
  }
}

// ---------- Galeria de mockups + lightbox ----------
function renderGallery(items) {
  const el = $("#project-gallery");
  if (!el || !items.length) return;

  el.innerHTML = items
    .map(
      (item, i) => `
      <button type="button" class="gallery-item reveal" style="transition-delay: ${i * 60}ms;" data-index="${i}" aria-label="Ver ${item.alt || "imagem"} em destaque">
        <img src="${item.src}" alt="${item.alt || ""}" loading="lazy">
        <span class="gallery-item-spotlight" aria-hidden="true"></span>
      </button>
    `
    )
    .join("");

  const revealItems = $$(".reveal", el);
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((r) => r.classList.add("is-visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.15 }
    );
    revealItems.forEach((r) => io.observe(r));
  }

  // Spotlight que segue o cursor — mesmo padrão do .project-card no index (cache + rAF)
  if (!prefersReducedMotion && window.matchMedia("(pointer: fine)").matches) {
    $$(".gallery-item", el).forEach((card) => {
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

  setupLightbox(items);
}

function setupLightbox(items) {
  const lightbox = $("#lightbox");
  const imgEl = $("#lightbox-img");
  const closeBtn = $("#lightbox-close");
  const prevBtn = $("#lightbox-prev");
  const nextBtn = $("#lightbox-next");
  const gallery = $("#project-gallery");
  if (!lightbox || !imgEl || !gallery) return;

  const focusable = [closeBtn, prevBtn, nextBtn];
  let currentIndex = 0;
  let lastFocused = null;

  function show(index) {
    currentIndex = (index + items.length) % items.length;
    imgEl.src = items[currentIndex].src;
    imgEl.alt = items[currentIndex].alt || "";
  }

  function open(index) {
    show(index);
    lastFocused = document.activeElement;
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    closeBtn.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function close() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowLeft") {
      show(currentIndex - 1);
    } else if (e.key === "ArrowRight") {
      show(currentIndex + 1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const idx = focusable.indexOf(document.activeElement);
      const next = e.shiftKey
        ? focusable[(idx - 1 + focusable.length) % focusable.length]
        : focusable[(idx + 1) % focusable.length];
      next.focus();
    }
  }

  gallery.addEventListener("click", (e) => {
    const item = e.target.closest(".gallery-item");
    if (!item) return;
    open(Number(item.dataset.index));
  });

  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", () => show(currentIndex - 1));
  nextBtn.addEventListener("click", () => show(currentIndex + 1));
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
}

// ---------- Ano no footer ----------
$("#year") && ($("#year").textContent = new Date().getFullYear());
