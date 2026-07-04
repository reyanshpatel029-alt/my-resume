(() => {
  const body = document.body;
  const header = document.querySelector(".site-header");
  const menuToggle = document.querySelector("#menuToggle");
  const navMenu = document.querySelector("#primaryMenu");
  const themeToggle = document.querySelector("#themeToggle");
  const scrollProgress = document.querySelector("#scrollProgress");
  const printPage = document.querySelector("#printPage");
  const copyEmail = document.querySelector("#copyEmail");
  const emailText = document.querySelector("#emailText");
  const contactForm = document.querySelector("#contactForm");
  const toast = document.querySelector("#toast");
  const revealElements = document.querySelectorAll(".reveal");
  const progressBars = document.querySelectorAll(".skill-progress");
  const counters = document.querySelectorAll(".counter");
  const navLinks = document.querySelectorAll(".nav-menu a[href^='#']");
  const sections = document.querySelectorAll("main section[id]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const themeKey = "reyansh-portfolio-theme";

  const savedTheme = localStorage.getItem(themeKey);
  if (savedTheme) {
    body.dataset.theme = savedTheme;
  }

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  };

  const closeMenu = () => {
    if (!navMenu || !menuToggle) return;
    body.classList.remove("menu-open");
    navMenu.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
  };

  menuToggle?.addEventListener("click", () => {
    const isOpen = navMenu?.classList.toggle("is-open");
    body.classList.toggle("menu-open", Boolean(isOpen));
    menuToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  navMenu?.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  themeToggle?.addEventListener("click", () => {
    const nextTheme = body.dataset.theme === "light" ? "" : "light";
    if (nextTheme) {
      body.dataset.theme = nextTheme;
      localStorage.setItem(themeKey, nextTheme);
      showToast("Light theme enabled");
    } else {
      delete body.dataset.theme;
      localStorage.removeItem(themeKey);
      showToast("Dark theme enabled");
    }
  });

  let ticking = false;
  const updateScrollUI = () => {
    const scrollTop = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    if (scrollProgress) {
      scrollProgress.style.width = `${progress}%`;
    }
    header?.classList.toggle("is-scrolled", scrollTop > 8);
  };

  const requestScrollUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateScrollUI();
      ticking = false;
    });
  };

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  updateScrollUI();

  const revealNow = (element) => element.classList.add("is-visible");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach(revealNow);
    progressBars.forEach((bar) => {
      bar.style.width = `${bar.dataset.width || 0}%`;
    });
    counters.forEach((counter) => {
      counter.textContent = counter.dataset.target || "0";
    });
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        revealNow(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });

    revealElements.forEach((element) => revealObserver.observe(element));

    const progressObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.style.width = `${entry.target.dataset.width || 0}%`;
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.45 });

    progressBars.forEach((bar) => progressObserver.observe(bar));

    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const target = Number(entry.target.dataset.target || 0);
        const step = Math.max(1, Math.ceil(target / 40));
        let current = 0;

        const count = () => {
          current += step;
          if (current >= target) {
            entry.target.textContent = String(target);
            observer.unobserve(entry.target);
            return;
          }
          entry.target.textContent = String(current);
          window.requestAnimationFrame(count);
        };

        count();
      });
    }, { threshold: 0.5 });

    counters.forEach((counter) => counterObserver.observe(counter));
  }

  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        navLinks.forEach((link) => link.classList.toggle("is-active", link.getAttribute("href") === id));
      });
    }, { rootMargin: "-35% 0px -55% 0px" });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  printPage?.addEventListener("click", () => window.print());

  copyEmail?.addEventListener("click", async () => {
    const email = emailText?.textContent?.trim();
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      showToast("Email copied");
    } catch {
      showToast("Copy failed. Select the email manually.");
    }
  });

  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !message) {
      showToast("Please complete every field");
      return;
    }

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validEmail) {
      showToast("Enter a valid email address");
      return;
    }

    const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
    const bodyText = encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`);
    window.location.href = `mailto:${emailText?.textContent?.trim() || "john.doe@example.com"}?subject=${subject}&body=${bodyText}`;
    contactForm.reset();
    showToast("Email draft prepared");
  });
})();
