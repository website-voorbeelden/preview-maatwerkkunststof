(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.site-nav');
  const header = document.querySelector('[data-header]');

  const setMenu = (open) => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    header?.classList.toggle('is-menu-open', open);
    if (open) header?.classList.remove('is-hidden');
  };

  menuButton?.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  menu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      setMenu(false);
      header?.classList.remove('is-hidden');
    }
  });

  let lastHeaderScroll = window.scrollY;
  let headerScrollQueued = false;
  let upwardScroll = 0;
  let downwardScroll = 0;

  const updateHeader = () => {
    const currentScroll = window.scrollY;
    const menuIsOpen = menuButton?.getAttribute('aria-expanded') === 'true';
    header?.classList.toggle('is-scrolled', currentScroll > 32);

    if (!header || menuIsOpen || currentScroll <= 24) {
      header?.classList.remove('is-hidden');
      upwardScroll = 0;
      downwardScroll = 0;
      lastHeaderScroll = currentScroll;
      headerScrollQueued = false;
      return;
    }

    const delta = currentScroll - lastHeaderScroll;
    if (Math.abs(delta) < 3) {
      headerScrollQueued = false;
      return;
    }
    if (delta > 0) {
      downwardScroll += delta;
      upwardScroll = 0;
      if (currentScroll > 260 && downwardScroll >= 90) header.classList.add('is-hidden');
    } else if (delta < 0) {
      upwardScroll -= delta;
      downwardScroll = 0;
      if (upwardScroll >= 110) header.classList.remove('is-hidden');
    }

    lastHeaderScroll = currentScroll;
    headerScrollQueued = false;
  };

  window.addEventListener('scroll', () => {
    if (headerScrollQueued) return;
    headerScrollQueued = true;
    window.requestAnimationFrame(updateHeader);
  }, { passive: true });
  updateHeader();

  const whatsappAvailability = document.querySelector('[data-whatsapp-availability]');
  if (whatsappAvailability) {
    const dismissedKey = 'mk_whatsapp_availability_dismissed';
    const shownKey = 'mk_whatsapp_availability_shown';
    const whatsappToggle = whatsappAvailability.querySelector('[data-whatsapp-availability-toggle]');
    const whatsappStatus = whatsappAvailability.querySelector('.whatsapp-availability__status');
    const whatsappOfflineNote = whatsappAvailability.querySelector('.whatsapp-availability__offline-note');
    const mobileWhatsappQuery = window.matchMedia('(max-width: 719px)');
    const forceLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      && new URLSearchParams(window.location.search).has('previewWhatsapp');
    let whatsappReady = false;
    let whatsappReadyTimer;
    const isDismissed = () => {
      try { return sessionStorage.getItem(dismissedKey) === 'true'; } catch { return false; }
    };
    const hasBeenShown = () => {
      try { return sessionStorage.getItem(shownKey) === 'true'; } catch { return false; }
    };
    const isDutchBusinessHours = () => {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Amsterdam',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(new Date());
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
      const minutes = (Number(values.hour) * 60) + Number(values.minute);
      return weekdays.includes(values.weekday) && minutes >= 9 * 60 && minutes < 17 * 60;
    };
    const updateWhatsappAvailability = () => {
      const employeeIsOnline = forceLocalPreview || isDutchBusinessHours();
      whatsappAvailability.hidden = !whatsappReady || isDismissed();
      if (whatsappStatus) whatsappStatus.hidden = !employeeIsOnline;
      if (whatsappOfflineNote) whatsappOfflineNote.hidden = employeeIsOnline;
    };

    const scheduleWhatsappAvailability = (delay) => {
      window.clearTimeout(whatsappReadyTimer);
      if (whatsappReady || isDismissed() || (!forceLocalPreview && hasBeenShown())) return;
      whatsappAvailability.hidden = true;
      whatsappReadyTimer = window.setTimeout(() => {
        whatsappReady = true;
        if (!forceLocalPreview) {
          try { sessionStorage.setItem(shownKey, 'true'); } catch { /* storage may be unavailable */ }
        }
        updateWhatsappAvailability();
      }, delay);
    };

    const collapseWhatsappAvailability = () => {
      whatsappAvailability.classList.remove('is-expanded');
      whatsappToggle?.setAttribute('aria-expanded', 'false');
    };

    whatsappToggle?.addEventListener('click', () => {
      const expanded = whatsappAvailability.classList.toggle('is-expanded');
      whatsappToggle.setAttribute('aria-expanded', String(expanded));
    });

    whatsappAvailability.querySelector('[data-whatsapp-availability-close]')?.addEventListener('click', () => {
      try { sessionStorage.setItem(dismissedKey, 'true'); } catch { /* storage may be unavailable */ }
      collapseWhatsappAvailability();
      whatsappAvailability.hidden = true;
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && whatsappAvailability.classList.contains('is-expanded')) {
        collapseWhatsappAvailability();
        whatsappToggle?.focus();
      }
    });

    mobileWhatsappQuery.addEventListener?.('change', collapseWhatsappAvailability);

    const showWhatsappAfterCookieBanner = () => {
      if (whatsappReady) {
        updateWhatsappAvailability();
        return;
      }
      scheduleWhatsappAvailability(4 * 1000);
    };

    window.addEventListener('mk:consent-opened', () => {
      window.clearTimeout(whatsappReadyTimer);
      whatsappAvailability.hidden = true;
    });
    window.addEventListener('mk:consent-updated', showWhatsappAfterCookieBanner);
    window.addEventListener('mk:consent-dismissed', showWhatsappAfterCookieBanner);

    if (
      window.MKCookieConsent?.hasConsentChoice?.()
      || window.MKCookieConsent?.wasDismissed?.()
    ) {
      scheduleWhatsappAvailability(7 * 1000);
    }
    window.setInterval(updateWhatsappAvailability, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) updateWhatsappAvailability();
    });
  }

  window.dataLayer = window.dataLayer || [];

  document.querySelectorAll('[data-analytics]').forEach((element) => {
    element.addEventListener('click', () => {
      if (!window.MKCookieConsent?.hasAnalyticsConsent()) return;
      window.dataLayer.push({
        event: element.dataset.analytics,
        click_location: element.dataset.location || '',
        click_text: element.textContent.trim(),
        page_path: window.location.pathname
      });
    });
  });

  const campaignKeys = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'gbraid', 'wbraid'
  ];

  const params = new URLSearchParams(window.location.search);
  const readStoredValue = (key) => {
    try { return sessionStorage.getItem(`mk_${key}`) || ''; } catch { return ''; }
  };
  const storeValue = (key, value) => {
    try { sessionStorage.setItem(`mk_${key}`, value); } catch { /* storage may be unavailable */ }
  };

  campaignKeys.forEach((key) => {
    const currentValue = params.get(key);
    if (currentValue) storeValue(key, currentValue);
  });

  document.querySelectorAll('[data-quote-form]').forEach((form) => {
    const startedField = form.querySelector('[data-form-started]');
    const status = form.querySelector('[data-form-status]');
    const submitButton = form.querySelector('[data-submit-button]');
    const fileInput = form.querySelector('input[type="file"]');
    const fileFeedback = form.querySelector('[data-file-feedback]');

    if (startedField) startedField.value = String(Date.now());

    campaignKeys.forEach((key) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = readStoredValue(key);
    });

    fileInput?.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const invalid = files.length > 3 || totalSize > 8 * 1024 * 1024;
      fileInput.setCustomValidity(invalid ? 'Selecteer maximaal 3 bestanden van samen maximaal 8 MB.' : '');

      if (fileFeedback) {
        if (!files.length) {
          fileFeedback.textContent = 'Nog geen bestand geselecteerd.';
          fileFeedback.classList.remove('has-files', 'has-error');
        } else if (invalid) {
          fileFeedback.textContent = 'Te veel of te grote bestanden. Kies maximaal 3 bestanden van samen maximaal 8 MB.';
          fileFeedback.classList.remove('has-files');
          fileFeedback.classList.add('has-error');
        } else {
          const fileNames = files.map((file) => file.name).join(', ');
          fileFeedback.textContent = files.length === 1
            ? `Toegevoegd: ${fileNames}`
            : `${files.length} bestanden toegevoegd: ${fileNames}`;
          fileFeedback.classList.add('has-files');
          fileFeedback.classList.remove('has-error');
        }
      }
    });

    form.addEventListener('submit', async (event) => {
      if (!window.fetch || !form.reportValidity()) return;
      event.preventDefault();

      status.className = 'form-status';
      status.textContent = '';
      submitButton.disabled = true;
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Aanvraag versturen…';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.message || 'De aanvraag kon niet worden verstuurd. Probeer het opnieuw.');
        }

        if (window.MKCookieConsent?.hasAnalyticsConsent()) {
          window.dataLayer.push({
            event: 'quote_form_submit',
            product_type: form.elements.namedItem('product')?.value || '',
            page_path: window.location.pathname
          });
        }

        window.location.assign('/bedankt/');
      } catch (error) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'Er ging iets mis. Probeer het later opnieuw of stuur een e-mail.';
        status.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  });

  const contactTopicSelect = document.querySelector('[data-contact-topic-select]');
  document.querySelectorAll('[data-contact-topic-link]').forEach((link) => {
    link.addEventListener('click', () => {
      if (!contactTopicSelect) return;
      contactTopicSelect.value = link.dataset.contactTopicLink || '';
    });
  });

  document.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
    const galleryStage = gallery.querySelector('[data-gallery-stage], .mkb-gallery-stage');
    const thumbnailStrip = gallery.querySelector('[data-gallery-thumbs], .mkb-gallery-thumbs');
    const mainImage = gallery.querySelector('[data-gallery-main]');
    const thumbnails = Array.from(gallery.querySelectorAll('[data-gallery-thumb]'));
    const previousButton = gallery.querySelector('[data-gallery-prev]');
    const nextButton = gallery.querySelector('[data-gallery-next]');
    const openButton = gallery.querySelector('[data-gallery-open]');
    const dialog = gallery.querySelector('[data-gallery-dialog]');
    const dialogImage = gallery.querySelector('[data-gallery-dialog-image]');
    const closeButton = gallery.querySelector('[data-gallery-close]');

    if (!mainImage || !thumbnails.length) return;

    const defaultImageSizes = mainImage.sizes;
    let activeIndex = Math.max(0, thumbnails.findIndex((thumbnail) => thumbnail.getAttribute('aria-pressed') === 'true'));
    let touchStartX = null;
    let openedWithPointer = false;
    let automaticRevealCancelled = false;

    const selectImage = (index, moveThumbnail = true) => {
      activeIndex = (index + thumbnails.length) % thumbnails.length;
      const selected = thumbnails[activeIndex];

      mainImage.srcset = selected.dataset.srcset || '';
      mainImage.sizes = selected.dataset.sizes || defaultImageSizes;
      mainImage.src = selected.dataset.src;
      mainImage.alt = selected.dataset.alt || '';

      thumbnails.forEach((thumbnail, thumbnailIndex) => {
        thumbnail.setAttribute('aria-pressed', String(thumbnailIndex === activeIndex));
      });

      if (moveThumbnail && thumbnailStrip) {
        const targetLeft = selected.offsetLeft - ((thumbnailStrip.clientWidth - selected.clientWidth) / 2);
        thumbnailStrip.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      }
    };

    thumbnails.forEach((thumbnail, index) => {
      thumbnail.addEventListener('click', () => selectImage(index));

      const preloadImage = () => {
        const image = new Image();
        image.srcset = thumbnail.dataset.srcset || '';
        image.sizes = thumbnail.dataset.sizes || defaultImageSizes;
        image.src = thumbnail.dataset.src;
      };

      thumbnail.addEventListener('pointerenter', preloadImage, { once: true });
      thumbnail.addEventListener('focus', preloadImage, { once: true });
    });

    previousButton?.addEventListener('click', () => selectImage(activeIndex - 1));
    nextButton?.addEventListener('click', () => selectImage(activeIndex + 1));

    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectImage(activeIndex - 1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectImage(activeIndex + 1);
      }
    });

    galleryStage?.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });

    galleryStage?.addEventListener('touchend', (event) => {
      if (touchStartX === null) return;
      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const distance = touchEndX - touchStartX;
      touchStartX = null;

      if (Math.abs(distance) < 45) return;
      selectImage(activeIndex + (distance < 0 ? 1 : -1));
    }, { passive: true });

    openButton?.addEventListener('pointerdown', () => {
      openedWithPointer = true;
    }, { passive: true });

    openButton?.addEventListener('keydown', () => {
      openedWithPointer = false;
    });

    openButton?.addEventListener('click', () => {
      if (!dialog || !dialogImage || typeof dialog.showModal !== 'function') return;
      dialogImage.src = thumbnails[activeIndex]?.dataset.fullSrc || mainImage.currentSrc || mainImage.src;
      dialogImage.alt = mainImage.alt;
      dialog.showModal();
    });

    closeButton?.addEventListener('click', () => dialog?.close());
    dialog?.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    dialog?.addEventListener('close', () => {
      if (!openedWithPointer) return;
      window.requestAnimationFrame(() => openButton?.blur());
    });

    const revealIndex = Number.parseInt(gallery.dataset.galleryRevealIndex || '', 10);
    const revealDelay = Number.parseInt(gallery.dataset.galleryRevealDelay || '1000', 10);

    if (Number.isInteger(revealIndex) && thumbnails[revealIndex] && revealIndex !== activeIndex) {
      const revealThumbnail = thumbnails[revealIndex];
      const preload = new Image();
      preload.srcset = revealThumbnail.dataset.srcset || '';
      preload.sizes = revealThumbnail.dataset.sizes || defaultImageSizes;

      const imageReady = new Promise((resolve) => {
        preload.addEventListener('load', () => resolve(true), { once: true });
        preload.addEventListener('error', () => resolve(false), { once: true });
      });

      preload.src = revealThumbnail.dataset.src;

      const cancelAutomaticReveal = () => {
        automaticRevealCancelled = true;
      };

      gallery.addEventListener('pointerdown', cancelAutomaticReveal, { once: true, passive: true });
      gallery.addEventListener('keydown', cancelAutomaticReveal, { once: true });

      const scheduleReveal = () => {
        window.setTimeout(async () => {
          const loaded = preload.complete && preload.naturalWidth > 0
            ? true
            : await imageReady;

          if (!loaded || automaticRevealCancelled) return;
          selectImage(revealIndex);
        }, Number.isFinite(revealDelay) ? Math.max(0, revealDelay) : 1000);
      };

      if (document.readyState === 'complete') {
        scheduleReveal();
      } else {
        window.addEventListener('load', scheduleReveal, { once: true });
      }
    }
  });

  document.querySelectorAll('[data-counter]').forEach((counter) => {
    const target = Number(counter.dataset.target);
    const suffix = counter.dataset.suffix || '';
    const finalValue = `${target}${suffix}`;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (!Number.isFinite(target) || reduceMotion || !('IntersectionObserver' in window)) {
      counter.textContent = finalValue;
      return;
    }

    counter.textContent = `0${suffix}`;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;

      const startTime = performance.now();
      const duration = 2200;

      const updateCounter = (currentTime) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        counter.textContent = `${Math.floor(target * easedProgress)}${suffix}`;

        if (progress < 1) {
          window.requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = finalValue;
        }
      };

      window.requestAnimationFrame(updateCounter);
      observer.disconnect();
    }, { threshold: 0.35 });

    observer.observe(counter);
  });
})();
