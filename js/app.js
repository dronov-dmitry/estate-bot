(function () {
  'use strict';

  var SUPPORTED = ['en', 'ru', 'de', 'fr', 'es', 'bg', 'hu', 'sr'];

  function detectLang() {
    var params = new URLSearchParams(window.location.search);
    var urlLang = params.get('lang');
    if (urlLang && SUPPORTED.includes(urlLang)) return urlLang;
    var ls = localStorage.getItem('estatebot_lang_set');
    if (ls) {
      var s = localStorage.getItem('estatebot_lang');
      if (s && SUPPORTED.includes(s)) return s;
    }
    var c = getCookie('estatebot_lang');
    if (c && SUPPORTED.includes(c)) return c;
    var bl = (navigator.languages || [navigator.language]).map(function(l){ return l.slice(0,2); });
    for (var i = 0; i < bl.length; i++) { if (SUPPORTED.includes(bl[i])) return bl[i]; }
    return 'en';
  }
  function getCookie(name) {
    var v = '; ' + document.cookie;
    var parts = v.split('; ' + name + '=');
    if (parts.length < 2) return null;
    return decodeURIComponent(parts.pop().split(';').shift());
  }
  function setLang(lang, explicit) {
    if (!SUPPORTED.includes(lang)) lang = 'en';
    if (explicit) {
      var url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      window.history.replaceState(null, '', url);
    }
    document.documentElement.setAttribute('data-lang', lang);
    if (explicit) {
      localStorage.setItem('estatebot_lang', lang);
      localStorage.setItem('estatebot_lang_set', '1');
      var d = new Date(); d.setDate(d.getDate() + 365);
      document.cookie = 'estatebot_lang=' + lang + '; expires=' + d.toUTCString() + '; path=/';
    }
    applyTranslations(lang);
    updateLangBtn(lang);
    updateLangAria(lang);
    langActive = lang;
  }
  function applyTranslations(lang) {
    var t = i18n[lang] || i18n.en;
    var s = typeof SETTINGS !== 'undefined' ? SETTINGS : {};
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      if (t[key]) {
        var text = t[key].replace(/\{(\w+)\}/g, function(m, name) {
          return s[name] !== undefined ? s[name] : m;
        });
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = text;
        else el.innerHTML = text;
      }
    });
    document.documentElement.lang = lang;
  }
  function updateLangBtn(lang) {
    var btn = document.getElementById('currentLang');
    if (btn) btn.textContent = lang.toUpperCase();
    var langToggle = document.getElementById('langBtn');
    if (langToggle) langToggle.dataset.current = lang;
  }

  window.i18n = typeof i18n !== 'undefined' ? i18n : {};

  // Lang switcher
  var langBtn = document.getElementById('langBtn');
  var langDropdown = document.getElementById('langDropdown');
  var langOptions = langDropdown ? langDropdown.querySelectorAll('[role="option"]') : [];
  var langOpen = false;

  function updateLangAria(selected) {
    langOptions.forEach(function(opt) {
      opt.setAttribute('aria-selected', opt.getAttribute('data-lang') === selected ? 'true' : 'false');
    });
    if (langBtn) langBtn.setAttribute('aria-expanded', langOpen ? 'true' : 'false');
  }

  if (langBtn) {
    langBtn.addEventListener('click', function(e){
      e.stopPropagation();
      langOpen = !langOpen;
      langDropdown.classList.toggle('open', langOpen);
      updateLangAria(langOpen ? document.documentElement.getAttribute('data-lang') : langBtn.dataset.current || 'en');
    });
  }
  document.addEventListener('click', function(){
    if (langOpen) {
      langOpen = false;
      langDropdown.classList.remove('open');
      updateLangAria(langBtn ? langBtn.dataset.current || 'en' : 'en');
    }
  });
  if (langDropdown) {
    langDropdown.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        setLang(btn.getAttribute('data-lang'), true);
        langOpen = false;
        langDropdown.classList.remove('open');
      });
    });
  }

  // Mobile hamburger
  var hamburger = document.getElementById('hamburger');
  var navLinks = document.getElementById('navLinks');
  if (hamburger) {
    hamburger.addEventListener('click', function(){
      navLinks.classList.toggle('open');
      var spans = hamburger.querySelectorAll('span');
      if (navLinks.classList.contains('open')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px,5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px,-5px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        if (navLinks.classList.contains('open')) {
          navLinks.classList.remove('open');
          hamburger.querySelectorAll('span').forEach(function(s){ s.style.transform=''; s.style.opacity=''; });
        }
      });
    });
  }

  // FAQ accordion
  function setupFaq() {
    document.querySelectorAll('.faq-question').forEach(function(btn){
      btn.addEventListener('click', function(){
        var item = btn.parentElement;
        var isOpen = item.classList.contains('open');
        // close all
        document.querySelectorAll('.faq-item.open').forEach(function(el){ el.classList.remove('open'); });
        if (!isOpen) item.classList.add('open');
      });
    });
  }

  // Scroll animations (IntersectionObserver)
  function setupScrollAnimations() {
    var els = document.querySelectorAll('.fade-in-up, .feature-card, .step-card, .pricing-card, .country-card, .keyword-card, .faq-item');
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function(el){ observer.observe(el); });
  }

  // Loader
  function hideLoader() {
    var loader = document.getElementById('loader');
    if (!loader) return;
    function doHide() { loader.classList.add('hidden'); }
    window.addEventListener('load', function(){ setTimeout(doHide, 200); }, { once: true });
    // Aggressive fallback — never block on mobile regardless of external resources
    setTimeout(doHide, 800);
  }

  // Service Worker
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('js/sw.js').catch(function(){});
  }

  // Apply settings from settings.js (now deferred — runs after body parsed)
  function applySettings() {
    var s = typeof SETTINGS !== 'undefined' ? SETTINGS : {};
    if (s.BOT_LINK) {
      document.querySelectorAll('[data-bot-link]').forEach(function(el){
        el.href = s.BOT_LINK;
      });
    }
    if (s.PREMIUM_PRICE_EUR) {
      document.querySelectorAll('[data-premium-price]').forEach(function(el){
        el.textContent = '\u20AC' + s.PREMIUM_PRICE_EUR;
      });
    }
  }

  // Init
  document.addEventListener('DOMContentLoaded', function(){
    // hideLoader first — must run even if other init steps throw
    hideLoader();
    try { applySettings(); } catch(e) { console.warn('applySettings error', e); }
    try {
      var lang = detectLang();
      setLang(lang, false);
    } catch(e) { console.warn('i18n error', e); }
    try { setupFaq(); } catch(e) {}
    try { setupScrollAnimations(); } catch(e) {}
    try { registerSW(); } catch(e) {}
  });
})();
