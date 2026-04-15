/**
 * VouchGraph3D — 3D visualization of vouch network.
 * Nodes = addresses; edges = vouches (voucher → target).
 * Neural-network style with glowing nodes and connections.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { VouchGraphData } from "@/hooks/useVouchGraphData";

const COLOR_CENTER = new THREE.Color(0x60a5fa);
/** Endorsements toward the focal profile — cool green (reads clearly vs “given”). */
const COLOR_RECEIVED = new THREE.Color(0x22c55e);
/** Vouches from the focal profile — warm amber (far from green + cyan in hue & luminance). */
const COLOR_GIVEN = new THREE.Color(0xf97316);
/** Global graph or edges not tied to the center — neutral cyan. */
const COLOR_EDGE = new THREE.Color(0x67e8f9);
/** Rare peripheral-only edges in ego mode. */
const COLOR_EDGE_OTHER = new THREE.Color(0x94a3b8);

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

function computeNodePositions(data: VouchGraphData): Map<string, THREE.Vector3> {
  const positions = new Map<string, THREE.Vector3>();
  const { nodes, edges, centerAddress } = data;
  if (nodes.length === 0) return positions;

  /** Global / network-wide graph: no focal node — place everyone on a sphere. */
  if (!centerAddress) {
    const R = 8;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    nodes.forEach((addr, i) => {
      const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(nodes.length, 1));
      const theta = 2 * Math.PI * (i / goldenRatio);
      positions.set(
        addr,
        new THREE.Vector3(
          R * Math.sin(phi) * Math.cos(theta),
          R * Math.sin(phi) * Math.sin(theta),
          R * Math.cos(phi)
        )
      );
    });
    return positions;
  }

  const center = new THREE.Vector3(0, 0, 0);
  positions.set(centerAddress, center);

  const received: string[] = [];
  const given: string[] = [];
  for (const e of edges) {
    if (e.target === centerAddress && e.voucher !== centerAddress) received.push(e.voucher);
    if (e.voucher === centerAddress && e.target !== centerAddress) given.push(e.target);
  }
  const receivedUnique = [...new Set(received)];
  const givenUnique = [...new Set(given)];

  const layerRadius = 6;
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  receivedUnique.forEach((addr, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(receivedUnique.length, 1));
    const theta = 2 * Math.PI * (i / goldenRatio);
    positions.set(
      addr,
      new THREE.Vector3(
        layerRadius * Math.sin(phi) * Math.cos(theta),
        layerRadius * Math.sin(phi) * Math.sin(theta),
        layerRadius * Math.cos(phi)
      )
    );
  });

  givenUnique.forEach((addr, i) => {
    const n = givenUnique.length;
    const phi = Math.acos(1 - 2 * (i + 0.5) / Math.max(n, 1));
    const theta = 2 * Math.PI * (i / goldenRatio) + Math.PI * 0.5;
    const r = layerRadius * 1.4;
    positions.set(
      addr,
      new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
    );
  });

  return positions;
}

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!(gl && gl instanceof WebGLRenderingContext);
  } catch {
    return false;
  }
}

function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

interface VouchGraph3DProps {
  data: VouchGraphData;
  nodeLabels?: Record<string, string>;
  className?: string;
}

export function VouchGraph3D({ data, nodeLabels = {}, className = "" }: VouchGraph3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [useFallback, setUseFallback] = useState<boolean | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isWebGLAvailable()) {
      setUseFallback(true);
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setUseFallback(true);
      return;
    }

    const r = renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setClearColor(0x050508, 1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.domElement.style.width = "100%";
    r.domElement.style.height = "100%";
    r.domElement.style.display = "block";
    r.domElement.style.position = "absolute";
    r.domElement.style.inset = "0";
    container.appendChild(r.domElement);

    const labelsDiv = document.createElement("div");
    labelsDiv.style.cssText =
      "position:absolute;inset:0;pointer-events:none;overflow:hidden;";
    container.appendChild(labelsDiv);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.003);
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 12, 24);

    const controls = new OrbitControls(camera, r.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = data.edges.length > 0;
    controls.autoRotateSpeed = 0.3;
    controls.enablePan = true;
    controls.minDistance = 5;
    controls.maxDistance = 50;

    const composer = new EffectComposer(r);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.5, 0.5, 0.6);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const positions = computeNodePositions(data);
    const nodeList = data.nodes.filter((n) => positions.has(n));

    const labelEntries: { addr: string; pos: THREE.Vector3; el: HTMLSpanElement }[] = [];
    const proj = new THREE.Vector3();
    nodeList.forEach((addr) => {
      const pos = positions.get(addr)!;
      const span = document.createElement("span");
      const label =
        nodeLabels[addr.toLowerCase()] ?? nodeLabels[addr] ?? shortAddr(addr);
      span.textContent = label;
      span.style.cssText =
        "position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;font-size:11px;font-weight:500;color:rgba(255,255,255,0.9);text-shadow:0 0 4px rgba(0,0,0,0.8);";
      labelsDiv.appendChild(span);
      labelEntries.push({ addr, pos: pos.clone(), el: span });
    });

    if (nodeList.length === 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
      const mat = new THREE.PointsMaterial({
        color: COLOR_CENTER,
        size: 2,
        transparent: true,
        opacity: 0.8,
      });
      const mesh = new THREE.Points(geo, mat);
      scene.add(mesh);
    } else {
      const nodePos: number[] = [];
      const nodeSizes: number[] = [];
      const nodeColors: number[] = [];
      const centerAddr = data.centerAddress ?? "";
      const globalMode = !data.centerAddress;

      nodeList.forEach((addr) => {
        const pos = positions.get(addr)!;
        nodePos.push(pos.x, pos.y, pos.z);
        const isCenter = !globalMode && addr === centerAddr;
        const isReceived =
          !globalMode &&
          data.edges.some((e) => e.target === centerAddr && e.voucher === addr);
        const isGivenNeighbor =
          !globalMode &&
          !isCenter &&
          !isReceived &&
          data.edges.some((e) => e.voucher === centerAddr && e.target === addr);
        const c = globalMode
          ? COLOR_EDGE
          : isCenter
            ? COLOR_CENTER
            : isReceived
              ? COLOR_RECEIVED
              : isGivenNeighbor
                ? COLOR_GIVEN
                : COLOR_EDGE_OTHER;
        nodeColors.push(c.r, c.g, c.b);
        nodeSizes.push(isCenter ? 1.8 : globalMode ? 1.1 : 0.9);
      });

      const nodeGeo = new THREE.BufferGeometry();
      nodeGeo.setAttribute("position", new THREE.Float32BufferAttribute(nodePos, 3));
      nodeGeo.setAttribute("nodeSize", new THREE.Float32BufferAttribute(nodeSizes, 1));
      nodeGeo.setAttribute("nodeColor", new THREE.Float32BufferAttribute(nodeColors, 3));
      const nodeMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          attribute float nodeSize;
          attribute vec3 nodeColor;
          uniform float uTime;
          varying vec3 vColor;
          void main() {
            vColor = nodeColor;
            float breathe = sin(uTime * 0.6) * 0.1 + 0.9;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = nodeSize * breathe * (800.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
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

      if (data.edges.length > 0) {
        const connPos: number[] = [];
        const connStart: number[] = [];
        const connEnd: number[] = [];
        const connStr: number[] = [];
        const connCol: number[] = [];
        const connPath: number[] = [];
        let pathIdx = 0;

        for (const e of data.edges) {
          const start = positions.get(e.voucher);
          const end = positions.get(e.target);
          if (!start || !end) continue;

          let edgeRgb = COLOR_EDGE;
          if (!globalMode && centerAddr) {
            const incomingToCenter =
              e.target === centerAddr && e.voucher !== centerAddr;
            const outgoingFromCenter =
              e.voucher === centerAddr && e.target !== centerAddr;
            if (incomingToCenter) edgeRgb = COLOR_RECEIVED;
            else if (outgoingFromCenter) edgeRgb = COLOR_GIVEN;
            else edgeRgb = COLOR_EDGE_OTHER;
          }

          for (let k = 0; k < 16; k++) {
            const t = k / 15;
            connPos.push(t, 0, 0);
            connStart.push(start.x, start.y, start.z);
            connEnd.push(end.x, end.y, end.z);
            connPath.push(pathIdx);
            connStr.push(e.strength);
            connCol.push(edgeRgb.r, edgeRgb.g, edgeRgb.b);
          }
          pathIdx++;
        }

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
            varying float vT;
            void main() {
              float t = position.x;
              vT = t;
              vec3 mid = mix(startPoint, endPoint, 0.5);
              vec3 dir = normalize(endPoint - startPoint);
              vec3 perp = normalize(cross(dir, vec3(0,1,0)));
              if (length(perp) < 0.1) perp = vec3(1,0,0);
              mid += perp * sin(t * 3.14159) * 0.2;
              vec3 p0 = mix(startPoint, mid, t);
              vec3 p1 = mix(mid, endPoint, t);
              vec3 pos = mix(p0, p1, t) + perp * snoise(vec3(pathIndex*0.1, t*0.5, uTime*0.2)) * 0.15;
              vColor = connectionColor;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            uniform float uTime;
            varying vec3 vColor;
            varying float vT;
            void main() {
              float flow = sin(vT * 20.0 - uTime * 3.0) * 0.5 + 0.5;
              vec3 col = vColor * (0.85 + 0.15 * sin(uTime * 0.5 + vT * 10.0));
              float a = (0.6 + 0.4 * flow) * 0.65;
              gl_FragColor = vec4(col, a);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const connMesh = new THREE.LineSegments(connGeo, connMat);
        scene.add(connMesh);
      }
    }

    const timeStart = performance.now();
    let animId: number;
    const materialsToUpdate: THREE.ShaderMaterial[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        const mat = obj.material;
        if (mat && "uniforms" in mat && (mat as THREE.ShaderMaterial).uniforms?.uTime) {
          materialsToUpdate.push(mat as THREE.ShaderMaterial);
        }
      }
    });

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
      const t = (performance.now() - timeStart) / 1000;
      for (const mat of materialsToUpdate) {
        mat.uniforms.uTime.value = t;
      }
      controls.update();
      composer.render();

      const w = container!.clientWidth;
      const h = container!.clientHeight;
      for (const { pos, el } of labelEntries) {
        proj.copy(pos);
        proj.project(camera);
        const ndcX = (proj.x + 1) / 2;
        const ndcY = (1 - proj.y) / 2;
        if (proj.z > 1 || proj.z < -1) {
          el.style.visibility = "hidden";
        } else {
          el.style.visibility = "visible";
          el.style.left = `${ndcX * w}px`;
          el.style.top = `${ndcY * h}px`;
        }
      }
    }

    resize();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
      controls.dispose();
      composer.dispose();
      if (container.contains(labelsDiv)) container.removeChild(labelsDiv);
      if (container.contains(r.domElement)) container.removeChild(r.domElement);
      r.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
      });
    };
  }, [data, nodeLabels]);

  if (useFallback === true) {
    return (
      <div
        ref={containerRef}
        className={`flex items-center justify-center rounded-xl border border-theme-border bg-theme-surface p-12 ${className}`}
      >
        <p className="text-theme-text-muted text-sm">
          3D view isn&apos;t available here — try another device or update your system, then open this page again.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative min-h-[400px] w-full rounded-xl border border-theme-border bg-theme-background overflow-hidden ${className}`}
      style={{ aspectRatio: "16/10" }}
    />
  );
}
