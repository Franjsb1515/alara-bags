'use strict';
const $ = s => document.querySelector(s);
const money = n => '$' + (Number(n)||0).toLocaleString('es-AR');
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let CAT = [], C = {}, filtroCat = 'todos';
let carrito = cargarCarrito();
let detProd = null, detColor = null, detQty = 1;

function cargarCarrito(){ try { return JSON.parse(localStorage.getItem('alara_carrito')||'[]'); } catch(e){ return []; } }
function guardarCarrito(){ try { localStorage.setItem('alara_carrito', JSON.stringify(carrito)); } catch(e){} }
function mediaSrc(m){ return m ? (m.url || ('/media/'+m.archivo)) : ''; }

async function init(){
  try {
    if (window.__ALARA_DATA__) { CAT = window.__ALARA_DATA__.catalogo||[]; C = window.__ALARA_DATA__.contenido||{}; }
    else {
      const [a,b] = await Promise.all([ fetch('catalogo.json'), fetch('contenido.json') ]);
      CAT = await a.json(); C = await b.json();
    }
  } catch(e){ $('#grid').innerHTML = '<p>No se pudo cargar el catálogo.</p>'; return; }
  aplicarContenido(); renderFiltros(); renderGrid(); renderFaq(); actualizarCarrito();
  $('#anio').textContent = new Date().getFullYear();
}

function wa(texto){
  const num = (C.whatsapp||'').replace(/[^0-9]/g,'');
  const msg = encodeURIComponent((C.whatsapp_mensaje||'Hola! ') + (texto||''));
  return `https://wa.me/${num}?text=${msg}`;
}

function aplicarContenido(){
  const r = document.documentElement.style;
  if (C.color_primario) r.setProperty('--primario', C.color_primario);
  if (C.color_secundario) r.setProperty('--secundario', C.color_secundario);
  if (C.color_fondo) r.setProperty('--fondo', C.color_fondo);
  if (C.tipografia_titulos) r.setProperty('--tit', `'${C.tipografia_titulos}'`);
  if (C.tipografia_texto) r.setProperty('--cuerpo', `'${C.tipografia_texto}'`);
  $('#brandNombre').childNodes[0].nodeValue = C.marca_nombre || 'Alara';
  $('#brandSub').textContent = C.marca_subtitulo || 'BAGS';
  $('#heroTitulo').textContent = C.hero_titulo || 'Alara';
  $('#heroSub2').textContent = C.marca_subtitulo || 'BAGS';
  $('#heroSub').textContent = C.hero_subtitulo || '';
  $('#btnHero1').textContent = C.hero_boton1 || 'Ver catálogo';
  $('#btnHero2').textContent = C.hero_boton2 || 'Escribinos';
  $('#catTitulo').textContent = C.seccion_catalogo_titulo || 'Nuestra colección';
  $('#txtEnvio').textContent = C.envio_texto || '';
  $('#txtCambios').textContent = C.cambios_texto || '';
  $('#txtDev').textContent = C.devoluciones_texto || '';
  $('#waFoot').href = $('#btnHero2').href = wa('');
  const cont = [];
  if (C.contacto_email) cont.push(C.contacto_email);
  if (C.contacto_direccion) cont.push(C.contacto_direccion);
  $('#footContacto').textContent = cont.join(' · ');
  const redes = [];
  if (C.instagram) redes.push(`<a href="${esc(C.instagram)}" target="_blank">Instagram</a>`);
  if (C.facebook) redes.push(`<a href="${esc(C.facebook)}" target="_blank">Facebook</a>`);
  if (C.tiktok) redes.push(`<a href="${esc(C.tiktok)}" target="_blank">TikTok</a>`);
  $('#footRedes').innerHTML = redes.join('');
}

function categorias(){ return ['todos', ...new Set(CAT.map(p=>p.categoria))]; }
function renderFiltros(){
  $('#filtros').innerHTML = categorias().map(c=>`<div class="chip ${filtroCat===c?'on':''}" data-c="${esc(c)}">${c==='todos'?'Todos':esc(c)}</div>`).join('');
  $('#filtros').querySelectorAll('.chip').forEach(ch=>ch.onclick=()=>{filtroCat=ch.dataset.c;renderFiltros();renderGrid();});
}
function renderGrid(){
  const items = CAT.filter(p=>filtroCat==='todos'||p.categoria===filtroCat);
  $('#grid').innerHTML = items.map(cardHTML).join('') || '<p class="muted">No hay productos en esta categoría.</p>';
  $('#grid').querySelectorAll('[data-id]').forEach(c=>c.onclick=()=>abrirDetalle(+c.dataset.id));
}
function coverHTML(p){
  const img=(p.media||[]).find(m=>m.tipo==='imagen');
  return img ? `<img src="${mediaSrc(img)}" alt="${esc(p.nombre)}">` : `<span class="nofoto">SIN FOTO</span>`;
}
function cardHTML(p){
  let badge='';
  if (p.agotado) badge='<span class="badge ago">Agotado</span>';
  else if (p.promo) badge='<span class="badge promo">Oferta</span>';
  else if (p.destacado) badge='<span class="badge">Destacado</span>';
  const dots=(p.colores||[]).map(c=>`<span class="dot" style="background:${esc(c.hex)}" title="${esc(c.nombre)}"></span>`).join('');
  return `<div class="card-p" data-id="${p.id}">
    <div class="cover">${coverHTML(p)}${badge}</div>
    <div class="card-b"><div class="cat">${esc(p.categoria)}</div><h3>${esc(p.nombre)}</h3>
      <div class="precio">${p.promo?`${money(p.promo)} <s>${money(p.precio)}</s>`:money(p.precio)}</div>
      <div class="dots">${dots}</div></div></div>`;
}

/* ---- Detalle con selección de color y cantidad ---- */
function abrirDetalle(id){
  const p = CAT.find(x=>x.id===id); if(!p) return;
  detProd = p; detQty = 1;
  const varios = (p.colores||[]).length > 1;
  detColor = varios ? null : ((p.colores||[]).length===1 ? p.colores[0].nombre : '');
  const media = p.media||[];
  const bigHTML = m => m ? (m.tipo==='video'
    ? `<video class="big" src="${mediaSrc(m)}" controls></video>`
    : `<img class="big" src="${mediaSrc(m)}">`) : `<div class="big nofoto-big">SIN FOTO</div>`;
  const filas=[];
  if (p.material) filas.push(`<div class="fila"><b>Material:</b> ${esc(p.material)}</div>`);
  if (p.medidas) filas.push(`<div class="fila"><b>Medidas:</b> ${esc(p.medidas)}</div>`);
  filas.push(`<div class="fila"><b>Estado:</b> ${p.agotado?'Agotado':'Disponible'}</div>`);
  const colorSel = varios
    ? `<div class="det-colores"><label>Elegí un color:</label><div class="col-opts">
        ${p.colores.map(c=>`<button class="col-opt" data-color="${esc(c.nombre)}"><span class="col-sw" style="background:${esc(c.hex)}"></span>${esc(c.nombre)}</button>`).join('')}</div></div>`
    : ((p.colores||[]).length===1 ? `<div class="fila"><b>Color:</b> ${esc(p.colores[0].nombre)}</div>` : '');
  const acciones = p.agotado
    ? `<a href="${wa('Consulta por: '+p.nombre)}" target="_blank" class="btn btn-wa" style="margin-top:16px">Consultar por WhatsApp</a>`
    : `<div class="det-compra">
         <div class="qty-sel"><button id="qMinus">−</button><span id="qVal">1</span><button id="qPlus">+</button></div>
         <button class="btn btn-p" id="addCart">Agregar al carrito</button>
       </div>`;
  $('#detCont').innerHTML = `<div class="det-grid">
    <div class="det-media"><div id="bigBox">${bigHTML(media[0])}</div>
      ${media.length>1?`<div class="det-thumbs" id="thumbs">${media.map((m,i)=>m.tipo==='video'
        ? `<video src="${mediaSrc(m)}" data-i="${i}" class="${i===0?'sel':''}"></video>`
        : `<img src="${mediaSrc(m)}" data-i="${i}" class="${i===0?'sel':''}">`).join('')}</div>`:''}</div>
    <div class="det-info"><div class="cat">${esc(p.categoria)}</div><h2>${esc(p.nombre)}</h2>
      <div class="det-precio">${p.promo?`${money(p.promo)} <s>${money(p.precio)}</s>`:money(p.precio)}</div>
      ${p.descripcion?`<p class="det-desc">${esc(p.descripcion)}</p>`:''}
      ${filas.join('')}${colorSel}${acciones}</div></div>`;
  if (media.length>1){
    const th=$('#thumbs');
    th.querySelectorAll('[data-i]').forEach(t=>t.onclick=()=>{
      $('#bigBox').innerHTML=bigHTML(media[+t.dataset.i]);
      th.querySelectorAll('[data-i]').forEach(x=>x.classList.remove('sel')); t.classList.add('sel');
    });
  }
  const bb=$('#bigBox'); if(bb){ bb.style.cursor='zoom-in'; bb.onclick=()=>{ const im=bb.querySelector('img'); if(im) abrirZoom(im.src); }; }
  if (varios) $('#detCont').querySelectorAll('.col-opt').forEach(b=>b.onclick=()=>{
    detColor=b.dataset.color;
    $('#detCont').querySelectorAll('.col-opt').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
  });
  if (!p.agotado){
    $('#qMinus').onclick=()=>{detQty=Math.max(1,detQty-1);$('#qVal').textContent=detQty;};
    $('#qPlus').onclick=()=>{detQty++;$('#qVal').textContent=detQty;};
    $('#addCart').onclick=()=>{
      if (varios && !detColor){ toast('Elegí un color primero'); return; }
      agregar(p.id, detColor, detQty); cerrarDetalle();
    };
  }
  $('#ov').classList.add('open');
}
function cerrarDetalle(){ $('#ov').classList.remove('open'); }
$('#cerrar').onclick = cerrarDetalle;
$('#ov').onclick = e => { if (e.target.id==='ov') cerrarDetalle(); };

/* ---- Carrito ---- */
function agregar(id, color, qty){
  const p = CAT.find(x=>x.id===id); if(!p||p.agotado) return;
  const key = id+'|'+(color||'');
  const ex = carrito.find(i=>i.key===key);
  if (ex) ex.qty += (qty||1);
  else carrito.push({key,id,nombre:p.nombre,color:color||'',precio:p.promo||p.precio,qty:qty||1});
  guardarCarrito(); actualizarCarrito(); abrirCarrito(); toast('Agregado al carrito');
}
function quitar(key){ carrito=carrito.filter(i=>i.key!==key); guardarCarrito(); actualizarCarrito(); renderCarrito(); }
function cambiarQty(key,d){ const i=carrito.find(x=>x.key===key); if(!i)return; i.qty=Math.max(1,i.qty+d); guardarCarrito(); actualizarCarrito(); renderCarrito(); }
function totalCarrito(){ return carrito.reduce((a,i)=>a+i.precio*i.qty,0); }
function actualizarCarrito(){ const n=carrito.reduce((a,i)=>a+i.qty,0); const b=$('#cartCount'); b.textContent=n; b.style.display=n?'flex':'none'; }
function renderCarrito(){
  const cont=$('#cartBody');
  if(!carrito.length){ cont.innerHTML='<p class="cart-empty">Tu carrito está vacío.</p>'; $('#cartFoot').style.display='none'; return; }
  $('#cartFoot').style.display='';
  cont.innerHTML = carrito.map(i=>`<div class="cart-it">
    <div class="cart-info"><b>${esc(i.nombre)}</b>${i.color?`<span class="muted"> · ${esc(i.color)}</span>`:''}<div class="muted">${money(i.precio)} c/u</div></div>
    <div class="qty-sel sm"><button data-q="-" data-k="${esc(i.key)}">−</button><span>${i.qty}</span><button data-q="+" data-k="${esc(i.key)}">+</button></div>
    <button class="cart-x" data-rm="${esc(i.key)}" title="Quitar">✕</button></div>`).join('');
  $('#cartTotal').textContent = money(totalCarrito());
  cont.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>cambiarQty(b.dataset.k,b.dataset.q==='+'?1:-1));
  cont.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>quitar(b.dataset.rm));
}
function abrirCarrito(){ renderCarrito(); $('#cartOv').classList.add('open'); }
function cerrarCarrito(){ $('#cartOv').classList.remove('open'); }
function checkout(){
  if(!carrito.length) return;
  const lineas = carrito.map(i=>`• ${i.nombre}${i.color?' ('+i.color+')':''} x${i.qty} — ${money(i.precio*i.qty)}`).join('\n');
  const msg = `${C.whatsapp_mensaje||'Hola! '}Quiero hacer este pedido:\n${lineas}\n\nTotal: ${money(totalCarrito())}`;
  const num=(C.whatsapp||'').replace(/[^0-9]/g,'');
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`,'_blank');
}
$('#cartBtn').onclick = e=>{ e.preventDefault(); abrirCarrito(); };
$('#cartClose').onclick = cerrarCarrito;
$('#cartOv').onclick = e=>{ if(e.target.id==='cartOv') cerrarCarrito(); };
$('#cartCheckout').onclick = checkout;

/* ---- FAQ + toast ---- */
function renderFaq(){
  const faqs=C.faqs||[];
  $('#faqList').innerHTML = faqs.map(f=>`<div class="faq-item"><div class="faq-q">${esc(f.pregunta)}<span>+</span></div><div class="faq-a">${esc(f.respuesta)}</div></div>`).join('');
  $('#faqList').querySelectorAll('.faq-q').forEach(q=>q.onclick=()=>{
    q.nextElementSibling.classList.toggle('open');
    q.querySelector('span').textContent = q.nextElementSibling.classList.contains('open')?'−':'+';
  });
}
let toastT;
function toast(t){ const el=$('#toast'); el.textContent=t; el.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove('show'),2200); }

/* ---- Zoom de imagenes (clic para agrandar + rueda del mouse) ---- */
let zScale=1, zX=0, zY=0, zDrag=false, zSX=0, zSY=0;
function aplicarZoom(){ const i=$('#zoomImg'); if(i) i.style.transform=`translate(${zX}px,${zY}px) scale(${zScale})`; }
function abrirZoom(src){ if(!src) return; zScale=1; zX=0; zY=0; $('#zoomImg').src=src; aplicarZoom(); $('#zoomOv').classList.add('open'); }
function cerrarZoom(){ $('#zoomOv').classList.remove('open'); }
function setZoom(v){ zScale=Math.min(5,Math.max(1,v)); if(zScale===1){zX=0;zY=0;} aplicarZoom(); }
(function(){
  const ov=$('#zoomOv'); if(!ov) return;
  ov.addEventListener('wheel', e=>{ e.preventDefault(); setZoom(zScale + (e.deltaY<0?0.2:-0.2)); }, {passive:false});
  $('#zoomIn').onclick = e=>{ e.stopPropagation(); setZoom(zScale+0.3); };
  $('#zoomOut').onclick = e=>{ e.stopPropagation(); setZoom(zScale-0.3); };
  $('#zoomClose').onclick = cerrarZoom;
  ov.addEventListener('click', e=>{ if(e.target.id==='zoomOv') cerrarZoom(); });
  const img=$('#zoomImg');
  img.addEventListener('mousedown', e=>{ if(zScale<=1) return; zDrag=true; zSX=e.clientX-zX; zSY=e.clientY-zY; e.preventDefault(); });
  window.addEventListener('mousemove', e=>{ if(!zDrag) return; zX=e.clientX-zSX; zY=e.clientY-zSY; aplicarZoom(); });
  window.addEventListener('mouseup', ()=>{ zDrag=false; });
  window.addEventListener('keydown', e=>{ if(e.key==='Escape') cerrarZoom(); });
})();

/* ---- Vista previa en vivo (para el panel admin via iframe) ---- */
window.addEventListener('message', e=>{
  const d=e.data; if(!d || !d.__alaraPreview) return;
  Object.assign(C, d.contenido||{}); aplicarContenido();
});

init();
