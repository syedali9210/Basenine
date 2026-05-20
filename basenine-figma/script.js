const BUTTON_DOT_PATTERNS = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1],
  [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
  [0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0],
  [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
  [0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0],
  [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
  [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const pixelMarks = document.querySelectorAll(".pixel-mark");

function applyDotPattern(pixels, pattern) {
  pixels.forEach((pixel, index) => {
    const isBright = pattern[index] === 1;
    pixel.classList.toggle("is-bright", isBright);
    pixel.classList.toggle("is-dim", !isBright);
  });
}

pixelMarks.forEach((mark) => {
  const pixels = [...mark.querySelectorAll("i")];
  let patternIndex = 0;

  applyDotPattern(pixels, BUTTON_DOT_PATTERNS[patternIndex]);

  if (reducedMotion.matches) return;

  window.setInterval(() => {
    patternIndex = (patternIndex + 1) % BUTTON_DOT_PATTERNS.length;
    applyDotPattern(pixels, BUTTON_DOT_PATTERNS[patternIndex]);
  }, 380);
});

function initLenisSmoothScroll() {
  if (!window.Lenis || !window.gsap || !window.ScrollTrigger || reducedMotion.matches) return;

  const lenis = new Lenis();
  window.lenis = lenis;

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function initStackingStickyCardsBounce() {
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const cardsSections = document.querySelectorAll("[data-stacking-cards-init]");
  const currentTier = getCurrentViewportTier();
  window.viewportTier = currentTier;

  ScrollTrigger.getAll().forEach((trigger) => {
    cardsSections.forEach((section) => {
      if (section.contains(trigger.trigger)) trigger.kill();
    });
  });

  cardsSections.forEach((section) => {
    section.querySelectorAll("[data-stacking-card-target]").forEach((el) => {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "all" });
    });
  });

  cardsSections.forEach((section) => {
    const tier = currentTier;
    const isEnabled =
      (tier === "desktop" && section.dataset.stackingCardsDesktop === "true") ||
      (tier === "tablet" && section.dataset.stackingCardsTablet === "true") ||
      ((tier === "mobile-portrait" || tier === "mobile-landscape") &&
        section.dataset.stackingCardsMobile === "true");

    if (!isEnabled) return;

    const cards = Array.from(section.querySelectorAll("[data-stacking-card]"));
    if (!cards.length) return;

    const stickyTop = parseFloat(getComputedStyle(cards[0]).top) || 0;

    const rotateValues = (() => {
      if (tier === "desktop") return parseRotateValues(section, "data-stacking-cards-desktop-rotate");
      if (tier === "tablet") return parseRotateValues(section, "data-stacking-cards-tablet-rotate");
      return parseRotateValues(section, "data-stacking-cards-mobile-rotate");
    })();

    const xValues = (() => {
      if (tier === "desktop") return parseAxisValues(section, "data-stacking-cards-desktop-x");
      if (tier === "tablet") return parseAxisValues(section, "data-stacking-cards-tablet-x");
      return parseAxisValues(section, "data-stacking-cards-mobile-x");
    })();

    const yValues = (() => {
      if (tier === "desktop") return parseAxisValues(section, "data-stacking-cards-desktop-y");
      if (tier === "tablet") return parseAxisValues(section, "data-stacking-cards-tablet-y");
      return parseAxisValues(section, "data-stacking-cards-mobile-y");
    })();

    cards.forEach((card, index) => {
      const targetEl = card.querySelector("[data-stacking-card-target]");
      if (!targetEl) return;

      const rotate = rotateValues[index % rotateValues.length];
      const x = xValues[index % xValues.length];
      const y = yValues[index % yValues.length];

      gsap.set(targetEl, {
        rotate: 0,
        x: 0,
        y: 0,
        scale: 1,
        zIndex: cards.length - index,
      });

      gsap.to(targetEl, {
        rotate,
        x,
        y,
        duration: 0.8,
        ease: "power2.out",
        overwrite: "auto",
        scrollTrigger: {
          id: `stacking-rotate-${index}`,
          trigger: card,
          start: "top 82%",
          once: true,
        },
      });

      ScrollTrigger.create({
        id: `stacking-bounce-${index}`,
        trigger: card,
        start: `top-=${stickyTop} top`,
        onEnter: () => pulseElement(targetEl),
      });
    });
  });

  ScrollTrigger.refresh();

  function parseRotateValues(section, attr) {
    const fallback = [0, 4, -4];
    const values = (section.getAttribute(attr) || "")
      .split(",")
      .map((val) => parseFloat(val.trim()));
    return values.length >= 1 && values.every((value) => !Number.isNaN(value)) ? values : fallback;
  }

  function parseAxisValues(section, attr) {
    const raw = section.getAttribute(attr);
    if (!raw) return ["0em", "0em", "0em"];
    const values = raw
      .split(",")
      .map((val) => val.trim())
      .filter((val) => val !== "");
    return values.length ? values : ["0em", "0em", "0em"];
  }

  if (!window._hasStackingResizeListener) {
    let last = getCurrentViewportTier();

    window.addEventListener(
      "resize",
      debounceOnWidthChange(() => {
        const next = getCurrentViewportTier();

        if (last !== next) {
          ScrollTrigger.getAll().forEach((trigger) => {
            if (trigger.vars?.id?.startsWith("stacking")) trigger.kill();
          });

          cardsSections.forEach((section) => {
            section.querySelectorAll("[data-stacking-card-target]").forEach((el) => {
              gsap.killTweensOf(el);
              gsap.set(el, { clearProps: "all" });
            });
          });

          initStackingStickyCardsBounce();
        }

        last = next;
        window.viewportTier = next;
      }, 250),
    );

    window._hasStackingResizeListener = true;
  }

  function getCurrentViewportTier() {
    const width = window.innerWidth;
    if (width <= 479) return "mobile-portrait";
    if (width <= 767) return "mobile-landscape";
    if (width <= 991) return "tablet";
    return "desktop";
  }

  function pulseElement(targetEl) {
    const width = targetEl.offsetWidth;
    const height = targetEl.offsetHeight;
    const fontSize = parseFloat(getComputedStyle(targetEl).fontSize);
    const stretchPx = 1.5 * fontSize;
    const targetScaleX = (width + stretchPx) / width;
    const targetScaleY = (height - stretchPx * 0.33) / height;

    const tl = gsap.timeline();
    tl.to(targetEl, {
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 0.1,
      ease: "power1.out",
    }).to(targetEl, {
      scaleX: 1,
      scaleY: 1,
      duration: 1,
      ease: "elastic.out(1, 0.3)",
    });
  }
}

function initClientWorkScrollCards() {
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const cards = document.querySelectorAll("[data-client-work-card]");
  if (!cards.length) return;

  if (reducedMotion.matches) {
    cards.forEach((card) => gsap.set(card, { clearProps: "all" }));
    return;
  }

  cards.forEach((card) => {
    const direction = card.dataset.clientWorkSide === "right" ? 1 : -1;

    gsap.set(card, {
      autoAlpha: 0.45,
      x: direction * 190,
      y: 92,
      rotate: direction * 7,
    });

    const entrance = gsap
      .timeline({ paused: true })
      .to(card, {
        autoAlpha: 0.8,
        x: direction * 64,
        y: -18,
        rotate: direction * 2.5,
        ease: "power1.out",
        duration: 0.38,
      })
      .to(card, {
        autoAlpha: 1,
        x: 0,
        y: 0,
        rotate: 0,
        ease: "back.out(1.15)",
        duration: 0.62,
      });

    ScrollTrigger.create({
      trigger: card,
      start: "top 90%",
      once: true,
      onEnter: () => entrance.play(),
    });
  });
}

function initCursorMarqueeEffect() {
  if (!window.gsap || reducedMotion.matches) return;

  const hoverOutDelay = 0.4;
  const followDuration = 0.4;
  const speedMultiplier = 5;

  const cursor = document.querySelector("[data-cursor-marquee-status]");
  if (!cursor) return;

  const targets = cursor.querySelectorAll("[data-cursor-marquee-text-target]");
  const xTo = gsap.quickTo(cursor, "x", { duration: followDuration, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: followDuration, ease: "power3" });

  let pauseTimeout = null;
  let activeEl = null;
  let lastX = 0;
  let lastY = 0;

  function playFor(el) {
    if (!el) return;
    if (pauseTimeout) clearTimeout(pauseTimeout);

    const text = el.getAttribute("data-cursor-marquee-text") || "";
    const seconds = (text.length || 1) / speedMultiplier;

    targets.forEach((target) => {
      target.textContent = text;
      target.style.animationPlayState = "running";
      target.style.animationDuration = `${seconds}s`;
    });

    cursor.setAttribute("data-cursor-marquee-status", "active");
    activeEl = el;
  }

  function pauseLater() {
    cursor.setAttribute("data-cursor-marquee-status", "not-active");
    if (pauseTimeout) clearTimeout(pauseTimeout);

    pauseTimeout = setTimeout(() => {
      targets.forEach((target) => {
        target.style.animationPlayState = "paused";
      });
    }, hoverOutDelay * 1000);

    activeEl = null;
  }

  function checkTarget() {
    const el = document.elementFromPoint(lastX, lastY);
    const hit = el && el.closest("[data-cursor-marquee-text]");

    if (hit !== activeEl) {
      if (activeEl) pauseLater();
      if (hit) playFor(hit);
    }
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      lastX = event.clientX;
      lastY = event.clientY;
      xTo(lastX);
      yTo(lastY);
      checkTarget();
    },
    { passive: true },
  );

  window.addEventListener(
    "scroll",
    () => {
      xTo(lastX);
      yTo(lastY);
      checkTarget();
    },
    { passive: true },
  );

  setTimeout(() => {
    cursor.setAttribute("data-cursor-marquee-status", "not-active");
  }, 500);
}

function initStackingCardsParallax() {
  if (!window.gsap || !window.ScrollTrigger || reducedMotion.matches) return;

  gsap.registerPlugin(ScrollTrigger);

  const cards = gsap.utils.toArray("[data-stacking-cards-item]");
  if (!cards.length) return;

  const visualStates = [
    {
      from: { x: "6em", y: "5em", rotation: 8 },
      to: { x: "-0.9em", y: "0em", rotation: 2.5 },
    },
    {
      from: { x: "-2.5em", y: "2em", rotation: -8 },
      to: { x: "0em", y: "0em", rotation: -2 },
    },
    {
      from: { x: "-5em", y: "3em", rotation: -10 },
      to: { x: "-0.7em", y: "1em", rotation: 1.8 },
    },
  ];

  cards.forEach((card, index) => {
    card.style.setProperty("--process-overlay-opacity", "0");
    gsap.set(card, { zIndex: index + 1 });

    if (index !== cards.length - 1) {
      ScrollTrigger.create({
        trigger: card,
        start: "top top",
        end: "bottom top",
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate(self) {
          card.style.setProperty("--process-overlay-opacity", self.progress);
        },
      });
    }

    const cardVisual = card.querySelector("[data-stacking-cards-img]");
    if (!cardVisual) return;

    const state = visualStates[index] || {
      from: { x: "0em", y: "0em", rotation: 0 },
      to: { x: "0em", y: "0em", rotation: 0 },
    };

    gsap.fromTo(cardVisual, state.from, {
      ...state.to,
      ease: "none",
      scrollTrigger: {
        trigger: card,
        start: "top bottom",
        end: "center center",
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });
  });
}

function initRotatingImageTrail() {
  const area = document.querySelector("[data-trail-area]");
  if (!area || reducedMotion.matches) return;

  const collection = area.querySelector("[data-trail-collection]");
  if (!collection) return;

  const items = collection.querySelectorAll("[data-trail-item]");
  if (!items.length) return;

  let index = 0;
  let lastCloneX = null;
  let lastCloneY = null;
  let cardWidth = items[0].getBoundingClientRect().width;
  let stepDistance = cardWidth * 0.5;

  function refreshDistance() {
    cardWidth = items[0].getBoundingClientRect().width;
    stepDistance = cardWidth * 0.5;
  }

  function spawnTrailItem(x, y) {
    const original = items[index];
    const clone = original.cloneNode(true);

    clone.style.left = `${x}px`;
    clone.style.top = `${y}px`;
    clone.setAttribute("data-trail-item", "hidden");
    area.appendChild(clone);

    void clone.getBoundingClientRect();
    clone.setAttribute("data-trail-item", "visible");

    setTimeout(() => {
      clone.setAttribute("data-trail-item", "transition-out");
    }, 400);

    setTimeout(() => {
      clone.remove();
    }, 1200);

    index = (index + 1) % items.length;
    lastCloneX = x;
    lastCloneY = y;
  }

  area.addEventListener("mousemove", (event) => {
    const rect = area.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      lastCloneX = null;
      lastCloneY = null;
      return;
    }

    if (lastCloneX === null || lastCloneY === null) {
      spawnTrailItem(x, y);
      return;
    }

    const dx = x - lastCloneX;
    const dy = y - lastCloneY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= stepDistance) {
      spawnTrailItem(x, y);
    }
  });

  window.addEventListener("resize", debounceOnWidthChange(refreshDistance, 250));
}

function initHighlightText() {
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const headings = document.querySelectorAll("[data-highlight-text]");
  headings.forEach((heading) => {
    const scrollStart = heading.getAttribute("data-highlight-scroll-start") || "top 90%";
    const scrollEnd = heading.getAttribute("data-highlight-scroll-end") || "center 40%";
    const fadedValue = parseFloat(heading.getAttribute("data-highlight-fade") || "0.2");
    const staggerValue = parseFloat(heading.getAttribute("data-highlight-stagger") || "0.1");

    if (!heading.dataset.highlightPrepared) {
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
      });
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach((node) => {
        const fragment = document.createDocumentFragment();
        Array.from(node.nodeValue).forEach((char) => {
          if (char === " ") {
            fragment.appendChild(document.createTextNode(" "));
            return;
          }
          const span = document.createElement("span");
          span.setAttribute("data-highlight-char", "");
          span.textContent = char;
          fragment.appendChild(span);
        });
        node.parentNode.replaceChild(fragment, node);
      });

      heading.dataset.highlightPrepared = "true";
    }

    const chars = heading.querySelectorAll("[data-highlight-char]");
    if (!chars.length) return;

    gsap.set(chars, { autoAlpha: fadedValue });

    gsap.fromTo(
      chars,
      { autoAlpha: fadedValue },
      {
        autoAlpha: 1,
        stagger: staggerValue,
        ease: "linear",
        immediateRender: false,
        scrollTrigger: {
          scrub: true,
          trigger: heading,
          start: scrollStart,
          end: scrollEnd,
        },
      },
    );
  });
}

function initTestimonialTabs() {
  function activateTab(component, tabName) {
    const links = component.querySelectorAll(".testimonial34_tab-link");
    const panes = component.querySelectorAll(".testimonial34_tab-pane");

    links.forEach((link) => {
      const isActive = link.getAttribute("data-w-tab") === tabName;
      link.classList.toggle("w--current", isActive);
      link.setAttribute("aria-selected", isActive ? "true" : "false");
      link.tabIndex = isActive ? 0 : -1;
    });

    panes.forEach((pane) => {
      const isActive = pane.getAttribute("data-w-tab") === tabName;
      pane.classList.toggle("w--tab-active", isActive);
      pane.hidden = !isActive;
    });
  }

  document.querySelectorAll("[data-testimonial-tabs]").forEach((component) => {
    const links = Array.from(component.querySelectorAll(".testimonial34_tab-link"));

    links.forEach((link, index) => {
      link.addEventListener("click", () => {
        activateTab(component, link.getAttribute("data-w-tab"));
      });

      link.addEventListener("keydown", (event) => {
        let direction = 0;

        if (event.key === "ArrowRight" || event.key === "ArrowDown") direction = 1;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") direction = -1;
        if (!direction) return;

        event.preventDefault();
        const nextIndex = (index + direction + links.length) % links.length;
        links[nextIndex].focus();
        activateTab(component, links[nextIndex].getAttribute("data-w-tab"));
      });
    });
  });
}

function initFaqAccordion() {
  document.querySelectorAll("[data-faq-list]").forEach((list) => {
    const items = Array.from(list.querySelectorAll(".faq-item"));

    items.forEach((item) => {
      const button = item.querySelector(".faq-question");
      const answer = item.querySelector(".faq-answer");

      if (!button || !answer) return;

      button.addEventListener("click", () => {
        const isOpen = button.getAttribute("aria-expanded") === "true";

        item.classList.toggle("is-open", !isOpen);
        button.setAttribute("aria-expanded", isOpen ? "false" : "true");
        answer.hidden = isOpen;
      });
    });
  });
}

function initFooterParallax() {
  if (!window.gsap || !window.ScrollTrigger || reducedMotion.matches) return;

  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll("[data-footer-parallax]").forEach((el) => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: "clamp(top bottom)",
        end: "clamp(top top)",
        scrub: true,
      },
    });

    const inner = el.querySelector("[data-footer-parallax-inner]");
    if (inner) {
      tl.from(inner, {
        yPercent: -25,
        ease: "linear",
      });
    }
  });
}

function initFooterWordmarkSlider() {
  const wordmark = document.querySelector("[data-footer-wordmark]");
  const slider = document.querySelector("[data-footer-font-slider]");

  if (!wordmark || !slider) return;

  const layers = Array.from(wordmark.querySelectorAll("[data-footer-wordmark-layer]"));
  const icons = Array.from(wordmark.querySelectorAll("[data-footer-font-icon]"));
  if (!layers.length) return;

  function fitWordmark() {
    const width = wordmark.clientWidth;

    layers.forEach((layer) => {
      layer.style.setProperty("--footer-brand-scale", "1");
      const rawWidth = layer.scrollWidth;
      const scale = rawWidth ? width / rawWidth : 1;
      layer.style.setProperty("--footer-brand-scale", scale.toString());
    });
  }

  function updateLayers() {
    const value = parseFloat(slider.value);
    const activeIndex = Math.round(value);
    const min = parseFloat(slider.min || "0");
    const max = parseFloat(slider.max || `${layers.length - 1}`);
    const progress = max === min ? 0 : (value - min) / (max - min);
    const markWidth = slider.parentElement?.clientWidth || 0;
    const thumbInset = window.innerWidth <= 760 ? 18 : 26;
    const x = thumbInset + progress * Math.max(0, markWidth - thumbInset * 2);

    slider.parentElement?.style.setProperty("--footer-slider-x", `${x}px`);

    layers.forEach((layer, index) => {
      const distance = Math.abs(value - index);
      const opacity = Math.max(0, 1 - distance);
      layer.style.opacity = opacity.toFixed(3);
    });

    icons.forEach((icon, index) => {
      icon.classList.toggle("is-active", index === activeIndex);
    });
  }

  function setSliderFromPointer(event) {
    const mark = slider.parentElement;
    if (!mark) return;

    const rect = mark.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const min = parseFloat(slider.min || "0");
    const max = parseFloat(slider.max || `${layers.length - 1}`);

    slider.value = (min + progress * (max - min)).toString();
    updateLayers();
  }

  slider.parentElement?.addEventListener("pointerdown", (event) => {
    slider.parentElement?.setPointerCapture(event.pointerId);
    setSliderFromPointer(event);
  });

  slider.parentElement?.addEventListener("pointermove", (event) => {
    if (!slider.parentElement?.hasPointerCapture(event.pointerId)) return;
    setSliderFromPointer(event);
  });

  slider.parentElement?.addEventListener("pointerup", (event) => {
    if (slider.parentElement?.hasPointerCapture(event.pointerId)) {
      slider.parentElement.releasePointerCapture(event.pointerId);
    }
  });

  slider.parentElement?.addEventListener("pointercancel", (event) => {
    if (slider.parentElement?.hasPointerCapture(event.pointerId)) {
      slider.parentElement.releasePointerCapture(event.pointerId);
    }
  });

  slider.addEventListener("input", updateLayers);
  fitWordmark();
  updateLayers();

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      fitWordmark();
      updateLayers();
    });
  }

  window.addEventListener(
    "resize",
    debounceOnWidthChange(() => {
      fitWordmark();
      updateLayers();
    }, 150),
  );
}

function debounceOnWidthChange(fn, ms) {
  let last = innerWidth;
  let timer;

  return function debouncedWidthChange(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

function initCaseStudyNavbar() {
  const toggle = document.querySelector("[data-case-study-nav-toggle]");
  const menu = document.querySelector("[data-case-study-nav-menu]");
  if (!toggle || !menu) return;

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    menu.classList.toggle("is-open", !isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 760) closeMenu();
    });
  });

  window.addEventListener(
    "resize",
    debounceOnWidthChange(() => {
      if (window.innerWidth > 760) closeMenu();
    }, 150),
  );
}

function initFooterScrollTopLink() {
  const link = document.querySelector("[data-footer-scroll-top]");
  if (!link) return;

  link.addEventListener("click", (event) => {
    event.preventDefault();

    if (window.lenis) {
      window.lenis.scrollTo(0);
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function initFooterServicesScrollLink() {
  const link = document.querySelector("[data-footer-scroll-services]");
  const target = document.querySelector("#services");
  if (!link || !target) return;

  link.addEventListener("click", (event) => {
    event.preventDefault();

    if (window.lenis) {
      window.lenis.scrollTo(target);
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initCaseStudyNavbar();
  initLenisSmoothScroll();
  initStackingStickyCardsBounce();
  initClientWorkScrollCards();
  initCursorMarqueeEffect();
  initStackingCardsParallax();
  initRotatingImageTrail();
  initHighlightText();
  initTestimonialTabs();
  initFaqAccordion();
  initFooterParallax();
  initFooterWordmarkSlider();
  initFooterScrollTopLink();
  initFooterServicesScrollLink();
  initCubeCardAnimation();
  initGlobeAnimation();
  initDesignCardAnimation();
});

function initCubeCardAnimation() {
  const container = document.getElementById('cube-container');
  if (!container) return;
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Configuration
  const CX = 203;
  const CY = 238.5;
  const SQRT3_2 = Math.sqrt(3) / 2;
  const SCALE = 80; // Reduced from 100 to prevent overflow
  let currentScale = SCALE;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 406 477");
  svg.style.overflow = "visible";

  const defs = document.createElementNS(SVG_NS, "defs");

  // Soft glow filter
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", "glow");
  filter.setAttribute("x", "-50%");
  filter.setAttribute("y", "-50%");
  filter.setAttribute("width", "200%");
  filter.setAttribute("height", "200%");

  const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
  blur.setAttribute("stdDeviation", "3.275");
  blur.setAttribute("result", "coloredBlur");

  const merge = document.createElementNS(SVG_NS, "feMerge");
  const mergeNode1 = document.createElementNS(SVG_NS, "feMergeNode");
  mergeNode1.setAttribute("in", "coloredBlur");
  const mergeNode2 = document.createElementNS(SVG_NS, "feMergeNode");
  mergeNode2.setAttribute("in", "SourceGraphic");

  merge.appendChild(mergeNode1);
  merge.appendChild(mergeNode2);
  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);

  const innerGradient = document.createElementNS(SVG_NS, "linearGradient");
  innerGradient.setAttribute("id", "innerGradient");
  innerGradient.setAttribute("x1", "0");
  innerGradient.setAttribute("y1", "0");
  innerGradient.setAttribute("x2", "0");
  innerGradient.setAttribute("y2", "1");
  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "75.83%");
  stop1.setAttribute("stop-color", "rgba(0, 99, 22, 0.01)");
  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "113.11%");
  stop2.setAttribute("stop-color", "rgba(255, 255, 255, 0.01)");
  innerGradient.appendChild(stop1);
  innerGradient.appendChild(stop2);
  defs.appendChild(innerGradient);

  // Inset shadow filter
  const innerShadow = document.createElementNS(SVG_NS, "filter");
  innerShadow.setAttribute("id", "innerShadow");
  innerShadow.setAttribute("x", "-20%");
  innerShadow.setAttribute("y", "-20%");
  innerShadow.setAttribute("width", "140%");
  innerShadow.setAttribute("height", "140%");

  const offset = document.createElementNS(SVG_NS, "feOffset");
  offset.setAttribute("dx", "-1");
  offset.setAttribute("dy", "5");
  offset.setAttribute("in", "SourceAlpha");

  const shadowBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
  shadowBlur.setAttribute("stdDeviation", "34.4"); // Matches CSS blur of 68.8 (stdDeviation ≈ blur / 2)
  shadowBlur.setAttribute("result", "offset-blur");

  const compositeOut = document.createElementNS(SVG_NS, "feComposite");
  compositeOut.setAttribute("operator", "out");
  compositeOut.setAttribute("in", "SourceAlpha");
  compositeOut.setAttribute("in2", "offset-blur");
  compositeOut.setAttribute("result", "inverse");

  const flood = document.createElementNS(SVG_NS, "feFlood");
  flood.setAttribute("flood-color", "#006316");
  flood.setAttribute("flood-opacity", "0.56");
  flood.setAttribute("result", "color");

  const compositeIn = document.createElementNS(SVG_NS, "feComposite");
  compositeIn.setAttribute("operator", "in");
  compositeIn.setAttribute("in", "color");
  compositeIn.setAttribute("in2", "inverse");
  compositeIn.setAttribute("result", "shadow");

  const compositeOver = document.createElementNS(SVG_NS, "feComposite");
  compositeOver.setAttribute("operator", "over");
  compositeOver.setAttribute("in", "shadow");
  compositeOver.setAttribute("in2", "SourceGraphic");

  innerShadow.appendChild(offset);
  innerShadow.appendChild(shadowBlur);
  innerShadow.appendChild(compositeOut);
  innerShadow.appendChild(flood);
  innerShadow.appendChild(compositeIn);
  innerShadow.appendChild(compositeOver);
  defs.appendChild(innerShadow);

  svg.appendChild(defs);

  // Core Layers
  const sortedLayer = document.createElementNS(SVG_NS, "g");
  const topLayer = document.createElementNS(SVG_NS, "g");
  svg.appendChild(sortedLayer);
  svg.appendChild(topLayer);

  // Math Helpers
  let globalRotX = 0;
  let globalRotY = 0;

  function rotate3D(p, rx, ry) {
    let sX = Math.sin(rx), cX = Math.cos(rx);
    let y1 = p.y * cX - p.z * sX;
    let z1 = p.y * sX + p.z * cX;

    let sY = Math.sin(ry), cY = Math.cos(ry);
    let x2 = p.x * cY + z1 * sY;
    let z2 = -p.x * sY + z1 * cY;

    return { x: x2, y: y1, z: z2 };
  }

  function rotatePt(p, pivot, axis, angle) {
    let dx = p.x - pivot[0];
    let dy = p.y - pivot[1];
    let dz = p.z - pivot[2];
    let s = Math.sin(angle), c = Math.cos(angle);
    if (axis === 'x') {
      return { x: p.x, y: pivot[1] + dy * c - dz * s, z: pivot[2] + dy * s + dz * c };
    } else if (axis === 'y') {
      return { x: pivot[0] + dx * c + dz * s, y: p.y, z: pivot[2] - dx * s + dz * c };
    } else if (axis === 'z') {
      return { x: pivot[0] + dx * c - dy * s, y: pivot[1] + dx * s + dy * c, z: p.z };
    }
    return p;
  }

  function project(p) {
    const x = CX + (p.x - p.z) * SQRT3_2 * currentScale;
    const y = CY + (p.x + p.z) * 0.5 * currentScale - p.y * currentScale;
    return { x, y };
  }

  function getNormal(p0, p1, p2) {
    let e1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
    let e2 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    let nx = e1.y * e2.z - e1.z * e2.y;
    let ny = e1.z * e2.x - e1.x * e2.z;
    let nz = e1.x * e2.y - e1.y * e2.x;
    let len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: nx / len, y: ny / len, z: nz / len };
  }

  // 1. Unfolding Cube Class
  class UnfoldingCube {
    constructor(scale, strokeColor, strokeWidth, dashArray, nodeOpacity, fill, filterId, groupOpacity, showMedians = false) {
      this.scale = scale;
      this.showMedians = showMedians;
      this.facesDef = [
        { id: 'bottom', pivot: [0, -1, 0], axis: 'x', mult: 0, p: null, coords: (u, v) => [u, -1, v] },
        { id: 'front', pivot: [0, -1, 1], axis: 'x', mult: 1, p: null, coords: (u, v) => [u, v, 1] },
        { id: 'back', pivot: [0, -1, -1], axis: 'x', mult: -1, p: null, coords: (u, v) => [u, v, -1] },
        { id: 'left', pivot: [-1, -1, 0], axis: 'z', mult: 1, p: null, coords: (u, v) => [-1, u, v] },
        { id: 'right', pivot: [1, -1, 0], axis: 'z', mult: -1, p: null, coords: (u, v) => [1, u, v] },
        { id: 'top', pivot: [0, 1, -1], axis: 'x', mult: -1, p: 'back', coords: (u, v) => [u, 1, v] }
      ];

      this.wireframeFaces = {};
      this.allVertices = [];
      this.facesDef.forEach(fd => {
        const f = { ...fd, vertices: [] };

        const wireGroup = document.createElementNS(SVG_NS, "g");
        if (groupOpacity) wireGroup.setAttribute("opacity", groupOpacity);

        const wirePath = document.createElementNS(SVG_NS, "path");
        if (dashArray) {
          wirePath.setAttribute("class", "dashed-line");
        }

        wirePath.setAttribute("fill", fill || "rgba(21, 15, 20, 0.4)");
        if (strokeColor) wirePath.setAttribute("stroke", strokeColor);
        if (strokeWidth) wirePath.setAttribute("stroke-width", strokeWidth);
        if (dashArray) wirePath.setAttribute("stroke-dasharray", dashArray);
        if (filterId) wirePath.setAttribute("filter", filterId);

        wireGroup.appendChild(wirePath);
        f.wireGroup = wireGroup;
        f.wirePath = wirePath;

        for (let v = -1; v <= 1; v++) {
          for (let u = -1; u <= 1; u++) {
            const pt = fd.coords(u, v);
            const vert = {
              id: `${fd.id}_${u}_${v}`,
              u, v,
              localPt: { x: pt[0] * scale, y: pt[1] * scale, z: pt[2] * scale },
              worldPt: { x: pt[0] * scale, y: pt[1] * scale, z: pt[2] * scale },
              projectedPt: { x: 0, y: 0 }
            };

            this.allVertices.push(vert);
            f.vertices.push(vert);
          }
        }
        this.wireframeFaces[fd.id] = f;
      });
    }

    getTransform(faceId, t) {
      let f = this.wireframeFaces[faceId];
      let transforms = [];
      let curr = f;
      const maxAngle = Math.PI / 2;
      while (curr) {
        if (curr.mult !== 0) {
          transforms.push({ pivot: [curr.pivot[0] * this.scale, curr.pivot[1] * this.scale, curr.pivot[2] * this.scale], axis: curr.axis, angle: curr.mult * maxAngle * t });
        }
        curr = curr.p ? this.wireframeFaces[curr.p] : null;
      }
      return transforms;
    }

    update(t, renderables) {
      for (let fId in this.wireframeFaces) {
        let trs = this.getTransform(fId, t);
        let f = this.wireframeFaces[fId];

        let center = { x: 0, y: 0, z: 0 };

        for (let v of f.vertices) {
          let p = { ...v.localPt };
          for (let tr of trs) {
            p = rotatePt(p, tr.pivot, tr.axis, tr.angle);
          }
          p = rotate3D(p, globalRotX, globalRotY);
          v.worldPt = p;
          v.projectedPt = project(p);
          center.x += p.x; center.y += p.y; center.z += p.z;
        }

        center.x /= 9; center.y /= 9; center.z /= 9;
        let depth = center.x + center.y + center.z;

        let d = "";
        let corners = [0, 2, 8, 6];
        for (let i = 0; i < 4; i++) {
          let pt = f.vertices[corners[i]].projectedPt;
          d += (i === 0 ? `M${pt.x},${pt.y} ` : `L${pt.x},${pt.y} `);
        }
        d += "Z ";
        let medianD = "";
        if (this.showMedians) {
          for (let u = -1; u <= 1; u++) {
            let v0 = f.vertices[(0) * 3 + (u + 1)].projectedPt;
            let v1 = f.vertices[(2) * 3 + (u + 1)].projectedPt;
            medianD += `M${v0.x},${v0.y} L${v1.x},${v1.y} `;
          }
          for (let v = -1; v <= 1; v++) {
            let v0 = f.vertices[(v + 1) * 3 + 0].projectedPt;
            let v1 = f.vertices[(v + 1) * 3 + 2].projectedPt;
            medianD += `M${v0.x},${v0.y} L${v1.x},${v1.y} `;
          }
        }
        f.wirePath.setAttribute("d", d + medianD);

        renderables.push({ el: f.wireGroup, depth: depth });
      }
    }
  }

  const outerCube = new UnfoldingCube(1.0, "#777777", "0.75", "4 4", 0.4, "transparent", null, 0.8, true);
  const midCube = new UnfoldingCube(0.8, "rgba(0, 99, 22, 1.0)", "1.0", "", 0.3, "url(#innerGradient)", "url(#innerShadow)", 0.5, true);
  const innerCube = new UnfoldingCube(0.49, "rgba(0, 99, 22, 1.0)", "1.0", "", 0.2, "url(#innerGradient)", "url(#innerShadow)", 0.3, false);
  const coreCube = new UnfoldingCube(0.28, "rgba(0, 99, 22, 1.0)", "1.0", "", 0.1, "url(#innerGradient)", "url(#innerShadow)", 0.1, false);


  // 3. Data Packets
  function distance3D(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);
  }

  function getNextVertex(v, prev) {
    let neighbors = outerCube.allVertices.filter(u => {
      let d = distance3D(v.worldPt, u.worldPt);
      return d > 0.95 && d < 1.05;
    });
    if (neighbors.length === 0) return v;
    let forward = neighbors.filter(u => u !== prev);
    if (forward.length > 0) {
      return forward[Math.floor(Math.random() * forward.length)];
    }
    return neighbors[Math.floor(Math.random() * neighbors.length)];
  }

  const movingDots = [];
  const NUM_DOTS = 10;

  for (let i = 0; i < NUM_DOTS; i++) {
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("r", "1.5");
    dot.setAttribute("fill", "rgba(20, 35, 20, 0.8)");
    dot.setAttribute("filter", "url(#glow)");
    topLayer.appendChild(dot);

    const trail = document.createElementNS(SVG_NS, "circle");
    trail.setAttribute("r", "1");
    trail.setAttribute("fill", "#1a231a");
    trail.style.opacity = "0.7";
    topLayer.appendChild(trail);

    const p = {
      el: dot,
      trail: trail,
      progress: Math.random(),
      speed: 0.0015 + Math.random() * 0.0015,
      currentVertex: outerCube.allVertices[Math.floor(Math.random() * outerCube.allVertices.length)]
    };
    p.targetVertex = getNextVertex(p.currentVertex, null);
    movingDots.push(p);
  }

  function easeInOutSine(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
  }

  function easeInOutQuart(x) {
    return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
  }

  function getCubeT(phase, start, end, reverseStart, reverseEnd) {
    if (phase >= start && phase <= end) {
      return easeInOutQuart((phase - start) / (end - start));
    } else if (phase > end && phase < reverseStart) {
      return 1;
    } else if (phase >= reverseStart && phase <= reverseEnd) {
      return 1 - easeInOutQuart((phase - reverseStart) / (reverseEnd - reverseStart));
    } else if (phase > reverseEnd || phase < start) {
      return 0;
    }
    return 0;
  }

  // 4. Center Glowing Orb
  const centerGlow = document.createElementNS(SVG_NS, "circle");
  centerGlow.setAttribute("cx", CX);
  centerGlow.setAttribute("cy", CY);
  centerGlow.setAttribute("fill", "#006316");
  centerGlow.setAttribute("filter", "url(#glow)");

  container.appendChild(svg);

  // Drag to rotate
  let tX = 0, tY = 0, cPX = 0, cPY = 0;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let vX = 0, vY = 0;

  // We scope interaction to the card container
  const card = document.querySelector('.cube-card');
  if (card) {
    card.style.cursor = 'grab';

    card.addEventListener('mousedown', e => {
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      vX = 0;
      vY = 0;
      card.style.cursor = 'grabbing';
    });

    card.addEventListener('mouseup', () => {
      isDragging = false;
      card.style.cursor = 'grab';
    });

    card.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const deltaX = e.clientX - lastMouseX;
      const deltaY = e.clientY - lastMouseY;

      vY = deltaX * 0.4;
      vX = -deltaY * 0.4;

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });

    card.addEventListener('mouseleave', () => {
      isDragging = false;
      card.style.cursor = 'grab';
    });
  }

  function renderLoop(time) {
    time *= 0.001;

    if (!isDragging) {
      vX *= 0.94; // Friction deceleration
      vY *= 0.94;
    }
    tX += vX;
    tY += vY;

    // Cinematic Starting Animation
    let entryProgress = Math.min(1, time / 4.0);
    let entryEase = easeInOutQuart(entryProgress);
    currentScale = SCALE * (0.01 + 0.99 * entryEase);

    // Spin during entrance
    let extraSpin = (1 - entryEase) * 180;

    // Parallax
    let autoTiltX = Math.sin(time * 0.5) * 4;
    let autoTiltY = Math.cos(time * 0.3) * 4;
    cPX += (tX + autoTiltX - cPX) * 0.08;
    cPY += (tY + autoTiltY - cPY) * 0.08;

    globalRotX = cPX * (Math.PI / 180);
    globalRotY = (cPY + extraSpin) * (Math.PI / 180);

    // Center Orb
    let pulse = 11 + Math.sin(time * 2) * 2;
    centerGlow.setAttribute("r", pulse);

    let renderables = [];
    renderables.push({ el: centerGlow, depth: 0 });

    // Unfold Timing Sequence
    let cycle = 24;
    let phase = (time % cycle) / cycle;

    let tOuter = 0;
    let tMid = 0;
    let tInner = 0;
    let tCore = 0;

    outerCube.update(tOuter, renderables);
    midCube.update(tMid, renderables);
    innerCube.update(tInner, renderables);
    coreCube.update(tCore, renderables);

    // Depth Sort & Append
    renderables.sort((a, b) => a.depth - b.depth);
    for (let r of renderables) {
      sortedLayer.appendChild(r.el);
    }

    // Packets
    for (let p of movingDots) {
      p.progress += p.speed;

      let dist = distance3D(p.currentVertex.worldPt, p.targetVertex.worldPt);
      if (dist > 1.5) {
        p.targetVertex = getNextVertex(p.currentVertex, null);
        p.progress = 0;
      }

      if (p.progress >= 1) {
        p.progress = 0;
        let prev = p.currentVertex;
        p.currentVertex = p.targetVertex;
        p.targetVertex = getNextVertex(p.currentVertex, prev);
      }

      if (p.currentVertex && p.targetVertex) {
        const ease = easeInOutSine(p.progress);
        const cw = p.currentVertex.worldPt;
        const tw = p.targetVertex.worldPt;

        const prevCx = p.el.getAttribute("cx");
        const prevCy = p.el.getAttribute("cy");

        const x3d = cw.x + (tw.x - cw.x) * ease;
        const y3d = cw.y + (tw.y - cw.y) * ease;
        const z3d = cw.z + (tw.z - cw.z) * ease;
        const proj = project({ x: x3d, y: y3d, z: z3d });

        p.el.setAttribute("cx", proj.x);
        p.el.setAttribute("cy", proj.y);

        if (prevCx !== null) {
          p.trail.setAttribute("cx", prevCx);
          p.trail.setAttribute("cy", prevCy);
        }
      }
    }

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);

  /* ── Build Text Scramble Animation ─────────────────────────── */
  const buildText = document.getElementById('build-text');
  if (buildText) {
    const originalText = "BUILD";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    let iteration = 0;
    let interval = null;

    function scramble() {
      interval = setInterval(() => {
        buildText.innerText = originalText.split("")
          .map((char, index) => {
            if (index < iteration) return originalText[index];
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join("");

        if (iteration >= originalText.length) {
          clearInterval(interval);
          setTimeout(() => { iteration = 0; scramble(); }, 8000);
        }
        iteration += 1 / 10;
      }, 60);
    }

    scramble();
  }

  /* ── Card Tilt Parallax Effect ────────────────────────────── */
  if (card) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const maxRotX = 8;
      const maxRotY = 8;

      const rotX = ((y - centerY) / centerY) * -maxRotX;
      const rotY = ((x - centerX) / centerX) * maxRotY;

      card.style.transform = `scale(0.9) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      card.style.boxShadow = `${-rotY * 1.5}px ${rotX * 1.5}px 40px rgba(0,0,0,0.1)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `scale(0.9) rotateX(0deg) rotateY(0deg)`;
      card.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.05)`;
    });
  }
}

function initGlobeAnimation() {
  /* ── Constants ─────────────────────────────────────────────── */
  const CX = 215.62, CY = 337.09, R = 215.62;
  const SPIN = 0.003;   // radians / frame
  const TSPD = 0.30;    // tilt oscillation speed multiplier

  /*
   * RINGS: three meridian rings.
   *  phase   — initial rotation offset so they start at the design's rx values
   *  tilt    — base diagonal tilt in degrees (makes them non-vertical = dynamic)
   *  tiltAmp — how much the tilt oscillates (gives the "alive" feel)
   *  tiltOff — phase offset for the tilt oscillation
   *  MIN_OP  — never go below this opacity (always visible)
   *  dots    — dot IDs that ride this rim, and their parametric angle α on the ellipse
   */
  const RINGS = [
    {
      id: 'meridian-wide',
      phase: Math.acos(174.62 / R),
      tilt: 15, tiltAmp: 7, tiltOff: 0.0,
      fColor: '#7a72b0', bColor: '#7a72b0', fOp: 1.0, bOp: 0.60,
      dots: [
        { id: 'dot-tr', alpha: -0.25 },
        { id: 'dot-lm', alpha: 3.40 }
      ]
    },
    {
      id: 'meridian-narrow',
      phase: Math.acos(128.62 / R),
      tilt: -22, tiltAmp: 9, tiltOff: 1.1,
      fColor: '#7a72b0', bColor: '#7a72b0', fOp: 0.95, bOp: 0.55,
      dots: [
        { id: 'dot-bc', alpha: 1.80 }
      ]
    },
    {
      id: 'meridian-slice',
      phase: Math.acos(29.63 / R),
      tilt: 40, tiltAmp: 6, tiltOff: 2.1,
      fColor: '#7a72b0', bColor: '#7a72b0', fOp: 0.95, bOp: 0.50,
      dots: [
        { id: 'dot-ur', alpha: 0.90 }
      ]
    }
  ];

  const TRI_ALPHA = Math.PI + 0.28;
  const TRI_S = 13;
  const BOX_OX = 60;
  const BOX_OY = -42;
  const FO_H = 28;

  const globeEl = document.getElementById('globe');
  if (!globeEl) return;
  const outerCircleEl = document.getElementById('outer-circle');
  const calloutGroup = document.getElementById('callout-group');
  const triEl = document.getElementById('triangle-marker');
  const lineEl = document.getElementById('callout-line');
  const foEl = document.getElementById('callout-fo');

  if (outerCircleEl) {
    let ocPath = `M ${CX + R},${CY} `;
    let ocSegments = 120;
    for (let i = 1; i <= ocSegments; i++) {
      let a = (i / ocSegments) * Math.PI * 2;
      let px = CX + R * Math.cos(a);
      let py = CY + R * Math.sin(a);
      ocPath += `L ${px.toFixed(2)},${py.toFixed(2)} `;
    }
    ocPath += "Z";
    outerCircleEl.setAttribute('d', ocPath);
  }

  let tX = 0, tY = 0, cPX = 0, cPY = 0;
  let vX = 0, vY = 0;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  globeEl.style.cursor = 'grab';

  globeEl.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    vX = 0;
    vY = 0;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    vX = deltaX * 0.15;
    vY = deltaY * 0.15;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  function rotate3D(p, rx, ry) {
    let sX = Math.sin(rx), cX = Math.cos(rx);
    let y1 = p.y * cX - p.z * sX;
    let z1 = p.y * sX + p.z * cX;

    let sY = Math.sin(ry), cY = Math.cos(ry);
    let x2 = p.x * cY + z1 * sY;
    let z2 = -p.x * sY + z1 * cY;

    return { x: x2, y: y1, z: z2 };
  }

  let t = 0;

  function tick() {
    t += SPIN;

    if (!isDragging) {
      vX *= 0.94;
      vY *= 0.94;
    }
    tX += vX;
    tY += vY;

    cPX += (tX - cPX) * 0.08;
    cPY += (tY - cPY) * 0.08;

    if (globeEl) globeEl.style.transform = 'none';

    let rotX = cPX * (Math.PI / 180);
    let rotY = cPY * (Math.PI / 180);

    RINGS.forEach((ring, idx) => {
      const gEl = document.getElementById(ring.id);
      if (!gEl) return;
      const pathBack = gEl.querySelector('.ring-back');
      const pathFront = gEl.querySelector('.ring-front');

      let spinY = t + ring.phase;
      let tiltDeg = ring.tilt + ring.tiltAmp * Math.sin(t * TSPD + ring.tiltOff);
      let tiltZ = tiltDeg * (Math.PI / 180);

      let frontPath = "", backPath = "";
      let segments = 180;
      let lastZ = null;

      for (let i = 0; i <= segments; i++) {
        let a = (i / segments) * Math.PI * 2;
        let p = { x: 0, y: R * Math.cos(a), z: R * Math.sin(a) };
        let p1 = rotate3D(p, 0, spinY);
        let sZ = Math.sin(tiltZ), cZ = Math.cos(tiltZ);
        let p2 = { x: p1.x * cZ - p1.y * sZ, y: p1.x * sZ + p1.y * cZ, z: p1.z };
        let p3 = rotate3D(p2, rotX, rotY);

        let projX = CX + p3.x;
        let projY = CY + p3.y;

        if (p3.z >= 0) {
          if (frontPath === "" || lastZ < 0) {
            frontPath += ` M ${projX.toFixed(2)},${projY.toFixed(2)}`;
          } else {
            frontPath += ` L ${projX.toFixed(2)},${projY.toFixed(2)}`;
          }
        } else if (lastZ >= 0 && frontPath !== "") {
          frontPath += ` L ${projX.toFixed(2)},${projY.toFixed(2)}`;
        }

        if (p3.z <= 0) {
          if (backPath === "" || lastZ > 0) {
            backPath += ` M ${projX.toFixed(2)},${projY.toFixed(2)}`;
          } else {
            backPath += ` L ${projX.toFixed(2)},${projY.toFixed(2)}`;
          }
        } else if (lastZ <= 0 && backPath !== "") {
          backPath += ` L ${projX.toFixed(2)},${projY.toFixed(2)}`;
        }

        lastZ = p3.z;
      }

      if (pathFront) {
        pathFront.setAttribute('d', frontPath);
        pathFront.setAttribute('stroke', ring.fColor);
      }
      if (pathBack) {
        pathBack.setAttribute('d', backPath);
        pathBack.setAttribute('stroke', ring.bColor);
      }

      ring.dots.forEach(dot => {
        const de = document.getElementById(dot.id);
        if (!de) return;

        let a = dot.alpha;
        let p = { x: 0, y: R * Math.cos(a), z: R * Math.sin(a) };
        let p1 = rotate3D(p, 0, spinY);
        let sZ = Math.sin(tiltZ), cZ = Math.cos(tiltZ);
        let p2 = { x: p1.x * cZ - p1.y * sZ, y: p1.x * sZ + p1.y * cZ, z: p1.z };
        let p3 = rotate3D(p2, rotX, rotY);

        let projX = CX + p3.x;
        let projY = CY + p3.y;

        let zFactor = (p3.z / R);
        let opacity = 0.5 + 0.5 * zFactor;
        let dotSize = 5 + 3 * zFactor;

        de.setAttribute('x', (projX - dotSize / 2).toFixed(2));
        de.setAttribute('y', (projY - dotSize / 2).toFixed(2));
        de.setAttribute('width', dotSize.toFixed(2));
        de.setAttribute('height', dotSize.toFixed(2));
        de.setAttribute('opacity', opacity.toFixed(2));
      });

      if (idx === 0) {
        let a = TRI_ALPHA;
        let p = { x: 0, y: R * Math.cos(a), z: R * Math.sin(a) };
        let p1 = rotate3D(p, 0, spinY);
        let sZ = Math.sin(tiltZ), cZ = Math.cos(tiltZ);
        let p2 = { x: p1.x * cZ - p1.y * sZ, y: p1.x * sZ + p1.y * cZ, z: p1.z };
        let p3 = rotate3D(p2, rotX, rotY);

        let triWX = CX + p3.x;
        let triWY = CY + p3.y;

        calloutGroup.removeAttribute('transform');

        triEl.setAttribute('points',
          `${triWX},${triWY - TRI_S} ` +
          `${triWX + TRI_S},${triWY + TRI_S} ` +
          `${triWX - TRI_S},${triWY + TRI_S}`
        );

        let foWX = triWX + BOX_OX;
        let foWY = triWY + BOX_OY;
        foEl.setAttribute('x', foWX.toFixed(2));
        foEl.setAttribute('y', foWY.toFixed(2));

        lineEl.setAttribute('x1', triWX.toFixed(2));
        lineEl.setAttribute('y1', (triWY - TRI_S).toFixed(2));
        lineEl.setAttribute('x2', foWX.toFixed(2));
        lineEl.setAttribute('y2', (foWY + FO_H / 2).toFixed(2));
      }
    });

    requestAnimationFrame(tick);
  }

  document.querySelectorAll('#globe path, #callout-group *')
    .forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transition = `opacity 0.7s ease ${i * 0.08}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.opacity = '';
      }));
    });

  const percentEl = document.getElementById('percent-loader');
  if (percentEl) {
    let startVal = 0;
    const endVal = 99;
    const duration = 2000;
    let startTime = null;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animatePercent(time) {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      let progress = elapsed / duration;
      if (progress > 1) progress = 1;

      const currentVal = Math.floor(startVal + (endVal - startVal) * easeOutCubic(progress));
      percentEl.textContent = currentVal + '%';

      if (progress < 1) {
        requestAnimationFrame(animatePercent);
      }
    }
    requestAnimationFrame(animatePercent);
  }

  tick();

  const card = document.querySelector('.rim-card-wrapper');
  if (card) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const maxRotX = 8;
      const maxRotY = 8;

      const rotX = ((y - centerY) / centerY) * -maxRotX;
      const rotY = ((x - centerX) / centerX) * maxRotY;

      card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      card.style.boxShadow = `${-rotY * 1.5}px ${rotX * 1.5}px 40px rgba(0,0,0,0.1)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `rotateX(0deg) rotateY(0deg)`;
      card.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.05)`;
    });
  }
}

function initDesignCardAnimation() {
  const card = document.querySelector('.design-card');
  if (!card) return;
  
  const SVG_NS = "http://www.w3.org/2000/svg";
  
  // Element selections
  const guidesGroup = document.getElementById('design-guides-group');
  const pathsGroup = document.getElementById('design-paths-group');
  const dotsGroup = document.getElementById('design-dots-group');
  
  if (!guidesGroup || !pathsGroup || !dotsGroup) return;

  // Parameters
  const numPoints = 120; // High resolution for smooth curves
  const Z_STEP = 18;     // Vertical distance separating the 3D stacked loops
  const CAMERA_D = 400;  // Camera focal length for perspective projection
  const CX = 142.5;      // Center X coordinate of SVG projection canvas
  const CY = 152;        // Center Y coordinate of SVG projection canvas

  // Animation settings
  const GROWTH_SPEED = 0.012;      // Speed of path growth
  const CASCADING_THRESHOLD = 0.4;  // Starts growing next ring when current is 40% complete

  // 3D Rotation coordinates (radians)
  const INITIAL_YAW = 0.25;         // Initial angled perspective
  const INITIAL_PITCH = -0.3;       // Initial downward tilt
  const DRAG_SENSITIVITY = 0.006;
  const DAMPING = 0.12;

  // Wavy curves dimensions from Figma metadata
  // Stacked outermost (Index 0) to innermost (Index 7)
  const curvesConfig = [
    { w: 285, h: 304 }, // Outer 1
    { w: 262, h: 272 }, // 2
    { w: 243, h: 248 }, // 3
    { w: 220, h: 220 }, // 4
    { w: 202, h: 192 }, // 5
    { w: 177, h: 163 }, // 6
    { w: 150, h: 138 }, // 7
    { w: 116, h: 107 }  // Inner 8
  ];

  // Dot configs: each assigned to a curve index and moving at different speeds/directions
  const dotsConfig = [
    { curveIndex: 1, angle: 0.2, speed: 0.008, size: 3.5 },  // Outer-middle
    { curveIndex: 3, angle: 1.8, speed: -0.012, size: 3.5 }, // Middle
    { curveIndex: 5, angle: 3.4, speed: 0.015, size: 3.5 },  // Inner-middle
    { curveIndex: 7, angle: 4.8, speed: -0.02, size: 3.5 }   // Innermost
  ];

  // Initialize loop state machine objects
  const curvesState = curvesConfig.map((config, index) => {
    // Create guide path element (faint wireframe background)
    const guide = document.createElementNS(SVG_NS, 'path');
    guide.setAttribute('class', 'design-wavy-path design-guide-path');
    guidesGroup.appendChild(guide);

    // Create active path element (glowing main concentric loops)
    const active = document.createElementNS(SVG_NS, 'path');
    active.setAttribute('class', 'design-wavy-path design-active-path');
    pathsGroup.appendChild(active);

    return {
      index: index,
      w: config.w,
      h: config.h,
      z: -index * Z_STEP,  // stacked vertically along Z-axis (funnel shape)
      state: 'waiting',    // 'waiting' | 'growing' | 'active'
      progress: 0.0,
      guidePath: guide,
      activePath: active
    };
  });

  // Start the cascading growth sequence from the innermost ring (Index 7)
  curvesState[7].state = 'growing';

  // Initialize orbiting marker elements
  const dotElements = dotsConfig.map((config) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('class', 'design-marker-dot');
    circle.setAttribute('r', config.size);
    circle.setAttribute('opacity', '0');
    dotsGroup.appendChild(circle);

    return {
      element: circle,
      curveIndex: config.curveIndex,
      angle: config.angle,
      speed: config.speed,
      size: config.size,
      fadeOpacity: 0.0
    };
  });

  // Mathematical Polar Equation for Wavy Outlines
  // r(theta) = 1.0 - A * (1.0 - cos(4 * theta - phase))
  function getWavyRadius(theta, amplitude, phase = 0) {
    return 1.0 - amplitude * (1.0 - Math.cos(4 * theta - phase));
  }

  // 3D coordinate rotation and perspective projection
  function projectPoint(xLoc, yLoc, zLoc, pitch, yaw) {
    // Yaw rotation (around Y axis)
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const x1 = xLoc * cosYaw + zLoc * sinYaw;
    const z1 = -xLoc * sinYaw + zLoc * cosYaw;

    // Pitch rotation (around X axis)
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const y2 = yLoc * cosPitch - z1 * sinPitch;
    const z2 = yLoc * sinPitch + z1 * cosPitch;

    // Perspective projection
    const scale = CAMERA_D / (CAMERA_D - z2);
    const xProj = CX + x1 * scale;
    const yProj = CY + y2 * scale;

    return { x: xProj, y: yProj, scale: scale, z: z2 };
  }

  /* ── Rotation Interaction States ────────────────────────────── */
  let yaw = INITIAL_YAW;
  let pitch = INITIAL_PITCH;
  let targetYaw = INITIAL_YAW;
  let targetPitch = INITIAL_PITCH;
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let autoRotateTime = 0;

  // Mouse drag handlers
  card.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;

    targetYaw += dx * DRAG_SENSITIVITY;
    targetPitch -= dy * DRAG_SENSITIVITY;

    // Restrict pitch so card system is not turned upside down
    const maxPitch = Math.PI * 0.44;
    targetPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));

    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Mobile touch drag handlers
  card.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      lastPointerX = e.touches[0].clientX;
      lastPointerY = e.touches[0].clientY;
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - lastPointerX;
    const dy = e.touches[0].clientY - lastPointerY;

    targetYaw += dx * DRAG_SENSITIVITY;
    targetPitch -= dy * DRAG_SENSITIVITY;

    const maxPitch = Math.PI * 0.44;
    targetPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));

    lastPointerX = e.touches[0].clientX;
    lastPointerY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  window.addEventListener('touchcancel', () => {
    isDragging = false;
  });

  /* ── Card Tilt Parallax Effect ────────────────────────────── */
  card.addEventListener('mousemove', (e) => {
    if (isDragging) return; // Disable tilt parallax while dragging 3D system
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const maxRotX = 7;
    const maxRotY = 7;

    const rotX = ((y - centerY) / centerY) * -maxRotX;
    const rotY = ((x - centerX) / centerX) * maxRotY;

    card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    card.style.boxShadow = `${-rotY * 1.5}px ${rotX * 1.5}px 40px rgba(0,0,0,0.15)`;
  });

  card.addEventListener('mouseleave', () => {
    if (isDragging) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg)`;
    card.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.05)`;
  });

  // Animation Loop
  function tick(time) {
    if (!time) time = performance.now();
    
    // 1. Update 3D Pitch and Yaw with smooth interpolation
    if (!isDragging) {
      // Idle wobble drift when not interacted
      autoRotateTime += 1;
      targetYaw = INITIAL_YAW + 0.18 * Math.sin(autoRotateTime * 0.007) + 0.08 * Math.cos(autoRotateTime * 0.003);
      targetPitch = INITIAL_PITCH + 0.08 * Math.cos(autoRotateTime * 0.005);
    }

    yaw += (targetYaw - yaw) * DAMPING;
    pitch += (targetPitch - pitch) * DAMPING;

    // Dynamic breathing amplitude parameters
    const baseAmplitude = 0.08;
    const amplitudeOscillationDepth = 0.025;
    const speedFactor = 0.0015;

    // 2. Symmetrical closed-loop cascading state machine updates
    curvesState.forEach((state, i) => {
      if (state.state === 'growing') {
        state.progress += GROWTH_SPEED;
        if (state.progress >= 1.0) {
          state.progress = 1.0;
          state.state = 'active';
        }

        // Trigger growth cascade to outer neighbor (index i - 1)
        if (i > 0 && state.progress >= CASCADING_THRESHOLD) {
          const nextState = curvesState[i - 1];
          if (nextState.state === 'waiting') {
            nextState.state = 'growing';
          }
        }
      }
    });

    // 3. Project and draw concentric wavy structures
    curvesState.forEach((p, i) => {
      const phaseOffset = i * 0.4;
      const currentAmplitude = baseAmplitude + amplitudeOscillationDepth * Math.sin(time * speedFactor - phaseOffset);
      const rotationPhase = time * 0.0003 * (1 - i * 0.05);

      // Pre-calculate 120 projected coordinates for guide skeletal alignment
      const points = [];
      for (let j = 0; j <= numPoints; j++) {
        const theta = (j / numPoints) * 2 * Math.PI;
        const r = getWavyRadius(theta, currentAmplitude, rotationPhase);
        
        const xLocal = r * (p.w / 2) * Math.cos(theta);
        const yLocal = r * (p.h / 2) * Math.sin(theta);
        const zLocal = p.z;

        const projected = projectPoint(xLocal, yLocal, zLocal, pitch, yaw);
        points.push(projected);
      }

      // Draw Guide Path (faint closed outline skeleton)
      let dGuide = "";
      points.forEach((pt, idx) => {
        if (idx === 0) dGuide += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        else dGuide += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      });
      dGuide += " Z";
      p.guidePath.setAttribute('d', dGuide);

      // Draw Active Path
      if (p.state === 'waiting') {
        p.activePath.setAttribute('d', '');
      } else if (p.state === 'growing') {
        const k = Math.round(numPoints * 0.5 * p.progress);

        // Path A: clockwise from 0 to k
        let dActiveA = "";
        for (let idx = 0; idx <= k; idx++) {
          const pt = points[idx];
          if (idx === 0) dActiveA += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
          else dActiveA += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        }

        // Path B: counter-clockwise from N down to N-k
        let dActiveB = "";
        for (let idx = 0; idx <= k; idx++) {
          const pt = points[numPoints - idx];
          if (idx === 0) dActiveB += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
          else dActiveB += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        }

        p.activePath.setAttribute('d', dActiveA + " " + dActiveB);

      } else if (p.state === 'active') {
        // Full stable active path drawn
        let dActive = "";
        points.forEach((pt, idx) => {
          if (idx === 0) dActive += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
          else dActive += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        });
        dActive += " Z";
        p.activePath.setAttribute('d', dActive);
      }

      // Save dynamic breathing values to align markers
      p.currentAmplitude = currentAmplitude;
      p.rotationPhase = rotationPhase;
    });

    // 4. Update and project Orbiting Dots
    dotElements.forEach((dot) => {
      const parentCurve = curvesState[dot.curveIndex];
      if (parentCurve.state === 'active') {
        // Orbit motion
        dot.angle += dot.speed;
        if (dot.angle > Math.PI * 2) dot.angle -= Math.PI * 2;
        if (dot.angle < 0) dot.angle += Math.PI * 2;

        // Smoothly fade-in once active
        if (dot.fadeOpacity < 0.95) {
          dot.fadeOpacity += 0.05;
          if (dot.fadeOpacity > 0.95) dot.fadeOpacity = 0.95;
        }

        // Calculate location of dot on the breathing curve in 3D
        const phaseOffset = dot.curveIndex * 0.4;
        const currentAmplitude = baseAmplitude + amplitudeOscillationDepth * Math.sin(time * speedFactor - phaseOffset);
        const rotationPhase = time * 0.0003 * (1 - dot.curveIndex * 0.05);

        const r = getWavyRadius(dot.angle, currentAmplitude, rotationPhase);
        const xLocal = r * (parentCurve.w / 2) * Math.cos(dot.angle);
        const yLocal = r * (parentCurve.h / 2) * Math.sin(dot.angle);
        const zLocal = parentCurve.z;

        const projected = projectPoint(xLocal, yLocal, zLocal, pitch, yaw);

        dot.element.setAttribute('cx', projected.x.toFixed(2));
        dot.element.setAttribute('cy', projected.y.toFixed(2));
        dot.element.setAttribute('r', (dot.size * projected.scale).toFixed(2));
        dot.element.setAttribute('opacity', dot.fadeOpacity.toFixed(2));
      } else {
        dot.element.setAttribute('opacity', '0');
      }
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}
