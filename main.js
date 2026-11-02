(() => {
  // WhatsApp quick-contact ------------------------------------------------
  // International format, digits only (e.g. "2348012345678"). While empty, the
  // floating button and the contact-list entry stay hidden.
  const WHATSAPP_NUMBER = "";
  const WHATSAPP_MESSAGE = "Hello, I'd like to learn more about the Joseph Alabi Adewoye Foundation.";

  if (WHATSAPP_NUMBER) {
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    document.querySelectorAll("[data-whatsapp-link]").forEach((a) => (a.href = waUrl));
    document.querySelectorAll("[data-whatsapp]").forEach((el) => (el.hidden = false));
  }

  // Mobile navigation ------------------------------------------------------
  const header = document.getElementById("site-header");
  const nav = document.getElementById("site-nav");
  const toggle = document.getElementById("menu-toggle");
  const toggleIcon = toggle.querySelector("i");

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

  // Header shadow once the page scrolls
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Highlight the nav link for the section in view
  const navLinks = [...nav.querySelectorAll('a[href^="#"]:not(.btn)')];
  // Observe every section (not just linked ones) so a link un-highlights when
  // the reader moves into a section the nav doesn't list, e.g. the FAQ.
  const sections = [...document.querySelectorAll("main section[id]")];
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => spy.observe(s));
  }

  // Reveal on scroll -------------------------------------------------------
  const revealEls = document.querySelectorAll("[data-reveal]");
  revealEls.forEach((el) => {
    if (el.dataset.revealDelay) el.style.setProperty("--reveal-delay", `${el.dataset.revealDelay}ms`);
  });
  if ("IntersectionObserver" in window) {
    const reveal = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
    );
    revealEls.forEach((el) => reveal.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Biography expand / collapse -------------------------------------------
  const bioText = document.getElementById("bio-text");
  const bioToggle = document.getElementById("bio-toggle");
  bioToggle.addEventListener("click", () => {
    const expanded = bioText.classList.toggle("is-expanded");
    bioToggle.setAttribute("aria-expanded", String(expanded));
    bioToggle.querySelector("span").textContent = expanded ? "Show less" : "Read full biography";
    if (!expanded) bioText.scrollIntoView({ block: "nearest" });
  });

  // Lightbox --------------------------------------------------------------
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = lightbox.querySelector("img");
  if (typeof lightbox.showModal === "function") {
    document.querySelectorAll("[data-lightbox]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const thumb = trigger.querySelector("img");
        lightboxImg.src = trigger.dataset.lightbox;
        lightboxImg.alt = thumb ? thumb.alt : "";
        lightbox.showModal();
      });
    });
    lightbox.querySelector(".lightbox__close").addEventListener("click", () => lightbox.close());
    // Clicking the backdrop (the dialog itself, outside the image) closes it
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) lightbox.close();
    });
  }

  // Contact form (sent through the /api/contact Netlify Function → Resend) --
  const form = document.getElementById("contact-form");
  const status = form.querySelector(".form-status");
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn.querySelector(".btn__label");

  const setStatus = (msg, kind) => {
    status.textContent = msg;
    status.classList.toggle("is-success", kind === "success");
    status.classList.toggle("is-error", kind === "error");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fields = [...form.querySelectorAll("input[required], textarea[required]")];
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      form.reset();
      fields.forEach((f) => f.removeAttribute("aria-invalid"));
      setStatus("Thank you! Your message has been sent. We'll be in touch soon.", "success");
    } catch (err) {
      setStatus(
        `${err.message} You can also email us directly at adewoyefoundation@gmail.com.`,
        "error"
      );
    } finally {
      submitBtn.disabled = false;
      submitLabel.textContent = "Send message";
    }
  });

  // Footer year
  document.getElementById("year").textContent = new Date().getFullYear();
})();
