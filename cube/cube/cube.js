(function () {
  const container = document.getElementById('cube-container');
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Configuration
  const CX = 203;
  const CY = 238.5;
  const SQRT3_2 = Math.sqrt(3) / 2;
  const SCALE = 80; // Reduced from 100 to prevent overflow
  let currentScale = SCALE;

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 406 477");
  svg.style.overflow = "visible";

  const defs = document.createElementNS(SVG_NS, "defs");

  // Soft glow filter
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", "glow");
  filter.setAttribute("x", "-50%");
  filter.setAttribute("y", "-50%");
  filter.setAttribute("width", "200%");
  filter.setAttribute("height", "200%");

  const blur = document.createElementNS(SVG_NS, "feGaussianBlur");
  blur.setAttribute("stdDeviation", "3.275");
  blur.setAttribute("result", "coloredBlur");

  const merge = document.createElementNS(SVG_NS, "feMerge");
  const mergeNode1 = document.createElementNS(SVG_NS, "feMergeNode");
  mergeNode1.setAttribute("in", "coloredBlur");
  const mergeNode2 = document.createElementNS(SVG_NS, "feMergeNode");
  mergeNode2.setAttribute("in", "SourceGraphic");

  merge.appendChild(mergeNode1);
  merge.appendChild(mergeNode2);
  filter.appendChild(blur);
  filter.appendChild(merge);
  defs.appendChild(filter);

  const innerGradient = document.createElementNS(SVG_NS, "linearGradient");
  innerGradient.setAttribute("id", "innerGradient");
  innerGradient.setAttribute("x1", "0");
  innerGradient.setAttribute("y1", "0");
  innerGradient.setAttribute("x2", "0");
  innerGradient.setAttribute("y2", "1");
  const stop1 = document.createElementNS(SVG_NS, "stop");
  stop1.setAttribute("offset", "75.83%");
  stop1.setAttribute("stop-color", "rgba(0, 99, 22, 0.01)");
  const stop2 = document.createElementNS(SVG_NS, "stop");
  stop2.setAttribute("offset", "113.11%");
  stop2.setAttribute("stop-color", "rgba(255, 255, 255, 0.01)");
  innerGradient.appendChild(stop1);
  innerGradient.appendChild(stop2);
  defs.appendChild(innerGradient);

  // Inset shadow filter
  const innerShadow = document.createElementNS(SVG_NS, "filter");
  innerShadow.setAttribute("id", "innerShadow");
  innerShadow.setAttribute("x", "-20%");
  innerShadow.setAttribute("y", "-20%");
  innerShadow.setAttribute("width", "140%");
  innerShadow.setAttribute("height", "140%");

  const offset = document.createElementNS(SVG_NS, "feOffset");
  offset.setAttribute("dx", "-1");
  offset.setAttribute("dy", "5");
  offset.setAttribute("in", "SourceAlpha");

  const shadowBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
  shadowBlur.setAttribute("stdDeviation", "34.4"); // Matches CSS blur of 68.8 (stdDeviation ≈ blur / 2)
  shadowBlur.setAttribute("result", "offset-blur");

  const compositeOut = document.createElementNS(SVG_NS, "feComposite");
  compositeOut.setAttribute("operator", "out");
  compositeOut.setAttribute("in", "SourceAlpha");
  compositeOut.setAttribute("in2", "offset-blur");
  compositeOut.setAttribute("result", "inverse");

  const flood = document.createElementNS(SVG_NS, "feFlood");
  flood.setAttribute("flood-color", "#006316");
  flood.setAttribute("flood-opacity", "0.56");
  flood.setAttribute("result", "color");

  const compositeIn = document.createElementNS(SVG_NS, "feComposite");
  compositeIn.setAttribute("operator", "in");
  compositeIn.setAttribute("in", "color");
  compositeIn.setAttribute("in2", "inverse");
  compositeIn.setAttribute("result", "shadow");

  const compositeOver = document.createElementNS(SVG_NS, "feComposite");
  compositeOver.setAttribute("operator", "over");
  compositeOver.setAttribute("in", "shadow");
  compositeOver.setAttribute("in2", "SourceGraphic");

  innerShadow.appendChild(offset);
  innerShadow.appendChild(shadowBlur);
  innerShadow.appendChild(compositeOut);
  innerShadow.appendChild(flood);
  innerShadow.appendChild(compositeIn);
  innerShadow.appendChild(compositeOver);
  defs.appendChild(innerShadow);

  svg.appendChild(defs);

  // Core Layers
  const sortedLayer = document.createElementNS(SVG_NS, "g");
  const topLayer = document.createElementNS(SVG_NS, "g");
  svg.appendChild(sortedLayer);
  svg.appendChild(topLayer);

  // Math Helpers
  let globalRotX = 0;
  let globalRotY = 0;

  function rotate3D(p, rx, ry) {
    let sX = Math.sin(rx), cX = Math.cos(rx);
    let y1 = p.y * cX - p.z * sX;
    let z1 = p.y * sX + p.z * cX;

    let sY = Math.sin(ry), cY = Math.cos(ry);
    let x2 = p.x * cY + z1 * sY;
    let z2 = -p.x * sY + z1 * cY;

    return { x: x2, y: y1, z: z2 };
  }

  function rotatePt(p, pivot, axis, angle) {
    let dx = p.x - pivot[0];
    let dy = p.y - pivot[1];
    let dz = p.z - pivot[2];
    let s = Math.sin(angle), c = Math.cos(angle);
    if (axis === 'x') {
      return { x: p.x, y: pivot[1] + dy * c - dz * s, z: pivot[2] + dy * s + dz * c };
    } else if (axis === 'y') {
      return { x: pivot[0] + dx * c + dz * s, y: p.y, z: pivot[2] - dx * s + dz * c };
    } else if (axis === 'z') {
      return { x: pivot[0] + dx * c - dy * s, y: pivot[1] + dx * s + dy * c, z: p.z };
    }
    return p;
  }

  function project(p) {
    const x = CX + (p.x - p.z) * SQRT3_2 * currentScale;
    const y = CY + (p.x + p.z) * 0.5 * currentScale - p.y * currentScale;
    return { x, y };
  }

  function getNormal(p0, p1, p2) {
    let e1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: p1.z - p0.z };
    let e2 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    let nx = e1.y * e2.z - e1.z * e2.y;
    let ny = e1.z * e2.x - e1.x * e2.z;
    let nz = e1.x * e2.y - e1.y * e2.x;
    let len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: nx / len, y: ny / len, z: nz / len };
  }

  // 1. Unfolding Cube Class
  class UnfoldingCube {
    constructor(scale, strokeColor, strokeWidth, dashArray, nodeOpacity, fill, filterId, groupOpacity, showMedians = false) {
      this.scale = scale;
      this.showMedians = showMedians;
      this.facesDef = [
        { id: 'bottom', pivot: [0, -1, 0], axis: 'x', mult: 0, p: null, coords: (u, v) => [u, -1, v] },
        { id: 'front', pivot: [0, -1, 1], axis: 'x', mult: 1, p: null, coords: (u, v) => [u, v, 1] },
        { id: 'back', pivot: [0, -1, -1], axis: 'x', mult: -1, p: null, coords: (u, v) => [u, v, -1] },
        { id: 'left', pivot: [-1, -1, 0], axis: 'z', mult: 1, p: null, coords: (u, v) => [-1, u, v] },
        { id: 'right', pivot: [1, -1, 0], axis: 'z', mult: -1, p: null, coords: (u, v) => [1, u, v] },
        { id: 'top', pivot: [0, 1, -1], axis: 'x', mult: -1, p: 'back', coords: (u, v) => [u, 1, v] }
      ];

      this.wireframeFaces = {};
      this.allVertices = [];
      this.facesDef.forEach(fd => {
        const f = { ...fd, vertices: [] };

        const wireGroup = document.createElementNS(SVG_NS, "g");
        if (groupOpacity) wireGroup.setAttribute("opacity", groupOpacity);

        const wirePath = document.createElementNS(SVG_NS, "path");
        if (!dashArray) {
          // If solid, just use standard path styling
        } else {
          wirePath.setAttribute("class", "dashed-line");
        }

        wirePath.setAttribute("fill", fill || "rgba(21, 15, 20, 0.4)");
        if (strokeColor) wirePath.setAttribute("stroke", strokeColor);
        if (strokeWidth) wirePath.setAttribute("stroke-width", strokeWidth);
        if (dashArray) wirePath.setAttribute("stroke-dasharray", dashArray);
        if (filterId) wirePath.setAttribute("filter", filterId);

        wireGroup.appendChild(wirePath);
        f.wireGroup = wireGroup;
        f.wirePath = wirePath;

        for (let v = -1; v <= 1; v++) {
          for (let u = -1; u <= 1; u++) {
            const pt = fd.coords(u, v);
            const vert = {
              id: `${fd.id}_${u}_${v}`,
              u, v,
              localPt: { x: pt[0] * scale, y: pt[1] * scale, z: pt[2] * scale },
              worldPt: { x: pt[0] * scale, y: pt[1] * scale, z: pt[2] * scale },
              projectedPt: { x: 0, y: 0 }
            };

            this.allVertices.push(vert);
            f.vertices.push(vert);
          }
        }
        this.wireframeFaces[fd.id] = f;
      });
    }

    getTransform(faceId, t) {
      let f = this.wireframeFaces[faceId];
      let transforms = [];
      let curr = f;
      const maxAngle = Math.PI / 2;
      while (curr) {
        if (curr.mult !== 0) {
          transforms.push({ pivot: [curr.pivot[0] * this.scale, curr.pivot[1] * this.scale, curr.pivot[2] * this.scale], axis: curr.axis, angle: curr.mult * maxAngle * t });
        }
        curr = curr.p ? this.wireframeFaces[curr.p] : null;
      }
      return transforms;
    }

    update(t, renderables) {
      for (let fId in this.wireframeFaces) {
        let trs = this.getTransform(fId, t);
        let f = this.wireframeFaces[fId];

        let center = { x: 0, y: 0, z: 0 };

        for (let v of f.vertices) {
          let p = { ...v.localPt };
          for (let tr of trs) {
            p = rotatePt(p, tr.pivot, tr.axis, tr.angle);
          }
          p = rotate3D(p, globalRotX, globalRotY);
          v.worldPt = p;
          v.projectedPt = project(p);
          center.x += p.x; center.y += p.y; center.z += p.z;
        }

        center.x /= 9; center.y /= 9; center.z /= 9;
        let depth = center.x + center.y + center.z;

        let d = "";
        let corners = [0, 2, 8, 6];
        for (let i = 0; i < 4; i++) {
          let pt = f.vertices[corners[i]].projectedPt;
          d += (i === 0 ? `M${pt.x},${pt.y} ` : `L${pt.x},${pt.y} `);
        }
        d += "Z ";
        let medianD = "";
        if (this.showMedians) {
          for (let u = -1; u <= 1; u++) {
            let v0 = f.vertices[(0) * 3 + (u + 1)].projectedPt;
            let v1 = f.vertices[(2) * 3 + (u + 1)].projectedPt;
            medianD += `M${v0.x},${v0.y} L${v1.x},${v1.y} `;
          }
          for (let v = -1; v <= 1; v++) {
            let v0 = f.vertices[(v + 1) * 3 + 0].projectedPt;
            let v1 = f.vertices[(v + 1) * 3 + 2].projectedPt;
            medianD += `M${v0.x},${v0.y} L${v1.x},${v1.y} `;
          }
        }
        f.wirePath.setAttribute("d", d + medianD);

        renderables.push({ el: f.wireGroup, depth: depth });
      }
    }
  }

  const outerCube = new UnfoldingCube(1.0, "#777777", "0.75", "4 4", 0.4, "transparent", null, 0.8, true);
  const midCube = new UnfoldingCube(0.8, "rgba(0, 99, 22, 1.0)", "1.0", "", 0.3, "url(#innerGradient)", "url(#innerShadow)", 0.5, true);
  const innerCube = new UnfoldingCube(0.49, "rgba(0, 99, 22, 1.0)", "1.0", "", 0.2, "url(#innerGradient)", "url(#innerShadow)", 0.3, false);
  const coreCube = new UnfoldingCube(0.28, "rgba(0, 99, 22, 1.0)", "1.0", "", 0.1, "url(#innerGradient)", "url(#innerShadow)", 0.1, false);


  // 3. Data Packets
  function distance3D(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);
  }

  function getNextVertex(v, prev) {
    let neighbors = outerCube.allVertices.filter(u => {
      let d = distance3D(v.worldPt, u.worldPt);
      return d > 0.95 && d < 1.05;
    });
    if (neighbors.length === 0) return v;
    let forward = neighbors.filter(u => u !== prev);
    if (forward.length > 0) {
      return forward[Math.floor(Math.random() * forward.length)];
    }
    return neighbors[Math.floor(Math.random() * neighbors.length)];
  }

  const movingDots = [];
  const NUM_DOTS = 10;

  for (let i = 0; i < NUM_DOTS; i++) {
    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("r", "1.5");
    dot.setAttribute("fill", "rgba(20, 35, 20, 0.8)");
    dot.setAttribute("filter", "url(#glow)");
    topLayer.appendChild(dot);

    const trail = document.createElementNS(SVG_NS, "circle");
    trail.setAttribute("r", "1");
    trail.setAttribute("fill", "#1a231a");
    trail.style.opacity = "0.7";
    topLayer.appendChild(trail);

    const p = {
      el: dot,
      trail: trail,
      progress: Math.random(),
      speed: 0.0015 + Math.random() * 0.0015,
      currentVertex: outerCube.allVertices[Math.floor(Math.random() * outerCube.allVertices.length)]
    };
    p.targetVertex = getNextVertex(p.currentVertex, null);
    movingDots.push(p);
  }

  function easeInOutSine(x) {
    return -(Math.cos(Math.PI * x) - 1) / 2;
  }

  function easeInOutQuart(x) {
    return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
  }

  function getCubeT(phase, start, end, reverseStart, reverseEnd) {
    if (phase >= start && phase <= end) {
      return easeInOutQuart((phase - start) / (end - start));
    } else if (phase > end && phase < reverseStart) {
      return 1;
    } else if (phase >= reverseStart && phase <= reverseEnd) {
      return 1 - easeInOutQuart((phase - reverseStart) / (reverseEnd - reverseStart));
    } else if (phase > reverseEnd || phase < start) {
      return 0;
    }
    return 0;
  }

  // 4. Center Glowing Orb
  const centerGlow = document.createElementNS(SVG_NS, "circle");
  centerGlow.setAttribute("cx", CX);
  centerGlow.setAttribute("cy", CY);
  centerGlow.setAttribute("fill", "#006316");
  centerGlow.setAttribute("filter", "url(#glow)");

  container.appendChild(svg);

  // Drag to rotate
  let tX = 0, tY = 0, cPX = 0, cPY = 0;
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let vX = 0, vY = 0;

  document.body.style.cursor = 'grab';

  document.addEventListener('mousedown', e => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    vX = 0;
    vY = 0;
    document.body.style.cursor = 'grabbing';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.cursor = 'grab';
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;

    vY = deltaX * 0.4;
    vX = -deltaY * 0.4;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    isDragging = false;
    document.body.style.cursor = 'grab';
  });

  function renderLoop(time) {
    time *= 0.001;

    if (!isDragging) {
      vX *= 0.94; // Friction deceleration
      vY *= 0.94;
    }
    tX += vX;
    tY += vY;

    // Cinematic Starting Animation
    // Scales up from a small point while spinning slightly
    let entryProgress = Math.min(1, time / 4.0); // 4 second scale up
    let entryEase = easeInOutQuart(entryProgress);
    currentScale = SCALE * (0.01 + 0.99 * entryEase);

    // Spin during entrance
    let extraSpin = (1 - entryEase) * 180;

    // Parallax
    let autoTiltX = Math.sin(time * 0.5) * 4;
    let autoTiltY = Math.cos(time * 0.3) * 4;
    cPX += (tX + autoTiltX - cPX) * 0.08;
    cPY += (tY + autoTiltY - cPY) * 0.08;

    globalRotX = cPX * (Math.PI / 180);
    globalRotY = (cPY + extraSpin) * (Math.PI / 180);

    // Center Orb
    let pulse = 11 + Math.sin(time * 2) * 2;
    centerGlow.setAttribute("r", pulse);

    let renderables = [];
    renderables.push({ el: centerGlow, depth: 0 });

    // Unfold Timing Sequence
    let cycle = 24; // 24 seconds total cycle
    let phase = (time % cycle) / cycle;

    let tOuter = 0;
    let tMid = 0;
    let tInner = 0;
    let tCore = 0;

    outerCube.update(tOuter, renderables);
    midCube.update(tMid, renderables);
    innerCube.update(tInner, renderables);
    coreCube.update(tCore, renderables);


    // Depth Sort & Append
    renderables.sort((a, b) => a.depth - b.depth);
    for (let r of renderables) {
      sortedLayer.appendChild(r.el); // highly efficient re-ordering
    }

    // Packets
    for (let p of movingDots) {
      p.progress += p.speed;

      let dist = distance3D(p.currentVertex.worldPt, p.targetVertex.worldPt);
      if (dist > 1.5) {
        p.targetVertex = getNextVertex(p.currentVertex, null);
        p.progress = 0;
      }

      if (p.progress >= 1) {
        p.progress = 0;
        let prev = p.currentVertex;
        p.currentVertex = p.targetVertex;
        p.targetVertex = getNextVertex(p.currentVertex, prev);
      }

      if (p.currentVertex && p.targetVertex) {
        const ease = easeInOutSine(p.progress);
        const cw = p.currentVertex.worldPt;
        const tw = p.targetVertex.worldPt;

        const prevCx = p.el.getAttribute("cx");
        const prevCy = p.el.getAttribute("cy");

        const x3d = cw.x + (tw.x - cw.x) * ease;
        const y3d = cw.y + (tw.y - cw.y) * ease;
        const z3d = cw.z + (tw.z - cw.z) * ease;
        const proj = project({ x: x3d, y: y3d, z: z3d });

        p.el.setAttribute("cx", proj.x);
        p.el.setAttribute("cy", proj.y);

        if (prevCx !== null) {
          p.trail.setAttribute("cx", prevCx);
          p.trail.setAttribute("cy", prevCy);
        }
      }
    }

    requestAnimationFrame(renderLoop);
  }

  requestAnimationFrame(renderLoop);

  /* ── Build Text Scramble Animation ─────────────────────────── */
  const buildText = document.getElementById('build-text');
  if (buildText) {
    const originalText = "BUILD";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
    let iteration = 0;
    let interval = null;

    function scramble() {
      interval = setInterval(() => {
        buildText.innerText = originalText.split("")
          .map((char, index) => {
            if (index < iteration) return originalText[index];
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join("");

        if (iteration >= originalText.length) {
          clearInterval(interval);
          // Loop every 10 seconds for extra "wow"
          setTimeout(() => { iteration = 0; scramble(); }, 8000);
        }
        iteration += 1 / 10;
      }, 60);
    }

    scramble();
  }

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
