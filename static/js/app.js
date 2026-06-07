/* FinanzasDuo — app.js */

const S = {
  usuario: null, miembros: [], periodo: 'mensual',
  mes: new Date().getMonth() + 1, anio: new Date().getFullYear(),
  ingresos: [], gastos: [], deudas: [], ahorros: [], resumen: null,
  movUsuarioActivo: null, movQuincena: 1, movEditId: null,
  tipoMov: 'gasto', tipoGasto: 'personal',
  tipoDeuda: 'personal', claseDeuda: 'Tarjeta',
  deudaEditId: null,
  tipoMeta: 'compartido', propMeta: 'David',
  emojiMeta: 'objetivo', geminiKey: localStorage.getItem('fd_gemini_key') || '',
  charts: {}, temaVisible: false
};

const MESES      = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CATS_GASTO = ['Vivienda','Alimentacion','Transporte','Salud','Educacion','Entretenimiento','Ropa','Servicios','Deuda','Otro'];
const CATS_ING   = ['Salario','Freelance','Bonificacion','Inversion','Otro'];
const CLASES_DEU = ['Tarjeta','Prestamo','Hipoteca','Vehiculo','Personal','Otro'];
const COLORES    = ['#1D9E75','#F0997B','#378ADD','#7F77DD','#EF9F27','#E24B4A','#5DCAA5'];
// Iconos minimalistas (SVG texto)
const ICO = {
  edit:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>',
  plus:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  pay:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
  send:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
  bot:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="11"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>',
  user:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  menu:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  palette: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/><path d="M12 20c2 0 4-1 4-3s-2-3-4-3-4 1-4 3 2 3 4 3z"/></svg>',
  down:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
  up:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>',
};

const fmtK = n => `CRC ${Math.round(n).toLocaleString('es-CR')}`;
const fmt  = n => `CRC ${Number(n).toLocaleString('es-CR')}`;
const api  = async (url, opts={}) => {
  const r = await fetch('/api'+url, { headers:{'Content-Type':'application/json'}, ...opts });
  const d = await r.json();
  if (!r.ok) {
    // FastAPI puede devolver detail como string, lista o objeto
    let msg = 'Error desconocido';
    if (typeof d.detail === 'string') msg = d.detail;
    else if (Array.isArray(d.detail)) msg = d.detail.map(e=>e.msg||JSON.stringify(e)).join(', ');
    else if (d.detail) msg = JSON.stringify(d.detail);
    throw new Error(msg);
  }
  return d;
};

// ── Init ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  try {
    S.usuario = await api('/auth/yo');
    S.miembros = S.usuario.miembros || [];
    // Aplicar tema guardado en BD para ESTE usuario específico
    const tema = S.usuario.tema || 'light';
    document.getElementById('app').setAttribute('data-theme', tema);
    document.documentElement.setAttribute('data-theme', tema);
    renderSidebar();
    iniciarIASugerencias();
    iniciarTemas();
    await cargarTodo();
    // Cargar API key compartida desde BD de la familia
    await cargarGeminiKey();
    navTo('overview');
    // Polling para tiempo real
    iniciarPolling();
  } catch(e) { window.location.href = '/login'; }
});

async function cargarTodo() {
  await Promise.all([cargarResumen(), cargarDeudas(), cargarAhorros()]);
  const [ingresos, gastos] = await Promise.all([
    api(`/ingresos?mes=${S.mes}&anio=${S.anio}`),
    api(`/gastos?mes=${S.mes}&anio=${S.anio}`)
  ]);
  S.ingresos = ingresos; S.gastos = gastos;
}

// ── Sidebar dinamico (Punto 2) ────────────────────────────
function renderSidebar() {
  const items = document.getElementById('sidebar-miembros');
  if (!items) return;
  items.innerHTML = S.miembros.map((m,i) => {
    const initials = m.nombre.slice(0,2).toUpperCase();
    const color = i === 0 ? '#CECBF6' : i === 1 ? '#9FE1CB' : '#FFC8D4';
    const txtColor = i === 0 ? '#3C3489' : i === 1 ? '#085041' : '#7a2040';
    return `<a class="sidebar-item" id="nav-m${m.id}" onclick="navToMiembro(${m.id},'${m.nombre}')">
      <div class="avatar-sm" style="background:${color};color:${txtColor};">${initials}</div>
      ${m.nombre}
    </a>`;
  }).join('');
  // Avatares topbar
  const avs = document.getElementById('topbar-avatares');
  if (avs) avs.innerHTML = S.miembros.slice(0,2).map((m,i) => {
    const color = i===0?'#CECBF6':i===1?'#9FE1CB':'#FFC8D4';
    return `<div class="avatar-sm" style="background:${color};margin-left:${i>0?'-5px':'0'};border:2px solid var(--bg-0);">${m.nombre.slice(0,2).toUpperCase()}</div>`;
  }).join('');
}

function navToMiembro(uid, nombre) {
  S.miembroActivoId = uid;
  S.miembroActivoNombre = nombre;
  // Crear vista dinamica si no existe
  if (!document.getElementById(`view-m${uid}`)) {
    const div = document.createElement('div');
    div.className = 'view';
    div.id = `view-m${uid}`;
    div.innerHTML = `<div id="vista-m${uid}-content"></div>`;
    document.getElementById('views').appendChild(div);
  }
  navTo(`m${uid}`);
  renderVistaMiembro(uid, nombre);
}

// ── Navegacion ────────────────────────────────────────────
function navTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  const el = document.getElementById('view-'+view);
  const ni = document.getElementById('nav-'+view);
  if (el) el.classList.add('active');
  if (ni) ni.classList.add('active');
  // Cerrar panel de temas si esta abierto
  if (S.temaVisible) { cerrarTemas(); }
  closeSidebar();
  const titulos = { overview:'Overview', metricas:'Metricas', deudas:'Deudas', ahorros:'Ahorros', ia:'Asistente IA', config:'Configuracion' };
  const subs    = { overview:'Finanzas compartidas', metricas:'Analisis financiero', deudas:'Gestion y asesoria IA', ahorros:'Metas y progreso', ia:'Asesoria financiera personalizada', config:'Ajustes de cuenta' };
  document.getElementById('topbar-title').textContent = titulos[view] || S.miembroActivoNombre || 'FinanzasDuo';
  document.getElementById('topbar-sub').textContent   = subs[view] || 'Vista quincenal personal';
  if (view === 'overview')  renderOverview();
  if (view === 'metricas')  {
    if (!S.metMes) S.metMes = S.mes;
    if (!S.metAnio) S.metAnio = S.anio;
    iniciarSelectorMesMetricas();
    renderMetricas('conjunta');
  }
  if (view === 'deudas')    renderDeudas();
  if (view === 'ahorros')   renderAhorros();
}

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); }

// Punto 6: toggle del panel de temas
function toggleTemas() {
  S.temaVisible = !S.temaVisible;
  document.getElementById('tema-panel').style.display = S.temaVisible ? 'block' : 'none';
}
function cerrarTemas() {
  S.temaVisible = false;
  document.getElementById('tema-panel').style.display = 'none';
}

// ── Overview ──────────────────────────────────────────────
async function cargarResumen() {
  const [resumen, balance] = await Promise.all([
    api(`/resumen?mes=${S.mes}&anio=${S.anio}`),
    api(`/balance-proporcional?mes=${S.mes}&anio=${S.anio}`)
  ]);
  S.resumen = resumen;
  S.balance = balance;
}

function renderOverview() {
  if (!S.resumen) return;
  const r = S.resumen;
  const bal = r.total_ingresos - r.total_gastos;
  const pctG = r.total_ingresos > 0 ? Math.round(r.total_gastos/r.total_ingresos*100) : 0;
  setText('ov-lbl',    `Balance disponible · ${MESES[S.mes-1]} ${S.anio}`);
  setText('ov-balance', fmtK(bal));
  setText('ov-sub',    `de ${fmtK(r.total_ingresos)} ingresados`);
  setText('ov-pct-g',  `Gastado ${pctG}%`);
  setText('ov-pct-d',  `Disponible ${100-pctG}%`);
  document.getElementById('ov-bar').style.width = `${100-pctG}%`;
  setText('ov-ing', fmtK(r.total_ingresos));
  setText('ov-gas', fmtK(r.total_gastos));
  setText('ov-aho', fmtK(r.total_ahorros));
  setText('ov-deu', fmtK(r.total_deudas));
  // Deudas por clasificacion en overview
  const porClase = {};
  S.deudas.forEach(d => { porClase[d.clase||'Otro'] = (porClase[d.clase||'Otro']||0) + d.monto_restante; });
  const resumenDeu = document.getElementById('ov-deu-detalle');
  if (resumenDeu) resumenDeu.innerHTML = Object.entries(porClase).map(([k,v]) =>
    `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--txt-1);margin-top:3px;"><span>${k}</span><span>${fmtK(v)}</span></div>`
  ).join('');
  // Punto 2: Heatmap de métricas clave en lugar del aporte proporcional
  const propEl = document.getElementById('prop-rows');
  if (propEl && S.resumen) {
    const r = S.resumen;
    const pctAhorro = r.total_ingresos>0 ? Math.round(r.total_ahorros/r.total_ingresos*100) : 0;
    const pctGasto  = r.total_ingresos>0 ? Math.round(r.total_gastos/r.total_ingresos*100) : 0;
    const ratioDeuda = r.total_ingresos>0 ? Math.round(r.total_deudas/r.total_ingresos*100) : 0;
    const balance   = r.total_ingresos - r.total_gastos;

    // Colores por semáforo
    const colorAhorro  = pctAhorro>=20?'var(--success)':pctAhorro>=10?'var(--amber)':'var(--danger)';
    const colorGasto   = pctGasto<=50?'var(--success)':pctGasto<=70?'var(--amber)':'var(--danger)';
    const colorDeuda   = ratioDeuda<=30?'var(--success)':ratioDeuda<=60?'var(--amber)':'var(--danger)';
    const colorBalance = balance>=0?'var(--success)':'var(--danger)';

    propEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div style="background:var(--bg-1);border-radius:10px;padding:10px 12px;border-left:3px solid ${colorAhorro};">
          <div style="font-size:10px;color:var(--txt-2);margin-bottom:3px;">Tasa de ahorro</div>
          <div style="font-size:20px;font-weight:600;color:${colorAhorro};">${pctAhorro}%</div>
          <div style="font-size:10px;color:var(--txt-2);">Meta: 20%+</div>
        </div>
        <div style="background:var(--bg-1);border-radius:10px;padding:10px 12px;border-left:3px solid ${colorGasto};">
          <div style="font-size:10px;color:var(--txt-2);margin-bottom:3px;">% Gastado</div>
          <div style="font-size:20px;font-weight:600;color:${colorGasto};">${pctGasto}%</div>
          <div style="font-size:10px;color:var(--txt-2);">Recomendado: -70%</div>
        </div>
        <div style="background:var(--bg-1);border-radius:10px;padding:10px 12px;border-left:3px solid ${colorDeuda};">
          <div style="font-size:10px;color:var(--txt-2);margin-bottom:3px;">Carga de deuda</div>
          <div style="font-size:20px;font-weight:600;color:${colorDeuda};">${ratioDeuda}%</div>
          <div style="font-size:10px;color:var(--txt-2);">Recomendado: -30%</div>
        </div>
        <div style="background:var(--bg-1);border-radius:10px;padding:10px 12px;border-left:3px solid ${colorBalance};">
          <div style="font-size:10px;color:var(--txt-2);margin-bottom:3px;">Excedente mes</div>
          <div style="font-size:16px;font-weight:600;color:${colorBalance};">${fmtK(Math.abs(balance))}</div>
          <div style="font-size:10px;color:var(--txt-2);">${balance>=0?'Disponible':'Deficit'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--txt-2);text-align:center;">
        Verde = saludable &nbsp;·&nbsp; Amarillo = atencion &nbsp;·&nbsp; Rojo = critico
      </div>`;
  }
  renderChartOverview();
}

function renderChartOverview() {
  const ctx = document.getElementById('chart-overview');
  if (!ctx) return;
  if (S.charts.overview) S.charts.overview.destroy();
  const q1Ing = S.ingresos.filter(i=>i.quincena===1).reduce((s,i)=>s+i.monto,0);
  const q2Ing = S.ingresos.filter(i=>i.quincena===2).reduce((s,i)=>s+i.monto,0);
  const q1Gas = S.gastos.filter(g=>g.quincena===1).reduce((s,g)=>s+g.monto,0);
  const q2Gas = S.gastos.filter(g=>g.quincena===2).reduce((s,g)=>s+g.monto,0);
  const m = MESES[S.mes-1].slice(0,3);
  S.charts.overview = new Chart(ctx, {
    type:'bar',
    data:{ labels:[`${m} Q1`,`${m} Q2`], datasets:[
      { label:'Ingresos', data:[q1Ing,q2Ing], backgroundColor:'#1D9E75', borderRadius:4 },
      { label:'Gastos',   data:[q1Gas,q2Gas], backgroundColor:'#F0997B', borderRadius:4 }
    ]},
    options:{ responsive:true, plugins:{legend:{labels:{font:{size:11}}}}, scales:{
      x:{grid:{display:false},ticks:{font:{size:10}}},
      y:{ticks:{callback:v=>`${(v/1000).toFixed(0)}k`,font:{size:9}}}
    }}
  });
}

function switchPeriodo(el, p) {
  document.querySelectorAll('#view-overview .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active'); S.periodo = p; renderOverview();
}

// ── Vista personal por miembro (Punto 2) ──────────────────
async function renderVistaMiembro(uid, nombre) {
  const i = S.miembros.findIndex(m=>m.id===uid);
  const colors = [['#CECBF6','#3C3489'],['#9FE1CB','#085041'],['#FFC8D4','#7a2040']];
  const [bg, tx] = colors[i] || ['#E0E0E0','#333'];
  const initials = nombre.slice(0,2).toUpperCase();

  // Cargar ingresos personales + gastos propios y compartidos + abonos de ahorro
  const [ingP, gasP, balance, abonosP] = await Promise.all([
    api(`/ingresos?mes=${S.mes}&anio=${S.anio}&usuario_id=${uid}`),
    api(`/gastos?mes=${S.mes}&anio=${S.anio}&usuario_id=${uid}`),
    api(`/balance-proporcional?mes=${S.mes}&anio=${S.anio}`),
    api(`/ahorros/movimientos?mes=${S.mes}&anio=${S.anio}&usuario_id=${uid}`)
  ]);

  const totalIng = ingP.reduce((s,x)=>s+x.monto,0);
  // Gastos: para compartidos usar el aporte de este usuario
  const totalGasBase = gasP.reduce((s,g)=>{
    if (g.tipo === 'compartido') {
      const miAporte = g.aportes?.find(a=>a.usuario_id===uid);
      if (miAporte) return s + miAporte.monto;
      const balG = balance?.gastos_compartidos?.find(x=>x.id===g.id);
      const sug = balG?.aportes_sugeridos?.[uid]?.sugerido;
      return s + (sug || g.monto);
    }
    return s + g.monto;
  }, 0);
  // Abonos de ahorro se descuentan del disponible pero NO se muestran como gasto
  const totalAbonos = abonosP.reduce((s,a)=>s+a.monto,0);
  const totalGas = totalGasBase; // gastos reales sin incluir ahorros
  const disp = totalIng - totalGas - totalAbonos; // disponible = ingreso - gastos - ahorros
  const balM = balance.por_miembro[uid] || {};

  const tabsMeses = MESES.map((m,idx)=>
    `<button class="tab ${idx===S.mes-1?'active':''}" onclick="switchMesMiembro(${idx+1},${uid},'${nombre}')">${m.slice(0,3)}</button>`
  ).join('');

  // Sin tarjeta de balance separada — la info proporcional se muestra inline en cada gasto
  const balanceCard = '';

  const html = `
    <div class="tab-row">${tabsMeses}</div>
    <div class="page-content">
      <div class="card" style="margin-top:4px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          <div style="width:38px;height:38px;border-radius:50%;background:${bg};color:${tx};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">${initials}</div>
          <div>
            <div style="font-size:14px;font-weight:500;">${nombre} · ${MESES[S.mes-1]} ${S.anio}</div>
            <div style="font-size:11px;color:var(--txt-1);">Aporte proporcional: ${balM.pct_ingreso||0}% del ingreso familiar</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(${totalAbonos>0?4:3},1fr);gap:8px;text-align:center;">
          <div><div style="font-size:15px;font-weight:500;color:var(--success);">${fmtK(totalIng)}</div><div style="font-size:10px;color:var(--txt-2);">Ingresos</div></div>
          <div><div style="font-size:15px;font-weight:500;color:var(--danger);">${fmtK(totalGas)}</div><div style="font-size:10px;color:var(--txt-2);">Gastos</div></div>
          ${totalAbonos>0?`<div><div style="font-size:15px;font-weight:500;color:var(--blue);">${fmtK(totalAbonos)}</div><div style="font-size:10px;color:var(--txt-2);">Ahorrado</div></div>`:''}
          <div><div style="font-size:15px;font-weight:500;color:${disp>=0?'var(--acc)':'var(--danger)'};">${fmtK(Math.abs(disp))}</div><div style="font-size:10px;color:var(--txt-2);">${disp>=0?'Disponible':'Deficit'}</div></div>
        </div>
      </div>
      ${balanceCard}
      ${renderQuincenaHTML(1, uid, nombre, ingP, gasP, balance)}
      ${renderQuincenaHTML(2, uid, nombre, ingP, gasP, balance)}
      ${abonosP.length > 0 ? renderAhorrosPersonal(abonosP) : ''}
    </div>`;
  const cont = document.getElementById(`vista-m${uid}-content`);
  if (cont) cont.innerHTML = html;
}

function renderQuincenaHTML(q, uid, nombre, ingP, gasP, balance) {
  const ing = ingP.filter(i=>i.quincena===q);
  const gas = gasP.filter(g=>g.quincena===q);
  const totalI = ing.reduce((s,i)=>s+i.monto,0);
  // Para el total de gastos en el header, usar el aporte personal en compartidos
  const totalG = gas.reduce((s,g)=>{
    if (g.tipo === 'compartido') {
      // Usar el aporte registrado para este usuario, o el sugerido
      const miAporte = g.aportes?.find(a=>a.usuario_id===uid);
      return s + (miAporte ? miAporte.monto : (balance?.gastos_compartidos?.find(x=>x.id===g.id)?.aportes_sugeridos?.[uid]?.sugerido || g.monto));
    }
    return s + g.monto;
  }, 0);
  const rows = [
    ...ing.map(i=>movRowHTML({...i,esIngreso:true}, uid, balance)),
    ...gas.map(g=>movRowHTML(g, uid, balance))
  ].join('');
  return `
    <div class="q-card">
      <div class="q-header" onclick="toggleQCard('q-${uid}-${q}','qi-${uid}-${q}')">
        <div>
          <div style="font-size:14px;font-weight:500;">Quincena del ${q===1?'1 al 15':'16 al 30'}</div>
          <div style="font-size:12px;color:var(--txt-1);">Ingreso: ${fmt(totalI)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="text-align:right;">
            <div style="font-size:13px;font-weight:500;color:var(--success);">+${fmtK(totalI)}</div>
            <div style="font-size:12px;color:var(--danger);">-${fmtK(totalG)}</div>
          </div>
          <span id="qi-${uid}-${q}" style="color:var(--txt-2);">${ICO.down}</span>
        </div>
      </div>
      <div class="q-body" id="q-${uid}-${q}" style="${q===1?'':'display:none'}">
        ${rows||'<div style="font-size:12px;color:var(--txt-2);padding:8px 0;">Sin movimientos registrados</div>'}
        <button class="btn btn-ghost" style="width:100%;margin-top:10px;font-size:12px;" onclick="abrirModalMov(${uid},'${nombre}',${q})">
          ${ICO.plus} Anadir ingreso o gasto
        </button>
      </div>
    </div>`;
}

function movRowHTML(mov, uid, balance) {
  const esIng = mov.esIngreso;
  const esCompartido = mov.tipo === 'compartido';
  const esMio = mov.usuario_id === uid;
  const badgeCls = esCompartido ? 'badge-shared' : 'badge-personal';
  const tipoLabel = esCompartido ? 'Compartido' : 'Personal';

  // Para gastos compartidos: mostrar el aporte de este usuario, no el total
  let montoMostrar = mov.monto;
  let aporteInfo = '';
  if (esCompartido && !esIng) {
    const miAporte = mov.aportes?.find(a=>a.usuario_id===uid);
    const balGasto = balance?.gastos_compartidos?.find(g=>g.id===mov.id);
    const sugeridoMio = balGasto?.aportes_sugeridos?.[uid];

    if (miAporte) {
      // Tiene aporte registrado manualmente
      montoMostrar = miAporte.monto;
      const faltante = mov.monto - (mov.aportes||[]).reduce((s,a)=>s+a.monto,0);
      aporteInfo = `
        <div style="margin-top:5px;padding:5px 8px;background:var(--bg-1);border-radius:6px;font-size:10px;color:var(--txt-1);">
          <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
            <span>Total del gasto:</span><span style="font-weight:500;">${fmt(mov.monto)}</span>
          </div>
          ${(mov.aportes||[]).map(a=>`
            <div style="display:flex;justify-content:space-between;">
              <span>${a.nombre} ${a.es_sugerido?'(sugerido)':'(manual)'}:</span>
              <span style="font-weight:500;color:${a.usuario_id===uid?'var(--acc)':'var(--txt-0)'};">${fmt(a.monto)}</span>
            </div>`).join('')}
          ${Math.abs(faltante)>1?`<div style="color:var(--amber);margin-top:2px;">Sin distribuir: ${fmt(Math.abs(faltante))}</div>`:''}
        </div>`;
    } else if (sugeridoMio) {
      // Solo sugerencia, sin aporte manual registrado
      montoMostrar = sugeridoMio.sugerido;
      aporteInfo = `
        <div style="margin-top:5px;padding:5px 8px;background:var(--bg-1);border-radius:6px;font-size:10px;color:var(--txt-1);">
          <div style="font-weight:500;margin-bottom:2px;">Aporte sugerido segun ingresos:</div>
          ${Object.values(balGasto.aportes_sugeridos).map(a=>`
            <div style="display:flex;justify-content:space-between;">
              <span>${a.nombre} (${a.pct}%):</span>
              <span style="font-weight:500;">${fmtK(a.sugerido)}</span>
            </div>`).join('')}
          <div style="color:var(--txt-2);margin-top:3px;font-style:italic;">Edita el gasto para definir aportes reales</div>
        </div>`;
    }
  }

  const autorLabel = !esMio && esCompartido
    ? `<span style="font-size:10px;color:var(--txt-2);margin-left:4px;">— por ${mov.usuario_nombre}</span>`
    : '';
  const colorMonto = esIng ? 'var(--success)' : 'var(--danger)';
  const signo = esIng ? '+' : '-';

  return `
    <div class="mov-row" style="${!esMio&&esCompartido?'opacity:0.88;':''}">
      <div class="mov-icon" style="background:${esIng?'var(--acc-bg)':esCompartido?'var(--blue-bg)':'var(--bg-2)'};color:${esIng?'var(--acc)':esCompartido?'var(--blue)':'var(--txt-1)'};">
        ${esIng?ICO.plus:ICO.pay}
      </div>
      <div class="mov-info" style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
          <div class="mov-name">${mov.descripcion}</div>${autorLabel}
        </div>
        <div class="mov-meta">
          <span>${mov.categoria}</span>
          <span class="badge ${badgeCls}">${tipoLabel}</span>
        </div>
        ${aporteInfo}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
        <div class="mov-amount" style="color:${colorMonto};">${signo}${fmt(montoMostrar)}</div>
        ${esMio?`<div class="mov-actions">
          <button class="icon-btn" onclick="editarMov(${mov.id},'${esIng?'ingreso':'gasto'}')" title="Editar">${ICO.edit}</button>
          <button class="icon-btn danger" onclick="eliminarMov(${mov.id},'${esIng?'ingreso':'gasto'}')" title="Eliminar">${ICO.trash}</button>
        </div>`:
        esCompartido&&!esIng?`<button class="icon-btn" onclick="editarMov(${mov.id},'gasto')" title="Editar aporte" style="color:var(--blue);">${ICO.edit}</button>`:''
        }
      </div>
    </div>`;
}

function renderAhorrosPersonal(abonos) {
  const total = abonos.reduce((s,a)=>s+a.monto,0);
  const rows = abonos.map(a=>`
    <div class="mov-row">
      <div class="mov-icon" style="background:var(--blue-bg);color:var(--blue);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
          <path d="M12 8v8M8 12h8"/>
        </svg>
      </div>
      <div class="mov-info" style="flex:1;">
        <div class="mov-name">${a.meta_nombre}</div>
        <div class="mov-meta">
          <span>Ahorro</span>
          <span class="badge badge-shared">Q${a.quincena||1}</span>
        </div>
      </div>
      <div class="mov-amount" style="color:var(--blue);">-${fmt(a.monto)}</div>
    </div>`).join('');
  return `
    <div class="q-card" style="margin-bottom:10px;">
      <div class="q-header" onclick="toggleQCard('q-ahorros','qi-ahorros')" style="cursor:pointer;">
        <div>
          <div style="font-size:14px;font-weight:500;">Abonos a ahorros</div>
          <div style="font-size:12px;color:var(--txt-1);">${abonos.length} movimiento${abonos.length!==1?'s':''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:13px;font-weight:500;color:var(--blue);">-${fmtK(total)}</div>
          <span id="qi-ahorros" style="color:var(--txt-2);">${ICO.down}</span>
        </div>
      </div>
      <div class="q-body" id="q-ahorros" style="display:none;">
        ${rows}
      </div>
    </div>`;
}

function toggleQCard(bodyId, iconId) {
  const body = document.getElementById(bodyId);
  const icon = document.getElementById(iconId);
  if (!body) return;
  const hidden = body.style.display === 'none';
  body.style.display = hidden ? 'block' : 'none';
  if (icon) icon.innerHTML = hidden ? ICO.up : ICO.down;
}

async function switchMesMiembro(mes, uid, nombre) {
  S.mes = mes;
  await cargarTodo();
  renderVistaMiembro(uid, nombre);
}

// ── Modal movimiento ──────────────────────────────────────
function abrirModalMov(uid, nombre, quincena) {
  S.movUsuarioActivo = uid; S.movQuincena = quincena;
  S.movEditId = null; S.tipoMov = 'gasto'; S.tipoGasto = 'personal';
  document.getElementById('modal-mov-title').firstChild.textContent = 'Nuevo movimiento — '+nombre;
  document.getElementById('mov-desc').value = '';
  document.getElementById('mov-monto').value = '';
  document.getElementById('mov-id').value = '';
  document.getElementById('mov-tipo-selector').style.display = 'flex';
  document.getElementById('mov-error').style.display = 'none';
  const notaDeuda = document.getElementById('mov-deuda-nota');
  if (notaDeuda) notaDeuda.style.display = 'none';
  // Poblar selector de deudas
  const sel = document.getElementById('mov-deuda-id');
  if (sel) {
    sel.innerHTML = '<option value="">No vincular a ninguna deuda</option>' +
      S.deudas.map(d => `<option value="${d.id}">${d.nombre} — ${d.tipo} — Saldo: ${fmtK(d.monto_restante)}</option>`).join('');
    sel.value = '';
    sel.onchange = () => {
      if (notaDeuda) notaDeuda.style.display = sel.value ? 'block' : 'none';
    };
  }
  // Generar campos de aporte por miembro
  const fieldsEl = document.getElementById('mov-aportes-fields');
  if (fieldsEl) {
    fieldsEl.innerHTML = S.miembros.map(m => `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:12px;font-weight:500;">${m.nombre}</span>
          <span id="aporte-sug-${m.id}" style="font-size:10px;color:var(--txt-2);" data-sugerido="true"></span>
        </div>
        <input type="number" id="aporte-mov-${m.id}" min="0" placeholder="CRC 0"
          style="font-size:13px;" oninput="recalcularAportes(${m.id}, this.value)">
      </div>`).join('');
  }
  selectTipoMov('gasto');
  actualizarCatsMov();
  abrirModal('modal-mov');
}

function recalcularAportes(uidCambio, valorNuevo) {
  // Al cambiar un aporte, marcar como manual (no sugerido)
  const sugEl = document.getElementById(`aporte-sug-${uidCambio}`);
  if (sugEl) { sugEl.textContent = 'Manual'; sugEl.dataset.sugerido = 'false'; }
}

function selectTipoMov(tipo) {
  S.tipoMov = tipo;
  document.getElementById('mov-tipo-gasto').classList.toggle('active', tipo==='gasto');
  document.getElementById('mov-tipo-ingreso').classList.toggle('active', tipo==='ingreso');
  document.getElementById('mov-tipo-gasto-wrap').style.display = tipo==='gasto' ? 'block' : 'none';
  actualizarCatsMov();
}

function selectTipoGasto(tipo) {
  S.tipoGasto = tipo;
  document.getElementById('mov-tg-personal').classList.toggle('active', tipo==='personal');
  document.getElementById('mov-tg-compartido').classList.toggle('active', tipo==='compartido');
  const notaEl = document.getElementById('mov-prop-nota');
  const aportesEl = document.getElementById('mov-aportes-wrap');
  notaEl.style.display = tipo==='compartido' ? 'block' : 'none';
  if (aportesEl) aportesEl.style.display = tipo==='compartido' ? 'block' : 'none';
  // Precargar sugerencia proporcional en los campos
  if (tipo === 'compartido') actualizarAportesSugeridos();
}

function actualizarAportesSugeridos() {
  const montoTotal = parseFloat(document.getElementById('mov-monto').value) || 0;
  if (!montoTotal || !S.balance) return;
  const miembros = Object.values(S.balance.por_miembro);
  const totalIng = miembros.reduce((s,m)=>s+m.ingreso,0);
  S.miembros.forEach(m => {
    const campo = document.getElementById(`aporte-mov-${m.id}`);
    const sugEl = document.getElementById(`aporte-sug-${m.id}`);
    if (!campo) return;
    const balM = S.balance.por_miembro[m.id];
    const pct = balM && totalIng > 0 ? balM.ingreso/totalIng : 1/S.miembros.length;
    const sugerido = Math.round(montoTotal * pct);
    campo.value = sugerido;
    campo.placeholder = `Sugerido: ${fmtK(sugerido)}`;
    if (sugEl) { sugEl.textContent = `${Math.round(pct*100)}% según ingresos`; sugEl.dataset.sugerido = 'true'; }
  });
}

function actualizarCatsMov() {
  const cats = S.tipoMov === 'gasto' ? CATS_GASTO : CATS_ING;
  document.getElementById('mov-cat').innerHTML = cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}

async function guardarMovimiento() {
  const desc  = document.getElementById('mov-desc').value.trim();
  const monto = parseFloat(document.getElementById('mov-monto').value);
  const cat   = document.getElementById('mov-cat').value;
  const errEl = document.getElementById('mov-error');
  errEl.style.display = 'none';
  if (!desc)           { errEl.textContent='Ingresa una descripcion'; errEl.style.display='block'; return; }
  if (!monto||monto<=0){ errEl.textContent='Ingresa un monto valido'; errEl.style.display='block'; return; }
  const btn = document.getElementById('mov-guardar-btn');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try {
    const deudaId = document.getElementById('mov-deuda-id')?.value;
    const body = { descripcion:desc, monto, categoria:cat, quincena:S.movQuincena, mes:S.mes, anio:S.anio,
                   deuda_id: deudaId ? parseInt(deudaId) : null };
    if (S.tipoMov === 'gasto') {
      body.tipo = S.tipoGasto;
      // Si es compartido, incluir aportes manuales
      if (S.tipoGasto === 'compartido') {
        body.aportes = S.miembros.map(m => {
          const campo = document.getElementById(`aporte-mov-${m.id}`);
          const montoAporte = campo ? parseFloat(campo.value)||0 : 0;
          const sugerido = document.getElementById(`aporte-sug-${m.id}`)?.dataset.sugerido === 'true';
          return { usuario_id: m.id, monto: montoAporte, es_sugerido: sugerido };
        }).filter(a => a.monto > 0);
      } else {
        body.aportes = [];
      }
    }
    const editId = document.getElementById('mov-id').value;
    if (editId) await api(`/${S.tipoMov}s/${editId}`, {method:'PUT', body:JSON.stringify(body)});
    else        await api(`/${S.tipoMov}s`,           {method:'POST',body:JSON.stringify(body)});
    cerrarModal('modal-mov');
    await cargarTodo();
    if (S.miembroActivoId) renderVistaMiembro(S.miembroActivoId, S.miembroActivoNombre);
    renderOverview();
  } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; }
  btn.disabled=false; btn.textContent='Guardar';
}

async function editarMov(id, tipo) {
  // Buscar en lista local o cargar desde API
  const lista = tipo==='ingreso' ? S.ingresos : S.gastos;
  let mov = lista.find(m=>m.id===id);
  if (!mov && tipo==='gasto') {
    try {
      const todos = await api(`/gastos?mes=${S.mes}&anio=${S.anio}`);
      mov = todos.find(g=>g.id===id);
    } catch(e) { return; }
  }
  if (!mov) return;
  S.tipoMov = tipo; S.movEditId = id;
  // Generar campos de aporte por miembro
  const fieldsEl = document.getElementById('mov-aportes-fields');
  if (fieldsEl) {
    fieldsEl.innerHTML = S.miembros.map(m => `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:12px;font-weight:500;">${m.nombre}</span>
          <span id="aporte-sug-${m.id}" style="font-size:10px;color:var(--txt-2);" data-sugerido="false">Manual</span>
        </div>
        <input type="number" id="aporte-mov-${m.id}" min="0" placeholder="CRC 0" style="font-size:13px;"
          oninput="recalcularAportes(${m.id}, this.value)">
      </div>`).join('');
  }
  selectTipoMov(tipo);
  document.getElementById('mov-desc').value  = mov.descripcion;
  document.getElementById('mov-monto').value = mov.monto;
  actualizarCatsMov();
  document.getElementById('mov-cat').value   = mov.categoria;
  document.getElementById('mov-id').value    = id;
  if (tipo==='gasto') {
    selectTipoGasto(mov.tipo);
    if (mov.tipo === 'compartido') {
      // Cargar aportes existentes o sugerencia
      if (mov.aportes?.length) {
        mov.aportes.forEach(a => {
          const campo = document.getElementById(`aporte-mov-${a.usuario_id}`);
          if (campo) campo.value = a.monto;
        });
      } else {
        actualizarAportesSugeridos();
      }
    }
  }
  document.getElementById('modal-mov-title').firstChild.textContent = 'Editar movimiento';
  document.getElementById('mov-tipo-selector').style.display = 'none';
  document.getElementById('mov-error').style.display = 'none';
  abrirModal('modal-mov');
}

async function eliminarMov(id, tipo) {
  if (!confirm('Eliminar este movimiento?')) return;
  await api(`/${tipo}s/${id}`, {method:'DELETE'});
  await cargarTodo();
  if (S.miembroActivoId) renderVistaMiembro(S.miembroActivoId, S.miembroActivoNombre);
  renderOverview();
}

// ── Deudas (Puntos 3 y 4) ────────────────────────────────
async function cargarDeudas() { S.deudas = await api('/deudas'); }

function renderDeudas() {
  const totalR  = S.deudas.reduce((s,d)=>s+d.monto_restante,0);
  const conTasa = S.deudas.filter(d=>d.tasa_anual>0);
  const tasaProm= conTasa.length ? conTasa.reduce((s,d)=>s+d.tasa_anual,0)/conTasa.length : 0;
  setText('ov-deu', fmtK(totalR));
  // Resumen por clasificacion
  const porClase = {};
  S.deudas.forEach(d => { const c=d.clase||'Otro'; porClase[c]=(porClase[c]||0)+d.monto_restante; });
  const claseRows = Object.entries(porClase).map(([k,v])=>`
    <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:0.5px solid var(--brd);">
      <span style="color:var(--txt-1);">${k}</span><span style="font-weight:500;">${fmtK(v)}</span>
    </div>`).join('');
  document.getElementById('deudas-resumen').innerHTML = `
    <div class="grid-2" style="margin-bottom:10px;">
      <div><div class="lbl">Total restante</div><div style="font-size:20px;font-weight:500;color:var(--danger);">${fmtK(totalR)}</div></div>
      <div><div class="lbl">Tasa promedio</div><div style="font-size:20px;font-weight:500;color:var(--amber);">${tasaProm>0?tasaProm.toFixed(1)+'%':'N/D'}</div></div>
    </div>
    ${claseRows ? `<div style="margin-top:6px;"><div style="font-size:11px;font-weight:500;color:var(--txt-1);margin-bottom:4px;">POR CATEGORIA</div>${claseRows}</div>` : ''}`;
  document.getElementById('deudas-lista').innerHTML = S.deudas.map(d=>deudaCardHTML(d)).join('');
}

function deudaCardHTML(d) {
  const pct = Math.min(100, Math.round((d.monto_original-d.monto_restante)/d.monto_original*100));
  const color = d.tipo==='compartida'?'var(--acc)':'var(--purple)';
  const tieneTasa = d.tasa_anual>0;
  const urgente   = tieneTasa && d.tasa_anual>=20;
  let interesesTxt='', tiempoTxt='N/D';
  if (tieneTasa && d.cuota_mensual>0) {
    let saldo=d.monto_restante, meses=0, intereses=0;
    const tM=d.tasa_anual/100/12;
    while(saldo>0&&meses<600){const i=saldo*tM;intereses+=i;saldo=saldo+i-d.cuota_mensual;meses++;}
    tiempoTxt=`${Math.floor(meses/12)}a ${meses%12}m`;
    interesesTxt=`<div style="background:var(--bg-1);border-radius:6px;padding:7px 10px;margin-bottom:10px;font-size:11px;color:var(--txt-1);">
      Pagando solo la cuota minima, pagaras <span style="font-weight:500;color:var(--danger);">${fmtK(Math.max(0,intereses))}</span> en intereses
    </div>`;
  }
  return `
    <div class="card">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
        <div>
          <div style="font-size:14px;font-weight:500;display:flex;align-items:center;gap:6px;">
            ${d.nombre}
            ${urgente?'<span style="font-size:9px;background:var(--danger-bg);color:var(--danger);padding:2px 7px;border-radius:4px;font-weight:500;">TASA ALTA</span>':''}
          </div>
          <div style="font-size:11px;color:var(--txt-1);margin-top:2px;">${d.clase||'Otro'} · ${d.tipo==='compartida'?'Compartida':'Personal'}</div>
        </div>
        <span class="badge ${d.tipo==='compartida'?'badge-shared':'badge-personal'}">${d.tipo==='compartida'?'Compartida':'Personal'}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:11px;color:var(--txt-1);">Pagado: ${fmtK(d.monto_original-d.monto_restante)}</span>
        <span style="font-size:11px;color:var(--txt-1);">Restante: ${fmtK(d.monto_restante)}</span>
      </div>
      <div class="progress-wrap" style="margin-bottom:10px;"><div class="progress-fill" style="width:${pct}%;background:${color};"></div></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center;margin-bottom:10px;">
        <div><div style="font-size:13px;font-weight:500;">${pct}%</div><div style="font-size:10px;color:var(--txt-2);">Pagado</div></div>
        <div><div style="font-size:13px;font-weight:500;color:${tieneTasa?'var(--danger)':'var(--txt-1)'};">${tieneTasa?d.tasa_anual+'%':'N/D'}</div><div style="font-size:10px;color:var(--txt-2);">Tasa anual</div></div>
        <div><div style="font-size:13px;font-weight:500;">${d.cuota_mensual>0?fmtK(d.cuota_mensual):'N/D'}</div><div style="font-size:10px;color:var(--txt-2);">Cuota/mes</div></div>
        <div><div style="font-size:13px;font-weight:500;color:var(--amber);">${tiempoTxt}</div><div style="font-size:10px;color:var(--txt-2);">Restante</div></div>
      </div>
      ${interesesTxt}
      <div style="display:flex;gap:8px;">
        <button class="btn" style="flex:1;font-size:12px;display:flex;align-items:center;justify-content:center;gap:5px;" onclick="pagarDeuda(${d.id},'${d.nombre}')">${ICO.pay} Pago</button>
        <button class="btn" style="flex:1;font-size:12px;display:flex;align-items:center;justify-content:center;gap:5px;" onclick="editarDeuda(${d.id})">${ICO.edit} Editar</button>
        <button class="btn btn-primary" style="flex:1;font-size:12px;" onclick="navTo('ia')">Asesoria IA</button>
        <button class="icon-btn danger" onclick="eliminarDeuda(${d.id})" title="Eliminar" style="border:0.5px solid var(--brd-2);border-radius:8px;padding:0 10px;">${ICO.trash}</button>
      </div>
    </div>`;
}

function abrirModalDeuda() {
  S.tipoDeuda='personal'; S.claseDeuda='Tarjeta'; S.deudaEditId=null;
  ['d-nombre','d-original','d-restante','d-tasa','d-cuota','d-minimo'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('d-error').style.display='none';
  document.getElementById('d-clase').value = 'Tarjeta';
  document.getElementById('modal-deuda-title').textContent = 'Nueva deuda';
  selectTipoDeuda('personal');
  abrirModal('modal-deuda');
}

// Punto 3: editar deuda
function editarDeuda(id) {
  const d = S.deudas.find(x=>x.id===id);
  if (!d) return;
  S.deudaEditId = id;
  document.getElementById('d-nombre').value   = d.nombre;
  document.getElementById('d-original').value = d.monto_original;
  document.getElementById('d-restante').value = d.monto_restante;
  document.getElementById('d-tasa').value     = d.tasa_anual||'';
  document.getElementById('d-cuota').value    = d.cuota_mensual||'';
  document.getElementById('d-minimo').value   = d.pago_minimo||'';
  document.getElementById('d-clase').value    = d.clase||'Tarjeta';
  document.getElementById('modal-deuda-title').textContent = 'Editar deuda';
  selectTipoDeuda(d.tipo);
  abrirModal('modal-deuda');
}

function selectTipoDeuda(tipo) {
  S.tipoDeuda=tipo;
  document.getElementById('d-tipo-personal').classList.toggle('active', tipo==='personal');
  document.getElementById('d-tipo-compartida').classList.toggle('active', tipo==='compartida');
}

async function guardarDeuda() {
  const nombre = document.getElementById('d-nombre').value.trim();
  const orig   = parseFloat(document.getElementById('d-original').value);
  const rest   = parseFloat(document.getElementById('d-restante').value);
  const tasa   = parseFloat(document.getElementById('d-tasa').value)||0;
  const cuota  = parseFloat(document.getElementById('d-cuota').value)||0;
  const minimo = parseFloat(document.getElementById('d-minimo').value)||cuota;
  const clase  = document.getElementById('d-clase').value||'Otro';
  const errEl  = document.getElementById('d-error');
  errEl.style.display='none';
  if (!nombre) { errEl.textContent='El nombre es obligatorio'; errEl.style.display='block'; return; }
  if (!orig||orig<=0) { errEl.textContent='El monto original es obligatorio'; errEl.style.display='block'; return; }
  try {
    const body = { nombre, monto_original:orig, monto_restante:rest||orig, tasa_anual:tasa, cuota_mensual:cuota, pago_minimo:minimo, tipo:S.tipoDeuda, proporcional:S.tipoDeuda==='compartida', clase };
    if (S.deudaEditId) await api(`/deudas/${S.deudaEditId}`, {method:'PUT', body:JSON.stringify(body)});
    else               await api('/deudas',                   {method:'POST',body:JSON.stringify(body)});
    cerrarModal('modal-deuda');
    await cargarDeudas();
    renderDeudas();
  } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; }
}

async function pagarDeuda(id, nombre) {
  const monto = parseFloat(prompt(`Monto del pago para "${nombre}" (CRC):`));
  if (!monto||monto<=0) return;
  await api(`/deudas/${id}/pago`, {method:'POST', body:JSON.stringify({monto, nota:'Pago registrado'})});
  await cargarDeudas(); renderDeudas();
}

async function eliminarDeuda(id) {
  if (!confirm('Eliminar esta deuda?')) return;
  await api(`/deudas/${id}`, {method:'DELETE'});
  await cargarDeudas(); renderDeudas();
}

// ── Ahorros ───────────────────────────────────────────────
async function cargarAhorros() { S.ahorros = await api('/ahorros'); }

function renderAhorros() {
  const totalA=S.ahorros.reduce((s,m)=>s+m.actual,0);
  const totalM=S.ahorros.reduce((s,m)=>s+m.meta,0);
  const pct=totalM>0?Math.round(totalA/totalM*100):0;
  document.getElementById('ahorros-resumen').innerHTML=`
    <div class="lbl">Total ahorrado en todas las metas</div>
    <div style="font-size:24px;font-weight:500;color:var(--blue);margin:4px 0 2px;">${fmtK(totalA)}</div>
    <div style="font-size:12px;color:var(--txt-1);margin-bottom:10px;">de ${fmtK(totalM)} en ${S.ahorros.length} metas</div>
    <div class="progress-wrap"><div class="progress-fill" style="width:${pct}%;background:var(--blue);"></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:5px;">
      <span style="font-size:10px;color:var(--txt-1);">Progreso ${pct}%</span>
      <span style="font-size:10px;color:var(--txt-1);">Falta ${fmtK(totalM-totalA)}</span>
    </div>`;
  document.getElementById('ahorros-lista').innerHTML=S.ahorros.map(m=>metaCardHTML(m)).join('');
}

function metaCardHTML(m) {
  const disponible = m.actual - (m.utilizado||0);
  const pctAhorrado = Math.min(100, Math.round((m.actual/m.meta)*100));
  const pctUtilizado = m.meta>0 ? Math.round(((m.utilizado||0)/m.meta)*100) : 0;
  const color = m.color||'var(--blue)';
  const esCumplida = m.cumplida || false;
  return `
    <div class="card" style="${esCumplida?'opacity:0.8;border-color:var(--success);':''}">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:500;${esCumplida?'text-decoration:line-through;color:var(--txt-1);':''}">${m.nombre}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
            <span class="badge ${m.tipo==='compartido'?'badge-shared':'badge-personal'}">${m.tipo==='compartido'?'Compartida':m.propietario||'Personal'}</span>
            ${esCumplida?'<span style="font-size:10px;color:var(--success);font-weight:500;">✓ Cumplida</span>':''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <div style="font-size:18px;font-weight:500;color:${esCumplida?'var(--success)':color};">${pctAhorrado}%</div>
          ${!esCumplida?`<button class="icon-btn" onclick="editarMeta(${m.id})" title="Editar">${ICO.edit}</button>`:''}
          <button class="icon-btn danger" onclick="confirmarEliminarMeta(${m.id},'${m.nombre}')" title="Eliminar">${ICO.trash}</button>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--txt-1);margin-bottom:4px;">
        <span>Ahorrado: <strong style="color:${color};">${fmt(m.actual)}</strong></span>
        <span>Meta: <strong>${fmt(m.meta)}</strong></span>
      </div>
      <div class="progress-wrap" style="margin-bottom:6px;">
        <div class="progress-fill" style="width:${pctAhorrado}%;background:${esCumplida?'var(--success)':color};"></div>
      </div>
      ${(m.utilizado||0)>0?`
      <div style="font-size:11px;color:var(--txt-1);margin-bottom:6px;">
        Utilizado: <span style="color:var(--amber);font-weight:500;">${fmt(m.utilizado)}</span>
        &nbsp;·&nbsp; Disponible: <span style="color:var(--success);font-weight:500;">${fmt(Math.max(0,disponible))}</span>
      </div>`:''}
      ${!esCumplida?`
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
        ${pctAhorrado<100?`<button class="btn btn-primary" style="flex:1;min-width:80px;font-size:12px;" onclick="abonarMeta(${m.id},'${m.nombre}')">${ICO.plus} Abonar</button>`:''}
        ${m.actual>0?`<button class="btn" style="flex:1;min-width:80px;font-size:12px;border-color:var(--amber);color:var(--amber);" onclick="usarAhorro(${m.id},'${m.nombre}',${m.actual})">Registrar uso</button>`:''}
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;color:var(--txt-1);cursor:pointer;padding:6px 10px;border:0.5px solid var(--brd);border-radius:8px;">
          <input type="checkbox" onchange="toggleCumplida(${m.id},this.checked)" style="width:14px;height:14px;accent-color:var(--success);cursor:pointer;">
          Meta cumplida
        </label>
      </div>`:'<div style="text-align:center;color:var(--success);font-size:12px;padding:6px;">Historial conservado — meta cumplida</div>'}
    </div>`;
}

async function toggleCumplida(id, checked) {
  if (!checked) return;
  if (!confirm('¿Marcar como cumplida? Se conservará el historial.')) {
    await cargarAhorros(); renderAhorros(); return;
  }
  try {
    await api(`/ahorros/${id}/cumplida`, {method:'PATCH'});
    await cargarAhorros(); renderAhorros();
  } catch(e) { alert('Error: '+e.message); }
}

async function confirmarEliminarMeta(id, nombre) {
  const conf = confirm(
    `¿Eliminar la meta "${nombre}"?\n\nEsto eliminará la meta y todos sus abonos.\nEl historial no se puede recuperar.\n\n¿Continuar?`
  );
  if (!conf) return;
  try {
    await api(`/ahorros/${id}`, {method:'DELETE'});
    await cargarAhorros();
    if (S.miembroActivoId) renderVistaMiembro(S.miembroActivoId, S.miembroActivoNombre);
    renderAhorros();
  } catch(e) { alert('Error: '+e.message); }
}

async function eliminarMeta(id) { await confirmarEliminarMeta(id, 'esta meta'); }
async function usarAhorro(id, nombre, disponible) {
  const monto = parseFloat(prompt(`Monto utilizado de "${nombre}"\nDisponible: ${fmt(disponible)}\n\nIngresa el monto usado (CRC):`));
  if (!monto || monto <= 0) return;
  if (monto > disponible) { alert(`No puedes usar más de ${fmt(disponible)}`); return; }
  try {
    await api(`/ahorros/${id}/usar`, {method:'POST', body:JSON.stringify({monto})});
    await cargarAhorros(); renderAhorros();
  } catch(e) { alert('Error: '+e.message); }
}

function editarMeta(id) {
  const m = S.ahorros.find(x=>x.id===id);
  if (!m) return;
  S.metaEditId = id;
  document.getElementById('m-nombre').value = m.nombre;
  document.getElementById('m-meta').value   = m.meta;
  document.getElementById('m-actual').value = m.actual;
  document.getElementById('m-error').style.display='none';
  selectTipoMeta(m.tipo||'compartido');
  abrirModal('modal-meta');
}

function abrirModalMeta() {
  S.metaEditId=null; S.emojiMeta='objetivo'; S.tipoMeta='compartido'; S.propMeta=S.miembros[0]?.nombre||'David';
  ['m-nombre','m-meta','m-actual'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('m-error').style.display='none';
  selectTipoMeta('compartido');
  abrirModal('modal-meta');
}

function selectTipoMeta(tipo) {
  S.tipoMeta=tipo;
  document.getElementById('m-tipo-compartido').classList.toggle('active',tipo==='compartido');
  document.getElementById('m-tipo-personal').classList.toggle('active',tipo==='personal');
  document.getElementById('m-propietario-wrap').style.display=tipo==='personal'?'block':'none';
}

function selectPropietario(p) {
  S.propMeta=p;
  S.miembros.forEach(m=>{
    const btn=document.getElementById(`m-prop-${m.nombre.toLowerCase()}`);
    if(btn) btn.classList.toggle('active',m.nombre===p);
  });
}

async function guardarMeta() {
  const nombre=document.getElementById('m-nombre').value.trim();
  const meta=parseFloat(document.getElementById('m-meta').value);
  const actual=parseFloat(document.getElementById('m-actual').value)||0;
  const errEl=document.getElementById('m-error');
  errEl.style.display='none';
  if(!nombre){errEl.textContent='Ingresa un nombre';errEl.style.display='block';return;}
  if(!meta||meta<=0){errEl.textContent='Ingresa un monto objetivo';errEl.style.display='block';return;}
  try {
    const body={nombre,emoji:'objetivo',color:'#378ADD',meta,actual,tipo:S.tipoMeta,propietario:S.tipoMeta==='personal'?S.propMeta:null};
    if(S.metaEditId) {
      await api('/ahorros/'+S.metaEditId,{method:'PUT',body:JSON.stringify(body)});
      S.metaEditId=null;
    } else {
      await api('/ahorros',{method:'POST',body:JSON.stringify(body)});
    }
    cerrarModal('modal-meta');
    await cargarAhorros(); renderAhorros();
  } catch(e){errEl.textContent=e.message;errEl.style.display='block';}
}

async function abonarMeta(id, nombre) {
  const monto = parseFloat(prompt(`Monto del abono para "${nombre}" (CRC):`));
  if (!monto || monto <= 0) return;
  // Pasar mes y quincena actuales para que aparezca en la vista personal
  const quincena = new Date().getDate() <= 15 ? 1 : 2;
  try {
    await api(`/ahorros/${id}/abono`, {method:'POST', body:JSON.stringify({
      monto, quincena, mes: S.mes, anio: S.anio
    })});
    await cargarAhorros(); renderAhorros();
    // Refrescar vista personal si está activa
    if (S.miembroActivoId) renderVistaMiembro(S.miembroActivoId, S.miembroActivoNombre);
  } catch(e) { alert('Error: '+e.message); }
}

async function eliminarMeta(id) {
  if(!confirm('Eliminar esta meta?')) return;
  await api(`/ahorros/${id}`,{method:'DELETE'});
  await cargarAhorros(); renderAhorros();
}

// Aporte real manual — guarda en memoria (no afecta los gastos registrados)
function actualizarAporteReal(nombre, valor) {
  if (!S.aportesReales) S.aportesReales = {};
  S.aportesReales[nombre] = parseFloat(valor) || 0;
  // Recalcular balance visual
  if (S.balance?.por_miembro) {
    const m = Object.values(S.balance.por_miembro).find(x=>x.nombre===nombre);
    if (m) {
      const aporte = S.aportesReales[nombre];
      const diff = aporte - m.debe_aportar;
      const etiqueta = diff >= 0 ? 'Pago de más' : 'Pendiente';
      const color = diff >= 0 ? 'var(--success)' : 'var(--danger)';
      // Actualizar todos los indicadores de balance de esta persona en pantalla
      document.querySelectorAll(`[id^="aporte-real-${nombre}"], [id^="aporte-manual-"]`).forEach(el => {
        const parentDiv = el.closest('.card, div[style*="margin-bottom:14px"]');
        if (parentDiv) {
          const balEl = parentDiv.querySelector('[style*="font-weight:500;flex-shrink"]') ||
                        parentDiv.querySelector('[style*="font-weight:500;color:var"]');
          if (balEl) {
            balEl.textContent = `${etiqueta}: ${fmtK(Math.abs(diff))}`;
            balEl.style.color = color;
          }
        }
      });
    }
  }
}

// ── Metricas con datos reales ─────────────────────────────
function iniciarSelectorMesMetricas() {
  const row = document.getElementById('met-meses-row');
  if (!row) return;
  const mesActual = S.metMes || S.mes;
  row.innerHTML = MESES.map((m,i) => `
    <button class="tab ${i+1===mesActual?'active':''}"
      onclick="switchMesMetrica(this,${i+1})"
      style="font-size:11px;padding:4px 10px;">
      ${m.slice(0,3)} ${i+1===S.mes?'(actual)':''}
    </button>`).join('');
}

function switchMesMetrica(el, mes) {
  S.metMes = mes;
  document.querySelectorAll('#met-meses-row .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  // Mantener el tipo activo
  const tipoActivo = document.querySelector('#view-metricas .tab-row:not(#met-meses-row) .tab.active');
  const tipo = tipoActivo ? tipoActivo.getAttribute('onclick').match(/'(\w+)'/)?.[1] : 'conjunta';
  renderMetricas(tipo || 'conjunta');
}

function switchMetricaTab(el, tipo) {
  document.querySelectorAll('#view-metricas .tab-row:not(#met-meses-row) .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  renderMetricas(tipo);
}

async function renderMetricas(tipo) {
  // Destruir charts anteriores
  ['chart-pie','chart-linea','chart-barras','chart-extra'].forEach(id=>{
    if(S.charts[id]){S.charts[id].destroy();delete S.charts[id];}
  });

  // Usar mes de métricas independiente del overview
  const mes  = S.metMes  || S.mes;
  const anio = S.metAnio || S.anio;

  // Cargar datos reales del servidor para el mes seleccionado
  let M;
  try { M = await api(`/metricas?mes=${mes}&anio=${anio}`); }
  catch(e) { console.error('Error metricas:', e); return; }

  const yFmt = v => v>=1000000?`${(v/1000000).toFixed(1)}M`:`${(v/1000).toFixed(0)}k`;
  const chartOpts = (extra={}) => ({
    responsive: true,
    plugins: { legend:{ labels:{ font:{size:11}, boxWidth:12 }}, ...extra.plugins },
    scales: extra.scales || {
      x:{ grid:{display:false}, ticks:{font:{size:10}} },
      y:{ grid:{color:'rgba(128,128,128,0.1)'}, ticks:{callback:yFmt, font:{size:9}} }
    }
  });

  const mesLabel = MESES[(mes||S.mes)-1];

  if (tipo === 'conjunta') {
    // 1. Pastel — gastos por categoría (datos reales)
    const cats = M.gastos_por_categoria;
    const catLabels = Object.keys(cats);
    const catData   = Object.values(cats);
    document.getElementById('met-title-1').textContent = `Gastos por categoria — ${mesLabel}`;
    if (catLabels.length) {
      S.charts['chart-pie'] = new Chart(document.getElementById('chart-pie'), {
        type:'doughnut',
        data:{ labels:catLabels, datasets:[{data:catData, backgroundColor:COLORES, borderWidth:0}] },
        options:{ responsive:true, plugins:{ legend:{labels:{font:{size:11},boxWidth:12}} }, cutout:'60%' }
      });
      const lp=document.getElementById('leyenda-pie');
      if(lp) lp.innerHTML=catLabels.map((l,i)=>
        `<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--txt-1);">
          <div style="width:8px;height:8px;border-radius:2px;background:${COLORES[i%COLORES.length]};"></div>
          ${l}: ${fmtK(catData[i])}
        </div>`).join('');
    } else {
      document.getElementById('chart-pie').parentElement.innerHTML += '<div style="text-align:center;color:var(--txt-2);font-size:13px;padding:20px;">Sin gastos registrados este mes</div>';
      const lp=document.getElementById('leyenda-pie'); if(lp) lp.innerHTML='';
    }

    // 2. Línea — tendencia 6 meses con excedente Y ahorro real
    document.getElementById('met-title-2').textContent = 'Tendencia ultimos 6 meses';
    const tend = M.tendencia_6m;
    // Ahorro real por mes desde el módulo de ahorros (abonos reales)
    const ahorroRealPorMes = tend.map(t => {
      const [mesStr, anioStr] = t.mes.split('/');
      return M.ahorros_por_mes?.[t.mes] || 0;
    });
    S.charts['chart-linea'] = new Chart(document.getElementById('chart-linea'), {
      type:'line',
      data:{ labels:tend.map(t=>t.mes), datasets:[
        {label:'Ingresos',   data:tend.map(t=>t.ingresos), borderColor:'#1D9E75', backgroundColor:'rgba(29,158,117,0.06)',  tension:0.4, fill:true, pointRadius:3},
        {label:'Gastos',     data:tend.map(t=>t.gastos),   borderColor:'#F0997B', backgroundColor:'rgba(240,153,123,0.06)', tension:0.4, fill:true, pointRadius:3},
        {label:'Excedente',  data:tend.map(t=>t.ahorro),   borderColor:'#378ADD', backgroundColor:'transparent',             tension:0.4, fill:false, pointRadius:3, borderDash:[5,4]},
        {label:'Ahorro real',data:ahorroRealPorMes,         borderColor:'#7F77DD', backgroundColor:'rgba(127,119,221,0.06)', tension:0.4, fill:true, pointRadius:3},
      ]},
      options: chartOpts()
    });

    // 3. Barras — quincenas del mes actual (datos reales)
    document.getElementById('met-title-3').textContent = `Ingresos vs Gastos — Quincenas ${mesLabel}`;
    const q = M.quincenas;
    S.charts['chart-barras'] = new Chart(document.getElementById('chart-barras'), {
      type:'bar',
      data:{ labels:[`Q1 (1-15)`,`Q2 (16-30)`], datasets:[
        {label:'Ingresos',data:[q[1].ingresos,q[2].ingresos],backgroundColor:'rgba(29,158,117,0.8)',borderRadius:6},
        {label:'Gastos',  data:[q[1].gastos,  q[2].gastos],  backgroundColor:'rgba(240,153,123,0.8)',borderRadius:6},
      ]},
      options: chartOpts()
    });

    // 4. KPIs numéricos debajo
    const kpisEl = document.getElementById('met-kpis');
    if(kpisEl) {
      const tasaAhorro = M.totales.ingresos > 0 ? Math.round((M.totales.ingresos-M.totales.gastos)/M.totales.ingresos*100) : 0;
      const pctCompartido = M.totales.gastos > 0 ? Math.round(M.gastos_por_tipo.compartido/M.totales.gastos*100) : 0;
      kpisEl.innerHTML = `
        <div class="grid-2">
          <div class="card-sm"><div class="lbl">Tasa de ahorro</div><div style="font-size:20px;font-weight:500;color:${tasaAhorro>=20?'var(--success)':'var(--amber)'};">${tasaAhorro}%</div><div style="font-size:10px;color:var(--txt-2);">Meta recomendada: 20%</div></div>
          <div class="card-sm"><div class="lbl">Gasto compartido</div><div style="font-size:20px;font-weight:500;color:var(--acc);">${pctCompartido}%</div><div style="font-size:10px;color:var(--txt-2);">del total de gastos</div></div>
          <div class="card-sm"><div class="lbl">Total ingresos</div><div style="font-size:18px;font-weight:500;color:var(--success);">${fmtK(M.totales.ingresos)}</div></div>
          <div class="card-sm"><div class="lbl">Total gastos</div><div style="font-size:18px;font-weight:500;color:var(--danger);">${fmtK(M.totales.gastos)}</div></div>
        </div>`;
    }

  } else if (tipo === 'individual') {
    // Ingresos por miembro
    document.getElementById('met-title-1').textContent = 'Ingresos por persona';
    const miembrosData = Object.values(M.por_miembro);
    S.charts['chart-pie'] = new Chart(document.getElementById('chart-pie'), {
      type:'doughnut',
      data:{ labels:miembrosData.map(m=>m.nombre), datasets:[{data:miembrosData.map(m=>m.ingresos), backgroundColor:['#7F77DD','#1D9E75','#F0997B'], borderWidth:0}] },
      options:{ responsive:true, plugins:{ legend:{labels:{font:{size:12},boxWidth:12}} }, cutout:'60%' }
    });
    const lp=document.getElementById('leyenda-pie');
    if(lp) lp.innerHTML=miembrosData.map((m,i)=>
      `<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--txt-1);">
        <div style="width:8px;height:8px;border-radius:2px;background:${['#7F77DD','#1D9E75','#F0997B'][i]};"></div>
        ${m.nombre}: ${fmtK(m.ingresos)} (${m.pct_ingreso}%)
      </div>`).join('');

    // Ingresos vs gastos por persona (barras)
    document.getElementById('met-title-2').textContent = 'Ingresos vs Gastos por persona';
    S.charts['chart-linea'] = new Chart(document.getElementById('chart-linea'), {
      type:'bar',
      data:{ labels:miembrosData.map(m=>m.nombre), datasets:[
        {label:'Ingresos',data:miembrosData.map(m=>m.ingresos),backgroundColor:'rgba(29,158,117,0.8)',borderRadius:6},
        {label:'Gastos',  data:miembrosData.map(m=>m.gastos),  backgroundColor:'rgba(240,153,123,0.8)',borderRadius:6},
      ]},
      options: chartOpts()
    });

    // Aporte proporcional
    document.getElementById('met-title-3').textContent = 'Aporte proporcional en gastos compartidos';
    const totalIng = miembrosData.reduce((s,m)=>s+m.ingresos,0);
    S.charts['chart-barras'] = new Chart(document.getElementById('chart-barras'), {
      type:'bar',
      data:{ labels:miembrosData.map(m=>m.nombre), datasets:[
        {label:'% de aporte',data:miembrosData.map(m=>m.pct_ingreso),backgroundColor:'rgba(127,119,221,0.8)',borderRadius:6},
      ]},
      options:{ responsive:true, plugins:{legend:{labels:{font:{size:11},boxWidth:12}}},
        scales:{ x:{grid:{display:false},ticks:{font:{size:10}}}, y:{ticks:{callback:v=>v+'%',font:{size:9}}} } }
    });

    const kpisEl = document.getElementById('met-kpis');
    if(kpisEl) kpisEl.innerHTML = `<div class="grid-2">` + miembrosData.map((m,i)=>`
      <div class="card-sm" style="border-left:3px solid ${['#7F77DD','#1D9E75'][i]||'#F0997B'};">
        <div style="font-size:13px;font-weight:500;margin-bottom:6px;">${m.nombre}</div>
        <div style="font-size:11px;color:var(--txt-1);">Ingresos: <span style="font-weight:500;color:var(--success);">${fmtK(m.ingresos)}</span></div>
        <div style="font-size:11px;color:var(--txt-1);">Gastos: <span style="font-weight:500;color:var(--danger);">${fmtK(m.gastos)}</span></div>
        <div style="font-size:11px;color:var(--txt-1);">Aporte: <span style="font-weight:500;">${m.pct_ingreso}%</span></div>
      </div>`).join('') + '</div>';

  } else { // deudas y ahorros
    // Deudas por clasificacion
    document.getElementById('met-title-1').textContent = 'Deudas por clasificacion';
    const dClase = M.deudas_por_clase;
    const dLabels = Object.keys(dClase);
    const dData   = Object.values(dClase);
    if(dLabels.length) {
      S.charts['chart-pie'] = new Chart(document.getElementById('chart-pie'), {
        type:'doughnut',
        data:{ labels:dLabels, datasets:[{data:dData, backgroundColor:COLORES, borderWidth:0}] },
        options:{ responsive:true, plugins:{legend:{labels:{font:{size:11},boxWidth:12}}}, cutout:'60%' }
      });
      const lp=document.getElementById('leyenda-pie');
      if(lp) lp.innerHTML=dLabels.map((l,i)=>
        `<div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--txt-1);">
          <div style="width:8px;height:8px;border-radius:2px;background:${COLORES[i%COLORES.length]};"></div>
          ${l}: ${fmtK(dData[i])}
        </div>`).join('');
    }

    // Progreso de ahorros (barras horizontales simuladas)
    document.getElementById('met-title-2').textContent = 'Progreso de metas de ahorro';
    const ahorros = M.ahorros;
    if(ahorros.length) {
      S.charts['chart-linea'] = new Chart(document.getElementById('chart-linea'), {
        type:'bar',
        data:{ labels:ahorros.map(a=>a.nombre), datasets:[
          {label:'Ahorrado', data:ahorros.map(a=>a.actual),  backgroundColor:'rgba(55,138,221,0.8)',  borderRadius:6},
          {label:'Meta',     data:ahorros.map(a=>a.meta),    backgroundColor:'rgba(128,128,128,0.2)', borderRadius:6},
        ]},
        options:{ ...chartOpts(), indexAxis:'y' }
      });
    }

    // Tendencia ahorros
    document.getElementById('met-title-3').textContent = 'Balance mensual (6 meses)';
    const tend = M.tendencia_6m;
    S.charts['chart-barras'] = new Chart(document.getElementById('chart-barras'), {
      type:'bar',
      data:{ labels:tend.map(t=>t.mes), datasets:[
        {label:'Balance', data:tend.map(t=>t.ahorro), backgroundColor:tend.map(t=>t.ahorro>=0?'rgba(29,158,117,0.8)':'rgba(240,153,123,0.8)'), borderRadius:6}
      ]},
      options: chartOpts()
    });

    const kpisEl = document.getElementById('met-kpis');
    if(kpisEl) kpisEl.innerHTML = `
      <div class="grid-2">
        <div class="card-sm"><div class="lbl">Total deudas</div><div style="font-size:18px;font-weight:500;color:var(--danger);">${fmtK(M.totales.deudas)}</div></div>
        <div class="card-sm"><div class="lbl">Total ahorrado</div><div style="font-size:18px;font-weight:500;color:var(--blue);">${fmtK(M.totales.ahorros)}</div></div>
      </div>`;
  }
}

// ── Asistente IA ──────────────────────────────────────────
function iniciarIASugerencias() {
  const sugs=['Como mejorar nuestros ahorros?','Cual deuda pagar primero?','Plan financiero para 6 meses','Como reducir gastos este mes?'];
  document.getElementById('ia-sugerencias').innerHTML=sugs.map(s=>
    `<button onclick="enviarIA('${s}')" style="flex-shrink:0;padding:7px 12px;border-radius:6px;font-size:12px;border:0.5px solid var(--brd-2);background:var(--card);color:var(--txt-1);cursor:pointer;white-space:nowrap;">${s}</button>`
  ).join('');
}

function toggleIAConfig() {
  const panel=document.getElementById('ia-config-panel');
  const hidden=panel.style.display==='none';
  panel.style.display=hidden?'block':'none';
  if(hidden) document.getElementById('gemini-key-input').value=S.geminiKey||'';
}

// API Key siempre guardada en BD de la familia — nunca en localStorage
async function guardarGeminiKey() {
  const k=document.getElementById('gemini-key-input').value.trim();
  if(!k) return;
  S.geminiKey=k;
  try {
    await api('/familia/gemini-key',{method:'POST',body:JSON.stringify({gemini_key:k})});
    actualizarBtnIA();
    toggleIAConfig();
  } catch(e){
    alert('Error al guardar la API Key. Verifica tu conexion.');
  }
}

// Siempre carga desde la BD — funciona para todos los miembros de la familia
async function cargarGeminiKey() {
  try {
    const r = await api('/familia/gemini-key');
    if(r.gemini_key) {
      S.geminiKey = r.gemini_key;
      actualizarBtnIA();
    }
  } catch(e){ console.warn('Sin API key configurada en la familia'); }
}
function actualizarBtnIA() {
  const btn=document.getElementById('ia-config-btn');
  if(btn){ btn.textContent='Clave configurada — cambiar'; btn.style.color='var(--success)'; }
}

async function enviarIA(texto) {
  const msg=texto||document.getElementById('ia-input').value.trim();
  if(!msg) return;
  if(!S.geminiKey){toggleIAConfig();return;}
  document.getElementById('ia-input').value='';
  document.getElementById('ia-sugerencias').style.display='none';
  const cont=document.getElementById('ia-mensajes');
  cont.innerHTML+=`
    <div style="display:flex;gap:8px;flex-direction:row-reverse;">
      <div style="width:28px;height:28px;border-radius:50%;background:var(--purple-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--purple);">${ICO.user}</div>
      <div style="background:var(--purple-bg);border:0.5px solid var(--brd);border-radius:12px 4px 12px 12px;padding:10px 12px;font-size:13px;max-width:80%;line-height:1.6;">${msg}</div>
    </div>`;
  const loadId='load-'+Date.now();
  cont.innerHTML+=`<div id="${loadId}" style="display:flex;gap:8px;"><div style="width:28px;height:28px;border-radius:50%;background:var(--acc-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--acc);">${ICO.bot}</div><div style="background:var(--card);border:0.5px solid var(--brd);border-radius:4px 12px 12px 12px;padding:10px 16px;"><div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div></div></div>`;
  cont.scrollTop=cont.scrollHeight;

  // Contexto financiero completo con datos individuales
  const totalIng = S.ingresos.reduce((s,i)=>s+i.monto,0)||0;
  const totalGas = S.gastos.reduce((s,g)=>s+g.monto,0)||0;
  const miembrosStr = S.miembros.map(m=>m.nombre).join(' y ')||'la pareja';

  // Datos individuales por miembro
  const datosIndividuales = S.miembros.map(m => {
    const ingM  = S.ingresos.filter(i=>i.usuario_id===m.id).reduce((s,i)=>s+i.monto,0);
    const gasM  = S.gastos.filter(g=>g.usuario_id===m.id&&g.tipo==='personal').reduce((s,g)=>s+g.monto,0);
    const gasComp = S.gastos.filter(g=>g.usuario_id===m.id&&g.tipo==='compartido').reduce((s,g)=>s+g.monto,0);
    const pct   = totalIng>0 ? Math.round(ingM/totalIng*100) : 0;
    return `${m.nombre}: ingreso ${fmtK(ingM)} (${pct}% del total), gastos personales ${fmtK(gasM)}, gastos compartidos registrados ${fmtK(gasComp)}`;
  }).join('\n');

  // Gastos compartidos detallados con aportes
  const gastosComp = S.gastos.filter(g=>g.tipo==='compartido').map(g=>{
    const aportes = (g.aportes||[]).map(a=>`${a.nombre}: ${fmtK(a.monto)}`).join(', ');
    return `${g.descripcion} (${g.categoria}): total ${fmtK(g.monto)}${aportes?`, aportes: ${aportes}`:''}`;
  }).join('\n') || 'ninguno';

  // Balance proporcional
  const balProp = S.balance?.por_miembro ? Object.values(S.balance.por_miembro).map(m=>
    `${m.nombre}: debe aportar ${fmtK(m.debe_aportar)}, ya aportó ${fmtK(m.ya_aporto)}, ${m.balance>=0?`pagó de más ${fmtK(m.balance)}`:`pendiente ${fmtK(Math.abs(m.balance))}`}`
  ).join('\n') : 'no disponible';

  const deuStr = S.deudas.map(d=>
    `${d.nombre} (${d.clase||'Otro'}, ${d.tipo}): tasa ${d.tasa_anual>0?d.tasa_anual+'%':'desconocida'}, saldo ${fmtK(d.monto_restante)}, cuota ${d.cuota_mensual>0?fmtK(d.cuota_mensual):'N/D'}`
  ).join('\n')||'ninguna';

  const ahoStr = S.ahorros.map(a=>
    `${a.nombre} (${a.tipo}): ${fmtK(a.actual)} de ${fmtK(a.meta)} (${Math.round(a.actual/a.meta*100)}%)${a.cumplida?' — cumplida':''}`
  ).join('\n')||'ninguna';

  const ctx=`Eres un asesor financiero personal experto, directo y practico. Ayudas a ${miembrosStr}, una pareja costarricense con sistema quincenal (ingresos cada 15 dias).

=== DATOS FINANCIEROS REALES — ${MESES[S.mes-1]} ${S.anio} ===

RESUMEN FAMILIAR:
- Ingresos totales: ${fmtK(totalIng)}
- Gastos totales: ${fmtK(totalGas)}
- Balance disponible: ${fmtK(totalIng-totalGas)}

DATOS INDIVIDUALES:
${datosIndividuales}

BALANCE PROPORCIONAL EN GASTOS COMPARTIDOS:
${balProp}

GASTOS COMPARTIDOS DEL MES:
${gastosComp}

DEUDAS ACTIVAS:
${deuStr}

METAS DE AHORRO:
${ahoStr}

=== INSTRUCCIONES ===
1. Responde SIEMPRE en espanol
2. Usa CRC para montos (ej: CRC 50 000)
3. Da respuestas COMPLETAS y detalladas
4. Cuando menciones a alguien, usa su nombre (${miembrosStr})
5. Considera el sistema quincenal al dar recomendaciones
6. Si hay desequilibrio entre miembros, mencionalo
7. Ve directo a la respuesta sin repetir el contexto`;

  try {
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${S.geminiKey}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[
          {role:'user',parts:[{text:ctx}]},
          {role:'model',parts:[{text:'Entendido. Estoy listo para dar asesoria financiera completa y detallada.'}]},
          {role:'user',parts:[{text:msg}]}
        ],
        generationConfig:{
          temperature:0.7,
          maxOutputTokens:4096,
          topP:0.95
        }
      })
    });
    const data=await res.json();
    const finishReason=data?.candidates?.[0]?.finishReason;
    let resp=data?.candidates?.[0]?.content?.parts?.[0]?.text||(data?.error?.message?`Error de API: ${data.error.message}`:'Sin respuesta.');
    if(finishReason==='MAX_TOKENS') resp += '\n\n_(Respuesta larga — escribe "continua" para ver el resto)_';
    // Renderizar markdown
    const html=resp
      .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.*?)\*/g,'<em>$1</em>')
      .replace(/#{1,3}\s(.*?)(\n|$)/g,'<div style="font-size:13px;font-weight:600;margin:8px 0 4px;">$1</div>')
      .replace(/^(\d+)\.\s(.+)/gm,'<div style="margin:3px 0;"><strong>$1.</strong> $2</div>')
      .replace(/^[-•]\s(.+)/gm,'<div style="margin:3px 0;">• $1</div>')
      .replace(/\n\n/g,'<br><br>')
      .replace(/\n/g,'<br>');
    document.getElementById(loadId).outerHTML=`<div style="display:flex;gap:8px;"><div style="width:28px;height:28px;border-radius:50%;background:var(--acc-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--acc);">${ICO.bot}</div><div style="background:var(--card);border:0.5px solid var(--brd);border-radius:4px 12px 12px 12px;padding:12px 14px;font-size:13px;max-width:88%;line-height:1.7;">${html}</div></div>`;
  } catch(e) {
    document.getElementById(loadId).outerHTML=`<div style="color:var(--danger);font-size:13px;padding:8px;">Error de conexion: ${e.message}</div>`;
  }
  cont.scrollTop=cont.scrollHeight;
}

// ── Temas (fix: guardar en BD + aplicar al cargar) ────────
const TEMAS=[
  {id:'light', nombre:'Light',  desc:'Limpio y luminoso',  colores:['#1D9E75','#F0997B','#378ADD'], bg:'#f4f4f2'},
  {id:'dark',  nombre:'Dark',   desc:'Oscuro y elegante',  colores:['#1D9E75','#F0997B','#378ADD'], bg:'#1e1e1e'},
  {id:'pastel',nombre:'Pastel', desc:'Calido y suave',     colores:['#c47a5a','#b07db0','#7aaac4'], bg:'#f5ede4'},
  {id:'rose',  nombre:'Rose',   desc:'Femenino y moderno', colores:['#e879a0','#f4a7c3','#c06090'], bg:'#fff0f5'},
];

function iniciarTemas() {
  const temaActual=S.usuario?.tema||'light';
  document.getElementById('temas-list').innerHTML=TEMAS.map(t=>`
    <div onclick="aplicarTema('${t.id}')" style="display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:10px;border:${temaActual===t.id?'2px solid var(--acc)':'0.5px solid var(--brd)'};cursor:pointer;margin-bottom:8px;">
      <div style="width:44px;height:44px;border-radius:8px;background:${t.bg};display:flex;gap:4px;padding:8px;align-items:flex-end;flex-shrink:0;">
        ${t.colores.map((c,i)=>`<div style="flex:1;height:${[28,18,22][i]}px;background:${c};border-radius:2px 2px 0 0;"></div>`).join('')}
      </div>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:500;color:var(--txt-0);">${t.nombre}</div>
        <div style="font-size:11px;color:var(--txt-1);">${t.desc}</div>
      </div>
      ${temaActual===t.id?`<span style="color:var(--acc);">${ICO.check}</span>`:''}
    </div>`).join('');
}

function aplicarTema(tema) {
  // Aplicar visualmente de inmediato
  document.getElementById('app').setAttribute('data-theme', tema);
  document.documentElement.setAttribute('data-theme', tema);
  // Guardar en BD para este usuario
  if(S.usuario) S.usuario.tema = tema;
  api('/auth/tema', {method:'PATCH', body:JSON.stringify({tema})})
    .catch(e => console.warn('Error guardando tema:', e));
  // Refrescar selector de temas
  iniciarTemas();
}

// Punto 5: polling para tiempo real (cada 15 segundos)
function iniciarPolling() {
  setInterval(async () => {
    try {
      const [ingresos, gastos, resumen, deudas, ahorros] = await Promise.all([
        api(`/ingresos?mes=${S.mes}&anio=${S.anio}`),
        api(`/gastos?mes=${S.mes}&anio=${S.anio}`),
        api(`/resumen?mes=${S.mes}&anio=${S.anio}`),
        api('/deudas'),
        api('/ahorros'),
      ]);
      const cambiaron = JSON.stringify([ingresos,gastos,deudas,ahorros]) !==
                        JSON.stringify([S.ingresos,S.gastos,S.deudas,S.ahorros]);
      S.ingresos=ingresos; S.gastos=gastos;
      S.resumen=resumen; S.deudas=deudas; S.ahorros=ahorros;
      if(!cambiaron) return; // sin cambios, no re-renderizar
      // Refrescar vista activa silenciosamente
      const activa=document.querySelector('.view.active')?.id?.replace('view-','');
      if(activa==='overview') renderOverview();
      if(activa==='deudas')   renderDeudas();
      if(activa==='ahorros')  renderAhorros();
      if(activa && activa.startsWith('m') && S.miembroActivoId)
        renderVistaMiembro(S.miembroActivoId, S.miembroActivoNombre);
      // Indicador sutil de actualización
      const ind=document.getElementById('sync-indicator');
      if(ind){ind.style.opacity='1';setTimeout(()=>{ind.style.opacity='0';},1500);}
    } catch(e) { /* ignorar errores de polling silenciosamente */ }
  }, 15000);
}

// ── Config ─────────────────────────────────────────────────
async function unirseAFamilia() {
  const codigo=document.getElementById('codigo-union').value.trim().toUpperCase();
  if(!codigo) return;
  try {
    await api(`/auth/unirse?codigo=${codigo}`,{method:'POST'});
    alert('Te uniste a la familia. Recarga la app.');
    location.reload();
  } catch(e){alert('Error: '+e.message);}
}

async function logout() {
  await api('/auth/logout',{method:'POST'});
  window.location.href='/login';
}

// ── Modales ───────────────────────────────────────────────
function abrirModal(id)  { document.getElementById(id).classList.add('open'); }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click',e=>{
  if(e.target.classList.contains('modal-overlay')) cerrarModal(e.target.id);
});

// ── Helpers ───────────────────────────────────────────────
function setText(id,txt){const el=document.getElementById(id);if(el)el.textContent=txt;}
