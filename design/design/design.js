(function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  
  // Element selections
  const guidesGroup = document.getElementById('guides-group');
  const pathsGroup = document.getElementById('paths-group');
  const dotsGroup = document.getElementById('dots-group');
  const card = document.getElementById('design-card');

  // Parameters
  const numPoints = 120; // High resolution for smooth curves
  const Z_STEP = 18;     // Vertical distance separating the 3D stacked loops
  const CAMERA_D = 400;  // Camera focal length for perspective projection
  const CX = 142.5;      // Center X coordinate of SVG projection canvas
  const CY = 152;        // Center Y coordinate of SVG projection canvas

  // Animation settings
  const GROWTH_SPEED = 0.012;      // Speed of path growth
  const CASCADING_THRESHOLD = 0.4;  // Starts growing next ring when current is 40% complete

  // 3D Rotation coordinates (radians)
  const INITIAL_YAW = 0.25;         // Initial angled perspective
  const INITIAL_PITCH = -0.3;       // Initial downward tilt
  const DRAG_SENSITIVITY = 0.006;
  const DAMPING = 0.12;

  // Wavy curves dimensions from Figma metadata
  // Stacked outermost (Index 0) to innermost (Index 7)
  const curvesConfig = [
    { w: 285, h: 304 }, // Outer 1
    { w: 262, h: 272 }, // 2
    { w: 243, h: 248 }, // 3
    { w: 220, h: 220 }, // 4
    { w: 202, h: 192 }, // 5
    { w: 177, h: 163 }, // 6
    { w: 150, h: 138 }, // 7
    { w: 116, h: 107 }  // Inner 8
  ];

  // Dot configs: each assigned to a curve index and moving at different speeds/directions
  const dotsConfig = [
    { curveIndex: 1, angle: 0.2, speed: 0.008, size: 3.5 },  // Outer-middle
    { curveIndex: 3, angle: 1.8, speed: -0.012, size: 3.5 }, // Middle
    { curveIndex: 5, angle: 3.4, speed: 0.015, size: 3.5 },  // Inner-middle
    { curveIndex: 7, angle: 4.8, speed: -0.02, size: 3.5 }   // Innermost
  ];

  // Initialize loop state machine objects
  const curvesState = curvesConfig.map((config, index) => {
    // Create guide path element (faint wireframe background)
    const guide = document.createElementNS(SVG_NS, 'path');
    guide.setAttribute('class', 'wavy-path guide-path');
    guidesGroup.appendChild(guide);

    // Create active path element (glowing main concentric loops)
    const active = document.createElementNS(SVG_NS, 'path');
    active.setAttribute('class', 'wavy-path active-path');
    pathsGroup.appendChild(active);

    return {
      index: index,
      w: config.w,
      h: config.h,
      z: -index * Z_STEP,  // stacked vertically along Z-axis (funnel shape)
      state: 'waiting',    // 'waiting' | 'growing' | 'active'
      progress: 0.0,
      guidePath: guide,
      activePath: active
    };
  });

  // Start the cascading growth sequence from the innermost ring (Index 7)
  curvesState[7].state = 'growing';

  // Initialize orbiting marker elements
  const dotElements = dotsConfig.map((config) => {
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('class', 'marker-dot');
    circle.setAttribute('r', config.size);
    circle.setAttribute('opacity', '0');
    dotsGroup.appendChild(circle);

    return {
      element: circle,
      curveIndex: config.curveIndex,
      angle: config.angle,
      speed: config.speed,
      size: config.size,
      fadeOpacity: 0.0
    };
  });

  // Mathematical Polar Equation for Wavy Outlines
  // r(theta) = 1.0 - A * (1.0 - cos(4 * theta - phase))
  function getWavyRadius(theta, amplitude, phase = 0) {
    return 1.0 - amplitude * (1.0 - Math.cos(4 * theta - phase));
  }

  // 3D coordinate rotation and perspective projection
  function projectPoint(xLoc, yLoc, zLoc, pitch, yaw) {
    // Yaw rotation (around Y axis)
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const x1 = xLoc * cosYaw + zLoc * sinYaw;
    const z1 = -xLoc * sinYaw + zLoc * cosYaw;

    // Pitch rotation (around X axis)
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const y2 = yLoc * cosPitch - z1 * sinPitch;
    const z2 = yLoc * sinPitch + z1 * cosPitch;

    // Perspective projection
    const scale = CAMERA_D / (CAMERA_D - z2);
    const xProj = CX + x1 * scale;
    const yProj = CY + y2 * scale;

    return { x: xProj, y: yProj, scale: scale, z: z2 };
  }

  /* ── Rotation Interaction States ────────────────────────────── */
  let yaw = INITIAL_YAW;
  let pitch = INITIAL_PITCH;
  let targetYaw = INITIAL_YAW;
  let targetPitch = INITIAL_PITCH;
  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let autoRotateTime = 0;

  if (card) {
    // Mouse drag handlers
    card.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;

      targetYaw += dx * DRAG_SENSITIVITY;
      targetPitch -= dy * DRAG_SENSITIVITY;

      // Restrict pitch so card system is not turned upside down
      const maxPitch = Math.PI * 0.44;
      targetPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));

      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Mobile touch drag handlers
    card.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        lastPointerX = e.touches[0].clientX;
        lastPointerY = e.touches[0].clientY;
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - lastPointerX;
      const dy = e.touches[0].clientY - lastPointerY;

      targetYaw += dx * DRAG_SENSITIVITY;
      targetPitch -= dy * DRAG_SENSITIVITY;

      const maxPitch = Math.PI * 0.44;
      targetPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));

      lastPointerX = e.touches[0].clientX;
      lastPointerY = e.touches[0].clientY;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isDragging = false;
    });

    window.addEventListener('touchcancel', () => {
      isDragging = false;
    });

    /* ── Card Tilt Parallax Effect ────────────────────────────── */
    card.addEventListener('mousemove', (e) => {
      if (isDragging) return; // Disable tilt parallax while dragging 3D system
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const maxRotX = 7;
      const maxRotY = 7;

      const rotX = ((y - centerY) / centerY) * -maxRotX;
      const rotY = ((x - centerX) / centerX) * maxRotY;

      card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      card.style.boxShadow = `${-rotY * 1.5}px ${rotX * 1.5}px 40px rgba(0,0,0,0.15)`;
    });

    card.addEventListener('mouseleave', () => {
      if (isDragging) return;
      card.style.transform = `rotateX(0deg) rotateY(0deg)`;
      card.style.boxShadow = `0 10px 30px rgba(0, 0, 0, 0.05)`;
    });
  }

  // Animation Loop
  function animate(time) {
    // 1. Update 3D Pitch and Yaw with smooth interpolation
    if (!isDragging) {
      // Idle wobble drift when not interacted
      autoRotateTime += 1;
      targetYaw = INITIAL_YAW + 0.18 * Math.sin(autoRotateTime * 0.007) + 0.08 * Math.cos(autoRotateTime * 0.003);
      targetPitch = INITIAL_PITCH + 0.08 * Math.cos(autoRotateTime * 0.005);
    }

    yaw += (targetYaw - yaw) * DAMPING;
    pitch += (targetPitch - pitch) * DAMPING;

    // Dynamic breathing amplitude parameters
    const baseAmplitude = 0.08;
    const amplitudeOscillationDepth = 0.025;
    const speedFactor = 0.0015;

    // 2. Symmetrical closed-loop cascading state machine updates
    curvesState.forEach((state, i) => {
      if (state.state === 'growing') {
        state.progress += GROWTH_SPEED;
        if (state.progress >= 1.0) {
          state.progress = 1.0;
          state.state = 'active';
        }

        // Trigger growth cascade to outer neighbor (index i - 1)
        if (i > 0 && state.progress >= CASCADING_THRESHOLD) {
          const nextState = curvesState[i - 1];
          if (nextState.state === 'waiting') {
            nextState.state = 'growing';
          }
        }
      }
    });

    // 3. Project and draw concentric wavy structures
    curvesState.forEach((p, i) => {
      const phaseOffset = i * 0.4;
      const currentAmplitude = baseAmplitude + amplitudeOscillationDepth * Math.sin(time * speedFactor - phaseOffset);
      const rotationPhase = time * 0.0003 * (1 - i * 0.05);

      // Pre-calculate 120 projected coordinates for guide skeletal alignment
      const points = [];
      for (let j = 0; j <= numPoints; j++) {
        const theta = (j / numPoints) * 2 * Math.PI;
        const r = getWavyRadius(theta, currentAmplitude, rotationPhase);
        
        const xLocal = r * (p.w / 2) * Math.cos(theta);
        const yLocal = r * (p.h / 2) * Math.sin(theta);
        const zLocal = p.z;

        const projected = projectPoint(xLocal, yLocal, zLocal, pitch, yaw);
        points.push(projected);
      }

      // Draw Guide Path (faint closed outline skeleton)
      let dGuide = "";
      points.forEach((pt, idx) => {
        if (idx === 0) dGuide += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        else dGuide += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      });
      dGuide += " Z";
      p.guidePath.setAttribute('d', dGuide);

      // Draw Active Path
      if (p.state === 'waiting') {
        p.activePath.setAttribute('d', '');
      } else if (p.state === 'growing') {
        const k = Math.round(numPoints * 0.5 * p.progress);

        // Path A: clockwise from 0 to k
        let dActiveA = "";
        for (let idx = 0; idx <= k; idx++) {
          const pt = points[idx];
          if (idx === 0) dActiveA += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
          else dActiveA += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        }

        // Path B: counter-clockwise from N down to N-k
        let dActiveB = "";
        for (let idx = 0; idx <= k; idx++) {
          const pt = points[numPoints - idx];
          if (idx === 0) dActiveB += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
          else dActiveB += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        }

        p.activePath.setAttribute('d', dActiveA + " " + dActiveB);

      } else if (p.state === 'active') {
        // Full stable active path drawn
        let dActive = "";
        points.forEach((pt, idx) => {
          if (idx === 0) dActive += `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
          else dActive += ` L ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
        });
        dActive += " Z";
        p.activePath.setAttribute('d', dActive);
      }

      // Save dynamic breathing values to align markers
      p.currentAmplitude = currentAmplitude;
      p.rotationPhase = rotationPhase;
    });

    // 4. Update and project Orbiting Dots
    dotElements.forEach((dot) => {
      const parentCurve = curvesState[dot.curveIndex];
      if (parentCurve.state === 'active') {
        // Orbit motion
        dot.angle += dot.speed;
        if (dot.angle > Math.PI * 2) dot.angle -= Math.PI * 2;
        if (dot.angle < 0) dot.angle += Math.PI * 2;

        // Smoothly fade-in once active
        if (dot.fadeOpacity < 0.95) {
          dot.fadeOpacity += 0.05;
          if (dot.fadeOpacity > 0.95) dot.fadeOpacity = 0.95;
        }

        // Calculate location of dot on the breathing curve in 3D
        const phaseOffset = dot.curveIndex * 0.4;
        const currentAmplitude = baseAmplitude + amplitudeOscillationDepth * Math.sin(time * speedFactor - phaseOffset);
        const rotationPhase = time * 0.0003 * (1 - dot.curveIndex * 0.05);

        const r = getWavyRadius(dot.angle, currentAmplitude, rotationPhase);
        const xLocal = r * (parentCurve.w / 2) * Math.cos(dot.angle);
        const yLocal = r * (parentCurve.h / 2) * Math.sin(dot.angle);
        const zLocal = parentCurve.z;

        const projected = projectPoint(xLocal, yLocal, zLocal, pitch, yaw);

        dot.element.setAttribute('cx', projected.x.toFixed(2));
        dot.element.setAttribute('cy', projected.y.toFixed(2));
        dot.element.setAttribute('r', (dot.size * projected.scale).toFixed(2));
        dot.element.setAttribute('opacity', dot.fadeOpacity.toFixed(2));
      } else {
        dot.element.setAttribute('opacity', '0');
      }
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
