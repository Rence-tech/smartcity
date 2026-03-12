/* ================================================================
   dashboard.js  —  Smart Transport System v3
   Pure client-side: Leaflet map, 3 animated jeepneys,
   Geolocation API, passenger simulation (no server needed)
   ================================================================ */

// ── State ──────────────────────────────────────────────────────────────────
let map = null;
let jeepMarkers = [null, null, null];
let jeepT = [0, 0.33, 0.66];          // t-positions for each jeepney
let jeepSpeed = [0.0018, 0.0022, 0.0016]; // speed per tick (varies)
let activeIdx = 0;
let autoSim = true;
let userLocMarker = null;
let userAccCircle = null;
let watchId = null;
let geoActive = false;

// ── Clock ──────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const date = now.toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
  const el = document.getElementById('d-clock');
  if (el) el.textContent = time;
  const de = document.getElementById('d-date');
  if (de) de.textContent = date;
}
setInterval(updateClock, 1000);
updateClock();

// ── Leaflet Map Init ───────────────────────────────────────────────────────
function initMap() {
  const el = document.getElementById('route-map');
  if (!el || !window.L) return;

  map = L.map('route-map', {
    center: [14.542, 121.060],
    zoom: 14,
    zoomControl: true,
  });

  // OpenStreetMap tiles (free)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  // Inject custom marker CSS
  injectCSS();

  // Route polyline (glow effect using two layers)
  const coords = window.ROUTE_COORDS;
  L.polyline(coords, { color: '#1565c0', weight: 7,   opacity: 0.5 }).addTo(map);
  L.polyline(coords, { color: '#00b0ff', weight: 3.5, opacity: 0.85 }).addTo(map);
  L.polyline(coords, { color: '#80d8ff', weight: 1.5, opacity: 0.5, dashArray: '6 12' }).addTo(map);

  // Stop markers
  window.ROUTE_STOPS.forEach((stop, i) => {
    const isStart = stop.type === 'start';
    const isEnd   = stop.type === 'end';
    const bg      = isStart ? '#00e676' : isEnd ? '#ff6d00' : '#00b0ff';
    const sz      = (isStart || isEnd) ? 18 : 13;
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:${sz}px;height:${sz}px;border-radius:50%;
        background:${bg};border:3px solid #020b18;
        box-shadow:0 0 12px ${bg}99;
        position:relative;">
        ${(isStart||isEnd)?`<div style="position:absolute;top:-2px;left:-2px;width:${sz+4}px;height:${sz+4}px;border-radius:50%;background:${bg};opacity:0.25;animation:ripple 2s infinite;"></div>`:''}
      </div>`,
      iconSize: [sz, sz], iconAnchor: [sz/2, sz/2],
    });
    const m = L.marker([stop.lat, stop.lng], { icon }).addTo(map);
    m.bindPopup(`
      <div class="pop-box">
        <div class="pop-title">${isStart?'🚌':''}${isEnd?'🏁':'📍'} ${stop.name}</div>
        <div class="pop-sub">${stop.sub}</div>
      </div>
    `, { maxWidth: 240 });
  });

  // Fit to route bounds
  map.fitBounds(coords, { padding: [50, 50] });

  // Start jeepney animation
  startAnimation();
}

// ── Inject CSS for popups & tooltips ──────────────────────────────────────
function injectCSS() {
  if (document.getElementById('jeep-style')) return;
  const s = document.createElement('style');
  s.id = 'jeep-style';
  s.textContent = `
    .pop-box { font-family: 'Outfit', sans-serif; min-width: 160px; }
    .pop-title { font-weight: 700; font-size: 13px; color: #0d47a1; margin-bottom: 4px; }
    .pop-sub   { font-size: 11px; color: #546e7a; }
    .pop-pax   { margin-top: 8px; font-size: 12px; font-weight: 600; }
    .pop-bar   { height: 6px; background: #e0e0e0; border-radius: 3px; margin-top: 4px; overflow: hidden; }
    .pop-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }
    .jeep-marker-wrap { cursor: pointer; }
    .jeep-tt {
      background: rgba(4,16,32,.94) !important;
      border: 1px solid rgba(0,229,255,.35) !important;
      border-radius: 8px !important;
      color: #e0f7fa !important;
      font-family: 'JetBrains Mono', monospace !important;
      font-size: 11px !important;
      padding: 4px 10px !important;
      box-shadow: 0 0 14px rgba(0,229,255,.3) !important;
      white-space: nowrap !important;
    }
    .jeep-tt::before { display:none !important; }
    @keyframes ripple { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(2.2);opacity:0} }
    .user-dot {
      width: 16px; height: 16px; border-radius: 50%;
      background: #2979ff;
      border: 3px solid #fff;
      box-shadow: 0 0 0 6px rgba(41,121,255,.25);
      animation: userPulse 2s ease-in-out infinite;
    }
    @keyframes userPulse {
      0%,100% { box-shadow: 0 0 0 4px rgba(41,121,255,.25); }
      50%      { box-shadow: 0 0 0 10px rgba(41,121,255,.08); }
    }
  `;
  document.head.appendChild(s);
}

// ── Animation Engine ───────────────────────────────────────────────────────
function startAnimation() {
  // Create markers for each jeepney
  window.FLEET.forEach((j, idx) => {
    const pos = window.getPosAtT(jeepT[idx]);
    const bearing = window.getBearingAtT(jeepT[idx]);
    const st = window.getJeepStatus(j);
    const icon = window.makeJeepIcon(bearing, st.color, j.id);

    const m = L.marker(pos, { icon, zIndexOffset: 1000 + idx }).addTo(map);
    m.bindTooltip(`${j.id} · ${j.passengers}/${j.max}`, {
      permanent: true,
      direction: 'top',
      offset: [0, -24],
      className: 'jeep-tt',
    });
    m.bindPopup(makeJeepPopup(j, idx), { maxWidth: 260 });
    m.on('click', () => { selectJeepney(idx); });
    jeepMarkers[idx] = m;
  });

  // Tick every 550ms
  setInterval(animTick, 550);
}

function animTick() {
  window.FLEET.forEach((j, idx) => {
    // Advance t
    jeepT[idx] += jeepSpeed[idx];
    if (jeepT[idx] >= 1) {
      jeepT[idx] = 0;  // Loop back to start
      addLog(`🔄 ${j.id} restarting route`, 'cyan');
    }

    const pos     = window.getPosAtT(jeepT[idx]);
    const bearing = window.getBearingAtT(jeepT[idx]);
    const st      = window.getJeepStatus(j);

    if (jeepMarkers[idx]) {
      jeepMarkers[idx].setLatLng(pos);
      jeepMarkers[idx].setIcon(window.makeJeepIcon(bearing, st.color, j.id));

      // Update tooltip
      jeepMarkers[idx].setTooltipContent(`${j.id} · ${j.passengers}/${j.max}`);
    }

    // Update position tags
    updatePosTag(idx, pos, jeepT[idx]);
  });
}

function updatePosTag(idx, pos, t) {
  const id = ['pos-jny001', 'pos-jny002', 'pos-jny003'][idx];
  const el = document.getElementById(id);
  if (!el) return;
  const j = window.FLEET[idx];
  const stop = window.getNearestStop(pos);
  const pct = Math.round(t * 100);
  const st = window.getJeepStatus(j);
  el.style.color = st.color;
  el.textContent = stop
    ? `🚌 ${j.id}: At ${stop.name}`
    : `🚌 ${j.id}: En route ${pct}%`;
}

// ── Jeepney popup content ──────────────────────────────────────────────────
function makeJeepPopup(j, idx) {
  const st = window.getJeepStatus(j);
  const pct = Math.round((j.passengers / j.max) * 100);
  return `
    <div class="pop-box">
      <div class="pop-title">🚌 ${j.id} — ${j.plate}</div>
      <div class="pop-sub" style="color:${st.color};font-weight:700;">${st.label}</div>
      <div class="pop-pax">${j.passengers} / ${j.max} passengers (${pct}%)</div>
      <div class="pop-bar"><div class="pop-bar-fill" style="width:${pct}%;background:${st.color};"></div></div>
    </div>`;
}

// ── Fleet cards ────────────────────────────────────────────────────────────
function renderFleet() {
  const grid = document.getElementById('fleet-grid');
  if (!grid) return;
  grid.innerHTML = '';
  window.FLEET.forEach((j, idx) => {
    const st = window.getJeepStatus(j);
    const pct = Math.round((j.passengers / j.max) * 100);
    const isActive = idx === activeIdx;
    const card = document.createElement('div');
    card.className = `jcard ${st.cls}${isActive ? ' jcard-active' : ''}`;
    card.innerHTML = `
      <div class="jcard-top">
        <div>
          <div class="jcard-id">${j.id}</div>
          <div class="jcard-plate">${j.plate}</div>
        </div>
        <div class="jcard-badge ${st.cls}">${st.label}</div>
      </div>
      <div class="jcard-num ${st.cls}">${j.passengers}</div>
      <div class="jcard-sub">/ ${j.max} passengers</div>
      <div class="jcard-bar-bg">
        <div class="jcard-bar-fill ${st.cls}" style="width:${pct}%"></div>
      </div>
      <div class="jcard-pct">${pct}%</div>`;
    card.onclick = () => selectJeepney(idx);
    grid.appendChild(card);
  });
}

function updateStats() {
  const avail = window.FLEET.filter(j => j.passengers < 15).length;
  const full  = window.FLEET.filter(j => j.passengers >= j.max).length;
  const total = window.FLEET.reduce((s, j) => s + j.passengers, 0);
  const el = id => document.getElementById(id);
  if (el('s-avail')) el('s-avail').textContent = avail;
  if (el('s-pax'))   el('s-pax').textContent   = total;
  if (el('s-full'))  el('s-full').textContent  = full;

  const alert = document.getElementById('alert-card');
  if (alert) {
    const fullJeep = window.FLEET.find(j => j.passengers >= j.max);
    alert.style.display = fullJeep ? 'flex' : 'none';
    if (fullJeep) {
      const msg = document.getElementById('alert-msg');
      if (msg) msg.textContent = `${fullJeep.id} is FULL (${fullJeep.passengers}/${fullJeep.max}) — Please wait for next ride.`;
    }
  }
}

function updateAllPopups() {
  window.FLEET.forEach((j, idx) => {
    if (jeepMarkers[idx]) {
      jeepMarkers[idx].setPopupContent(makeJeepPopup(j, idx));
    }
  });
}

// ── Active jeepney selection ───────────────────────────────────────────────
function selectJeepney(idx) {
  activeIdx = idx;
  const lbl = document.getElementById('active-lbl');
  if (lbl) lbl.textContent = `Active: ${window.FLEET[idx].id}`;
  renderFleet();
  addLog(`Selected ${window.FLEET[idx].id} as active`, 'cyan');

  // Pan map to that jeepney
  if (map && jeepMarkers[idx]) {
    map.panTo(jeepMarkers[idx].getLatLng(), { animate: true, duration: 0.8 });
  }
}
window.selectJeepney = selectJeepney;

// ── Passenger controls ─────────────────────────────────────────────────────
window.ctrlAdd = function() {
  const j = window.FLEET[activeIdx];
  if (j.passengers < j.max) {
    j.passengers++;
    addLog(`+1 passenger on ${j.id} → ${j.passengers}/${j.max}`, 'green');
    refreshAll();
  }
};
window.ctrlRemove = function() {
  const j = window.FLEET[activeIdx];
  if (j.passengers > 0) {
    j.passengers--;
    addLog(`-1 passenger on ${j.id} → ${j.passengers}/${j.max}`, 'yellow');
    refreshAll();
  }
};
window.ctrlReset = function() {
  const j = window.FLEET[activeIdx];
  j.passengers = 0;
  addLog(`Reset ${j.id} to 0 passengers`, 'red');
  refreshAll();
};

function refreshAll() {
  renderFleet();
  updateStats();
  updateAllPopups();
}

// ── Auto simulation ────────────────────────────────────────────────────────
let simInterval = null;
function startAutoSim() {
  simInterval = setInterval(() => {
    if (!autoSim) return;
    window.FLEET.forEach(j => {
      const delta = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
      j.passengers = Math.max(0, Math.min(j.max, j.passengers + delta));
    });
    refreshAll();
  }, 7000);
}
window.toggleAutoSim = function() {
  autoSim = document.getElementById('auto-sim').checked;
  addLog(`Auto-simulation ${autoSim ? 'enabled' : 'disabled'}`, 'cyan');
};

// ── Activity log ───────────────────────────────────────────────────────────
function addLog(msg, color = 'cyan') {
  const list = document.getElementById('log-list');
  if (!list) return;
  const now = new Date();
  const t = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2,'0')).join(':');
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `<div class="log-dot-sm ${color}"></div><span class="log-time">${t}</span><span class="log-txt">${msg}</span>`;
  list.insertBefore(item, list.firstChild);
  while (list.children.length > 40) list.removeChild(list.lastChild);
}

// ── Geolocation API ────────────────────────────────────────────────────────
window.toggleGeolocation = function() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }
  if (geoActive) {
    stopGeolocation();
  } else {
    startGeolocation();
  }
};

function startGeolocation() {
  const btn = document.getElementById('geo-btn');
  if (btn) { btn.textContent = '⏳ Getting location…'; btn.classList.add('geo-active'); }
  const geoStatus = document.getElementById('geo-status');
  if (geoStatus) geoStatus.textContent = '📍 Requesting location…';

  watchId = navigator.geolocation.watchPosition(
    onGeoSuccess,
    onGeoError,
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
  geoActive = true;
}

function stopGeolocation() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (userLocMarker) { map.removeLayer(userLocMarker); userLocMarker = null; }
  if (userAccCircle) { map.removeLayer(userAccCircle); userAccCircle = null; }
  geoActive = false;
  const btn = document.getElementById('geo-btn');
  if (btn) { btn.textContent = '📍 My Location'; btn.classList.remove('geo-active'); }
  const geoStatus = document.getElementById('geo-status');
  if (geoStatus) geoStatus.textContent = '📍 Location: off';
  addLog('Geolocation stopped', 'yellow');
}

function onGeoSuccess(pos) {
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const acc = Math.round(pos.coords.accuracy);

  const btn = document.getElementById('geo-btn');
  if (btn) { btn.textContent = '📍 Live Location ON'; }

  // User dot icon
  const userIcon = L.divIcon({
    className: '',
    html: '<div class="user-dot"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -16],
  });

  if (!userLocMarker) {
    userLocMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 2000 }).addTo(map);
    userLocMarker.bindPopup(`
      <div class="pop-box">
        <div class="pop-title">📍 Your Location</div>
        <div class="pop-sub">Accuracy: ±${acc}m</div>
      </div>`);
    userAccCircle = L.circle([lat, lng], {
      radius: acc,
      color: '#2979ff', fillColor: '#2979ff',
      fillOpacity: 0.08, weight: 1.5, opacity: 0.4,
    }).addTo(map);
    map.setView([lat, lng], 15, { animate: true });
    addLog(`📍 Your location found (±${acc}m)`, 'green');
  } else {
    userLocMarker.setLatLng([lat, lng]);
    userLocMarker.setPopupContent(`
      <div class="pop-box">
        <div class="pop-title">📍 Your Location</div>
        <div class="pop-sub">Accuracy: ±${acc}m</div>
      </div>`);
    userAccCircle.setLatLng([lat, lng]);
    userAccCircle.setRadius(acc);
  }

  // Find nearest stop
  let nearestStop = null, nearestDist = Infinity;
  window.ROUTE_STOPS.forEach(s => {
    const d = distanceMeters(lat, lng, s.lat, s.lng);
    if (d < nearestDist) { nearestDist = d; nearestStop = s; }
  });

  const geoStatus = document.getElementById('geo-status');
  if (geoStatus) {
    geoStatus.textContent = nearestDist < 500
      ? `📍 Near: ${nearestStop.name} (${Math.round(nearestDist)}m away)`
      : `📍 ${Math.round(nearestDist)}m from nearest stop: ${nearestStop.name}`;
  }
}

function onGeoError(err) {
  const btn = document.getElementById('geo-btn');
  if (btn) { btn.textContent = '📍 My Location'; btn.classList.remove('geo-active'); }
  const geoStatus = document.getElementById('geo-status');
  const msgs = { 1: 'Permission denied', 2: 'Position unavailable', 3: 'Timeout' };
  if (geoStatus) geoStatus.textContent = `📍 Error: ${msgs[err.code] || 'Unknown'}`;
  addLog(`Geolocation error: ${msgs[err.code] || err.message}`, 'red');
  geoActive = false;
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  renderFleet();
  updateStats();
  startAutoSim();
  addLog('System online — 3 jeepneys tracked', 'green');
  addLog('Leaflet + OpenStreetMap loaded', 'cyan');
  addLog('Click 📍 My Location for GPS tracking', 'cyan');

  // Refresh fleet UI every 2s
  setInterval(() => {
    renderFleet();
    updateStats();
    updateAllPopups();
  }, 2000);
});
