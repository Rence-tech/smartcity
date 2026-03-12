/* ================================================================
   jeep-common.js
   Shared route data, jeepney SVG builder, smooth animation engine
   Used by both index.html (mini map) and dashboard.html (full map)
   ================================================================ */

// ── Route stops (Taguig City) ──────────────────────────────────────────────
window.ROUTE_STOPS = [
  { name: 'Market! Market! Terminal', sub: 'Departure · BGC, Taguig City',         lat: 14.55100, lng: 121.05090, type: 'start' },
  { name: 'C5 Road',                  sub: 'Intermediate · C5, Taguig City',        lat: 14.54750, lng: 121.05480, type: 'mid'   },
  { name: 'Gate 3',                   sub: 'Intermediate · AFPOVAI, Taguig City',   lat: 14.54200, lng: 121.05900, type: 'mid'   },
  { name: 'AFPOVAI Phase 1',          sub: 'Near-final · AFPOVAI, Taguig City',     lat: 14.53700, lng: 121.06350, type: 'mid'   },
  { name: '7/11 Stop',                sub: 'Final Destination · AFPOVAI Phase 1',   lat: 14.53300, lng: 121.06800, type: 'end'   },
];

// ── Dense route waypoints (smooth path) ───────────────────────────────────
window.ROUTE_COORDS = (function () {
  // Waypoints between stops (manually tuned to follow road-like curves)
  const waypoints = [
    [14.55100, 121.05090], // Market! Market!
    [14.55060, 121.05150],
    [14.55010, 121.05230],
    [14.54950, 121.05280],
    [14.54890, 121.05330],
    [14.54830, 121.05370],
    [14.54790, 121.05400],
    [14.54750, 121.05480], // C5 Road
    [14.54700, 121.05550],
    [14.54650, 121.05620],
    [14.54590, 121.05690],
    [14.54530, 121.05760],
    [14.54460, 121.05820],
    [14.54380, 121.05870],
    [14.54300, 121.05890],
    [14.54220, 121.05900],
    [14.54200, 121.05900], // Gate 3
    [14.54140, 121.05960],
    [14.54080, 121.06020],
    [14.54010, 121.06090],
    [14.53940, 121.06170],
    [14.53870, 121.06240],
    [14.53800, 121.06290],
    [14.53750, 121.06320],
    [14.53700, 121.06350], // AFPOVAI Phase 1
    [14.53640, 121.06420],
    [14.53580, 121.06490],
    [14.53520, 121.06560],
    [14.53460, 121.06630],
    [14.53390, 121.06710],
    [14.53330, 121.06760],
    [14.53300, 121.06800], // 7/11 Stop
  ];

  // Interpolate between each pair for ultra-smooth movement (4 sub-steps)
  const dense = [];
  const STEPS = 4;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [la, lo] = waypoints[i];
    const [lb, lb2] = waypoints[i + 1];
    for (let t = 0; t < STEPS; t++) {
      const f = t / STEPS;
      dense.push([la + (lb - la) * f, lo + (lb2 - lo) * f]);
    }
  }
  dense.push(waypoints[waypoints.length - 1]);
  return dense;
})();

// ── Fleet state (client-side simulation) ──────────────────────────────────
window.FLEET = [
  { id: 'JNY-001', plate: 'ABC 1234', passengers: 4,  max: 20, color: '#00e676', offset: 0    },
  { id: 'JNY-002', plate: 'DEF 5678', passengers: 14, max: 20, color: '#ffd600', offset: 0.33 },
  { id: 'JNY-003', plate: 'GHI 9012', passengers: 19, max: 20, color: '#ff1744', offset: 0.66 },
];

window.getJeepStatus = function(j) {
  if (j.passengers >= j.max)  return { label: 'FULL',        color: '#ff1744', cls: 'red'    };
  if (j.passengers >= 15)     return { label: 'ALMOST FULL', color: '#ffd600', cls: 'yellow' };
  return                             { label: 'AVAILABLE',   color: '#00e676', cls: 'green'  };
};

// ── Bearing calculation ────────────────────────────────────────────────────
window.calcBearing = function(from, to) {
  const lat1 = from[0] * Math.PI / 180;
  const lat2 = to[0]   * Math.PI / 180;
  const dLng = (to[1] - from[1]) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

// ── Jeepney SVG icon builder ───────────────────────────────────────────────
// Returns a Leaflet divIcon with a realistic Philippine Jeepney SVG
window.makeJeepIcon = function(bearing, statusColor, label) {
  const size = 44;
  // We rotate the whole icon container; jeepney faces RIGHT (east) at 0deg
  // bearing 0=north → we need to adjust: SVG default is east, so offset by -90
  const rotation = bearing - 90;

  const svg = `
  <svg viewBox="0 0 90 42" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size*42/90)}">
    <!-- Shadow -->
    <ellipse cx="45" cy="39" rx="30" ry="3" fill="rgba(0,0,0,0.35)"/>
    <!-- Body main -->
    <rect x="8" y="12" width="70" height="22" rx="5" fill="#1a237e"/>
    <!-- Roof / cab extension -->
    <rect x="12" y="5"  width="52" height="10" rx="4" fill="#283593"/>
    <!-- Roof rack bars -->
    <rect x="14" y="4"  width="48" height="2.5" rx="1" fill="#3949ab" opacity="0.7"/>
    <!-- Front hood -->
    <path d="M78 14 L85 18 L85 30 L78 32 Z" fill="#0d47a1"/>
    <!-- Rear -->
    <rect x="8" y="12" width="7" height="22" rx="2" fill="#0a2d6e"/>
    <!-- Front windshield -->
    <rect x="74" y="17" width="8" height="11" rx="2" fill="#80deea" opacity="0.9"/>
    <!-- Rear window -->
    <rect x="10" y="16" width="6" height="8" rx="1.5" fill="#80deea" opacity="0.6"/>
    <!-- Side windows row -->
    <rect x="22" y="14" width="9" height="8" rx="1.5" fill="#b3e5fc" opacity="0.85"/>
    <rect x="34" y="14" width="9" height="8" rx="1.5" fill="#b3e5fc" opacity="0.85"/>
    <rect x="46" y="14" width="9" height="8" rx="1.5" fill="#b3e5fc" opacity="0.85"/>
    <rect x="58" y="14" width="9" height="8" rx="1.5" fill="#b3e5fc" opacity="0.85"/>
    <!-- Colorful decorative stripe (classic jeepney style) -->
    <rect x="8" y="24" width="70" height="5" fill="${statusColor}" opacity="0.82"/>
    <!-- Chrome trim line -->
    <rect x="8" y="23" width="70" height="1.5" fill="#fff" opacity="0.35"/>
    <!-- Headlights (front) -->
    <circle cx="83" cy="20" r="2.5" fill="#fff9c4"/>
    <circle cx="83" cy="27" r="2.5" fill="#fff9c4"/>
    <!-- Tail lights (rear) -->
    <circle cx="9"  cy="20" r="2.2" fill="#ff1744"/>
    <circle cx="9"  cy="27" r="2.2" fill="#ff8a80"/>
    <!-- Front wheels -->
    <circle cx="72" cy="35" r="5.5" fill="#212121" stroke="#546e7a" stroke-width="1.5"/>
    <circle cx="72" cy="35" r="2.5" fill="#37474f"/>
    <circle cx="72" cy="35" r="1"   fill="#78909c"/>
    <!-- Rear wheels -->
    <circle cx="22" cy="35" r="5.5" fill="#212121" stroke="#546e7a" stroke-width="1.5"/>
    <circle cx="22" cy="35" r="2.5" fill="#37474f"/>
    <circle cx="22" cy="35" r="1"   fill="#78909c"/>
    <!-- Status glow dot on roof -->
    <circle cx="38" cy="7" r="3" fill="${statusColor}" opacity="0.9"/>
    <circle cx="38" cy="7" r="5" fill="${statusColor}" opacity="0.25"/>
  </svg>`;

  return L.divIcon({
    className: '',
    html: `
      <div class="jeep-marker-wrap" style="
        transform: rotate(${rotation}deg);
        width:${size}px;
        filter: drop-shadow(0 3px 10px ${statusColor}88);
        transition: transform 0.4s ease;
      ">${svg}</div>`,
    iconSize:   [size, Math.round(size * 42 / 90)],
    iconAnchor: [size / 2, Math.round(size * 42 / 90) / 2],
    popupAnchor: [0, -22],
  });
};

// ── Smooth position interpolation ─────────────────────────────────────────
// t = 0..1 representing position along route
window.getPosAtT = function(t) {
  const coords = window.ROUTE_COORDS;
  const max = coords.length - 1;
  const exact = Math.max(0, Math.min(t, 1)) * max;
  const i = Math.min(Math.floor(exact), max - 1);
  const frac = exact - i;
  const from = coords[i];
  const to   = coords[i + 1];
  return [from[0] + (to[0] - from[0]) * frac, from[1] + (to[1] - from[1]) * frac];
};

window.getBearingAtT = function(t) {
  const coords = window.ROUTE_COORDS;
  const max = coords.length - 1;
  const exact = Math.max(0, Math.min(t, 0.9999)) * max;
  const i = Math.min(Math.floor(exact), max - 1);
  return window.calcBearing(coords[i], coords[Math.min(i + 1, max)]);
};

window.getNearestStop = function(pos) {
  let best = null, bestDist = Infinity;
  window.ROUTE_STOPS.forEach(s => {
    const d = Math.hypot(s.lat - pos[0], s.lng - pos[1]);
    if (d < bestDist) { bestDist = d; best = s; }
  });
  return bestDist < 0.0020 ? best : null;
};
