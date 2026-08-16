// PHẢN ỨNG. — content script
// Bôi đen (chọn) một tên nguyên tố, công thức phản ứng, hoặc thuật ngữ Vật lý/Sinh học
// trên bất kỳ trang web nào để hiện một biểu tượng nhỏ; bấm vào đó để mở phòng thí
// nghiệm ảo 3D tương ứng ngay trên trang, tương tự cách Google Dịch hiện bản dịch.
(function(){
  'use strict';

  // Trỏ thẳng về bản đã deploy trên Netlify — extension không đóng gói lab.html/
  // three.min.js cục bộ nữa, nên luôn dùng đúng phiên bản mới nhất, không lo thiếu file.
  var APP_URL = 'https://sfes-lab.netlify.app/';

  /* ---------------- Detection dictionaries ---------------- */

  // symbol/name (lowercase) -> official symbol, for the periodic-table deep link.
  var ELEMENT_LOOKUP = {};
  [
    ['H','Hiđro'],['He','Heli'],['Li','Liti'],['Be','Berili'],['B','Bo'],['C','Cacbon'],['N','Nitơ'],
    ['O','Oxi'],['F','Flo'],['Ne','Neon'],['Na','Natri'],['Mg','Magie'],['Al','Nhôm'],['Si','Silic'],
    ['P','Photpho'],['S','Lưu huỳnh'],['Cl','Clo'],['Ar','Agon'],['K','Kali'],['Ca','Canxi'],
    ['Sc','Scandi'],['Ti','Titan'],['V','Vanadi'],['Cr','Crom'],['Mn','Mangan'],['Fe','Sắt'],
    ['Co','Coban'],['Ni','Niken'],['Cu','Đồng'],['Zn','Kẽm'],['Ga','Gali'],['Ge','Germani'],
    ['As','Asen'],['Se','Selen'],['Br','Brom'],['Kr','Krypton'],['Rb','Rubidi'],['Sr','Stronti'],
    ['Y','Ytri'],['Zr','Zirconi'],['Nb','Niobi'],['Mo','Molypden'],['Ag','Bạc'],['Cd','Cadimi'],
    ['In','Indi'],['Sn','Thiếc'],['Sb','Antimon'],['Te','Telu'],['I','Iot'],['Xe','Xenon'],
    ['Cs','Xesi'],['Ba','Bari'],['Hf','Hafini'],['Ta','Tantan'],['W','Vonfram'],['Re','Rheni'],
    ['Os','Osmi'],['Ir','Iridi'],['Pt','Platin'],['Au','Vàng'],['Hg','Thuỷ ngân'],['Tl','Tali'],
    ['Pb','Chì'],['Bi','Bitmut'],['Po','Poloni'],['At','Astatin'],['Rn','Radon'],['Fr','Franxi'],
    ['Ra','Radi'],['U','Urani'],['Th','Thori']
  ].forEach(function(pair){
    ELEMENT_LOOKUP[pair[0].toLowerCase()] = pair[0];
    ELEMENT_LOOKUP[pair[1].normalize('NFC').toLowerCase()] = pair[0];
  });

  // metal + solution formula combos this lab can simulate (matches lab.html's REACTIONS table).
  var METALS = ['Zn','Fe','Mg','Cu'];
  var SOLUTIONS = ['HCl','H2SO4','NaOH'];
  var REACTION_COMBOS = [];
  METALS.forEach(function(m){
    SOLUTIONS.forEach(function(s){
      REACTION_COMBOS.push({ key:(m+'+'+s).toLowerCase(), metal:m, solution:s });
    });
  });
  var METAL_WORDS = {'kẽm':'Zn','sắt':'Fe','magie':'Mg','đồng':'Cu'};
  var SOLUTION_WORDS = {'axit clohidric':'HCl','axit clohydric':'HCl','hcl':'HCl','axit sunfuric':'H2SO4','h2so4':'H2SO4','natri hiđroxit':'NaOH','natri hidroxit':'NaOH','naoh':'NaOH'};

  var PHYS_KEYWORDS = ['mặt phẳng nghiêng','hệ số ma sát','lực ma sát','gia tốc trên mặt phẳng nghiêng'].map(function(s){return s.normalize('NFC');});
  var BIO_KEYWORDS = ['tế bào thực vật','tế bào động vật','bào quan','lục lạp','ti thể','nhân tế bào','thành tế bào','không bào trung tâm'].map(function(s){return s.normalize('NFC');});

  function normFormula(t){
    return t.toLowerCase().replace(/\s+/g,'').replace(/₂/g,'2').replace(/₃/g,'3').replace(/₄/g,'4');
  }

  // Detects Oxyz analytic-geometry equations (plane / sphere / line) matching the
  // parser in sfes-lab.html's "Phòng Toán học" — kept as a light heuristic here;
  // the lab page itself does the real parsing once the deep link opens.
  function normMath(t){
    return t.normalize('NFC').replace(/\s+/g,'').toLowerCase()
      .replace(/²/g,'^2').replace(/³/g,'^3').replace(/−/g,'-');
  }
  function isLikelyMathEquation(raw){
    var eq = normMath(raw);
    if(!eq || eq.length>90) return false;
    var varCount = (eq.indexOf('x')!==-1?1:0) + (eq.indexOf('y')!==-1?1:0) + (eq.indexOf('z')!==-1?1:0);
    if(varCount<2) return false;
    if(!/^[0-9xyzt+\-=.^()/;]+$/.test(eq)) return false;
    var eqCount = (eq.match(/=/g)||[]).length;
    if(eq.indexOf(';')!==-1){
      if(eq.indexOf('t')===-1) return false;
      var chunks = eq.split(';');
      if(chunks.length!==3) return false;
      return /^[xyz]=/.test(chunks[0]) && /^[xyz]=/.test(chunks[1]) && /^[xyz]=/.test(chunks[2]);
    }
    if(eqCount===2 && eq.indexOf('/')!==-1) return true; // symmetric line form
    if(eqCount===1) return true; // plane or sphere form
    return false;
  }

  function matchSelection(raw){
    var t = raw.trim();
    if(!t || t.length>70) return null;
    var tl = t.normalize('NFC').toLowerCase();

    if(ELEMENT_LOOKUP[tl]) return {type:'element', symbol:ELEMENT_LOOKUP[tl]};

    var norm = normFormula(t);
    for(var i=0;i<REACTION_COMBOS.length;i++){
      if(norm.indexOf(REACTION_COMBOS[i].key)!==-1){
        return {type:'chem', metal:REACTION_COMBOS[i].metal, solution:REACTION_COMBOS[i].solution};
      }
    }

    var foundMetal=null, foundSolution=null;
    Object.keys(METAL_WORDS).forEach(function(w){ if(tl.indexOf(w.normalize('NFC'))!==-1) foundMetal=METAL_WORDS[w]; });
    Object.keys(SOLUTION_WORDS).forEach(function(w){ if(tl.indexOf(w.normalize('NFC'))!==-1) foundSolution=SOLUTION_WORDS[w]; });
    if(foundMetal && foundSolution) return {type:'chem', metal:foundMetal, solution:foundSolution};
    if(foundMetal || foundSolution) return {type:'chem'};

    for(var p=0;p<PHYS_KEYWORDS.length;p++){ if(tl.indexOf(PHYS_KEYWORDS[p])!==-1) return {type:'phys'}; }
    for(var b=0;b<BIO_KEYWORDS.length;b++){
      if(tl.indexOf(BIO_KEYWORDS[b])!==-1){
        return {type:'bio', cell: tl.indexOf('động vật')!==-1 ? 'animal' : 'plant'};
      }
    }

    if(isLikelyMathEquation(t)) return {type:'math', eq:t};

    return null;
  }

  function buildUrl(match){
    var u = new URL(APP_URL);
    u.searchParams.set('embed','1');
    if(match.type==='element'){
      u.searchParams.set('element', match.symbol);
    } else if(match.type==='chem'){
      u.searchParams.set('room','chem');
      if(match.metal && match.solution){
        u.searchParams.set('metal', match.metal);
        u.searchParams.set('solution', match.solution);
      }
    } else if(match.type==='phys'){
      u.searchParams.set('room','phys');
    } else if(match.type==='bio'){
      u.searchParams.set('room','bio');
      u.searchParams.set('cell', match.cell||'plant');
    } else if(match.type==='math'){
      u.searchParams.set('room','math');
      u.searchParams.set('eq', match.eq);
    }
    return u.toString();
  }

  /* ---------------- Floating UI (Shadow DOM to avoid clashing with host page CSS) ---------------- */

  var hostEl=null, shadow=null, badgeEl=null, panelEl=null;
  var lastMatch=null, lastRect=null;

  function ensureHost(){
    if(hostEl) return;
    hostEl = document.createElement('div');
    hostEl.style.cssText = 'all:initial; position:absolute; top:0; left:0; z-index:2147483647;';
    document.documentElement.appendChild(hostEl);
    shadow = hostEl.attachShadow({mode:'open'});

    var style = document.createElement('style');
    style.textContent =
      '.rn-badge{position:absolute; width:34px; height:34px; border-radius:50%; border:none;' +
      ' background:#161D26; color:#49C6B9; box-shadow:0 4px 14px rgba(0,0,0,0.35), 0 0 0 1.5px #49C6B9;' +
      ' display:none; align-items:center; justify-content:center; cursor:pointer; font-size:16px;' +
      ' font-family:sans-serif; transition:transform 0.12s ease;}' +
      '.rn-badge:hover{transform:scale(1.08);}' +
      '.rn-panel{position:absolute; display:none; flex-direction:column; width:420px; max-width:92vw;' +
      ' background:#1D2733; border:1px solid rgba(255,255,255,0.1); border-radius:16px; overflow:hidden;' +
      ' box-shadow:0 24px 60px rgba(0,0,0,0.5); font-family:sans-serif;}' +
      '.rn-panel-head{display:flex; align-items:center; justify-content:space-between; padding:10px 14px;' +
      ' background:#232F3D; color:#F3F1EA; font-weight:700; font-size:13px; letter-spacing:0.02em;}' +
      '.rn-panel-close{background:transparent; border:none; color:#F3F1EA; opacity:0.7; font-size:15px;' +
      ' cursor:pointer; line-height:1; padding:4px;}' +
      '.rn-panel-close:hover{opacity:1;}' +
      '.rn-panel-body{background:#161D26;}' +
      '.rn-panel-body iframe{width:420px; max-width:92vw; height:600px; max-height:75vh; border:0; display:block;}';
    shadow.appendChild(style);

    badgeEl = document.createElement('button');
    badgeEl.type='button';
    badgeEl.className='rn-badge';
    badgeEl.title='Xem thí nghiệm 3D — PHẢN ỨNG.';
    badgeEl.textContent='⚗';
    badgeEl.addEventListener('mousedown', function(e){ e.preventDefault(); }); // keep text selection alive
    badgeEl.addEventListener('click', function(e){ e.preventDefault(); openPanel(); });
    shadow.appendChild(badgeEl);

    panelEl = document.createElement('div');
    panelEl.className='rn-panel';
    panelEl.innerHTML =
      '<div class="rn-panel-head"><span>PHẢN ỨNG. — Phòng thí nghiệm ảo</span>' +
      '<button type="button" class="rn-panel-close">✕</button></div>' +
      '<div class="rn-panel-body"></div>';
    panelEl.querySelector('.rn-panel-close').addEventListener('click', closePanel);
    shadow.appendChild(panelEl);
  }

  function hideBadge(){ if(badgeEl) badgeEl.style.display='none'; }
  function closePanel(){
    if(!panelEl) return;
    panelEl.style.display='none';
    panelEl.querySelector('.rn-panel-body').innerHTML='';
  }

  function showBadge(rect){
    ensureHost();
    badgeEl.style.top = (window.scrollY + rect.bottom + 6) + 'px';
    badgeEl.style.left = (window.scrollX + rect.right - 30) + 'px';
    badgeEl.style.display = 'flex';
  }

  function openPanel(){
    if(!lastMatch || !lastRect) return;
    var panelW = 420, panelH = 600;
    var top = window.scrollY + lastRect.bottom + 10;
    var left = window.scrollX + lastRect.left;
    var maxTop = window.scrollY + window.innerHeight - Math.min(panelH+20, window.innerHeight-20);
    var maxLeft = window.scrollX + window.innerWidth - panelW - 16;
    top = Math.max(window.scrollY+10, Math.min(top, maxTop));
    left = Math.max(window.scrollX+10, Math.min(left, maxLeft));
    panelEl.style.top = top+'px';
    panelEl.style.left = left+'px';
    var body = panelEl.querySelector('.rn-panel-body');
    var iframe = document.createElement('iframe');
    var src = buildUrl(lastMatch);
    console.debug('[PHẢN ỨNG] opening panel with match:', lastMatch, '→', src);
    iframe.src = src;
    body.innerHTML = '';
    body.appendChild(iframe);
    panelEl.style.display = 'flex';
    hideBadge();
  }

  function withinHost(e){
    return hostEl && e.composedPath && e.composedPath().indexOf(hostEl) !== -1;
  }

  document.addEventListener('mouseup', function(e){
    if(withinHost(e)) return;
    setTimeout(function(){
      var sel = window.getSelection();
      var text = sel && sel.toString();
      if(!text || !text.trim()){ hideBadge(); return; }
      var match = matchSelection(text);
      if(!match){ hideBadge(); return; }
      lastMatch = match;
      lastRect = sel.getRangeAt(0).getBoundingClientRect();
      showBadge(lastRect);
    }, 0);
  }, true);

  document.addEventListener('mousedown', function(e){
    if(withinHost(e)) return;
    hideBadge();
  }, true);
  window.addEventListener('scroll', hideBadge, true);
  window.addEventListener('keydown', function(e){ if(e.key==='Escape') closePanel(); });

  /* =====================================================================
     Floating Blackboard window — mở qua menu chuột phải "Mở bảng đen tại
     đây" (đăng ký ở background.js). Cửa sổ nổi trên trang, kéo được bằng
     thanh tiêu đề, và tuỳ chỉnh kích thước bằng cách kéo góc dưới-phải
     (dùng CSS resize:both của trình duyệt — không cần thư viện ngoài).
  ===================================================================== */

  var bbHost=null, bbShadow=null, bbWin=null, bbDragState=null;
  var lastContextPos=null;

  // Ghi lại vị trí chuột phải gần nhất để mở cửa sổ ngay cạnh đó.
  document.addEventListener('contextmenu', function(e){
    lastContextPos = { x:e.clientX, y:e.clientY };
  }, true);

  function ensureBlackboardHost(){
    if(bbHost) return;
    bbHost = document.createElement('div');
    bbHost.style.cssText = 'all:initial; position:absolute; top:0; left:0; z-index:2147483647;';
    document.documentElement.appendChild(bbHost);
    bbShadow = bbHost.attachShadow({mode:'open'});

    var style = document.createElement('style');
    style.textContent =
      '.bb-win{position:fixed; width:640px; height:480px; min-width:340px; min-height:260px;' +
      ' max-width:96vw; max-height:92vh; background:#1D2733; border:1px solid rgba(255,255,255,0.14);' +
      ' border-radius:14px; box-shadow:0 24px 60px rgba(0,0,0,0.55); overflow:hidden;' +
      ' resize:both; display:none; flex-direction:column; font-family:sans-serif;}' +
      '.bb-win.show{display:flex;}' +
      '.bb-head{display:flex; align-items:center; justify-content:space-between; gap:10px;' +
      ' padding:9px 12px; background:#232F3D; color:#F3F1EA; font-weight:700; font-size:12.5px;' +
      ' cursor:move; user-select:none; flex-shrink:0;}' +
      '.bb-close{background:transparent; border:none; color:#F3F1EA; opacity:0.7; font-size:16px;' +
      ' cursor:pointer; line-height:1; padding:4px; flex-shrink:0;}' +
      '.bb-close:hover{opacity:1;}' +
      '.bb-body{flex:1; min-height:0;}' +
      '.bb-body iframe{width:100%; height:100%; border:0; display:block;}';
    bbShadow.appendChild(style);

    bbWin = document.createElement('div');
    bbWin.className = 'bb-win';
    bbWin.innerHTML =
      '<div class="bb-head"><span>📝 Bảng đen — PHẢN ỨNG.</span>' +
      '<button type="button" class="bb-close" title="Đóng">✕</button></div>' +
      '<div class="bb-body"><iframe src="'+APP_URL+'?embed=1&room=blackboard" title="Bảng đen"></iframe></div>';
    bbShadow.appendChild(bbWin);

    bbWin.querySelector('.bb-close').addEventListener('click', closeBlackboardWindow);

    var head = bbWin.querySelector('.bb-head');
    head.addEventListener('mousedown', function(e){
      // Bỏ qua nếu bấm đúng vào nút đóng.
      if(e.target.closest('.bb-close')) return;
      bbDragState = {
        startX:e.clientX, startY:e.clientY,
        startLeft:bbWin.getBoundingClientRect().left, startTop:bbWin.getBoundingClientRect().top
      };
      e.preventDefault();
    });
    window.addEventListener('mousemove', function(e){
      if(!bbDragState) return;
      var dx = e.clientX - bbDragState.startX;
      var dy = e.clientY - bbDragState.startY;
      var w = bbWin.offsetWidth, h = bbWin.offsetHeight;
      var left = Math.max(0, Math.min(window.innerWidth - Math.min(120,w), bbDragState.startLeft + dx));
      var top = Math.max(0, Math.min(window.innerHeight - 40, bbDragState.startTop + dy));
      bbWin.style.left = left + 'px';
      bbWin.style.top = top + 'px';
    });
    window.addEventListener('mouseup', function(){ bbDragState = null; });
  }

  function openBlackboardWindow(){
    ensureBlackboardHost();
    var w = bbWin.offsetWidth || 640, h = bbWin.offsetHeight || 480;
    var left, top;
    if(lastContextPos){
      left = lastContextPos.x;
      top = lastContextPos.y;
    } else {
      left = (window.innerWidth - w) / 2;
      top = (window.innerHeight - h) / 2;
    }
    left = Math.max(10, Math.min(left, window.innerWidth - 140));
    top = Math.max(10, Math.min(top, window.innerHeight - 60));
    bbWin.style.left = left + 'px';
    bbWin.style.top = top + 'px';
    bbWin.classList.add('show');
  }

  function closeBlackboardWindow(){
    if(bbWin) bbWin.classList.remove('show');
  }

  // Trang Netlify báo về (postMessage) khi người dùng bấm "Thoát bảng đen"
  // bên trong iframe, để ta đóng luôn cửa sổ nổi thay vì để lại màn hình trống.
  window.addEventListener('message', function(e){
    if(e.data && e.data.source==='sfes-lab' && e.data.type==='blackboard-closed'){
      closeBlackboardWindow();
    }
  });

  // Nhận lệnh mở từ background.js (đăng ký bởi menu chuột phải).
  chrome.runtime.onMessage.addListener(function(msg){
    if(msg && msg.type==='open-blackboard'){ openBlackboardWindow(); }
  });

})();
