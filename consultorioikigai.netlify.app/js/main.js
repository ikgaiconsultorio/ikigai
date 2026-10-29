// Menu mobile
document.addEventListener('DOMContentLoaded', function () {
  // Identifica a página para que cada seção possa receber uma composição própria.
  var page = window.location.pathname.split('/').pop().replace('.html', '') || 'index';
  document.body.classList.add('page-' + page);

  // Indicador discreto de leitura nas páginas longas.
  var progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);
  function updateScrollProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    progress.style.width = (ratio * 100) + '%';
  }
  updateScrollProgress();
  window.addEventListener('scroll', updateScrollProgress, { passive: true });

  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
      document.body.classList.toggle('menu-open', toggle.classList.contains('open'));
      var expanded = toggle.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded);
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        toggle.classList.remove('open');
        links.classList.remove('open');
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Frases-chave acompanham a direção da leitura e voltam a repousar ao sair da tela.
  var scrollFocus = document.querySelectorAll('.home-hero h1, .quote-band p:first-child, body:not(.page-index) main > section:first-child h1');
  if ('IntersectionObserver' in window && scrollFocus.length && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var focusObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-active', entry.isIntersecting);
      });
    }, { threshold: 0.38 });
    scrollFocus.forEach(function (el) {
      el.classList.add('scroll-focus');
      focusObserver.observe(el);
    });
  }

  // Revelação suave ao rolar a página
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Profundidade sutil no diagrama da capa, respeitando preferências de movimento.
  var hero = document.querySelector('.home-hero');
  var motif = hero && hero.querySelector('.circle-motif');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hero && motif && !reducedMotion) {
    window.addEventListener('scroll', function () {
      var offset = Math.min(window.scrollY * 0.045, 28);
      motif.style.transform = 'translateY(' + offset + 'px) rotate(' + (offset * 0.16) + 'deg)';
    }, { passive: true });
  }
});

/* ====================================================================
   MODAL DE AVALIAÇÃO / FEEDBACK (CYNTIA)
   - Disparo inicial: 45s de permanência contínua no site (corrido entre páginas)
   - Reabertura ao fechar: após 1.5 min (90s)
   - Não zera ao navegar entre páginas
   - Reinicia a cada nova abertura do site
   - Validação obrigatória: nota de 0 a 10 e gorjeta (mínimo R$ 0,00)
   ==================================================================== */
(function () {
  var SESSION_KEY = 'ikigai_feedback_session';
  var HEARTBEAT_KEY = 'ikigai_site_heartbeat';
  var EVAL_DATA_KEY = 'ikigai_cyntia_avaliacao';
  var TARGET_PHONE = '558596394502'; // +55 85 9639-4502

  var INITIAL_DELAY_MS = 45 * 1000;  // 45 segundos
  var REOPEN_DELAY_MS = 90 * 1000;   // 1.5 minutos = 90 segundos
  var NEW_SESSION_GAP_MS = 12 * 1000; // 12s de ausência indica novo acesso

  var selectedRating = null;
  var tickerTimer = null;
  var state = null;

  function loadState() {
    var now = Date.now();
    var sessionStr = null;
    var localStr = null;
    var lastHeartbeat = 0;

    try {
      sessionStr = sessionStorage.getItem(SESSION_KEY);
      localStr = localStorage.getItem(SESSION_KEY);
      lastHeartbeat = parseInt(localStorage.getItem(HEARTBEAT_KEY) || '0', 10);
    } catch (e) {}

    var loaded = null;

    if (sessionStr) {
      try {
        loaded = JSON.parse(sessionStr);
      } catch (e) {
        loaded = null;
      }
    }

    // Se sessionStorage estiver vazio (ex: file:// isolado), mas heartbeat for recente (< 12s),
    // reconhece como continuação da mesma sessão de navegação entre páginas.
    if (!loaded && localStr && (now - lastHeartbeat < NEW_SESSION_GAP_MS)) {
      try {
        loaded = JSON.parse(localStr);
      } catch (e) {
        loaded = null;
      }
    }

    // Se for uma abertura do site nova / do zero:
    if (!loaded) {
      loaded = {
        sessionId: 'session_' + now + '_' + Math.floor(Math.random() * 100000),
        sessionStart: now,
        targetTime: now + INITIAL_DELAY_MS,
        status: 'pending_initial' // 'pending_initial' | 'open' | 'pending_repeat' | 'submitted'
      };
      saveState(loaded);
    }

    return loaded;
  }

  function saveState(s) {
    state = s;
    try {
      var str = JSON.stringify(s);
      sessionStorage.setItem(SESSION_KEY, str);
      localStorage.setItem(SESSION_KEY, str);
      localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
    } catch (e) {}
  }

  function sendHeartbeat() {
    try {
      localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
    } catch (e) {}
  }

  function formatBRL(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    var num = parseInt(digits, 10);
    if (isNaN(num)) return '';
    var cents = (num / 100).toFixed(2);
    var parts = cents.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + parts[0] + ',' + parts[1];
  }

  function createModalDOM() {
    if (document.getElementById('ikigaiFeedbackModal')) {
      return;
    }

    var backdrop = document.createElement('div');
    backdrop.id = 'ikigaiFeedbackModal';
    backdrop.className = 'ikigai-modal-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-labelledby', 'ikigaiModalTitle');

    backdrop.innerHTML = [
      '<div class="ikigai-modal-box">',
      '  <button type="button" class="ikigai-modal-close" id="ikigaiModalClose" aria-label="Fechar">&times;</button>',
      '  <div id="ikigaiModalFormContainer">',
      '    <h3 class="ikigai-modal-title" id="ikigaiModalTitle">Cyntia, torcemos que tenha a agradado.</h3>',
      '    <p class="ikigai-modal-subtitle">por gentileza, avalie nosso serviço</p>',
      '    <div class="ikigai-rating-section">',
      '      <div class="ikigai-rating-grid" id="ikigaiRatingGrid">',
      '        <button type="button" class="ikigai-rating-btn" data-value="0">0</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="1">1</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="2">2</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="3">3</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="4">4</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="5">5</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="6">6</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="7">7</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="8">8</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="9">9</button>',
      '        <button type="button" class="ikigai-rating-btn" data-value="10">10</button>',
      '      </div>',
      '      <div class="ikigai-error-msg" id="ikigaiRatingError" style="display:none;">Por gentileza, avalie selecionando uma nota de 0 a 10.</div>',
      '    </div>',
      '    <div class="ikigai-tip-section">',
      '      <p class="ikigai-tip-intro">esse site foi feito com carinho, deixar uma gorgeta para nosso time.</p>',
      '      <input type="text" id="ikigaiTipInput" class="ikigai-tip-input" placeholder="exemplo: R$ 100,00" inputmode="numeric" autocomplete="off" />',
      '      <div class="ikigai-error-msg" id="ikigaiTipError" style="display:none;">Por gentileza, informe um valor de gorjeta (nem que seja R$ 0,00).</div>',
      '    </div>',
      '    <p class="ikigai-confirm-text">para confirmar que está tudo ok com o site pressione o botão abaixo</p>',
      '    <button type="button" class="ikigai-submit-btn" id="ikigaiSubmitBtn">Continuar</button>',
      '  </div>',
      '  <div id="ikigaiModalSuccess" class="ikigai-modal-success" style="display:none;">',
      '    <div class="ikigai-success-icon">✓</div>',
      '    <h4>Muito obrigado, Cyntia!</h4>',
      '    <p>Sua avaliação e confirmação foram registradas com sucesso.</p>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(backdrop);
    bindModalEvents();
  }

  function bindModalEvents() {
    var backdrop = document.getElementById('ikigaiFeedbackModal');
    var closeBtn = document.getElementById('ikigaiModalClose');
    var ratingGrid = document.getElementById('ikigaiRatingGrid');
    var tipInput = document.getElementById('ikigaiTipInput');
    var submitBtn = document.getElementById('ikigaiSubmitBtn');
    var ratingError = document.getElementById('ikigaiRatingError');
    var tipError = document.getElementById('ikigaiTipError');

    // Seleção de nota 0 a 10
    var ratingBtns = ratingGrid.querySelectorAll('.ikigai-rating-btn');
    ratingBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        ratingBtns.forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        selectedRating = parseInt(btn.getAttribute('data-value'), 10);
        ratingError.style.display = 'none';
        ratingGrid.classList.remove('ikigai-input-error');
      });
    });

    // Formatação de moeda no campo de gorjeta (Real BR)
    tipInput.addEventListener('input', function () {
      var formatted = formatBRL(this.value);
      this.value = formatted;
      tipError.style.display = 'none';
      this.classList.remove('ikigai-input-error');
    });

    tipInput.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        var digits = this.value.replace(/\D/g, '');
        if (digits.length <= 1) {
          this.value = '';
          e.preventDefault();
          tipError.style.display = 'none';
          this.classList.remove('ikigai-input-error');
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitBtn.click();
      }
    });

    // Fechar pelo botão X
    closeBtn.addEventListener('click', function () {
      closeModal(false);
    });

    // Fechar ao clicar fora (backdrop)
    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) {
        closeModal(false);
      }
    });

    // Fechar com a tecla Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var bd = document.getElementById('ikigaiFeedbackModal');
        if (bd && bd.classList.contains('is-open')) {
          closeModal(false);
        }
      }
    });

    // Submissão pelo botão Continuar
    submitBtn.addEventListener('click', function () {
      var hasRating = (selectedRating !== null && selectedRating !== undefined);
      var tipVal = (tipInput.value || '').trim();
      var hasTip = (tipVal.length > 0);

      var isValid = true;

      if (!hasRating) {
        ratingError.style.display = 'block';
        ratingGrid.classList.add('ikigai-input-error');
        isValid = false;
      } else {
        ratingError.style.display = 'none';
        ratingGrid.classList.remove('ikigai-input-error');
      }

      if (!hasTip) {
        tipError.style.display = 'block';
        tipInput.classList.add('ikigai-input-error');
        if (isValid) tipInput.focus();
        isValid = false;
      } else {
        tipError.style.display = 'none';
        tipInput.classList.remove('ikigai-input-error');
      }

      if (!isValid) return;

      // Persiste avaliação
      var dataObj = {
        nota: selectedRating,
        gorjeta: tipVal,
        data: new Date().toISOString()
      };

      try {
        localStorage.setItem(EVAL_DATA_KEY, JSON.stringify(dataObj));
      } catch (e) {}

      // Envia os dados para o WhatsApp (+55 85 9639-4502)
      var message = 'Olá! Segue a avaliação e confirmação do site:\n\n' +
        '• Avaliação do serviço: ' + selectedRating + '/10\n' +
        '• Gorjeta para o time: ' + tipVal + '\n' +
        '• Confirmação: Tudo ok com o site!';

      var waUrl = 'https://wa.me/' + TARGET_PHONE + '?text=' + encodeURIComponent(message);

      try {
        window.open(waUrl, '_blank');
      } catch (e) {
        window.location.href = waUrl;
      }

      // Exibe tela de confirmação
      var formContainer = document.getElementById('ikigaiModalFormContainer');
      var successContainer = document.getElementById('ikigaiModalSuccess');
      if (formContainer) formContainer.style.display = 'none';
      if (successContainer) successContainer.style.display = 'block';

      setTimeout(function () {
        closeModal(true);
      }, 1600);
    });
  }

  function openModal() {
    createModalDOM();
    var modalEl = document.getElementById('ikigaiFeedbackModal');
    if (modalEl) {
      modalEl.classList.add('is-open');
      modalEl.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    state.status = 'open';
    saveState(state);
  }

  function closeModal(isSubmit) {
    var modalEl = document.getElementById('ikigaiFeedbackModal');
    if (modalEl) {
      modalEl.classList.remove('is-open');
      modalEl.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    if (isSubmit) {
      state.status = 'submitted';
      saveState(state);
      if (tickerTimer) clearInterval(tickerTimer);
    } else {
      // Se fechou sem submeter: reabre após 1.5 minutos (90 segundos)
      state.status = 'pending_repeat';
      state.targetTime = Date.now() + REOPEN_DELAY_MS;
      saveState(state);
      startTicker();
    }
  }

  function startTicker() {
    if (tickerTimer) clearInterval(tickerTimer);

    tickerTimer = setInterval(function () {
      sendHeartbeat();
      var now = Date.now();

      if (state.status === 'open' || state.status === 'submitted') {
        return;
      }

      if (now >= state.targetTime) {
        clearInterval(tickerTimer);
        openModal();
      }
    }, 500);
  }

  function init() {
    state = loadState();
    createModalDOM();

    // Heartbeat contínuo
    sendHeartbeat();
    setInterval(sendHeartbeat, 1000);
    window.addEventListener('beforeunload', sendHeartbeat);
    window.addEventListener('pagehide', sendHeartbeat);

    if (state.status === 'open') {
      openModal();
    } else if (state.status === 'pending_initial' || state.status === 'pending_repeat') {
      if (Date.now() >= state.targetTime) {
        openModal();
      } else {
        startTicker();
      }
    }

    // Ferramentas auxiliares no console (para testes rápidos pelo desenvolvedor)
    window.__ikigaiModal = {
      open: openModal,
      close: function () { closeModal(false); },
      reset: function () {
        try {
          sessionStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(HEARTBEAT_KEY);
        } catch (e) {}
        location.reload();
      },
      triggerIn: function (seconds) {
        state.targetTime = Date.now() + (seconds * 1000);
        state.status = 'pending_initial';
        saveState(state);
        startTicker();
        console.log('[Ikigai Modal] Disparo agendado para daqui a ' + seconds + ' segundos.');
      },
      getStatus: function () {
        var remaining = Math.max(0, Math.round((state.targetTime - Date.now()) / 1000));
        return {
          status: state.status,
          targetTime: new Date(state.targetTime).toLocaleTimeString(),
          segundosRestantes: remaining,
          notaSelecionada: selectedRating
        };
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
