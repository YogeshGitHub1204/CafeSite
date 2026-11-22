import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Coffee, Compass, MapPin, Sparkles } from 'lucide-react';
import type {
  AtmospherePreset,
  CafeTable,
  MenuCategory,
  StoreConfig,
} from '../types/cafe';
import { ATMOSPHERE_DETAILS } from '../types/cafe';
import {
  buildCafeScene,
  type CafeHotspotInfo,
  type CafeSceneController,
} from '../three/cafeBuilder';

export type CameraFocusKey = 'overview' | 'espresso' | 'roastery' | 'tables';

interface CameraPreset {
  pos: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: Record<CameraFocusKey, CameraPreset> = {
  overview: { pos: [7.6, 5.4, 8.2], target: [-0.4, 1.1, -0.6] },
  espresso: { pos: [2.2, 2.35, 0.85], target: [1.35, 1.15, -2.3] },
  roastery: { pos: [-1.4, 2.45, -0.35], target: [-2.4, 1.65, -3.7] },
  tables: { pos: [3.2, 4.4, 6.4], target: [-0.7, 0.75, 1.2] },
};

interface CafeScene3DProps {
  config: StoreConfig;
  tables: CafeTable[];
  selectedTableId: string | null;
  activeFocus: CameraFocusKey;
  onFocusChange: (focus: CameraFocusKey) => void;
  onSelectAtmosphere: (atmosphere: AtmospherePreset) => void;
  onHotspotOrderCategory: (category: MenuCategory) => void;
  onSelectTableFrom3D: (tableId: string) => void;
}

export default function CafeScene3D({
  config,
  tables,
  selectedTableId,
  activeFocus,
  onFocusChange,
  onSelectAtmosphere,
  onHotspotOrderCategory,
  onSelectTableFrom3D,
}: CafeScene3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<CafeSceneController | null>(null);
  const transitionRef = useRef<{
    active: boolean;
    pos: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    pos: new THREE.Vector3(...CAMERA_PRESETS.overview.pos),
    target: new THREE.Vector3(...CAMERA_PRESETS.overview.target),
  });

  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [hoveredHotspot, setHoveredHotspot] = useState<CafeHotspotInfo | null>(null);
  const [activeHotspot, setActiveHotspot] = useState<CafeHotspotInfo | null>(null);
  const [contextLost, setContextLost] = useState(false);

  const tablesRef = useRef(tables);
  tablesRef.current = tables;
  const configRef = useRef(config);
  configRef.current = config;
  const onSelectTableRef = useRef(onSelectTableFrom3D);
  onSelectTableRef.current = onSelectTableFrom3D;
  const onFocusChangeRef = useRef(onFocusChange);
  onFocusChangeRef.current = onFocusChange;

  // Mount Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 1280;
    const height = container.clientHeight || 640;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Environment reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.4;
    controls.maxDistance = 16.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minPolarAngle = 0.25;
    controls.update();

    controls.addEventListener('start', () => {
      transitionRef.current.active = false;
    });

    const cafeController = buildCafeScene(
      scene,
      renderer,
      isSoftwareGl,
      tablesRef.current,
      configRef.current.activeRoastNote
    );
    cafeController.applyAesthetics(
      configRef.current.atmosphere,
      configRef.current.surfaceFinish,
      configRef.current.accentMetal
    );
    controllerRef.current = cafeController;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting setup
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastHoverCheck = 0;
    let downX = 0;
    let downY = 0;

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
    };

    const handlePointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;

      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(cafeController.clickables, false);
      if (hits.length > 0) {
        const info = hits[0].object.userData.hotspot as CafeHotspotInfo | undefined;
        if (info) {
          renderer.domElement.style.cursor = 'pointer';
          cafeController.setHighlightedHotspot(info.id);
          setHoveredHotspot(info);
          return;
        }
      }
      renderer.domElement.style.cursor = 'grab';
      cafeController.setHighlightedHotspot(null);
      setHoveredHotspot(null);
    };

    const handlePointerUp = (ev: PointerEvent) => {
      const moved = Math.hypot(ev.clientX - downX, ev.clientY - downY);
      if (moved > 6) return;

      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(cafeController.clickables, false);
      if (hits.length > 0) {
        const info = hits[0].object.userData.hotspot as CafeHotspotInfo | undefined;
        if (info) {
          setActiveHotspot(info);
          if (info.kind === 'espresso') {
            transitionRef.current = {
              active: true,
              pos: new THREE.Vector3(...CAMERA_PRESETS.espresso.pos),
              target: new THREE.Vector3(...CAMERA_PRESETS.espresso.target),
            };
            onFocusChangeRef.current('espresso');
          } else if (info.kind === 'roastery') {
            transitionRef.current = {
              active: true,
              pos: new THREE.Vector3(...CAMERA_PRESETS.roastery.pos),
              target: new THREE.Vector3(...CAMERA_PRESETS.roastery.target),
            };
            onFocusChangeRef.current('roastery');
          } else if (info.kind === 'table' && info.tableId) {
            const tbl = tablesRef.current.find((t) => t.id === info.tableId);
            if (tbl) {
              transitionRef.current = {
                active: true,
                pos: new THREE.Vector3(tbl.x + 1.8, 2.25, tbl.z + 2.4),
                target: new THREE.Vector3(tbl.x, 0.78, tbl.z),
              };
              onSelectTableRef.current(tbl.id);
            }
          }
        }
      }
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 640;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation loop (paced properly on Software WebGL)
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Smooth camera transition
      const tr = transitionRef.current;
      if (tr.active) {
        const lambda = reduceMotion ? 30 : 5.2;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, tr.pos.x, lambda, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, tr.pos.y, lambda, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, tr.pos.z, lambda, delta);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, tr.target.x, lambda, delta);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, tr.target.y, lambda, delta);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, tr.target.z, lambda, delta);

        if (
          camera.position.distanceTo(tr.pos) < 0.03 &&
          controls.target.distanceTo(tr.target) < 0.03
        ) {
          tr.active = false;
        }
      }

      // Gentle steam rise above tasting cortado & vinyl turntable spin
      if (!reduceMotion) {
        cafeController.vinylDisc.rotation.y += delta * 0.85;
        const posAttr = cafeController.steamParticles.geometry.getAttribute(
          'position'
        ) as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < cafeController.steamVelocities.length; i++) {
          arr[i * 3 + 1] += cafeController.steamVelocities[i] * delta;
          arr[i * 3] =
            cafeController.steamOrigins[i * 3] + Math.sin(elapsed * 1.4 + i) * 0.025;
          if (arr[i * 3 + 1] > cafeController.steamOrigins[i * 3 + 1] + 0.65) {
            arr[i * 3 + 1] = cafeController.steamOrigins[i * 3 + 1];
          }
        }
        posAttr.needsUpdate = true;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      cafeController.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      controllerRef.current = null;
    };
  }, []);

  // Sync aesthetic config changes to live 3D scene
  useEffect(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    ctrl.applyAesthetics(config.atmosphere, config.surfaceFinish, config.accentMetal);
    ctrl.updateMenuBoard(config.activeRoastNote);
  }, [config.atmosphere, config.surfaceFinish, config.accentMetal, config.activeRoastNote]);

  // Sync table status changes to 3D pendant lamps & table rings
  useEffect(() => {
    controllerRef.current?.updateTables(tables);
  }, [tables]);

  // Sync camera focus preset changes from UI
  useEffect(() => {
    const preset = CAMERA_PRESETS[activeFocus];
    if (!preset) return;
    transitionRef.current = {
      active: true,
      pos: new THREE.Vector3(...preset.pos),
      target: new THREE.Vector3(...preset.target),
    };
  }, [activeFocus]);

  // Sync selected table from Reservation Section back to 3D camera
  useEffect(() => {
    if (!selectedTableId) return;
    const tbl = tables.find((t) => t.id === selectedTableId);
    if (!tbl) return;
    setActiveHotspot({ id: `table:${tbl.id}`, kind: 'table', tableId: tbl.id });
    transitionRef.current = {
      active: true,
      pos: new THREE.Vector3(tbl.x + 1.8, 2.25, tbl.z + 2.4),
      target: new THREE.Vector3(tbl.x, 0.78, tbl.z),
    };
  }, [selectedTableId, tables]);

  const activeTable =
    activeHotspot?.kind === 'table'
      ? tables.find((t) => t.id === activeHotspot.tableId)
      : null;

  const isDarkScene = config.atmosphere === 'evening';

  return (
    <section
      id="cafe-3d"
      className="relative w-full h-[78vh] min-h-[540px] max-h-[820px] overflow-hidden border-b border-stone-200 dark:border-stone-800"
    >
      {/* Isolated WebGL mount container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D view of Aurora Roasters cafe interior"
      />

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-900 text-stone-100 p-8 text-center">
          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-display font-semibold">3D Viewport Paused</h2>
            <p className="text-sm text-stone-300">
              Your browser temporarily released the WebGL graphics context. Refresh or scroll to browse the menu below.
            </p>
          </div>
        </div>
      )}

      {/* Minimal Top-Left Scene Context & Clicked Hotspot Callout (solid rgba, zero backdrop-blur) */}
      <div className="pointer-events-none absolute top-5 left-5 right-5 flex flex-wrap items-start justify-between gap-4">
        <div
          className={`pointer-events-auto max-w-sm rounded-xl border px-4 py-3 shadow-sm transition-colors duration-200 ${
            isDarkScene
              ? 'bg-stone-900/92 border-stone-700 text-stone-100'
              : 'bg-stone-50/95 border-stone-200 text-stone-900'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            <Compass className="w-3.5 h-3.5" />
            <span>Interactive Cafe Floor</span>
            <span aria-hidden="true">·</span>
            <span>{ATMOSPHERE_DETAILS[config.atmosphere].label}</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed opacity-85">
            Drag to orbit, scroll to zoom, or click the Espresso Bar, Roastery Wall, or any Table to shop and reserve.
          </p>
          {hoveredHotspot && (
            <div className="mt-2 pt-2 border-t border-current/10 text-xs font-medium">
              {hoveredHotspot.kind === 'espresso' && 'Click to inspect Espresso & Pastry Bar'}
              {hoveredHotspot.kind === 'roastery' && 'Click to inspect Single-Origin Roastery Wall'}
              {hoveredHotspot.kind === 'table' &&
                (() => {
                  const t = tables.find((x) => x.id === hoveredHotspot.tableId);
                  return t
                    ? `Table ${t.code} · ${t.label} (${t.seats} seats · ${t.status})`
                    : 'Click to inspect table';
                })()}
            </div>
          )}
        </div>

        {/* Contextual Action Card when a 3D zone or table is selected */}
        {activeHotspot && (
          <div
            className={`pointer-events-auto max-w-xs rounded-xl border px-4 py-3 shadow-sm ${
              isDarkScene
                ? 'bg-stone-900/95 border-stone-700 text-stone-100'
                : 'bg-stone-50/95 border-stone-200 text-stone-900'
            }`}
          >
            {activeHotspot.kind === 'espresso' && (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold">Espresso & Pastry Bar</span>
                  <button
                    type="button"
                    onClick={() => setActiveHotspot(null)}
                    className="text-xs opacity-60 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="mt-1 text-xs opacity-80">
                  Pulling double ristrettos & warming laminated cardamom knots. Ready in ~{config.pickupLeadMinutes} min.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onHotspotOrderCategory('espresso')}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-medium hover:bg-amber-800 transition-colors whitespace-nowrap"
                  >
                    Order Drinks
                  </button>
                  <button
                    type="button"
                    onClick={() => onHotspotOrderCategory('bakery')}
                    className="px-3 py-1.5 rounded-lg border border-current/20 text-xs font-medium hover:bg-current/5 transition-colors whitespace-nowrap"
                  >
                    View Pastries
                  </button>
                </div>
              </div>
            )}

            {activeHotspot.kind === 'roastery' && (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold">Roastery & Slow Bar</span>
                  <button
                    type="button"
                    onClick={() => setActiveHotspot(null)}
                    className="text-xs opacity-60 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="mt-1 text-xs opacity-80">{config.activeRoastNote}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onHotspotOrderCategory('beans')}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-medium hover:bg-amber-800 transition-colors whitespace-nowrap"
                  >
                    Shop Whole Beans
                  </button>
                  <button
                    type="button"
                    onClick={() => onHotspotOrderCategory('pourover')}
                    className="px-3 py-1.5 rounded-lg border border-current/20 text-xs font-medium hover:bg-current/5 transition-colors whitespace-nowrap"
                  >
                    Slow Pour-Overs
                  </button>
                </div>
              </div>
            )}

            {activeTable && (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold">
                    {activeTable.code} · {activeTable.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveHotspot(null)}
                    className="text-xs opacity-60 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs opacity-80">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{activeTable.zone}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeTable.seats} seats</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize font-medium">{activeTable.status}</span>
                </div>
                <div className="mt-3">
                  <a
                    href="#reserve"
                    onClick={() => onSelectTableFrom3D(activeTable.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-medium hover:bg-amber-800 transition-colors whitespace-nowrap"
                  >
                    Reserve {activeTable.code}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collapsible Unified Bottom Control Dock */}
      <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 w-fit max-w-[94vw] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className={`pointer-events-auto mb-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium shadow-sm transition-colors whitespace-nowrap ${
            isDarkScene
              ? 'bg-stone-900/95 border-stone-700 text-stone-200 hover:bg-stone-800'
              : 'bg-stone-50/95 border-stone-200 text-stone-800 hover:bg-stone-100'
          }`}
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div
            className={`pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-xl border px-3 py-2 shadow-sm ${
              isDarkScene
                ? 'bg-stone-900/95 border-stone-700 text-stone-100'
                : 'bg-stone-50/95 border-stone-200 text-stone-900'
            }`}
          >
            {/* Camera Focus Presets */}
            <div className="flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5 mr-1 opacity-60 hidden sm:block" />
              {(
                [
                  ['overview', 'Full Cafe'],
                  ['espresso', 'Espresso Bar'],
                  ['roastery', 'Roastery Wall'],
                  ['tables', 'Dining Tables'],
                ] as [CameraFocusKey, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onFocusChange(key);
                    if (key === 'espresso') setActiveHotspot({ id: 'espresso', kind: 'espresso' });
                    else if (key === 'roastery') setActiveHotspot({ id: 'roastery', kind: 'roastery' });
                    else if (key === 'overview') setActiveHotspot(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    activeFocus === key
                      ? 'bg-amber-700 text-white'
                      : isDarkScene
                      ? 'text-stone-300 hover:bg-stone-800'
                      : 'text-stone-700 hover:bg-stone-200/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              className={`h-5 w-px hidden md:block ${
                isDarkScene ? 'bg-stone-700' : 'bg-stone-200'
              }`}
              aria-hidden="true"
            />

            {/* Aesthetic Atmosphere Sync */}
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 mr-1 opacity-60 hidden sm:block" />
              {(
                [
                  ['morning', 'Morning Sun'],
                  ['golden', 'Golden Hour'],
                  ['evening', 'Evening'],
                ] as [AtmospherePreset, string][]
              ).map(([preset, label]) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSelectAtmosphere(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    config.atmosphere === preset
                      ? isDarkScene
                        ? 'bg-stone-100 text-stone-900'
                        : 'bg-stone-900 text-stone-50'
                      : isDarkScene
                      ? 'text-stone-300 hover:bg-stone-800'
                      : 'text-stone-700 hover:bg-stone-200/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
