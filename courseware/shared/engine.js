/* 力的平行四边形互动引擎 — 供各课件复用
 * 用法：页面 HTML 放 <svg id="stage" viewBox="0 0 760 520"> 及对应元素，
 * 然后配置 window.SIM = { el, F1, F2, ... }，在 DOMContentLoaded 后 initSim()。
 */
(function(){
  'use strict';
  var COLORS = { f1:'#3b82f6', f2:'#f59e0b', result:'#dc2626', f3:'#8b5cf6', target:'#16a34a' };

  function el(id){ return document.getElementById(id); }

  /* 屏幕坐标 <-> 物理坐标 */
  function makeGrid(ox, oy, scale){
    return {
      ox:ox, oy:oy, scale:scale,
      toScreen:function(v){ return {x:ox+v.x*scale, y:oy-v.y*scale}; },
      toPhys:function(px,py){ return {x:(px-ox)/scale, y:(oy-py)/scale}; }
    };
  }

  function drawArrow(g, P, Q, color, width, markerEnd, label){
    g.setAttribute('x1',P.x); g.setAttribute('y1',P.y);
    g.setAttribute('x2',Q.x); g.setAttribute('y2',Q.y);
    g.setAttribute('stroke',color);
    if(markerEnd){ g.setAttribute('marker-end', markerEnd); }
    if(width) g.setAttribute('stroke-width', width);
    if(label){ /* caller handles text separately */ }
  }

  /* 返回单位矢与长度 */
  function vec(sx,sy){ var m=Math.hypot(sx,sy)||1e-9; return {x:sx/m, y:sy/m, m:m}; }

  function fmt(n){ return (Math.round(n*100)/100).toFixed(1); }

  window.SimKit = {
    COLORS:COLORS, el:el, makeGrid:makeGrid, drawArrow:drawArrow, vec:vec, fmt:fmt
  };

  /* 主初始化：解析配置，绑定滑块与拖拽 */
  function initSim(cfg){
    var svg = el(cfg.svgId);
    var grid = makeGrid(cfg.ox, cfg.oy, cfg.scale);
    var v1 = { x:cfg.F1.x, y:cfg.F1.y };  // 物理坐标单位
    var v2 = { x:cfg.F2.x, y:cfg.F2.y };

    /* --- 拖拽向量（平行四边形的边）--- */
    function drag(id, vecRef){
      var g = el(id);
      svg.addEventListener('pointerdown', function(ev){
        if(ev.target.id !== id) return;
        g.setPointerCapture(ev.pointerId);
        var moved=false;
        var onMove=function(e){
          var rect=svg.getBoundingClientRect();
          var px=(e.clientX-rect.left)* (cfg.viewW/svg.clientWidth);
          var py=(e.clientY-rect.top)  * (cfg.viewH/svg.clientHeight);
          var p=grid.toPhys(px,py);
          var m=Math.hypot(p.x,p.y);
          var max=cfg.maxForce||3;
          if(m>max){ p.x=p.x/m*max; p.y=p.y/m*max; }
          vecRef.x=+p.x.toFixed(2); vecRef.y=+p.y.toFixed(2);
          removed=true; refresh();
          e.preventDefault();
        };
        var onUp=function(){ svg.removeEventListener('pointermove',onMove); svg.removeEventListener('pointerup',onUp); };
        // 使用 pointer capture 在 g 上
        g.onpointermove=onMove; g.onpointerup=onUp;
        cfg.syncRefs&&cfg.syncRefs();
        refresh();
      });
    }
    // 简化：统一绑定 drag 逻辑
    if(cfg.draggable!==false){
      bindDrag(svg, el(cfg.v1Id||'v1'), v1, grid, cfg, cfg.range1);
      if(cfg.v2Id) bindDrag(svg, el(cfg.v2Id), v2, grid, cfg, cfg.range2);
    }

    window.SIM_STATE={ v1:v1, v2:v2, grid:grid };
    cfg.render&&cfg.render(v1,v2,grid);
    cfg.onReady&&cfg.onReady();
  }

  function bindDrag(svg, g, vecRef, grid, cfg, range){
    if(!g) return;
    g.style.cursor='grab';
    svg.addEventListener('pointerdown', function(ev){
      if(ev.target !== g && ev.target !== g.querySelector('circle')) return;
      ev.preventDefault();
      svg.setPointerCapture && svg.setPointerCapture(ev.pointerId);
      var onMove=function(e){
        var rect=svg.getBoundingClientRect();
        var px=(e.clientX-rect.left)*(cfg.viewW/svg.clientWidth);
        var py=(e.clientY-rect.top)*(cfg.viewH/svg.clientHeight);
        var p=grid.toPhys(px,py);
        var max=range&&range.max!=null?range.max:(cfg.maxForce||3);
        if(Math.hypot(p.x,p.y)>max){ var m=Math.hypot(p.x,p.y)||1; p.x=p.x/m*max; p.y=p.y/m*max; }
        var step=range&&range.step?range.step:0.02;
        vecRef.x=+Math.round(p.x/step)*step; vecRef.y=+Math.round(p.y/step)*step;
        refresh();
      };
      var onUp=function(){ svg.removeEventListener('pointermove',onMove); svg.removeEventListener('pointerup',onUp); };
      svg.addEventListener('pointermove',onMove); svg.addEventListener('pointerup',onUp);
      refresh();
    });
  }

  /* 滑块 <-> 向量绑定 */
  window.attachSlider = function(sliderId, vecRef, axis, mapVal){
    var s=el(sliderId);
    if(!s) return;
    var upd=function(){ var v=parseFloat(s.value); if(mapVal) v=mapVal(v); vecRef[axis]=v; refresh(); };
    s.addEventListener('input', upd);
    window.__sliderSync=upd;
  };
  window.SIM_init = initSim;
  window.refreshSim = function(fn){ refresh=fn; };

  var refresh=function(){};

  if(window.SIM_AUTO!==false && window.SIM_READY){
    initSim(window.SIM_CFG);
  }

  // 暴露给页面：手动启动
  window.SIM_initIfNot = function(){
    if(!window.__simStarted){ window.__simStarted=true; initSim(window.SIM_CFG); }
  };
})();

/* ===== 原题截图：点击选择 / Ctrl+V 粘贴 / 自动存本地 =====
 * 页面放 <div class="prob-img" data-key="...">，脚本自动初始化（见题干框头栏） */
(function(){
  'use strict';
  var UPLOAD_API = (window.SIM_UPLOAD_API) || 'https://trae-memory-card.vercel.app/api/upload-img';

  /* 压缩图片到最大宽度 1400px、JPEG 0.82，控制上传体积 */
  function compressImage(dataUrl){
    return new Promise(function(res, rej){
      var img = new Image();
      img.onload = function(){
        try {
          var w = img.naturalWidth || 0, h = img.naturalHeight || 0;
          if(!w || !h) return res(dataUrl);
          var maxW = 1400, scale = Math.min(1, maxW / w);
          var cw = Math.round(w * scale), ch = Math.round(h * scale);
          var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
          var ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, cw, ch);
          res(cv.toDataURL('image/jpeg', 0.82));
        } catch(_) { res(dataUrl); }
      };
      img.onerror = function(){ res(dataUrl); };
      img.src = dataUrl;
    });
  }

  /* 上传 base64 到云端仓库，返回可直接访问的分支相对路径 URL */
  function uploadToCloud(dataUrl, filename){
    var base = dataUrl.split(',')[1] || '';
    return fetch(UPLOAD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: filename, content: base, ext: 'png' })
    }).then(function(r){ return r.json(); }).then(function(j){
      if(j && j.ok && j.url) return j.url;
      throw new Error((j && j.error) || 'upload fail');
    });
  }

  function isRemote(src){ return /^(https?:)?\/\//.test(src); }

  function initProbImg(scope){
    var roots = (scope && scope.querySelectorAll ? scope.querySelectorAll('.prob-img') : document.querySelectorAll('.prob-img'));
    Array.prototype.forEach.call(roots, function(root){
      if(root.dataset && root.dataset.probReady) return;
      if(root.dataset) root.dataset.probReady='1';
      var key = root.getAttribute('data-key') || ('probimg_'+Math.random().toString(36).slice(2));
      var body = root.querySelector('.prob-img-body');
      var empty = root.querySelector('.prob-img-empty');
      if(!body) return;
      var img = null;
      var fileInput = document.createElement('input');
      fileInput.type='file'; fileInput.accept='image/*'; fileInput.style.display='none';
      document.body.appendChild(fileInput);

      function persist(src){ try{ localStorage.setItem(key, src); }catch(_){} }
      function display(src){
        if(!img){ img=document.createElement('img'); img.className='prob-img-img'; body.appendChild(img); }
        img.src=src;
        if(empty) empty.style.display='none';
      }
      function setNote(ok){
        var note = root.closest ? root.closest('.card, section') : null;
        var n = note ? note.querySelector('.note') : null;
        if(!n) return;
        if(ok){ n.textContent='✅ 截图已上传至云端仓库，可跨设备访问，清除缓存也不会丢失。'; }
        else{ n.textContent='⚠️ 云端上传失败，已临时保存在本机浏览器，可在网络恢复后重新粘贴一次。'; }
      }
      function clearAll(){
        if(img){ img.remove(); img=null; }
        if(empty) empty.style.display='';
        try{ localStorage.removeItem(key); }catch(_){}
      }
      function handleDataUrl(raw){
        var comp = raw;
        compressImage(raw).then(function(compressed){
          comp = compressed;
          display(comp);            // 先展示（减少等待感）
          uploadToCloud(comp, key).then(function(url){
            persist(url);           // 成功后只存云端 URL，省本地空间
            display(url);
            setNote(true);
          }).catch(function(){
            persist(comp);          // 失败回退本地 base64
            setNote(false);
          });
        });
      }
      function readFile(f){
        if(!f || !/^image\//.test(f.type)) return;
        var r=new FileReader();
        r.onload=function(){ handleDataUrl(r.result); };
        r.readAsDataURL(f);
      }
      // 恢复已保存：云端 URL 直接用；旧 base64 也兼容显示
      try{ var saved=localStorage.getItem(key); if(saved){ display(saved); } }catch(_){}
      // 按钮
      root.addEventListener('click', function(ev){
        var a = ev.target.closest ? ev.target.closest('[data-action]') : null;
        if(!a) return;
        if(a.getAttribute('data-action')==='pick'){ fileInput.click(); }
        else if(a.getAttribute('data-action')==='clear'){ clearAll(); }
      });
      fileInput.addEventListener('change', function(){ var f=fileInput.files && fileInput.files[0]; if(f) readFile(f); fileInput.value=''; });
      // 粘贴
      root.addEventListener('paste', function(ev){
        var items = (ev.clipboardData && ev.clipboardData.items) || [];
        for(var i=0;i<items.length;i++){ var it=items[i]; if(it.type && it.type.indexOf('image')===0){ var f=it.getAsFile(); if(f){ ev.preventDefault(); readFile(f); break; } } }
      });
      // 拖放
      root.addEventListener('dragover', function(ev){ ev.preventDefault(); root.classList.add('pasting'); });
      root.addEventListener('dragleave', function(){ root.classList.remove('pasting'); });
      root.addEventListener('drop', function(ev){ ev.preventDefault(); root.classList.remove('pasting'); var f=ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]; if(f) readFile(f); });
      if(root.tabIndex<0) root.tabIndex=0;
    });
  }
  window.SimKit = window.SimKit || {};
  window.SimKit.initProbImg = initProbImg;
  // 滚动显现「分步讲解」步骤：滚动进入视口即加上 .show
  window.SimKit.revealSteps = function(){
    var steps = document.querySelectorAll('.step');
    if(!steps.length) return;
    if(!('IntersectionObserver' in window)){
      [].forEach.call(steps, function(s){ s.classList.add('show'); });
      return;
    }
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add('show'); io.unobserve(en.target); }
      });
    }, {threshold:0.12, rootMargin:'0px 0px -40px 0px'});
    [].forEach.call(steps, function(s){ io.observe(s); });
  };
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', function(){ initProbImg(); }); }
  else initProbImg();
})();