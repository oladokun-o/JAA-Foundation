// Shared by every page. Each feature checks its elements exist first, because
// the legal and error pages only carry the header and footer.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const hasIO = "IntersectionObserver" in window;

  // WhatsApp quick-contact ------------------------------------------------
  // Number comes from the WHATSAPP_NUMBER env var on Netlify, written into
  // /config.js at deploy time (tools/write-config.mjs). While empty, every
  // [data-whatsapp] element (top bar, contact list, floating button) stays hidden.
  const WHATSAPP_NUMBER = String((window.JAA_CONFIG && window.JAA_CONFIG.whatsappNumber) || "").replace(/\D/g, "");
  const WHATSAPP_MESSAGE = "Hello, I'd like to learn more about the Joseph Alabi Adewoye Foundation.";

  if (WHATSAPP_NUMBER) {
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    $$("[data-whatsapp-link]").forEach((a) => (a.href = waUrl));
    $$("[data-whatsapp]").forEach((el) => (el.hidden = false));
  }

  // Footer year
  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  // Header & mobile navigation ---------------------------------------------
  const header = $("#site-header");
  const nav = $("#site-nav");
  const toggle = $("#menu-toggle");

  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (nav && toggle) {
    const toggleIcon = $("i", toggle);
    const setMenu = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      toggleIcon.className = open ? "ri-close-line" : "ri-menu-line";
    };

    toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });

    // Highlight the nav link for the section in view (home page only). Every
    // section is observed, not just linked ones, so links un-highlight in
    // sections the nav doesn't list (e.g. the FAQ).
    const navLinks = $$('a[href^="#"]:not(.btn)', nav);
    const sections = $$("main section[id]");
    if (hasIO && navLinks.length && sections.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((a) =>
              a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`)
            );
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      sections.forEach((s) => spy.observe(s));
    }
  }

  // Reveal on scroll -------------------------------------------------------
  // [data-stagger] containers reveal their children one after another.
  $$("[data-stagger]").forEach((group) => {
    [...group.children].forEach((child, i) => {
      if (child.hidden) return;
      child.setAttribute("data-reveal", "");
      child.dataset.revealDelay = String(Math.min(i * 90, 540));
    });
  });

  const revealEls = $$("[data-reveal]");
  revealEls.forEach((el) => {
    if (el.dataset.revealDelay) el.style.setProperty("--reveal-delay", `${el.dataset.revealDelay}ms`);
  });

  if (hasIO) {
    const reveal = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add("is-visible");
          obs.unobserve(el);
          // Once revealed, drop the reveal styles so the element's own hover
          // transitions (lifts, zooms) aren't overridden or delayed by them.
          // .is-visible stays, since some effects (timeline, photo wipes) key off it.
          const done = () => el.removeAttribute("data-reveal");
          const delay = parseInt(el.dataset.revealDelay || "0", 10);
          el.addEventListener("transitionend", function onEnd(e) {
            if (e.target !== el || e.propertyName !== "transform") return;
            el.removeEventListener("transitionend", onEnd);
            done();
          });
          setTimeout(done, delay + 1500);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    revealEls.forEach((el) => reveal.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Biography expand / collapse -------------------------------------------
  const bioText = $("#bio-text");
  const bioToggle = $("#bio-toggle");
  if (bioText && bioToggle) {
    bioToggle.addEventListener("click", () => {
      const expanded = bioText.classList.toggle("is-expanded");
      bioToggle.setAttribute("aria-expanded", String(expanded));
      $("span", bioToggle).textContent = expanded ? "Show less" : "Read full biography";
      if (!expanded) bioText.scrollIntoView({ block: "nearest" });
    });
  }

  // Lightbox --------------------------------------------------------------
  const lightbox = $("#lightbox");
  if (lightbox && typeof lightbox.showModal === "function") {
    const lightboxImg = $("img", lightbox);
    $$("[data-lightbox]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const thumb = $("img", trigger);
        lightboxImg.src = trigger.dataset.lightbox;
        lightboxImg.alt = thumb ? thumb.alt : "";
        lightbox.showModal();
      });
    });
    $(".lightbox__close", lightbox).addEventListener("click", () => lightbox.close());
    // Clicking the backdrop (the dialog itself, outside the image) closes it
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.close();
    });
  }

  // Contact form ------------------------------------------------------------
  // Posts JSON to the /api/contact Netlify Function (→ Resend). Without JS the
  // form still submits normally and the function redirects to /message-sent/
  // or /error/.
  const form = $("#contact-form");
  if (form) {
    form.noValidate = true; // we show our own messages; native validation stays on without JS
    const status = $(".form-status", form);
    const submitBtn = $('button[type="submit"]', form);
    const submitLabel = $(".btn__label", submitBtn);

    const setStatus = (msg, kind) => {
      status.textContent = msg;
      status.classList.toggle("is-success", kind === "success");
      status.classList.toggle("is-error", kind === "error");
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const fields = $$("input[required], textarea[required]", form);
      let firstInvalid = null;
      fields.forEach((f) => {
        const valid = f.checkValidity() && f.value.trim() !== "";
        f.setAttribute("aria-invalid", String(!valid));
        if (!valid && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) {
        setStatus("Please fill in every field with a valid email address.", "error");
        firstInvalid.focus();
        return;
      }

      submitBtn.disabled = true;
      submitLabel.textContent = "Sending…";
      setStatus("", null);

      try {
        const res = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Something went wrong.");
        form.reset();
        fields.forEach((f) => f.removeAttribute("aria-invalid"));
        setStatus("Thank you! Your message has been sent. We'll be in touch soon.", "success");
      } catch (err) {
        setStatus(`${err.message} You can also email us directly at adewoyefoundation@gmail.com.`, "error");
      } finally {
        submitBtn.disabled = false;
        submitLabel.textContent = "Send message";
      }
    });
  }
})();
