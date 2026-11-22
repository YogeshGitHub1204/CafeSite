import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCw, ShoppingBag } from 'lucide-react';
import type { MenuItem, OrderItem, StoreConfig } from '../types/cafe';
import { CATEGORY_LABELS } from '../types/cafe';
import {
  createCoffeeBagLabelTexture,
  createContactShadowTexture,
  createLatteArtTexture,
  createTerrazzoTexture,
  createWoodGrainTexture,
} from '../three/proceduralTextures';

interface ProductShowcase3DProps {
  item: MenuItem;
  allItems: MenuItem[];
  config: StoreConfig;
  onSelectItem: (itemId: string) => void;
  onAddToBag: (orderItem: OrderItem, image: string) => void;
}

const MILK_CHOICES = ['Whole Farm Milk', 'Barista Oat', 'Almond Milk'];
const GRIND_CHOICES = ['Whole Bean', 'Espresso (Fine)', 'Pour-Over', 'French Press'];

export default function ProductShowcase3D({
  item,
  allItems,
  config,
  onSelectItem,
  onAddToBag,
}: ProductShowcase3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const syncVisualsRef = useRef<(() => void) | null>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);

  const [sizeOz, setSizeOz] = useState<'8 oz' | '12 oz'>('8 oz');
  const [milk, setMilk] = useState(MILK_CHOICES[0]);
  const [grind, setGrind] = useState(GRIND_CHOICES[0]);
  const [extraShot, setExtraShot] = useState(false);

  const stateRef = useRef({ item, config, sizeOz, extraShot });
  stateRef.current = { item, config, sizeOz, extraShot };

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

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(1.9, 1.45, 2.35);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.34, 0);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.45;
    controls.maxDistance = 4.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minPolarAngle = 0.28;
    controls.update();

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(d: T): T => {
      disposables.push(d);
      return d;
    };

    // Lighting
    const hemi = new THREE.HemisphereLight(0xedf4fb, 0x6b5644, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
    keyLight.position.set(2.8, 4.5, 3.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2;
    keyLight.shadow.camera.right = 2;
    keyLight.shadow.camera.top = 2;
    keyLight.shadow.camera.bottom = -2;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd2e4f8, 0.75);
    rimLight.position.set(-3, 2.5, -2.5);
    scene.add(rimLight);

    // Textures & Materials
    const terrazzoTex = track(createTerrazzoTexture(renderer));
    const woodTex = track(createWoodGrainTexture(renderer, '#6b4730', '#442a18'));
    const latteTex = track(createLatteArtTexture(renderer));
    const bagDarkTex = track(createCoffeeBagLabelTexture(renderer, 'obsidian'));
    const bagLightTex = track(createCoffeeBagLabelTexture(renderer, 'linen'));
    const shadowTex = track(createContactShadowTexture());

    const plinthMat = track(
      new THREE.MeshStandardMaterial({
        map: terrazzoTex,
        color: 0xeae3d7,
        roughness: 0.45,
        metalness: 0.05,
      })
    );
    const woodMat = track(
      new THREE.MeshStandardMaterial({
        map: woodTex,
        roughness: 0.55,
        metalness: 0.05,
      })
    );
    const ceramicMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xf5f0e8,
        roughness: 0.28,
        metalness: 0.04,
      })
    );
    const accentMetalMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xc9924b,
        metalness: 0.9,
        roughness: 0.22,
        clearcoat: 0.4,
      })
    );
    const glassMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.08,
        metalness: 0,
        transmission: isSoftwareGl ? 0 : 0.88,
        transparent: true,
        opacity: isSoftwareGl ? 0.32 : 1,
        ior: 1.5,
        thickness: 0.2,
        depthWrite: false,
      })
    );
    const pastryMat = track(
      new THREE.MeshStandardMaterial({ color: 0xc6823b, roughness: 0.72, metalness: 0.02 })
    );
    const darkChocMat = track(
      new THREE.MeshStandardMaterial({ color: 0x3b2214, roughness: 0.5, metalness: 0.05 })
    );

    // Architectural Travertine Display Pedestal
    const plinth = new THREE.Mesh(track(new THREE.CylinderGeometry(0.92, 0.96, 0.14, 36)), plinthMat);
    plinth.position.y = -0.07;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const plinthRim = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.92, 0.012, 10, 48)),
      accentMetalMat
    );
    plinthRim.rotation.x = Math.PI / 2;
    plinthRim.position.y = 0.0;
    scene.add(plinthRim);

    const contactShadow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.35, 1.35)),
      track(
        new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.5,
        })
      )
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.004;
    scene.add(contactShadow);

    // ---------------------------------------------------------
    // MODEL 1: ESPRESSO CUP + SAUCER + LATTE ART + BRASS SPOON
    // ---------------------------------------------------------
    const espressoModel = new THREE.Group();
    scene.add(espressoModel);

    const saucer = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.38, 0.24, 0.04, 32)),
      ceramicMat
    );
    saucer.position.y = 0.02;
    saucer.castShadow = true;
    saucer.receiveShadow = true;
    espressoModel.add(saucer);

    const cupGroup = new THREE.Group();
    espressoModel.add(cupGroup);

    const cupProfile = [
      new THREE.Vector2(0, 0.03),
      new THREE.Vector2(0.16, 0.03),
      new THREE.Vector2(0.24, 0.22),
      new THREE.Vector2(0.27, 0.36),
      new THREE.Vector2(0.245, 0.36),
      new THREE.Vector2(0.22, 0.22),
      new THREE.Vector2(0, 0.07),
    ];
    const cupMesh = new THREE.Mesh(track(new THREE.LatheGeometry(cupProfile, 32)), ceramicMat);
    cupMesh.castShadow = true;
    cupGroup.add(cupMesh);

    const cupHandle = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.095, 0.022, 12, 24, Math.PI)),
      ceramicMat
    );
    cupHandle.rotation.z = -Math.PI / 2;
    cupHandle.position.set(0.25, 0.22, 0);
    cupGroup.add(cupHandle);

    const foamDisk = new THREE.Mesh(
      track(new THREE.CircleGeometry(0.235, 28)),
      track(new THREE.MeshStandardMaterial({ map: latteTex, roughness: 0.45 }))
    );
    foamDisk.rotation.x = -Math.PI / 2;
    foamDisk.position.y = 0.335;
    cupGroup.add(foamDisk);

    const spoonStem = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.38, 0.012, 0.024)),
      accentMetalMat
    );
    spoonStem.position.set(0.06, 0.025, 0.48);
    spoonStem.rotation.y = 0.25;
    espressoModel.add(spoonStem);

    const spoonBowl = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.05, 14, 10)),
      accentMetalMat
    );
    spoonBowl.scale.set(1.3, 0.25, 0.9);
    spoonBowl.position.set(-0.14, 0.025, 0.53);
    spoonBowl.rotation.y = 0.25;
    espressoModel.add(spoonBowl);

    // ---------------------------------------------------------
    // MODEL 2: V60 POUR-OVER + CARAFE + BRASS GOOSENECK KETTLE
    // ---------------------------------------------------------
    const pouroverModel = new THREE.Group();
    scene.add(pouroverModel);

    const pourBoard = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.04, 0.58)), woodMat);
    pourBoard.position.y = 0.02;
    pourBoard.castShadow = true;
    pouroverModel.add(pourBoard);

    const carafeMesh = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.11, 0.19, 0.32, 24)),
      glassMat
    );
    carafeMesh.position.set(0.22, 0.2, 0);
    carafeMesh.renderOrder = 4;
    pouroverModel.add(carafeMesh);

    const brewedCoffee = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.14, 0.17, 0.14, 20)),
      darkChocMat
    );
    brewedCoffee.position.set(0.22, 0.11, 0);
    pouroverModel.add(brewedCoffee);

    const v60 = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.19, 0.04, 0.22, 24)),
      glassMat
    );
    v60.position.set(0.22, 0.46, 0);
    v60.renderOrder = 5;
    pouroverModel.add(v60);

    const kettleProfile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.18, 0),
      new THREE.Vector2(0.15, 0.25),
      new THREE.Vector2(0.12, 0.34),
      new THREE.Vector2(0, 0.36),
    ];
    const kettle = new THREE.Mesh(track(new THREE.LatheGeometry(kettleProfile, 24)), accentMetalMat);
    kettle.position.set(-0.22, 0.04, 0);
    kettle.castShadow = true;
    pouroverModel.add(kettle);

    const spoutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.1, 0),
      new THREE.Vector3(0.06, 0.18, 0),
      new THREE.Vector3(0.12, 0.36, 0),
      new THREE.Vector3(0.17, 0.39, 0),
    ]);
    const kettleSpout = new THREE.Mesh(
      track(new THREE.TubeGeometry(spoutCurve, 16, 0.018, 10, false)),
      accentMetalMat
    );
    pouroverModel.add(kettleSpout);

    // ---------------------------------------------------------
    // MODEL 3: ARTISANAL PASTRIES ON STONEWARE PLATE
    // ---------------------------------------------------------
    const bakeryModel = new THREE.Group();
    scene.add(bakeryModel);

    const plate = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.48, 0.38, 0.04, 32)),
      ceramicMat
    );
    plate.position.y = 0.02;
    plate.castShadow = true;
    plate.receiveShadow = true;
    bakeryModel.add(plate);

    const croissant = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.15, 0.075, 16, 28, Math.PI * 1.45)),
      pastryMat
    );
    croissant.rotation.set(Math.PI / 2, 0, -0.35);
    croissant.position.set(-0.1, 0.11, 0.05);
    croissant.castShadow = true;
    bakeryModel.add(croissant);

    const knot = new THREE.Mesh(
      track(new THREE.TorusKnotGeometry(0.1, 0.038, 48, 10, 2, 3)),
      pastryMat
    );
    knot.scale.set(1.1, 0.65, 1.1);
    knot.position.set(0.18, 0.11, -0.08);
    knot.castShadow = true;
    bakeryModel.add(knot);

    // ---------------------------------------------------------
    // MODEL 4: WHOLE BEAN RETAIL BAG + CUPPING BOWL OF BEANS
    // ---------------------------------------------------------
    const beanBagModel = new THREE.Group();
    scene.add(beanBagModel);

    const bagObsidianMat = track(
      new THREE.MeshStandardMaterial({ map: bagDarkTex, roughness: 0.72, metalness: 0.04 })
    );
    const bagLinenMat = track(
      new THREE.MeshStandardMaterial({ map: bagLightTex, roughness: 0.75, metalness: 0.02 })
    );

    const bagBody = new THREE.Mesh(track(new THREE.BoxGeometry(0.44, 0.68, 0.22)), bagObsidianMat);
    bagBody.position.set(-0.12, 0.34, 0);
    bagBody.castShadow = true;
    beanBagModel.add(bagBody);

    const bagTab = new THREE.Mesh(track(new THREE.BoxGeometry(0.09, 0.08, 0.03)), woodMat);
    bagTab.position.set(-0.12, 0.71, 0);
    beanBagModel.add(bagTab);

    const cupBowl = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.2, 0.13, 0.16, 24)),
      ceramicMat
    );
    cupBowl.position.set(0.32, 0.08, 0.14);
    cupBowl.castShadow = true;
    beanBagModel.add(cupBowl);

    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const rad = (i % 3) * 0.045 + 0.02;
      const bean = new THREE.Mesh(track(new THREE.SphereGeometry(0.026, 10, 8)), darkChocMat);
      bean.scale.set(1.3, 0.7, 0.9);
      bean.position.set(0.32 + Math.cos(ang) * rad, 0.16, 0.14 + Math.sin(ang) * rad);
      bean.rotation.y = ang;
      beanBagModel.add(bean);
    }

    // Coalesced On-Demand Render Loop (per threejs/SKILL.md)
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        controls.update();
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };
    requestRenderRef.current = requestRender;

    const syncVisuals = () => {
      const { item: curItem, config: curCfg, sizeOz: curSize } = stateRef.current;

      // Match background & plinth to owner's active cafe aesthetic
      if (curCfg.atmosphere === 'evening') {
        scene.background = new THREE.Color(0x1b1917);
        keyLight.intensity = 1.9;
      } else if (curCfg.atmosphere === 'golden') {
        scene.background = new THREE.Color(0xede3d4);
        keyLight.intensity = 2.3;
      } else {
        scene.background = new THREE.Color(0xefeae2);
        keyLight.intensity = 2.2;
      }

      if (curCfg.surfaceFinish === 'slate') plinthMat.color.setHex(0x63605d);
      else if (curCfg.surfaceFinish === 'walnut') plinthMat.color.setHex(0xd6c7b4);
      else plinthMat.color.setHex(0xeae3d7);

      accentMetalMat.color.setHex(curCfg.accentMetal === 'brass' ? 0xc9924b : 0x2b2927);

      espressoModel.visible = curItem.category === 'espresso';
      pouroverModel.visible = curItem.category === 'pourover';
      bakeryModel.visible = curItem.category === 'bakery';
      beanBagModel.visible = curItem.category === 'beans';

      // Cup size live scaling
      const cupScale = curSize === '12 oz' ? 1.18 : 1.0;
      cupGroup.scale.set(1.0, cupScale, 1.0);

      // Bean bag label swap between Linen and Obsidian
      const isLinen = curItem.name.toLowerCase().includes('linen');
      bagBody.material = isLinen ? bagLinenMat : bagObsidianMat;

      requestRender();
    };
    syncVisualsRef.current = syncVisuals;

    controls.addEventListener('change', requestRender);

    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth || 540;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    syncVisuals();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      syncVisualsRef.current = null;
      requestRenderRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncVisualsRef.current?.();
  }, [item, config.atmosphere, config.surfaceFinish, config.accentMetal, sizeOz, extraShot]);

  const isEvening = config.atmosphere === 'evening';
  const cardSurface = isEvening
    ? 'bg-stone-900 border-stone-800 text-stone-100'
    : 'bg-white border-stone-200 text-stone-900';
  const mutedText = isEvening ? 'text-stone-400' : 'text-stone-600';

  const finalPrice = Math.round((item.price + (extraShot ? 1.5 : 0)) * 100) / 100;
  const soldOut = !item.available || item.stock <= 0;

  return (
    <div
      id="product-studio-3d"
      className={`mt-10 grid grid-cols-1 lg:grid-cols-12 rounded-2xl border overflow-hidden items-stretch ${cardSurface}`}
    >
      {/* Left: Interactive 3D Product Turntable */}
      <div className="lg:col-span-7 relative min-h-[380px] lg:min-h-[460px]">
        <div
          ref={mountRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          aria-label={`Interactive 3D view of ${item.name}`}
        />
        <div
          className={`pointer-events-none absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            isEvening
              ? 'bg-stone-900/92 border-stone-700 text-stone-200'
              : 'bg-stone-50/95 border-stone-200 text-stone-800'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
          <span>Drag to spin 360° · Scroll to inspect</span>
        </div>
      </div>

      {/* Right: Live 3D Variant Customizer & Direct Purchase */}
      <div className="lg:col-span-5 p-7 lg:p-9 flex flex-col justify-between gap-6 border-t lg:border-t-0 lg:border-l border-stone-200/80 dark:border-stone-800">
        <div>
          <div className={`flex items-center gap-2 text-xs ${mutedText}`}>
            <span>Interactive 3D Counter Studio</span>
            <span aria-hidden="true">·</span>
            <span>{CATEGORY_LABELS[item.category]}</span>
          </div>

          <h3 className="mt-2 text-3xl font-display font-semibold tracking-tight">{item.name}</h3>
          <p className={`mt-2.5 text-sm leading-relaxed ${mutedText}`}>{item.description}</p>
          <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-400">
            Tasting Notes: {item.tastingNotes}
          </p>

          {/* Quick 3D Product Switcher across Categories */}
          <div className="mt-5">
            <p className={`text-xs font-medium mb-2 ${mutedText}`}>Switch 3D Showcase Item</p>
            <div className="flex flex-wrap gap-1.5">
              {allItems.slice(0, 4).map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSelectItem(candidate.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    candidate.id === item.id
                      ? 'border-amber-700 bg-amber-700 text-white'
                      : 'border-stone-200 dark:border-stone-700 hover:border-amber-700/60'
                  }`}
                >
                  {candidate.name.split(' ').slice(0, 2).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive 3D Customizer Controls */}
          {item.category === 'espresso' && (
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(['8 oz', '12 oz'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSizeOz(sz)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                      sizeOz === sz
                        ? 'border-amber-700 bg-amber-700/10 text-amber-800 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {sz} Ceramic Cup
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {MILK_CHOICES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMilk(m)}
                    className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                      milk === m
                        ? 'border-amber-700 bg-amber-700/10 text-amber-800 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <label className="flex items-center justify-between rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2 cursor-pointer">
                <span className="text-xs font-medium">Extra Single-Origin Ristretto Shot</span>
                <span className="flex items-center gap-2.5">
                  <span className="font-mono text-xs tabular-nums">+$1.50</span>
                  <input
                    type="checkbox"
                    checked={extraShot}
                    onChange={(e) => setExtraShot(e.target.checked)}
                    className="h-4 w-4 accent-amber-700"
                  />
                </span>
              </label>
            </div>
          )}

          {item.isBean && (
            <div className="mt-5">
              <p className={`text-xs font-medium mb-2 ${mutedText}`}>Grind Specification</p>
              <div className="grid grid-cols-2 gap-2">
                {GRIND_CHOICES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrind(g)}
                    className={`py-2 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      grind === g
                        ? 'border-amber-700 bg-amber-700/10 text-amber-800 dark:text-amber-300'
                        : 'border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-stone-200/80 dark:border-stone-800">
          <div>
            <span className="font-mono text-2xl font-medium tabular-nums">
              ${finalPrice.toFixed(2)}
            </span>
            <span className={`ml-2.5 text-xs tabular-nums ${mutedText}`}>
              {soldOut ? 'Sold out' : `${item.stock} available`}
            </span>
          </div>

          <button
            type="button"
            disabled={soldOut}
            onClick={() =>
              onAddToBag(
                {
                  menuItemId: item.id,
                  name: item.name,
                  price: finalPrice,
                  quantity: 1,
                  size: item.category === 'espresso' ? sizeOz : undefined,
                  milk: item.category === 'espresso' ? milk : undefined,
                  grind: item.isBean ? grind : undefined,
                  extraShot: item.category === 'espresso' ? extraShot : false,
                },
                item.image
              )
            }
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-700 text-white text-sm font-medium hover:bg-amber-800 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{soldOut ? 'Unavailable' : 'Add to Bag'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
