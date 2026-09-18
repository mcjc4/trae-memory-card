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