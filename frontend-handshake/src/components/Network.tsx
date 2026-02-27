/**
 * Network — serene neural network background.
 * Uses WebGL (Three.js) when available; falls back to Canvas 2D particle network
 * when WebGL is blocked (e.g. sandboxed environments). Canvas 2D works everywhere.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const COLOR_PALETTE = [
  new THREE.Color(0x667eea),
  new THREE.Color(0x764ba2),
  new THREE.Color(0xf093fb),
  new THREE.Color(0x9d50bb),
  new THREE.Color(0x6e48aa),
];

const NOISE_FUNCTIONS = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!(gl && gl instanceof WebGLRenderingContext);
  } catch {
    return false;
  }
}

interface Node {
  position: THREE.Vector3;
  connections: { node: Node; strength: number }[];
  level: number;
  type: number;
  size: number;
  distanceFromRoot: number;
}

function createNode(pos: THREE.Vector3, level: number, type: number): Node {
  return {
    position: pos,
    connections: [],
    level,
    type,
    size: type === 0 ? THREE.MathUtils.randFloat(0.8, 1.4) : THREE.MathUtils.randFloat(0.5, 1.0),
    distanceFromRoot: 0,
  };
}

function addConnection(a: Node, b: Node, strength = 1.0) {
  if (!a.connections.some((c) => c.node === b)) {
    a.connections.push({ node: b, strength });
    b.connections.push({ node: a, strength });
  }
}

function generateCrystallineSphere(): { nodes: Node[] } {
  const nodes: Node[] = [];
  const root = createNode(new THREE.Vector3(0, 0, 0), 0, 0);
  root.size = 2;
  nodes.push(root);
  const layers = 5;
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let layer = 1; layer <= layers; layer++) {
    const radius = layer * 4;
    const numPoints = Math.floor(layer * 12);
    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / numPoints);
      const theta = 2 * Math.PI * (i / goldenRatio);
      const pos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      const isLeaf = layer === layers || Math.random() < 0.3;
      const node = createNode(pos, layer, isLeaf ? 1 : 0);
      node.distanceFromRoot = radius;
      nodes.push(node);
      if (layer > 1) {
        const prev = nodes.filter((n) => n.level === layer - 1 && n !== root);
        prev.sort((a, b) => pos.distanceTo(a.position) - pos.distanceTo(b.position));
        for (let j = 0; j < Math.min(3, prev.length); j++) {
          const dist = pos.distanceTo(prev[j].position);
          addConnection(node, prev[j], Math.max(0.3, 1 - dist / (radius * 2)));
        }
      } else {
        addConnection(root, node, 0.9);
      }
    }
  }
  return { nodes };
}

/** Canvas 2D particle network — works when WebGL is blocked (e.g. sandboxed). */
function Canvas2DNetwork({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;";
    container.appendChild(canvas);

    const ctxOrNull = canvas.getContext("2d");
    if (!ctxOrNull) return;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    const particles: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: 1 + Math.random() * 2,
      });
    }

    let animId: number;
    function resize() {
      const w = container!.clientWidth;
      const h = container!.clientHeight;
      canvas.width = w;
      canvas.height = h;
    }

    function draw() {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = Math.min(w, h) / 120;

      ctx.fillStyle = "rgba(5, 5, 8, 0.15)";
      ctx.fillRect(0, 0, w, h);

      const t = Date.now() * 0.001;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -50 || p.x > 50) p.vx *= -1;
        if (p.y < -50 || p.y > 50) p.vy *= -1;

        const px = cx + p.x * scale;
        const py = cy + p.y * scale;

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const qx = cx + q.x * scale;
          const qy = cy + q.y * scale;
          const dist = Math.hypot(px - qx, py - qy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.3 * (0.5 + 0.5 * Math.sin(t + i * 0.1));
            ctx.strokeStyle = `rgba(102, 126, 234, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(qx, qy);
            ctx.stroke();
          }
        }

        const pulse = 0.7 + 0.3 * Math.sin(t * 2 + i * 0.2);
        ctx.beginPath();
        ctx.arc(px, py, p.r * pulse * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(102, 126, 234, ${0.4 + 0.3 * pulse})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
      container.removeChild(canvas);
    };
  }, [containerRef]);

  return null;
}

export function Network() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [useCanvas2D, setUseCanvas2D] = useState<boolean | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const webglOk = isWebGLAvailable();
    let renderer: THREE.WebGLRenderer | null = null;

    if (webglOk) {
      const rendererOptions = [
        { antialias: true, alpha: true },
        { antialias: false, alpha: true, powerPreference: "low-power" as const },
        { antialias: false, alpha: false },
      ];
      for (const opts of rendererOptions) {
        try {
          renderer = new THREE.WebGLRenderer(opts);
          break;
        } catch {
          // try next
        }
      }
    }

    if (!renderer) {
      setUseCanvas2D(true);
      return;
    }

    const r = renderer;
    try {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000000, 0.002);
      const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1000);
      camera.position.set(0, 8, 28);

      r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      r.setClearColor(0x050508, 1);
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.domElement.style.pointerEvents = "none";
      container.appendChild(r.domElement);

      const starGeo = new THREE.BufferGeometry();
      const starPos: number[] = [];
      const starCol: number[] = [];
      const starSize: number[] = [];
      for (let i = 0; i < 4000; i++) {
        const r_val = THREE.MathUtils.randFloat(50, 120);
        const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
        const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
        starPos.push(r_val * Math.sin(phi) * Math.cos(theta), r_val * Math.sin(phi) * Math.sin(theta), r_val * Math.cos(phi));
        const c = Math.random();
        if (c < 0.7) starCol.push(1, 1, 1);
        else if (c < 0.85) starCol.push(0.7, 0.8, 1);
        else starCol.push(1, 0.9, 0.8);
        starSize.push(THREE.MathUtils.randFloat(0.1, 0.25));
      }
      starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
      starGeo.setAttribute("color", new THREE.Float32BufferAttribute(starCol, 3));
      starGeo.setAttribute("size", new THREE.Float32BufferAttribute(starSize, 1));
      const starMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          attribute float size; attribute vec3 color; varying vec3 vColor; uniform float uTime;
          void main() {
            vColor = color;
            float twinkle = sin(uTime * 2.0 + position.x * 100.0) * 0.3 + 0.7;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * twinkle * (300.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(vColor, (1.0 - smoothstep(0.0, 0.5, d)) * 0.7);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const stars = new THREE.Points(starGeo, starMat);
      scene.add(stars);

      const controls = new OrbitControls(camera, r.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.2;
      controls.enablePan = false;
      controls.minDistance = 8;
      controls.maxDistance = 80;

      const composer = new EffectComposer(r);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.8, 0.6, 0.7);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());

      const { nodes } = generateCrystallineSphere();
      const nodePos: number[] = [];
      const nodeTypes: number[] = [];
      const nodeSizes: number[] = [];
      const nodeColors: number[] = [];
      const distRoot: number[] = [];
      nodes.forEach((n) => {
        nodePos.push(n.position.x, n.position.y, n.position.z);
        nodeTypes.push(n.type);
        nodeSizes.push(n.size);
        distRoot.push(n.distanceFromRoot);
        const c = COLOR_PALETTE[Math.min(n.level, COLOR_PALETTE.length - 1)].clone();
        c.offsetHSL(THREE.MathUtils.randFloatSpread(0.03), THREE.MathUtils.randFloatSpread(0.08), THREE.MathUtils.randFloatSpread(0.08));
        nodeColors.push(c.r, c.g, c.b);
      });
      const nodeGeo = new THREE.BufferGeometry();
      nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nodePos, 3));
      nodeGeo.setAttribute("nodeType", new THREE.Float32BufferAttribute(nodeTypes, 1));
      nodeGeo.setAttribute("nodeSize", new THREE.Float32BufferAttribute(nodeSizes, 1));
      nodeGeo.setAttribute("nodeColor", new THREE.Float32BufferAttribute(nodeColors, 3));
      nodeGeo.setAttribute("distanceFromRoot", new THREE.Float32BufferAttribute(distRoot, 1));
      const nodeMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `${NOISE_FUNCTIONS}
          attribute float nodeType, nodeSize, distanceFromRoot;
          attribute vec3 nodeColor;
          uniform float uTime;
          varying vec3 vColor;
          varying float vDist;
          void main() {
            vColor = nodeColor;
            vDist = distanceFromRoot;
            float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = nodeSize * breathe * 0.6 * (1000.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vDist;
          void main() {
            vec2 c = 2.0 * gl_PointCoord - 1.0;
            float d = length(c);
            if (d > 1.0) discard;
            float a = (1.0 - smoothstep(0.0, 0.5, d)) * 0.9;
            gl_FragColor = vec4(vColor, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const nodeMesh = new THREE.Points(nodeGeo, nodeMat);
      scene.add(nodeMesh);

      const connPos: number[] = [];
      const connStart: number[] = [];
      const connEnd: number[] = [];
      const connStr: number[] = [];
      const connCol: number[] = [];
      const connPath: number[] = [];
      const seen = new Set<string>();
      let pathIdx = 0;
      nodes.forEach((node, i) => {
        node.connections.forEach(({ node: other, strength }) => {
          const j = nodes.indexOf(other);
          if (j === -1) return;
          const key = [Math.min(i, j), Math.max(i, j)].join("-");
          if (seen.has(key)) return;
          seen.add(key);
          const start = node.position;
          const end = other.position;
          for (let k = 0; k < 20; k++) {
            const t = k / 19;
            connPos.push(t, 0, 0);
            connStart.push(start.x, start.y, start.z);
            connEnd.push(end.x, end.y, end.z);
            connPath.push(pathIdx);
            connStr.push(strength);
            const c = COLOR_PALETTE[Math.min(Math.floor((node.level + other.level) / 2), COLOR_PALETTE.length - 1)].clone();
            c.offsetHSL(THREE.MathUtils.randFloatSpread(0.03), THREE.MathUtils.randFloatSpread(0.08), THREE.MathUtils.randFloatSpread(0.08));
            connCol.push(c.r, c.g, c.b);
          }
          pathIdx++;
        });
      });
      const connGeo = new THREE.BufferGeometry();
      connGeo.setAttribute("position", new THREE.Float32BufferAttribute(connPos, 3));
      connGeo.setAttribute("startPoint", new THREE.Float32BufferAttribute(connStart, 3));
      connGeo.setAttribute("endPoint", new THREE.Float32BufferAttribute(connEnd, 3));
      connGeo.setAttribute("connectionStrength", new THREE.Float32BufferAttribute(connStr, 1));
      connGeo.setAttribute("connectionColor", new THREE.Float32BufferAttribute(connCol, 3));
      connGeo.setAttribute("pathIndex", new THREE.Float32BufferAttribute(connPath, 1));
      const connMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `${NOISE_FUNCTIONS}
          attribute vec3 startPoint, endPoint;
          attribute float connectionStrength, pathIndex;
          attribute vec3 connectionColor;
          uniform float uTime;
          varying vec3 vColor;
          varying float vStr;
          varying float vT;
          void main() {
            float t = position.x;
            vT = t;
            vec3 mid = mix(startPoint, endPoint, 0.5);
            vec3 perp = normalize(cross(normalize(endPoint - startPoint), vec3(0,1,0)));
            if (length(perp) < 0.1) perp = vec3(1,0,0);
            mid += perp * sin(t * 3.14159) * 0.15;
            vec3 p0 = mix(startPoint, mid, t);
            vec3 p1 = mix(mid, endPoint, t);
            vec3 pos = mix(p0, p1, t) + perp * snoise(vec3(pathIndex*0.08, t*0.6, uTime*0.15)) * 0.12;
            vColor = connectionColor;
            vStr = connectionStrength;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec3 vColor;
          varying float vStr;
          varying float vT;
          void main() {
            float flow = sin(vT * 25.0 - uTime * 4.0) * 0.5 + 0.5;
            vec3 col = vColor * (0.8 + 0.2 * sin(uTime * 0.6 + vT * 12.0));
            float a = (0.7 * vStr + 0.3 * flow) * 0.7;
            gl_FragColor = vec4(col, a);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const connMesh = new THREE.LineSegments(connGeo, connMat);
      scene.add(connMesh);

      const clock = new THREE.Clock();
      let animId: number;

      function resize() {
        const w = container!.clientWidth;
        const h = container!.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        r.setSize(w, h);
        composer.setSize(w, h);
        composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        bloom.resolution.set(w, h);
      }

      function animate() {
        animId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        starMat.uniforms.uTime.value = t;
        nodeMat.uniforms.uTime.value = t;
        connMat.uniforms.uTime.value = t;
        stars.rotation.y += 0.0002;
        nodeMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
        connMesh.rotation.y = Math.sin(t * 0.04) * 0.05;
        controls.update();
        composer.render();
      }

      resize();
      animate();
      window.addEventListener("resize", resize);

      return () => {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(animId);
        if (container.contains(r.domElement)) container.removeChild(r.domElement);
        r.dispose();
        starGeo.dispose();
        starMat.dispose();
        nodeGeo.dispose();
        nodeMat.dispose();
        connGeo.dispose();
        connMat.dispose();
      };
    } catch {
      setUseCanvas2D(true);
      try {
        if (renderer && container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
        renderer?.dispose();
      } catch {}
    }
  }, []);

  if (useCanvas2D === true) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
        <Canvas2DNetwork containerRef={containerRef} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden
    />
  );
}
