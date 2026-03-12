/* ================================================================
   script.js  —  Landing page: mini map preview + demo counter
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {

  // ── Mini Map on Landing page ─────────────────────────────────────────────
  const el = document.getElementById('hero-map');
  if (el && window.L && window.ROUTE_COORDS) {
    const miniMap = L.map('hero-map', {
      center: [14.542, 121.060],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(miniMap);

    // Route lines
    L.polyline(window.ROUTE_COORDS, { color: '#1565c0', weight: 5, opacity: 0.5 }).addTo(miniMap);
    L.polyline(window.ROUTE_COORDS, { color: '#00b0ff', weight: 2.5, opacity: 0.85 }).addTo(miniMap);

    // Stop dots
    window.ROUTE_STOPS.forEach(stop => {
      const isStart = stop.type === 'start', isEnd = stop.type === 'end';
      const col = isStart ? '#00e676' : isEnd ? '#ff6d00' : '#00b0ff';
      const sz = (isStart || isEnd) ? 14 : 10;
      L.divIcon({});
      L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${col};border:2.5px solid #020b18;box-shadow:0 0 8px ${col}88;"></div>`,
          iconSize:[sz,sz],iconAnchor:[sz/2,sz/2],
        })
      }).addTo(miniMap);
    });

    // 3 animated jeepneys
    let miniT = [0, 0.33, 0.66];
    const miniSpeed = [0.0022, 0.0018, 0.0025];
    const miniMarkers = [null, null, null];
    const colors = ['#00e676', '#ffd600', '#ff1744'];

    window.FLEET.forEach((j, idx) => {
      const pos = window.getPosAtT(miniT[idx]);
      const bearing = window.getBearingAtT(miniT[idx]);
      miniMarkers[idx] = L.marker(pos, {
        icon: window.makeJeepIcon(bearing, colors[idx], j.id),
        zIndexOffset: 1000,
      }).addTo(miniMap);
    });

    setInterval(() => {
      window.FLEET.forEach((j, idx) => {
        miniT[idx] += miniSpeed[idx];
        if (miniT[idx] >= 1) miniT[idx] = 0;
        const pos = window.getPosAtT(miniT[idx]);
        const bearing = window.getBearingAtT(miniT[idx]);
        miniMarkers[idx].setLatLng(pos);
        miniMarkers[idx].setIcon(window.makeJeepIcon(bearing, colors[idx], j.id));
      });
    }, 600);

    miniMap.fitBounds(window.ROUTE_COORDS, { padding: [30, 30] });
  }

  // ── Demo passenger counter animation ────────────────────────────────────
  const demo = { num: 4, max: 20, dir: 1 };
  const colors = { green: '#00e676', yellow: '#ffd600', red: '#ff1744' };

  function getColor(n) {
    if (n >= 20) return 'red';
    if (n >= 15) return 'yellow';
    return 'green';
  }

  setInterval(() => {
    demo.num += demo.dir;
    if (demo.num >= demo.max) demo.dir = -1;
    if (demo.num <= 0) demo.dir = 1;

    const cls = getColor(demo.num);
    const pct = (demo.num / demo.max) * 100;

    const numEl = document.getElementById('demo-num');
    const barEl = document.getElementById('demo-bar');
    const badgeEl = document.getElementById('demo-badge');

    if (numEl) { numEl.textContent = demo.num; numEl.className = `mock-num ${cls}`; }
    if (barEl)  { barEl.style.width = `${pct}%`; barEl.className = `mock-bar-fill ${cls}`; }
    if (badgeEl) {
      badgeEl.className = `mock-badge ${cls}`;
      badgeEl.textContent = cls === 'green' ? 'AVAILABLE' : cls === 'yellow' ? 'ALMOST FULL' : 'FULL';
    }

    const m1 = document.getElementById('m1pax');
    if (m1) m1.textContent = `${demo.num}/20`;
  }, 1800);
});
