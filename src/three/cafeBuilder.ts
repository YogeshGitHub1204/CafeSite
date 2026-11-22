import * as THREE from 'three';
import type {
  AccentMetal,
  AtmospherePreset,
  CafeTable,
  MaterialFinish,
  TableStatus,
} from '../types/cafe';
import {
  createCoffeeBagLabelTexture,
  createContactShadowTexture,
  createLatteArtTexture,
  createMenuBoardTexture,
  createPlasterTexture,
  createTerrazzoTexture,
  createTravelMugWrapTexture,
  createVinylTexture,
  createWoodGrainTexture,
} from './proceduralTextures';

export interface CafeHotspotInfo {
  id: string;
  kind: 'espresso' | 'roastery' | 'table';
  tableId?: string;
}

export interface CafeSceneController {
  clickables: THREE.Object3D[];
  steamParticles: THREE.Points;
  steamVelocities: Float32Array;
  steamOrigins: Float32Array;
  vinylDisc: THREE.Mesh;
  applyAesthetics: (
    atmosphere: AtmospherePreset,
    finish: MaterialFinish,
    metal: AccentMetal
  ) => void;
  updateTables: (tables: CafeTable[]) => void;
  updateMenuBoard: (roastNote: string) => void;
  setHighlightedHotspot: (hotspotId: string | null) => void;
  dispose: () => void;
}

const STATUS_COLORS: Record<TableStatus, number> = {
  available: 0x3b8a63,
  reserved: 0xd48b35,
  occupied: 0x6b6560,
};

export function buildCafeScene(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  initialTables: CafeTable[],
  initialRoastNote: string
): CafeSceneController {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Textures
  const terrazzoTex = track(createTerrazzoTexture(renderer));
  const walnutTex = track(createWoodGrainTexture(renderer, '#6b4730', '#442a18'));
  const oakTex = track(createWoodGrainTexture(renderer, '#a9845c', '#7c5c3b'));
  const plasterTex = track(createPlasterTexture(renderer));
  const latteTex = track(createLatteArtTexture(renderer));
  const bagDarkTex = track(createCoffeeBagLabelTexture(renderer, 'obsidian'));
  const bagLightTex = track(createCoffeeBagLabelTexture(renderer, 'linen'));
  const contactTex = track(createContactShadowTexture());
  const vinylTex = track(createVinylTexture(renderer));
  const travelMugTex = track(createTravelMugWrapTexture(renderer));
  let menuBoardTex = track(createMenuBoardTexture(renderer, initialRoastNote));

  // Shared Dynamic Materials (updated live on aesthetic sync)
  const floorMat = track(
    new THREE.MeshStandardMaterial({
      map: terrazzoTex,
      color: 0xf4efe8,
      roughness: 0.62,
      metalness: 0.04,
    })
  );
  const wallMat = track(
    new THREE.MeshStandardMaterial({
      map: plasterTex,
      color: 0xf0ebe3,
      roughness: 0.88,
      metalness: 0.02,
    })
  );
  const counterTopMat = track(
    new THREE.MeshStandardMaterial({
      map: terrazzoTex,
      color: 0xe6dfd4,
      roughness: 0.38,
      metalness: 0.05,
    })
  );
  const timberMat = track(
    new THREE.MeshStandardMaterial({
      map: walnutTex,
      color: 0xffffff,
      roughness: 0.56,
      metalness: 0.06,
    })
  );
  const oakMat = track(
    new THREE.MeshStandardMaterial({
      map: oakTex,
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.04,
    })
  );
  const accentMetalMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xc9924b,
      metalness: 0.88,
      roughness: 0.24,
      clearcoat: 0.4,
      anisotropy: 0.7,
    })
  );
  const darkSteelMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x22201e,
      metalness: 0.72,
      roughness: 0.36,
    })
  );
  const ceramicMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf6f2ec,
      roughness: 0.3,
      metalness: 0.05,
    })
  );
  const glassDomeMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0,
      transmission: isSoftwareGl ? 0 : 0.88,
      transparent: true,
      opacity: isSoftwareGl ? 0.32 : 1,
      ior: 1.5,
      thickness: 0.25,
      depthWrite: false,
    })
  );
  const windowGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xeaf2f8,
      roughness: 0.06,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    })
  );
  const pastryMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xc7833c,
      roughness: 0.72,
      metalness: 0.02,
    })
  );
  const beanMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b2416,
      roughness: 0.52,
      metalness: 0.05,
    })
  );
  const skyPlaneMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xdbe6ef,
    })
  );

  // Lighting Rig (<= 2 shadow casters, warm key + cool fill + pendant warmth)
  const hemiLight = new THREE.HemisphereLight(0xdce8f4, 0x6b5644, 0.85);
  scene.add(hemiLight);

  const keySunLight = new THREE.DirectionalLight(0xfff1dc, 2.2);
  keySunLight.position.set(-7.5, 9.5, 7.5);
  keySunLight.castShadow = !isSoftwareGl;
  keySunLight.shadow.mapSize.set(2048, 2048);
  keySunLight.shadow.camera.near = 1;
  keySunLight.shadow.camera.far = 30;
  keySunLight.shadow.camera.left = -8;
  keySunLight.shadow.camera.right = 8;
  keySunLight.shadow.camera.top = 8;
  keySunLight.shadow.camera.bottom = -8;
  keySunLight.shadow.bias = -0.0004;
  keySunLight.shadow.normalBias = 0.02;
  scene.add(keySunLight);

  const rimLight = new THREE.DirectionalLight(0xc9dcf0, 0.7);
  rimLight.position.set(7, 6, -6);
  scene.add(rimLight);

  const barAccentLight = new THREE.PointLight(0xffcb8c, 2.4, 9, 1.8);
  barAccentLight.position.set(1.6, 3.1, -2.1);
  scene.add(barAccentLight);

  // =====================================================
  // 1. ARCHITECTURAL SHELL (Floor, Walls, Daylight Facade)
  // =====================================================
  const shellGroup = new THREE.Group();
  scene.add(shellGroup);

  const floorGeo = track(new THREE.BoxGeometry(12.2, 0.24, 9.6));
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.set(0, -0.12, 0);
  floorMesh.receiveShadow = true;
  shellGroup.add(floorMesh);

  // Back wall
  const backWall = new THREE.Mesh(track(new THREE.BoxGeometry(12.2, 4.8, 0.28)), wallMat);
  backWall.position.set(0, 2.4, -4.66);
  backWall.receiveShadow = true;
  shellGroup.add(backWall);

  // Timber vertical wainscoting strip along back wall
  const backPanel = new THREE.Mesh(track(new THREE.BoxGeometry(11.8, 1.15, 0.08)), timberMat);
  backPanel.position.set(0, 0.575, -4.48);
  backPanel.receiveShadow = true;
  shellGroup.add(backPanel);

  // Left glazed window facade wall (cutaway architectural framing)
  const leftBase = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.75, 9.6)), wallMat);
  leftBase.position.set(-5.96, 0.375, 0);
  leftBase.receiveShadow = true;
  shellGroup.add(leftBase);

  const leftHeader = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.55, 9.6)), wallMat);
  leftHeader.position.set(-5.96, 4.525, 0);
  shellGroup.add(leftHeader);

  // Steel window mullions
  const mullionGeo = track(new THREE.BoxGeometry(0.14, 3.55, 0.12));
  [-4.4, -2.2, 0, 2.2, 4.4].forEach((zPos) => {
    const mullion = new THREE.Mesh(mullionGeo, darkSteelMat);
    mullion.position.set(-5.96, 2.5, zPos);
    mullion.castShadow = true;
    shellGroup.add(mullion);
  });
  const glassPane = new THREE.Mesh(track(new THREE.PlaneGeometry(9.2, 3.45)), windowGlassMat);
  glassPane.rotation.y = Math.PI / 2;
  glassPane.position.set(-5.96, 2.5, 0);
  glassPane.renderOrder = 3;
  shellGroup.add(glassPane);

  // Exterior courtyard ground & warm sky backdrop outside window (prevents void look)
  const sidewalk = new THREE.Mesh(
    track(new THREE.BoxGeometry(6, 0.16, 14)),
    track(new THREE.MeshStandardMaterial({ color: 0xcbc4b8, roughness: 0.9 }))
  );
  sidewalk.position.set(-9.1, -0.1, 0);
  sidewalk.receiveShadow = true;
  shellGroup.add(sidewalk);

  const skyBackdrop = new THREE.Mesh(track(new THREE.PlaneGeometry(24, 14)), skyPlaneMat);
  skyBackdrop.rotation.y = Math.PI / 2;
  skyBackdrop.position.set(-14, 4.5, 0);
  shellGroup.add(skyBackdrop);

  // Menu board mounted on back wall
  const menuBoardFrame = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.55, 1.32, 0.08)),
    accentMetalMat
  );
  menuBoardFrame.position.set(1.3, 2.95, -4.46);
  shellGroup.add(menuBoardFrame);

  const menuBoardMat = track(
    new THREE.MeshStandardMaterial({
      map: menuBoardTex,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  const menuBoardFace = new THREE.Mesh(track(new THREE.PlaneGeometry(2.42, 1.2)), menuBoardMat);
  menuBoardFace.position.set(1.3, 2.95, -4.41);
  shellGroup.add(menuBoardFace);

  // Architectural wall sconce / plant corner
  const planterPot = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.32, 0.24, 0.56, 20)),
    ceramicMat
  );
  planterPot.position.set(-5.2, 0.28, -3.9);
  planterPot.castShadow = true;
  shellGroup.add(planterPot);

  const foliageMat = track(
    new THREE.MeshStandardMaterial({ color: 0x4c6b53, roughness: 0.75, metalness: 0.02 })
  );
  const leafGroup = new THREE.Group();
  leafGroup.position.set(-5.2, 0.58, -3.9);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const stem = new THREE.Mesh(track(new THREE.CylinderGeometry(0.015, 0.02, 0.85, 8)), foliageMat);
    stem.position.set(Math.cos(angle) * 0.08, 0.35, Math.sin(angle) * 0.08);
    stem.rotation.z = Math.cos(angle) * 0.24;
    stem.rotation.x = Math.sin(angle) * 0.24;
    leafGroup.add(stem);

    const leaf = new THREE.Mesh(track(new THREE.SphereGeometry(0.16, 12, 10)), foliageMat);
    leaf.scale.set(1.1, 0.35, 0.65);
    leaf.position.set(Math.cos(angle) * 0.22, 0.72 + (i % 2) * 0.14, Math.sin(angle) * 0.22);
    leaf.rotation.y = -angle;
    leafGroup.add(leaf);
  }
  shellGroup.add(leafGroup);

  // =====================================================
  // 2. ESPRESSO & PASTRY BAR (Composite Multi-Part Group)
  // =====================================================
  const clickables: THREE.Object3D[] = [];
  const hotspotGroups = new Map<string, THREE.Group>();

  const espressoZone = new THREE.Group();
  espressoZone.position.set(1.5, 0, -2.35);
  scene.add(espressoZone);
  hotspotGroups.set('espresso', espressoZone);

  // Main stone-topped bar counter
  const barBase = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 0.96, 1.05)), timberMat);
  barBase.position.set(0, 0.48, 0);
  barBase.castShadow = true;
  barBase.receiveShadow = true;
  espressoZone.add(barBase);

  const barKick = new THREE.Mesh(track(new THREE.BoxGeometry(4.42, 0.1, 1.07)), accentMetalMat);
  barKick.position.set(0, 0.05, 0);
  espressoZone.add(barKick);

  const barTop = new THREE.Mesh(track(new THREE.BoxGeometry(4.56, 0.09, 1.18)), counterTopMat);
  barTop.position.set(0, 1.005, 0);
  barTop.castShadow = true;
  barTop.receiveShadow = true;
  espressoZone.add(barTop);

  // Fluted vertical ribs on front of bar
  const ribGeo = track(new THREE.CylinderGeometry(0.03, 0.03, 0.84, 8));
  for (let rx = -2.0; rx <= 2.0; rx += 0.16) {
    const rib = new THREE.Mesh(ribGeo, oakMat);
    rib.position.set(rx, 0.52, 0.53);
    espressoZone.add(rib);
  }

  // Dual-Group Brass & Obsidian Espresso Machine (7-part assembly)
  const machineGroup = new THREE.Group();
  machineGroup.position.set(-0.65, 1.05, -0.1);
  espressoZone.add(machineGroup);

  const machineBody = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 0.48, 0.56)), accentMetalMat);
  machineBody.position.set(0, 0.24, 0);
  machineBody.castShadow = true;
  machineGroup.add(machineBody);

  const machineSideL = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.52, 0.58)), darkSteelMat);
  machineSideL.position.set(-0.56, 0.26, 0);
  machineGroup.add(machineSideL);

  const machineSideR = machineSideL.clone();
  machineSideR.position.set(0.56, 0.26, 0);
  machineGroup.add(machineSideR);

  const dripTray = new THREE.Mesh(track(new THREE.BoxGeometry(1.06, 0.06, 0.24)), darkSteelMat);
  dripTray.position.set(0, 0.03, 0.36);
  machineGroup.add(dripTray);

  // Two brew groups + portafilters
  [-0.28, 0.28].forEach((gx) => {
    const groupHead = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 16)),
      darkSteelMat
    );
    groupHead.position.set(gx, 0.32, 0.31);
    machineGroup.add(groupHead);

    const handle = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.022, 0.026, 0.22, 10)),
      timberMat
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(gx, 0.24, 0.44);
    machineGroup.add(handle);
  });

  // Cup warmer rack + stacked espresso cups on top
  const cupRail = new THREE.Mesh(track(new THREE.BoxGeometry(1.04, 0.05, 0.44)), accentMetalMat);
  cupRail.position.set(0, 0.505, -0.02);
  machineGroup.add(cupRail);

  const miniCupGeo = track(new THREE.CylinderGeometry(0.048, 0.036, 0.07, 14));
  for (let c = 0; c < 5; c++) {
    const cup = new THREE.Mesh(miniCupGeo, ceramicMat);
    cup.position.set(-0.36 + c * 0.18, 0.56, -0.02);
    machineGroup.add(cup);
  }

  // Conical Burr Grinder beside espresso machine
  const grinderGroup = new THREE.Group();
  grinderGroup.position.set(0.32, 1.05, -0.14);
  espressoZone.add(grinderGroup);

  const grinderBody = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.11, 0.13, 0.34, 16)),
    darkSteelMat
  );
  grinderBody.position.y = 0.17;
  grinderBody.castShadow = true;
  grinderGroup.add(grinderBody);

  const hopper = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.16, 0.07, 0.24, 16)),
    glassDomeMat
  );
  hopper.position.y = 0.45;
  hopper.renderOrder = 4;
  grinderGroup.add(hopper);

  const hopperBeans = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 12, 10)), beanMat);
  hopperBeans.position.y = 0.41;
  grinderGroup.add(hopperBeans);

  // Pastry Cloche Dome on Turned Oak Stand
  const clocheGroup = new THREE.Group();
  clocheGroup.position.set(1.22, 1.05, 0.14);
  espressoZone.add(clocheGroup);

  const cakeStandFoot = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.11, 0.15, 0.1, 20)),
    oakMat
  );
  cakeStandFoot.position.y = 0.05;
  clocheGroup.add(cakeStandFoot);

  const cakePlatter = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.34, 0.32, 0.04, 24)),
    oakMat
  );
  cakePlatter.position.y = 0.11;
  cakePlatter.castShadow = true;
  clocheGroup.add(cakePlatter);

  // Pastries inside dome
  const pastryPositions = [
    [-0.1, 0.18, 0.06],
    [0.11, 0.18, 0.04],
    [0.0, 0.18, -0.11],
  ];
  pastryPositions.forEach(([px, py, pz], idx) => {
    const croissant = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.065, 0.035, 10, 16, Math.PI * 1.4)),
      pastryMat
    );
    croissant.position.set(px, py, pz);
    croissant.rotation.set(Math.PI / 2, 0, idx * 1.1);
    clocheGroup.add(croissant);
  });

  const domeBell = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.31, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2)),
    glassDomeMat
  );
  domeBell.position.y = 0.13;
  domeBell.renderOrder = 5;
  clocheGroup.add(domeBell);

  const domeKnob = new THREE.Mesh(track(new THREE.SphereGeometry(0.032, 12, 10)), accentMetalMat);
  domeKnob.position.y = 0.455;
  clocheGroup.add(domeKnob);

  // Tasting Cortado Cup on front of counter with Latte Art + Steam
  const tastingCupGroup = new THREE.Group();
  tastingCupGroup.position.set(-1.55, 1.05, 0.25);
  espressoZone.add(tastingCupGroup);

  const saucer = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.09, 0.02, 20)), ceramicMat);
  saucer.position.y = 0.01;
  tastingCupGroup.add(saucer);

  const tastingCup = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.09, 0.065, 0.12, 20)),
    ceramicMat
  );
  tastingCup.position.y = 0.075;
  tastingCup.castShadow = true;
  tastingCupGroup.add(tastingCup);

  const latteDisk = new THREE.Mesh(
    track(new THREE.CircleGeometry(0.082, 20)),
    track(new THREE.MeshStandardMaterial({ map: latteTex, roughness: 0.45 }))
  );
  latteDisk.rotation.x = -Math.PI / 2;
  latteDisk.position.y = 0.137;
  tastingCupGroup.add(latteDisk);

  // Clickable proxy box for Espresso Bar
  const espressoProxy = new THREE.Mesh(
    track(new THREE.BoxGeometry(4.6, 1.8, 1.4)),
    track(new THREE.MeshBasicMaterial({ visible: false }))
  );
  espressoProxy.position.set(0, 0.9, 0);
  espressoProxy.userData.hotspot = { id: 'espresso', kind: 'espresso' } satisfies CafeHotspotInfo;
  espressoZone.add(espressoProxy);
  clickables.push(espressoProxy);

  // =====================================================
  // 3. ROASTERY, POUR-OVER & BEAN WALL (Composite Group)
  // =====================================================
  const roasteryZone = new THREE.Group();
  roasteryZone.position.set(-2.6, 0, -3.55);
  scene.add(roasteryZone);
  hotspotGroups.set('roastery', roasteryZone);

  // Floating oak display shelves on back wall
  const shelfGeo = track(new THREE.BoxGeometry(3.2, 0.07, 0.42));
  [1.45, 2.25, 3.05].forEach((sy, sIdx) => {
    const shelf = new THREE.Mesh(shelfGeo, oakMat);
    shelf.position.set(0, sy, -0.78);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    roasteryZone.add(shelf);

    // Coffee bags & canisters on shelves
    for (let b = 0; b < 4; b++) {
      const isDarkBag = (b + sIdx) % 2 === 0;
      const bagMat = track(
        new THREE.MeshStandardMaterial({
          map: isDarkBag ? bagDarkTex : bagLightTex,
          roughness: 0.72,
          metalness: 0.04,
        })
      );
      const bag = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.36, 0.13)), bagMat);
      bag.position.set(-1.15 + b * 0.48, sy + 0.215, -0.76);
      bag.castShadow = true;
      roasteryZone.add(bag);
    }

    const canister = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.11, 0.11, 0.28, 16)),
      sIdx % 2 === 0 ? ceramicMat : accentMetalMat
    );
    canister.position.set(1.08, sy + 0.175, -0.76);
    roasteryZone.add(canister);
  });

  // Slow Pour-Over Credenza & Copper Kettle
  const pourBarBase = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 0.92, 0.86)), oakMat);
  pourBarBase.position.set(0.3, 0.46, 0.35);
  pourBarBase.castShadow = true;
  pourBarBase.receiveShadow = true;
  roasteryZone.add(pourBarBase);

  const pourBarTop = new THREE.Mesh(track(new THREE.BoxGeometry(2.7, 0.08, 0.94)), counterTopMat);
  pourBarTop.position.set(0.3, 0.96, 0.35);
  pourBarTop.receiveShadow = true;
  roasteryZone.add(pourBarTop);

  // Brass Gooseneck Kettle (Lathe body + Tube spout)
  const kettleGroup = new THREE.Group();
  kettleGroup.position.set(-0.25, 1.0, 0.38);
  roasteryZone.add(kettleGroup);

  const kettleProfile = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.13, 0),
    new THREE.Vector2(0.11, 0.16),
    new THREE.Vector2(0.085, 0.22),
    new THREE.Vector2(0.09, 0.24),
    new THREE.Vector2(0.0, 0.25),
  ];
  const kettleBody = new THREE.Mesh(track(new THREE.LatheGeometry(kettleProfile, 20)), accentMetalMat);
  kettleBody.castShadow = true;
  kettleGroup.add(kettleBody);

  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0.05, 0),
    new THREE.Vector3(0.2, 0.1, 0),
    new THREE.Vector3(0.24, 0.22, 0),
    new THREE.Vector3(0.28, 0.24, 0),
  ]);
  const kettleSpout = new THREE.Mesh(
    track(new THREE.TubeGeometry(spoutCurve, 14, 0.014, 8, false)),
    accentMetalMat
  );
  kettleGroup.add(kettleSpout);

  // V60 Dripper & Glass Carafe
  const carafe = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.065, 0.11, 0.2, 18)),
    glassDomeMat
  );
  carafe.position.set(0.35, 1.1, 0.38);
  carafe.renderOrder = 4;
  roasteryZone.add(carafe);

  const v60Cone = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.105, 0.025, 0.12, 18)),
    glassDomeMat
  );
  v60Cone.position.set(0.35, 1.26, 0.38);
  v60Cone.renderOrder = 4;
  roasteryZone.add(v60Cone);

  // Drum Roaster in far right corner (4.4, 0, -2.5)
  const roasterGroup = new THREE.Group();
  roasterGroup.position.set(7.2, 0, 0.35);
  roasteryZone.add(roasterGroup);

  const roasterPedestal = new THREE.Mesh(track(new THREE.BoxGeometry(0.92, 0.85, 1.1)), darkSteelMat);
  roasterPedestal.position.y = 0.425;
  roasterPedestal.castShadow = true;
  roasterGroup.add(roasterPedestal);

  const roasterDrum = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.32, 0.32, 0.88, 20)),
    accentMetalMat
  );
  roasterDrum.rotation.x = Math.PI / 2;
  roasterDrum.position.set(0, 1.16, -0.05);
  roasterDrum.castShadow = true;
  roasterGroup.add(roasterDrum);

  const coolingTray = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 22)),
    darkSteelMat
  );
  coolingTray.position.set(0, 0.86, 0.62);
  roasterGroup.add(coolingTray);

  const roastedBeansDisc = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 22)),
    beanMat
  );
  roastedBeansDisc.position.set(0, 0.93, 0.62);
  roasteryZone.add(roastedBeansDisc);
  roastedBeansDisc.position.set(7.2, 0.93, 0.97);

  const hopperFunnel = new THREE.Mesh(
    track(new THREE.ConeGeometry(0.24, 0.34, 18, 1, true)),
    accentMetalMat
  );
  hopperFunnel.rotation.x = Math.PI;
  hopperFunnel.position.set(0, 1.62, -0.08);
  roasterGroup.add(hopperFunnel);

  const chimneyPipe = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.08, 0.08, 2.7, 14)),
    darkSteelMat
  );
  chimneyPipe.position.set(-0.24, 2.35, -0.35);
  roasterGroup.add(chimneyPipe);

  // Kyoto Slow-Drip Cold Brew Glass Tower on Espresso Bar right corner
  const kyotoGroup = new THREE.Group();
  kyotoGroup.position.set(1.88, 1.05, -0.18);
  espressoZone.add(kyotoGroup);

  const kyotoBase = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.04, 0.28)), timberMat);
  kyotoBase.position.y = 0.02;
  kyotoGroup.add(kyotoBase);

  [-0.11, 0.11].forEach((kx) => {
    const post = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.012, 0.012, 0.72, 10)),
      accentMetalMat
    );
    post.position.set(kx, 0.38, -0.05);
    kyotoGroup.add(post);
  });

  const kyotoRingTop = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.085, 0.01, 8, 18)),
    accentMetalMat
  );
  kyotoRingTop.rotation.x = Math.PI / 2;
  kyotoRingTop.position.set(0, 0.56, 0.02);
  kyotoGroup.add(kyotoRingTop);

  const kyotoIceChamber = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.075, 0.045, 0.18, 16)),
    glassDomeMat
  );
  kyotoIceChamber.position.set(0, 0.62, 0.02);
  kyotoIceChamber.renderOrder = 4;
  kyotoGroup.add(kyotoIceChamber);

  const kyotoMiddleChamber = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.065, 0.05, 0.14, 16)),
    glassDomeMat
  );
  kyotoMiddleChamber.position.set(0, 0.38, 0.02);
  kyotoMiddleChamber.renderOrder = 4;
  kyotoGroup.add(kyotoMiddleChamber);

  const kyotoCoffeeGrounds = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.055, 0.048, 0.06, 14)),
    beanMat
  );
  kyotoCoffeeGrounds.position.set(0, 0.35, 0.02);
  kyotoGroup.add(kyotoCoffeeGrounds);

  const kyotoCarafe = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.095, 16, 12)),
    glassDomeMat
  );
  kyotoCarafe.scale.set(1, 0.9, 1);
  kyotoCarafe.position.set(0, 0.13, 0.02);
  kyotoCarafe.renderOrder = 4;
  kyotoGroup.add(kyotoCarafe);

  const amberLiquidMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x3b1e0d,
      roughness: 0.15,
      metalness: 0.05,
    })
  );
  const kyotoLiquid = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.078, 0.082, 0.08, 14)),
    amberLiquidMat
  );
  kyotoLiquid.position.set(0, 0.09, 0.02);
  kyotoGroup.add(kyotoLiquid);

  // Backlit Brass Emblem Crest flanking Menu Board
  const crestRing = new THREE.Mesh(
    track(new THREE.TorusGeometry(0.24, 0.025, 12, 32)),
    accentMetalMat
  );
  crestRing.position.set(3.25, 2.95, -4.45);
  shellGroup.add(crestRing);

  const crestBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.03, 0.03)), accentMetalMat);
  crestBar.position.set(3.25, 2.95, -4.45);
  crestBar.rotation.z = Math.PI / 6;
  shellGroup.add(crestBar);

  // Tiered Retail Merchandising Shelf & Branded Travel Tumblers (front-right bar flank)
  const merchGroup = new THREE.Group();
  merchGroup.position.set(4.65, 0, -1.2);
  scene.add(merchGroup);

  const merchFrameL = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 1.85, 0.44)), darkSteelMat);
  merchFrameL.position.set(-0.55, 0.925, 0);
  merchGroup.add(merchFrameL);

  const merchFrameR = merchFrameL.clone();
  merchFrameR.position.set(0.55, 0.925, 0);
  merchGroup.add(merchFrameR);

  const travelMugMat = track(
    new THREE.MeshStandardMaterial({
      map: travelMugTex,
      roughness: 0.4,
      metalness: 0.18,
    })
  );
  [0.42, 0.96, 1.48].forEach((my, idx) => {
    const shelf = new THREE.Mesh(track(new THREE.BoxGeometry(1.16, 0.05, 0.46)), oakMat);
    shelf.position.set(0, my, 0);
    shelf.castShadow = true;
    shelf.receiveShadow = true;
    merchGroup.add(shelf);

    // Travel tumblers & gift tins on merch shelves
    for (let m = 0; m < 3; m++) {
      const mug = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.06, 0.05, 0.19, 14)),
        idx === 1 ? ceramicMat : travelMugMat
      );
      mug.position.set(-0.34 + m * 0.24, my + 0.12, 0.04);
      mug.castShadow = true;
      merchGroup.add(mug);
    }

    const giftBox = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.24, 0.2, 0.22)),
      idx % 2 === 0 ? accentMetalMat : darkSteelMat
    );
    giftBox.position.set(0.36, my + 0.125, -0.02);
    merchGroup.add(giftBox);
  });

  // Hanging Botanical Trailing Planters along window header
  [-2.8, 0.4].forEach((hz) => {
    const hangerGroup = new THREE.Group();
    hangerGroup.position.set(-5.35, 3.65, hz);
    shellGroup.add(hangerGroup);

    const cable = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.006, 0.006, 0.85, 6)),
      darkSteelMat
    );
    cable.position.y = 0.42;
    hangerGroup.add(cable);

    const pot = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.18, 0.13, 0.22, 16)),
      ceramicMat
    );
    hangerGroup.add(pot);

    for (let v = 0; v < 6; v++) {
      const ang = (v / 6) * Math.PI * 2;
      const vine = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.09, 10, 8)),
        foliageMat
      );
      vine.scale.set(0.9, 1.4, 0.7);
      vine.position.set(Math.cos(ang) * 0.14, -0.05 - (v % 3) * 0.08, Math.sin(ang) * 0.14);
      hangerGroup.add(vine);
    }
  });

  // Window Espresso Rail & 2 Bar Stools along left glass facade
  const windowRail = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.06, 2.3)), oakMat);
  windowRail.position.set(-5.58, 0.98, 2.3);
  windowRail.castShadow = true;
  shellGroup.add(windowRail);

  [1.75, 2.85].forEach((sz) => {
    const stool = new THREE.Group();
    stool.position.set(-5.12, 0, sz);
    const sSeat = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.18, 0.17, 0.05, 16)),
      timberMat
    );
    sSeat.position.y = 0.68;
    sSeat.castShadow = true;
    stool.add(sSeat);

    const sPost = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.025, 0.03, 0.66, 10)),
      darkSteelMat
    );
    sPost.position.y = 0.33;
    stool.add(sPost);

    const sFoot = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.14, 0.014, 8, 16)),
      accentMetalMat
    );
    sFoot.rotation.x = Math.PI / 2;
    sFoot.position.y = 0.22;
    stool.add(sFoot);
    shellGroup.add(stool);
  });

  // Lounge Corner Vinyl Listening Credenza & Spinning Turntable
  const credenzaGroup = new THREE.Group();
  credenzaGroup.position.set(-5.15, 0, -2.05);
  scene.add(credenzaGroup);

  const credenzaBody = new THREE.Mesh(track(new THREE.BoxGeometry(0.58, 0.72, 1.45)), timberMat);
  credenzaBody.position.y = 0.44;
  credenzaBody.castShadow = true;
  credenzaBody.receiveShadow = true;
  credenzaGroup.add(credenzaBody);

  [-0.58, 0.58].forEach((cz) => {
    const leg = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.02, 0.014, 0.12, 8)),
      accentMetalMat
    );
    leg.position.set(0, 0.06, cz);
    credenzaGroup.add(leg);
  });

  const plinth = new THREE.Mesh(track(new THREE.BoxGeometry(0.38, 0.06, 0.46)), darkSteelMat);
  plinth.position.set(0, 0.83, -0.15);
  credenzaGroup.add(plinth);

  const vinylDisc = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 24)),
    track(new THREE.MeshStandardMaterial({ map: vinylTex, roughness: 0.35, metalness: 0.2 }))
  );
  vinylDisc.position.set(-0.02, 0.868, -0.15);
  credenzaGroup.add(vinylDisc);

  const speakerBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.34, 0.24)), oakMat);
  speakerBox.position.set(0, 0.97, 0.42);
  speakerBox.castShadow = true;
  credenzaGroup.add(speakerBox);

  // Clickable proxy for Roastery Wall
  const roasteryProxy = new THREE.Mesh(
    track(new THREE.BoxGeometry(3.4, 3.2, 1.8)),
    track(new THREE.MeshBasicMaterial({ visible: false }))
  );
  roasteryProxy.position.set(0.1, 1.6, -0.1);
  roasteryProxy.userData.hotspot = { id: 'roastery', kind: 'roastery' } satisfies CafeHotspotInfo;
  roasteryZone.add(roasteryProxy);
  clickables.push(roasteryProxy);

  // =====================================================
  // 4. INTERACTIVE PHYSICAL TABLES (T1-T5) + PENDANT LAMPS
  // =====================================================
  const tableVisuals = new Map<
    string,
    {
      ringMat: THREE.MeshStandardMaterial;
      bulbMat: THREE.MeshStandardMaterial;
      lampLight: THREE.PointLight;
    }
  >();

  initialTables.forEach((tbl) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(tbl.x, 0, tbl.z);
    scene.add(tGroup);
    const hotspotId = `table:${tbl.id}`;
    hotspotGroups.set(hotspotId, tGroup);

    const isCommunal = tbl.shape === 'communal';
    const topW = isCommunal ? 1.85 : 0.96;
    const topD = isCommunal ? 0.92 : 0.96;

    // Contact shadow plane
    const shadowPlane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(topW * 1.4, topD * 1.4)),
      track(
        new THREE.MeshBasicMaterial({
          map: contactTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.55,
        })
      )
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.015;
    tGroup.add(shadowPlane);

    // Table pedestal & base
    if (isCommunal) {
      [-0.62, 0.62].forEach((lx) => {
        const leg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.05, 0.72, 12)), darkSteelMat);
        leg.position.set(lx, 0.36, 0);
        leg.castShadow = true;
        tGroup.add(leg);
      });
      const tabletop = new THREE.Mesh(track(new THREE.BoxGeometry(topW, 0.06, topD)), oakMat);
      tabletop.position.y = 0.74;
      tabletop.castShadow = true;
      tabletop.receiveShadow = true;
      tGroup.add(tabletop);
    } else {
      const basePlate = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.24, 0.26, 0.03, 20)),
        accentMetalMat
      );
      basePlate.position.y = 0.015;
      tGroup.add(basePlate);

      const pedestal = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.038, 0.045, 0.72, 14)),
        darkSteelMat
      );
      pedestal.position.y = 0.37;
      pedestal.castShadow = true;
      tGroup.add(pedestal);

      const tabletop = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24)),
        timberMat
      );
      tabletop.position.y = 0.74;
      tabletop.castShadow = true;
      tabletop.receiveShadow = true;
      tGroup.add(tabletop);
    }

    // Subtle status indicator brass/ceramic coaster ring on table center
    const statusColor = STATUS_COLORS[tbl.status];
    const ringMat = track(
      new THREE.MeshStandardMaterial({
        color: statusColor,
        emissive: statusColor,
        emissiveIntensity: 0.45,
        roughness: 0.35,
      })
    );
    const statusRing = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.11, 0.018, 10, 24)),
      ringMat
    );
    statusRing.rotation.x = Math.PI / 2;
    statusRing.position.y = 0.775;
    tGroup.add(statusRing);

    // Ceramic cup prop on table
    const tCup = new THREE.Mesh(track(new THREE.CylinderGeometry(0.045, 0.035, 0.075, 14)), ceramicMat);
    tCup.position.set(0.18, 0.805, 0.12);
    tGroup.add(tCup);

    // Chairs around table
    const chairOffsets: [number, number, number][] = isCommunal
      ? [
          [-0.55, 0.64, Math.PI],
          [0.0, 0.64, Math.PI],
          [0.55, 0.64, Math.PI],
          [-0.55, -0.64, 0],
          [0.0, -0.64, 0],
          [0.55, -0.64, 0],
        ]
      : tbl.seats === 4
      ? [
          [-0.68, 0, Math.PI / 2],
          [0.68, 0, -Math.PI / 2],
          [0, 0.68, Math.PI],
          [0, -0.68, 0],
        ]
      : [
          [-0.66, 0, Math.PI / 2],
          [0.66, 0, -Math.PI / 2],
        ];

    chairOffsets.forEach(([cx, cz, rotY]) => {
      const chair = new THREE.Group();
      chair.position.set(cx, 0, cz);
      chair.rotation.y = rotY;
      const seat = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.17, 0.04, 16)), oakMat);
      seat.position.y = 0.44;
      seat.castShadow = true;
      chair.add(seat);

      const back = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.28, 0.04)), oakMat);
      back.position.set(0, 0.66, -0.15);
      chair.add(back);

      const legGeo = track(new THREE.CylinderGeometry(0.016, 0.014, 0.44, 8));
      [
        [-0.11, -0.11],
        [0.11, -0.11],
        [-0.11, 0.11],
        [0.11, 0.11],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, darkSteelMat);
        leg.position.set(lx, 0.22, lz);
        chair.add(leg);
      });
      tGroup.add(chair);
    });

    // Suspended Brass Pendant Lamp above each table
    const cord = new THREE.Mesh(track(new THREE.CylinderGeometry(0.008, 0.008, 1.8, 6)), darkSteelMat);
    cord.position.y = 3.55;
    tGroup.add(cord);

    const shade = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.24, 0.18, 20, 1, true)),
      accentMetalMat
    );
    shade.position.y = 2.62;
    tGroup.add(shade);

    const bulbMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xffe4b5,
        emissive: statusColor,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      })
    );
    const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.055, 12, 10)), bulbMat);
    bulb.position.y = 2.55;
    tGroup.add(bulb);

    const lampLight = new THREE.PointLight(0xffcf91, 0.9, 4.2, 2);
    lampLight.position.set(0, 2.45, 0);
    tGroup.add(lampLight);

    tableVisuals.set(tbl.id, { ringMat, bulbMat, lampLight });

    // Clickable invisible proxy box for fast, reliable raycasting
    const tblProxy = new THREE.Mesh(
      track(new THREE.BoxGeometry(topW + 0.55, 1.35, topD + 0.55)),
      track(new THREE.MeshBasicMaterial({ visible: false }))
    );
    tblProxy.position.y = 0.65;
    tblProxy.userData.hotspot = {
      id: hotspotId,
      kind: 'table',
      tableId: tbl.id,
    } satisfies CafeHotspotInfo;
    tGroup.add(tblProxy);
    clickables.push(tblProxy);
  });

  // =====================================================
  // 5. RISING STEAM PARTICLES ABOVE TASTING CUP
  // =====================================================
  const steamCount = 26;
  const steamPositions = new Float32Array(steamCount * 3);
  const steamVelocities = new Float32Array(steamCount);
  const steamOrigins = new Float32Array(steamCount * 3);

  const cupWorldX = 1.5 - 1.55;
  const cupWorldY = 1.2;
  const cupWorldZ = -2.35 + 0.25;

  for (let i = 0; i < steamCount; i++) {
    const ox = cupWorldX + (Math.random() - 0.5) * 0.08;
    const oy = cupWorldY + Math.random() * 0.55;
    const oz = cupWorldZ + (Math.random() - 0.5) * 0.08;
    steamPositions[i * 3] = ox;
    steamPositions[i * 3 + 1] = oy;
    steamPositions[i * 3 + 2] = oz;
    steamOrigins[i * 3] = ox;
    steamOrigins[i * 3 + 1] = cupWorldY;
    steamOrigins[i * 3 + 2] = oz;
    steamVelocities[i] = 0.14 + Math.random() * 0.14;
  }

  const steamGeo = track(new THREE.BufferGeometry());
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));
  const steamMat = track(
    new THREE.PointsMaterial({
      color: 0xfbf8f3,
      size: 0.045,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    })
  );
  const steamParticles = new THREE.Points(steamGeo, steamMat);
  scene.add(steamParticles);

  // =====================================================
  // LIVE SYNC METHODS (Aesthetics & Business State)
  // =====================================================
  const applyAesthetics = (
    atmosphere: AtmospherePreset,
    finish: MaterialFinish,
    metal: AccentMetal
  ) => {
    // 1. Surface Finish
    if (finish === 'limestone') {
      floorMat.color.setHex(0xf4efe8);
      wallMat.color.setHex(0xf0ebe3);
      counterTopMat.color.setHex(0xe8e1d6);
      timberMat.color.setHex(0xffffff);
    } else if (finish === 'walnut') {
      floorMat.color.setHex(0xdfd6c9);
      wallMat.color.setHex(0xe4ddd2);
      counterTopMat.color.setHex(0xd4c9ba);
      timberMat.color.setHex(0xc49c7c);
    } else {
      floorMat.color.setHex(0x9b9894);
      wallMat.color.setHex(0xb8b5b0);
      counterTopMat.color.setHex(0x52504e);
      timberMat.color.setHex(0x9e826d);
    }

    // 2. Accent Metal
    if (metal === 'brass') {
      accentMetalMat.color.setHex(0xc9924b);
      accentMetalMat.roughness = 0.24;
      accentMetalMat.metalness = 0.88;
    } else {
      accentMetalMat.color.setHex(0x2a2826);
      accentMetalMat.roughness = 0.34;
      accentMetalMat.metalness = 0.76;
    }

    // 3. Atmosphere Lighting & Horizon Fog
    if (atmosphere === 'morning') {
      const bg = new THREE.Color(0xeae5dc);
      scene.background = bg;
      scene.fog = new THREE.FogExp2(0xeae5dc, 0.022);
      skyPlaneMat.color.setHex(0xdfeaf4);
      keySunLight.color.setHex(0xfff5e4);
      keySunLight.intensity = 2.3;
      keySunLight.position.set(-7.5, 10.0, 6.5);
      hemiLight.color.setHex(0xe4eef8);
      hemiLight.groundColor.setHex(0x7c6855);
      hemiLight.intensity = 0.9;
      barAccentLight.intensity = 1.6;
      tableVisuals.forEach((v) => {
        v.lampLight.intensity = 0.55;
      });
    } else if (atmosphere === 'golden') {
      const bg = new THREE.Color(0xe3d4be);
      scene.background = bg;
      scene.fog = new THREE.FogExp2(0xe3d4be, 0.024);
      skyPlaneMat.color.setHex(0xf6cba0);
      keySunLight.color.setHex(0xffb86c);
      keySunLight.intensity = 2.5;
      keySunLight.position.set(-10.5, 4.5, 4.5);
      hemiLight.color.setHex(0xffdfc2);
      hemiLight.groundColor.setHex(0x594230);
      hemiLight.intensity = 0.78;
      barAccentLight.intensity = 2.6;
      tableVisuals.forEach((v) => {
        v.lampLight.intensity = 1.05;
      });
    } else {
      const bg = new THREE.Color(0x161412);
      scene.background = bg;
      scene.fog = new THREE.FogExp2(0x161412, 0.028);
      skyPlaneMat.color.setHex(0x1d2330);
      keySunLight.color.setHex(0x88a4d4);
      keySunLight.intensity = 0.75;
      keySunLight.position.set(-7.0, 8.0, 6.0);
      hemiLight.color.setHex(0x465268);
      hemiLight.groundColor.setHex(0x2e2319);
      hemiLight.intensity = 0.58;
      barAccentLight.intensity = 4.2;
      tableVisuals.forEach((v) => {
        v.lampLight.intensity = 2.0;
      });
    }
  };

  const updateTables = (tables: CafeTable[]) => {
    tables.forEach((tbl) => {
      const vis = tableVisuals.get(tbl.id);
      if (!vis) return;
      const col = STATUS_COLORS[tbl.status];
      vis.ringMat.color.setHex(col);
      vis.ringMat.emissive.setHex(col);
      vis.bulbMat.emissive.setHex(col);
      vis.bulbMat.emissiveIntensity = tbl.status === 'available' ? 0.75 : 0.45;
    });
  };

  const updateMenuBoard = (roastNote: string) => {
    menuBoardTex.dispose();
    menuBoardTex = createMenuBoardTexture(renderer, roastNote);
    menuBoardMat.map = menuBoardTex;
    menuBoardMat.needsUpdate = true;
  };

  const setHighlightedHotspot = (hotspotId: string | null) => {
    hotspotGroups.forEach((grp, id) => {
      const active = id === hotspotId;
      grp.scale.setScalar(active ? 1.02 : 1.0);
    });
  };

  const dispose = () => {
    disposables.forEach((d) => d.dispose());
    menuBoardTex.dispose();
  };

  return {
    clickables,
    steamParticles,
    steamVelocities,
    steamOrigins,
    vinylDisc,
    applyAesthetics,
    updateTables,
    updateMenuBoard,
    setHighlightedHotspot,
    dispose,
  };
}
