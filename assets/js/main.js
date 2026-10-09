// Conjuntura Crítica — interações do site (sem dependências)
(function () {
  // Menu mobile em tela cheia
  var openBtn = document.querySelector('.site-header .menu-btn');
  var menu = document.getElementById('menu-mobile');
  if (openBtn && menu) {
    var closeBtn = menu.querySelector('[data-close]');
    var open = function () {
      menu.hidden = false; openBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden'; closeBtn.focus();
    };
    var close = function () {
      menu.hidden = true; openBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = ''; openBtn.focus();
    };
    openBtn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) close(); });
  }

  // Item de menu ativo
  var section = document.body.getAttribute('data-section');
  if (section) {
    document.querySelectorAll('[data-nav="' + section + '"]').forEach(function (a) { a.setAttribute('aria-current', 'page'); });
  }

  // Contador regressivo (segundo turno: 25/10/2026, 8h, horário de Brasília)
  var cd = document.querySelector('[data-countdown]');
  if (cd) {
    var target = new Date(cd.getAttribute('data-countdown')).getTime();
    var set = function (k, v) { var el = cd.querySelector('[data-' + k + ']'); if (el) el.textContent = v; };
    var tick = function () {
      var diff = Math.max(0, target - Date.now());
      set('d', Math.floor(diff / 864e5));
      set('h', Math.floor(diff / 36e5) % 24);
      set('m', Math.floor(diff / 6e4) % 60);
    };
    tick(); setInterval(tick, 30000);
  }

  // Compartilhar: Web Share API no celular, WhatsApp como padrão
  document.querySelectorAll('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url') || location.href, title = btn.getAttribute('data-title') || document.title;
      var kind = btn.getAttribute('data-share');
      if (kind === 'auto') kind = navigator.share ? 'native' : 'whatsapp';
      if (kind === 'native' && navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
      if (kind === 'copy') {
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
          var t = btn.textContent; btn.textContent = 'Link copiado'; setTimeout(function () { btn.textContent = t; }, 2000);
        }).catch(function () { prompt('Copie o link:', url); });
        return;
      }
      window.open('https://wa.me/?text=' + encodeURIComponent(title + ' ' + url), '_blank', 'noopener');
    });
  });
  if (!navigator.share) document.querySelectorAll('[data-share="native"]').forEach(function (b) { b.hidden = true; });

  // Filtros de lista (Dados, Análises, Materiais). Aceita #tema na URL (ex.: dados/index.html#renda).
  document.querySelectorAll('[data-filters]').forEach(function (group) {
    var target = document.querySelector(group.getAttribute('data-filters'));
    var apply = function (b) {
      group.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      var tag = b.getAttribute('data-tag');
      target.querySelectorAll('[data-tags]').forEach(function (item) {
        item.hidden = tag !== 'todos' && item.getAttribute('data-tags').split(' ').indexOf(tag) === -1;
      });
    };
    group.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) apply(b); });
    var fromHash = location.hash && group.querySelector('[data-tag="' + location.hash.slice(1) + '"]');
    if (fromHash) apply(fromHash);
  });

  // Slide manual da home: setas, bolinhas, teclado e arrastar (scroll-snap nativo)
  document.querySelectorAll('[data-slider]').forEach(function (slider) {
    var track = slider.querySelector('.slider__track');
    var slides = [].slice.call(track.children);
    var prev = slider.querySelector('[data-prev]'), next = slider.querySelector('[data-next]');
    var dots = slider.querySelector('.slider__dots'), count = slider.querySelector('.slider__count');
    var current = 0;
    slides.forEach(function (s, i) {
      s.setAttribute('aria-label', (i + 1) + ' de ' + slides.length);
      var d = document.createElement('button');
      d.type = 'button'; d.setAttribute('aria-label', 'Ir para o slide ' + (i + 1));
      d.addEventListener('click', function () { go(i); });
      dots.appendChild(d);
    });
    var go = function (i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      target = i;
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    var update = function () {
      var i = Math.round(track.scrollLeft / track.clientWidth);
      if (i === current && dots.children[i].hasAttribute('aria-current')) return;
      current = i;
      [].forEach.call(dots.children, function (d, k) { if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      slides.forEach(function (s, k) {
        s.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        s.querySelectorAll('a, button').forEach(function (el) { el.tabIndex = k === i ? 0 : -1; });
      });
      count.textContent = (i + 1) + ' / ' + slides.length;
      prev.disabled = i === 0; next.disabled = i === slides.length - 1;
    };
    var target = 0; // destino do último clique, para cliques seguidos durante a animação
    prev.addEventListener('click', function () { go(target - 1); });
    next.addEventListener('click', function () { go(target + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(target + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(target - 1); }
    });
    var t; track.addEventListener('scroll', function () {
      clearTimeout(t); t = setTimeout(function () { update(); target = current; }, 80);
    }, { passive: true });
    window.addEventListener('resize', function () { go(current); });
    update();
  });

  // Contador da campanha do 2º turno (dias, horas, minutos e andamento)
  document.querySelectorAll('[data-campanha]').forEach(function (el) {
    var ini = new Date(el.getAttribute('data-inicio')).getTime();
    var fim = new Date(el.getAttribute('data-fim')).getTime();
    var q = function (s) { return el.querySelector(s); };
    var tick = function () {
      var now = Date.now(), diff = Math.max(0, fim - now);
      q('[data-d]').textContent = Math.floor(diff / 864e5);
      q('[data-h]').textContent = Math.floor(diff / 36e5) % 24;
      q('[data-m]').textContent = String(Math.floor(diff / 6e4) % 60).padStart(2, '0');
      var dia = Math.min(21, Math.max(1, Math.floor((now - ini) / 864e5) + 1));
      q('[data-dia]').textContent = diff === 0 ? 'Dia da votação' : 'Dia ' + dia + ' de 21';
      var pct = Math.round(Math.min(1, Math.max(0, (now - ini) / (fim - ini))) * 100);
      q('[data-progress]').style.width = pct + '%';
      q('.progress').setAttribute('aria-valuenow', pct);
    };
    tick(); setInterval(tick, 30000);
  });

  // Atos: some com os que já passaram (o build marca, isto confere no dia)
  var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  document.querySelectorAll('[data-proximos] .evento').forEach(function (ev) {
    if (new Date(ev.getAttribute('data-date') + 'T23:59:59') < hoje) ev.hidden = true;
  });

  // Atos: etiqueta "Hoje", "Amanhã" ou "Em N dias"
  document.querySelectorAll('.evento').forEach(function (ev) {
    var tag = ev.querySelector('[data-quando]'); if (!tag) return;
    var diff = Math.round((new Date(ev.getAttribute('data-date') + 'T00:00:00') - hoje) / 864e5);
    var texto = diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : diff > 1 ? 'Em ' + diff + ' dias' : '';
    if (!texto) return;
    tag.textContent = texto; tag.hidden = false;
  });

  // Atos: card PNG 1080×1350 desenhado em canvas (mesmo layout da arte na página), WhatsApp e .ics
  var drawEventCard = function (arte) {
    var txt = function (s) { var el = arte.querySelector(s); return el ? el.textContent.trim() : ''; };
    var W = 1080, H = 1350, X = 120;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var g = cv.getContext('2d');
    var wrap = function (text, x, y, maxW, lh) {
      var words = text.split(' '), line = '';
      words.forEach(function (w) {
        var test = line ? line + ' ' + w : w;
        if (g.measureText(test).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = test;
      });
      g.fillText(line, x, y); return y + lh;
    };
    g.fillStyle = '#C23C1E'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6B1A0C'; g.fillRect(0, 0, 44, H);
    // chip do tipo
    g.font = '44px "Bebas Neue"'; var tipo = txt('.evento__topo .chip').toUpperCase();
    var cw = g.measureText(tipo).width + 56;
    g.fillStyle = '#A82C17'; g.beginPath(); g.roundRect(X, 100, cw, 64, 32); g.fill();
    g.fillStyle = '#FFF7EA'; g.fillText(tipo, X + 28, 148);
    // dia e mês
    var dia = arte.querySelector('.evento__dia').firstChild.textContent.trim();
    g.font = '440px "Bebas Neue"'; g.fillStyle = '#FFF7EA'; g.fillText(dia, X - 8, 560);
    var dw = g.measureText(dia).width;
    g.font = '140px "Bebas Neue"'; g.fillStyle = '#FFC85A'; g.fillText(txt('.evento__dia span'), X + dw + 24, 560);
    g.font = '64px "Bebas Neue"'; g.fillStyle = '#FFF7EA'; g.fillText(txt('.evento__semana').toUpperCase(), X, 660);
    // título e local
    g.font = '124px "Bebas Neue"'; var y = wrap(txt('.evento__titulo').toUpperCase(), X, 800, W - X - 100, 116);
    g.font = '44px Poppins'; wrap(txt('.evento__local'), X, y - 40, W - X - 100, 58);
    var logo = arte.querySelector('.evento__logo');
    return new Promise(function (ok) {
      var done = function () { g.drawImage(logo, X, H - 110 - 172, 450, 172); ok(cv); };
      if (logo.complete) done(); else logo.onload = done;
    });
  };
  var dataBR = function (iso) { var p = iso.split('-'); return p[2] + '/' + p[1]; };
  document.querySelectorAll('.evento__acoes').forEach(function (box) {
    var ev = box.closest('.evento');
    var d = box.dataset;
    var nome = 'conjuntura-critica-' + d.data + '-' + d.titulo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-evento]'); if (!b) return;
      var kind = b.getAttribute('data-evento');
      if (kind === 'whatsapp') {
        var txt = '*' + d.titulo + '*\n' + dataBR(d.data) + ', ' + d.hora.replace(':', 'h') + '\n' + d.local +
          (d.destaque ? '\n' + d.destaque : '') + '\n\n' +
          'Conjuntura Crítica · NEC/UFBA\n' + location.href.split('#')[0] + '#' + ev.id;
        window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener');
      }
      if (kind === 'ics') {
        var dt = function (h) { return d.data.replace(/-/g, '') + 'T' + h.replace(':', '') + '00'; };
        var fimH = d.fim || (String(Math.min(23, +d.hora.split(':')[0] + 2)).padStart(2, '0') + ':' + d.hora.split(':')[1]);
        var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Conjuntura Critica//PT-BR', 'BEGIN:VEVENT',
          'UID:' + ev.id + '@conjunturacritica', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
          'DTSTART;TZID=America/Bahia:' + dt(d.hora), 'DTEND;TZID=America/Bahia:' + dt(fimH),
          'SUMMARY:' + d.titulo, 'LOCATION:' + d.local, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = nome + '.ics'; a.click();
      }
      if (kind === 'png') {
        var label = b.textContent; b.textContent = 'Gerando…'; b.disabled = true;
        var arte = ev.querySelector('[data-arte]');
        var fonts = document.fonts ? Promise.all([document.fonts.load('440px "Bebas Neue"'), document.fonts.load('44px Poppins')]) : Promise.resolve();
        fonts.then(function () { return drawEventCard(arte); }).then(function (canvas) {
          var a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = nome + '.png'; a.click();
        }).catch(function () { alert('Não conseguimos gerar o card agora. Tente de novo ou tire um print da arte.'); })
          .then(function () { b.textContent = label; b.disabled = false; });
      }
    });
  });

  // Galeria com lightbox (<dialog>): setas, Esc e clique fora
  var lb = document.querySelector('.lightbox');
  if (lb) {
    var itens = [].slice.call(document.querySelectorAll('.galeria__item')), idx = 0;
    var show = function (i) {
      idx = (i + itens.length) % itens.length;
      lb.querySelector('img').src = itens[idx].dataset.full;
      lb.querySelector('img').alt = itens[idx].querySelector('img').alt;
      var d = itens[idx].dataset, cap = lb.querySelector('p');
      cap.textContent = d.legenda + (d.onde ? ' · ' + d.onde : '') + ' · Foto: ';
      if (d.link) { var a = document.createElement('a'); a.href = d.link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = d.credito; cap.appendChild(a); }
      else cap.appendChild(document.createTextNode(d.credito));
    };
    itens.forEach(function (it, i) { it.addEventListener('click', function () { show(i); lb.showModal(); }); });
    lb.querySelector('.lightbox__prev').addEventListener('click', function () { show(idx - 1); });
    lb.querySelector('.lightbox__next').addEventListener('click', function () { show(idx + 1); });
    lb.querySelector('.lightbox__close').addEventListener('click', function () { lb.close(); });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(idx + 1); if (e.key === 'ArrowLeft') show(idx - 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  }

  // Botão fixo "Entre no grupo" no celular, depois de rolar uma tela
  var sticky = document.querySelector('.sticky-cta');
  var footer = document.querySelector('.site-footer');
  // Barra de leitura em artigos
  if (document.querySelector('article .prose')) document.body.setAttribute('data-reading', '');
  var bar = document.body.hasAttribute('data-reading') && document.querySelector('.read-progress span');
  var onScroll = function () {
    if (sticky) {
      var nearEnd = footer && footer.getBoundingClientRect().top < innerHeight;
      sticky.classList.toggle('is-visible', scrollY > innerHeight * 0.9 && !nearEnd);
    }
    if (bar) {
      var art = document.querySelector('article');
      var r = art.getBoundingClientRect();
      bar.style.width = Math.min(100, Math.max(0, -r.top / (r.height - innerHeight) * 100)) + '%';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Formulários: validação em linha, foco no primeiro erro, confirmação com próximo passo.
  // Sem backend ainda: defina data-endpoint (ex.: Formspree, Google Apps Script) para enviar de verdade.
  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = null;
      form.querySelectorAll('[data-error-for]').forEach(function (p) { p.hidden = true; });
      form.querySelectorAll('[required]').forEach(function (f) {
        var bad = f.type === 'checkbox' ? !f.checked : !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
        var group = f.closest('[data-group]');
        if (group && f.type === 'checkbox' && group.querySelector('input:checked')) bad = false;
        var err = form.querySelector('[data-error-for="' + (group ? group.getAttribute('data-group') : f.name) + '"]');
        f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad) { if (err) err.hidden = false; if (!first) first = f; }
      });
      if (first) { first.focus(); return; }

      var done = function () {
        var ok = document.querySelector(form.getAttribute('data-success'));
        form.hidden = true; if (ok) { ok.hidden = false; ok.focus(); }
      };
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) { done(); return; }
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(); done(); })
        .catch(function () {
          var err = form.querySelector('[data-error-for="envio"]');
          if (err) { err.hidden = false; err.focus(); }
        });
    });
  });
})();
