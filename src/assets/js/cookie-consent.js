(() => {
  'use strict';

  const STORAGE_KEY = 'mk_cookie_consent_v1';
  const DISMISSED_KEY = 'mk_cookie_consent_dismissed';
  const config = window.MK_TRACKING_CONFIG || {};
  let analyticsLoaded = false;

  const readConsent = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return typeof value?.analytics === 'boolean' ? value : null;
    } catch {
      return null;
    }
  };

  const wasDismissed = () => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const hasAnalyticsConsent = () => readConsent()?.analytics !== false;

  const deleteCookie = (name) => {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
  };

  const clearAnalyticsCookies = () => {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (name === '_ga' || name.startsWith('_ga_') || name === '_clck' || name === '_clsk') {
        deleteCookie(name);
      }
    });
  };

  const updateGoogleConsent = (analytics) => {
    if (config.gaMeasurementId) {
      window[`ga-disable-${config.gaMeasurementId}`] = !analytics;
    }

    window.gtag?.('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  };

  const updateClarityConsent = (analytics) => {
    window.clarity?.('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: analytics ? 'granted' : 'denied'
    });
  };

  const loadGoogleAnalytics = () => {
    if (!config.gaMeasurementId || document.querySelector('[data-mk-ga4]')) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    updateGoogleConsent(true);
    window.gtag('js', new Date());
    window.gtag('config', config.gaMeasurementId, { allow_google_signals: false });

    const script = document.createElement('script');
    script.async = true;
    script.dataset.mkGa4 = 'true';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaMeasurementId)}`;
    document.head.appendChild(script);
  };

  const loadClarity = () => {
    if (!config.clarityProjectId || document.querySelector('[data-mk-clarity]')) return;

    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    updateClarityConsent(true);

    const script = document.createElement('script');
    script.async = true;
    script.dataset.mkClarity = 'true';
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(config.clarityProjectId)}`;
    document.head.appendChild(script);
  };

  const loadAnalytics = () => {
    if (analyticsLoaded) {
      updateGoogleConsent(true);
      updateClarityConsent(true);
      return;
    }
    analyticsLoaded = true;
    loadGoogleAnalytics();
    loadClarity();
  };

  const denyAnalytics = () => {
    updateGoogleConsent(false);
    updateClarityConsent(false);
    clearAnalyticsCookies();
  };

  const saveConsent = (analytics) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        analytics: Boolean(analytics),
        updatedAt: new Date().toISOString()
      }));
    } catch {
      /* The banner remains usable if storage is unavailable. */
    }

    if (analytics) loadAnalytics();
    else denyAnalytics();

    window.dispatchEvent(new CustomEvent('mk:consent-updated', {
      detail: { analytics: Boolean(analytics) }
    }));
  };

  window.MKCookieConsent = {
    hasAnalyticsConsent,
    hasConsentChoice: () => Boolean(readConsent()),
    wasDismissed,
    open: () => document.querySelector('[data-cookie-settings]')?.click()
  };

  if (hasAnalyticsConsent()) loadAnalytics();
  else denyAnalytics();

  document.addEventListener('DOMContentLoaded', () => {
    const consent = document.querySelector('[data-cookie-consent]');
    if (!consent) return;

    let showTimer;

    const forceLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      && new URLSearchParams(window.location.search).has('previewCookies');

    const open = () => {
      window.clearTimeout(showTimer);
      consent.hidden = false;
      document.body.classList.add('cookie-consent-open');
      window.dispatchEvent(new CustomEvent('mk:consent-opened'));
    };

    const close = () => {
      window.clearTimeout(showTimer);
      consent.hidden = true;
      document.body.classList.remove('cookie-consent-open');
    };

    const dismiss = () => {
      try {
        sessionStorage.setItem(DISMISSED_KEY, 'true');
      } catch {
        /* Closing remains possible if storage is unavailable. */
      }
      close();
      window.dispatchEvent(new CustomEvent('mk:consent-dismissed'));
    };

    consent.querySelector('[data-cookie-accept]')?.addEventListener('click', () => {
      saveConsent(true);
      close();
    });

    consent.querySelector('[data-cookie-reject]')?.addEventListener('click', () => {
      saveConsent(false);
      close();
    });

    consent.querySelector('[data-cookie-close]')?.addEventListener('click', dismiss);

    document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
      button.addEventListener('click', open);
    });

    if (forceLocalPreview) {
      showTimer = window.setTimeout(open, 250);
    } else if (!readConsent() && !wasDismissed()) {
      showTimer = window.setTimeout(open, 5 * 1000);
    }
  });
})();
