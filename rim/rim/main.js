(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────── */
  const CX = 215.62, CY = 337.09, R = 215.62;
  const SPIN = 0.003;   // radians / frame
  const TSPD = 0.30;    // tilt oscillation speed multiplier

  /*
   * RINGS: three meridian rings.
   *  phase   — initial rotation offset so they start at the design's rx values
   *  tilt    — base diagonal tilt in degrees (makes them non-vertical = dynamic)
   *  tiltAmp — how much the tilt oscillates (gives the "alive" feel)
   *  tiltOff — phase offset for the tilt oscillation
   *  MIN_OP  — never go below this opacity (always visible)
   *  dots    — dot IDs that ride this rim, and their parametric angle α on the ellipse
   */
  const RINGS = [
    {
      id: 'meridian-wide',
      phase: Math.acos(174.62 / R),
      tilt: 15, tiltAmp: 7, tiltOff: 0.0,
      fColor: '#7a72b0', bColor: '#7a72b0', fOp: 1.0, bOp: 0.60,
      dots: [
        { id: 'dot-tr', alpha: -0.25 },
        { id: 'dot-lm', alpha: 3.40 }
      ]
    },
    {
      id: 'meridian-narrow',
      phase: Math.acos(128.62 / R),
      tilt: -22, tiltAmp: 9, tiltOff: 1.1,
      fColor: '#7a72b0', bColor: '#7a72b0', fOp: 0.95, bOp: 0.55,
      dots: [
        { id: 'dot-bc', alpha: 1.80 }
      ]
    },
    {
      id: 'meridian-slice',
      phase: Math.acos(29.63 / R),
      tilt: 40, tiltAmp: 6, tiltOff: 2.1,
      fColor: '#7a72b0', bColor: '#7a72b0', fOp: 0.95, bOp: 0.50,
      dots: [
        { id: 'dot-ur', alpha: 0.90 }
      ]
    }
  ];

  /*
   * The callout group (triangle + line + box) rides ring-0 (meridian-wide).
   * TRI_ALPHA: parametric angle on that ellipse — π+0.28 puts it upper-left.
   * BOX_OX / BOX_OY: offset from triangle TIP to box, in ring-0's local space.
   */
  const TRI_ALPHA = Math.PI + 0.28;
  const TRI_S = 13;    // triangle half-size
  const BOX_OX = 60;    // box offset right  of triangle (local space)
  const BOX_OY = -42;   // box offset above triangle  (local space)
  const FO_H = 28;

  /* ── DOM refs ──────────────────────────────────────────────── */
  const globeEl = document.getElementById('globe');
  const outerCircleEl = document.getElementById('outer-circle');
  const calloutGroup = document.getElementById('callout-group');
  const triEl = document.getElementById('triangle-marker');
  const lineEl = document.getElementById('callout-line');
  const foEl = document.getElementById('callout-fo');

  // Generate static outer circle path (smooth stroke)
  if (outerCircleEl) {
    let ocPath = `M ${CX + R},${CY} `;
    let ocSegments = 120;
    for (let i = 1; i <= ocSegments; i++) {
      let a = (i / ocSegments) * Math.PI * 2;
      let px = CX + R * Math.cos(a);
      let py = CY + R * Math.sin(a);
      ocPath += `L ${px.toFixed(2)},${py.toFixed(2)} `;
    }
    ocPath += "Z";
    outerCircleEl.setAttribute('d', ocPath);
  }

  /* ── Drag to rotate state ──────────────────────────────────── */
  let tX = 0, tY = 0, cPX = 0, cPY = 0;
  let vX = 0, vY = 0;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;

  document.body.style.cursor = 'grab';

  document.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    vX = 0;
    vY = 0;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    vX = deltaX * 0.15;
    vY = deltaY * 0.15;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  /* ── 3D Math Helper ────────────────────────────────────────── */
  function rotate3D(p, rx, ry) {
    let sX = Math.sin(rx), cX = Math.cos(rx);
    let y1 = p.y * cX - p.z * sX;
    let z1 = p.y * sX + p.z * cX;

    let sY = Math.sin(ry), cY = Math.cos(ry);
    let x2 = p.x * cY + z1 * sY;
    let z2 = -p.x * sY + z1 * cY;

    return { x: x2, y: y1, z: z2 };
  }

  /* ── Animation loop ────────────────────────────────────────── */
  let t = 0;

  function tick() {
    t += SPIN;

    if (!isDragging) {
      vX *= 0.94; // Friction deceleration
      vY *= 0.94;
    }
    tX += vX;
    tY += vY;

    /* Smooth rotation interpolation */
    cPX += (tX - cPX) * 0.08;
    cPY += (tY - cPY) * 0.08;

    // We remove the globeEl CSS transform because we're doing true 3D in SVG space
    if (globeEl) globeEl.style.transform = 'none';

    let rotX = cPX * (Math.PI / 180);
    let rotY = cPY * (Math.PI / 180);

    RINGS.forEach((ring, idx) => {
      const gEl = document.getElementById(ring.id);
      if (!gEl) return;
      const pathBack = gEl.querySelector('.ring-back');
      const pathFront = gEl.querySelector('.ring-front');

      let spinY = t + ring.phase;
      let tiltDeg = ring.tilt + ring.tiltAmp * Math.sin(t * TSPD + ring.tiltOff);
      let tiltZ = tiltDeg * (Math.PI / 180);

      // Generate continuous lines for the ring
      let frontPath = "", backPath = "";
      let segments = 180; 
      let lastZ = null;

      for (let i = 0; i <= segments; i++) {
        let a = (i / segments) * Math.PI * 2;
        let p = { x: 0, y: R * Math.cos(a), z: R * Math.sin(a) };
        let p1 = rotate3D(p, 0, spinY);
        let sZ = Math.sin(tiltZ), cZ = Math.cos(tiltZ);
        let p2 = { x: p1.x * cZ - p1.y * sZ, y: p1.x * sZ + p1.y * cZ, z: p1.z };
        let p3 = rotate3D(p2, rotX, rotY);

        let projX = CX + p3.x;
        let projY = CY + p3.y;

        // Front path
        if (p3.z >= 0) {
          if (frontPath === "" || lastZ < 0) {
             frontPath += ` M ${projX.toFixed(2)},${projY.toFixed(2)}`;
          } else {
             frontPath += ` L ${projX.toFixed(2)},${projY.toFixed(2)}`;
          }
        } else if (lastZ >= 0 && frontPath !== "") {
          frontPath += ` L ${projX.toFixed(2)},${projY.toFixed(2)}`;
        }

        // Back path
        if (p3.z <= 0) {
          if (backPath === "" || lastZ > 0) {
             backPath += ` M ${projX.toFixed(2)},${projY.toFixed(2)}`;
          } else {
             backPath += ` L ${projX.toFixed(2)},${projY.toFixed(2)}`;
          }
        } else if (lastZ <= 0 && backPath !== "") {
          backPath += ` L ${projX.toFixed(2)},${projY.toFixed(2)}`;
        }

        lastZ = p3.z;
      }

      if (pathFront) {
        pathFront.setAttribute('d', frontPath);
        pathFront.setAttribute('stroke', ring.fColor);
      }
      if (pathBack) {
        pathBack.setAttribute('d', backPath);
        pathBack.setAttribute('stroke', ring.bColor);
      }

      /* ── Dots ride their rim ─────────────────────────────── */
      ring.dots.forEach(dot => {
        const de = document.getElementById(dot.id);
        if (!de) return;

        let a = dot.alpha;
        let p = { x: 0, y: R * Math.cos(a), z: R * Math.sin(a) };
        let p1 = rotate3D(p, 0, spinY);
        let sZ = Math.sin(tiltZ), cZ = Math.cos(tiltZ);
        let p2 = { x: p1.x * cZ - p1.y * sZ, y: p1.x * sZ + p1.y * cZ, z: p1.z };
        let p3 = rotate3D(p2, rotX, rotY);

        let projX = CX + p3.x;
        let projY = CY + p3.y;

        let zFactor = (p3.z / R); // -1 to +1
        let opacity = 0.5 + 0.5 * zFactor; // 0.0 to 1.0
        let dotSize = 5 + 3 * zFactor; // 2 to 8

        // snap dot to center of its pixel block
        // Smooth dot placement
        de.setAttribute('x', (projX - dotSize / 2).toFixed(2));
        de.setAttribute('y', (projY - dotSize / 2).toFixed(2));
        de.setAttribute('width', dotSize.toFixed(2));
        de.setAttribute('height', dotSize.toFixed(2));
        de.setAttribute('opacity', opacity.toFixed(2));
      });

      /* ── Ring-0: drive callout group ─────────────────────── */
      if (idx === 0) {
        let a = TRI_ALPHA;
        let p = { x: 0, y: R * Math.cos(a), z: R * Math.sin(a) };
        let p1 = rotate3D(p, 0, spinY);
        let sZ = Math.sin(tiltZ), cZ = Math.cos(tiltZ);
        let p2 = { x: p1.x * cZ - p1.y * sZ, y: p1.x * sZ + p1.y * cZ, z: p1.z };
        let p3 = rotate3D(p2, rotX, rotY);

        let triWX = CX + p3.x;
        let triWY = CY + p3.y;

        calloutGroup.removeAttribute('transform');

        triEl.setAttribute('points',
          `${triWX},${triWY - TRI_S} ` +
          `${triWX + TRI_S},${triWY + TRI_S} ` +
          `${triWX - TRI_S},${triWY + TRI_S}`
        );

        let foWX = triWX + BOX_OX;
        let foWY = triWY + BOX_OY;
        foEl.setAttribute('x', foWX.toFixed(2));
        foEl.setAttribute('y', foWY.toFixed(2));

        lineEl.setAttribute('x1', triWX.toFixed(2));
        lineEl.setAttribute('y1', (triWY - TRI_S).toFixed(2));
        lineEl.setAttribute('x2', foWX.toFixed(2));
        lineEl.setAttribute('y2', (foWY + FO_H / 2).toFixed(2));
      }
    });

    requestAnimationFrame(tick);
  }

  /* ── Entrance fade-in ──────────────────────────────────────── */
  document.querySelectorAll('#globe path, #callout-group *')
    .forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transition = `opacity 0.7s ease ${i * 0.08}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.opacity = '';
      }));
    });

  /* ── Percent Loading Animation ───────────────────────────── */
  const percentEl = document.getElementById('percent-loader');
  if (percentEl) {
    let startVal = 0;
    const endVal = 99;
    const duration = 2000;
    let startTime = null;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animatePercent(time) {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;
      let progress = elapsed / duration;
      if (progress > 1) progress = 1;

      const currentVal = Math.floor(startVal + (endVal - startVal) * easeOutCubic(progress));
      percentEl.textContent = currentVal + '%';

      if (progress < 1) {
        requestAnimationFrame(animatePercent);
      }
    }
    requestAnimationFrame(animatePercent);
  }

  tick();

  /* ── Card Tilt Parallax Effect ────────────────────────────── */
  const card = document.querySelector('.card');
  if (card) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Max rotation angles (degrees)
      const maxRotX = 8;
      const maxRotY = 8;

      const rotX = ((y - centerY) / centerY) * -maxRotX;
      const rotY = ((x - centerX) / centerX) * maxRotY;

      card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      card.style.boxShadow = `${-rotY * 1.5}px ${rotX * 1.5}px 40px rgba(0,0,0,0.1)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = `rotateX(0deg) rotateY(0deg)`;
      card.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.05)`;
    });
  }

})();
