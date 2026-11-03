import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ParkingSpot, GateState } from '../types/parking';
import {
  createAsphaltTexture,
  createBayDecalTexture,
  createArrowTexture,
} from './ProceduralTextures';
import {
  createVehicleModel,
  createBarrierGateModel,
  createEVChargerModel,
  createSensorPod,
  createLPRGantry,
  createStructuralColumn,
} from './ProceduralModels';

interface ParkingSceneProps {
  spots: ParkingSpot[];
  entranceGate: GateState;
  selectedSpotId?: string;
  onSelectSpot: (spot: ParkingSpot) => void;
  cameraPreset: 'overview' | 'entrance' | 'evBay' | 'rooftop' | 'driver';
  nightMode: boolean;
}

// Scratch math objects for zero garbage collection
const _vec3TargetPos = new THREE.Vector3();
const _vec3TargetLook = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

export const ParkingScene: React.FC<ParkingSceneProps> = ({
  spots,
  entranceGate,
  selectedSpotId,
  onSelectSpot,
  cameraPreset,
  nightMode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const spotsRef = useRef(spots);
  const entranceGateRef = useRef(entranceGate);
  const selectedSpotIdRef = useRef(selectedSpotId);
  const onSelectSpotRef = useRef(onSelectSpot);
  const cameraPresetRef = useRef(cameraPreset);
  const nightModeRef = useRef(nightMode);

  spotsRef.current = spots;
  entranceGateRef.current = entranceGate;
  selectedSpotIdRef.current = selectedSpotId;
  onSelectSpotRef.current = onSelectSpot;
  cameraPresetRef.current = cameraPreset;
  nightModeRef.current = nightMode;

  const sceneObjectsRef = useRef<{
    vehicleMap: Map<string, THREE.Group>;
    sensorMap: Map<string, (status: any) => void>;
    setEntranceOpen: (open: boolean) => void;
    selectionRing: THREE.Mesh;
    keyLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
    pointLights: THREE.PointLight[];
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Detect Software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
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

    // 2. Scene & Camera Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const skyColor = 0x090d16;
    scene.background = new THREE.Color(skyColor);
    scene.fog = new THREE.FogExp2(skyColor, 0.012);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 160);
    camera.position.set(2, 22, 26);
    camera.lookAt(0, 1.5, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Studio Environment Map (PMREMGenerator + RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.75);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.5);
    keyLight.position.set(18, 30, 20);
    keyLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 70;
      keyLight.shadow.camera.left = -28;
      keyLight.shadow.camera.right = 28;
      keyLight.shadow.camera.top = 28;
      keyLight.shadow.camera.bottom = -28;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Architectural Point Lights
    const pL1 = new THREE.PointLight(0x38bdf8, 1.2, 22);
    pL1.position.set(-7.5, 4.0, 1);
    const pL2 = new THREE.PointLight(0x38bdf8, 1.2, 22);
    pL2.position.set(7.5, 7.5, 1);
    const pLEntry = new THREE.PointLight(0x22c55e, 1.6, 18);
    pLEntry.position.set(-7.5, 4.0, -14);
    scene.add(pL1, pL2, pLEntry);
    const pointLights = [pL1, pL2, pLEntry];

    // 5. Ground Floor Plane (Level 1 Asphalt)
    const asphaltTexture = createAsphaltTexture();
    const groundGeom = new THREE.PlaneGeometry(64, 64);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      map: asphaltTexture,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    // Perimeter Curbs
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const curbLeft = new THREE.BoxGeometry(0.5, 0.25, 28);
    curbLeft.translate(-14, 0.125, 0.5);
    scene.add(new THREE.Mesh(curbLeft, curbMat));

    // Central Dividing Barrier between Level 1 and Level 2
    const centerBarrierGeom = new THREE.BoxGeometry(0.5, 0.8, 26);
    centerBarrierGeom.translate(-0.8, 0.4, 0.5);
    scene.add(new THREE.Mesh(centerBarrierGeom, curbMat));

    // Driving lane arrows on Level 1 (X = -7.5)
    const arrowTex = createArrowTexture();
    const arrowMat = new THREE.MeshBasicMaterial({
      map: arrowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const arrowGeom = new THREE.PlaneGeometry(1.6, 1.6);
    arrowGeom.rotateX(-Math.PI / 2);
    for (let z = -10; z <= 10; z += 5) {
      const aL1 = new THREE.Mesh(arrowGeom, arrowMat);
      aL1.position.set(-7.5, 0.02, z);
      scene.add(aL1);

      // Driving lane arrows on Level 2 (X = 7.5, Y = 3.62)
      const aL2 = new THREE.Mesh(arrowGeom, arrowMat);
      aL2.position.set(7.5, 3.62, z);
      scene.add(aL2);
    }

    // 6. Level 2: Elevated Rooftop Deck Structure
    // Centered at X = 7.5, Y = 3.6, Width = 14, Length = 26
    const deckGeom = new THREE.BoxGeometry(14, 0.35, 26);
    deckGeom.translate(7.5, 3.6 - 0.175, 0.5);
    const deckMat = new THREE.MeshStandardMaterial({
      map: asphaltTexture,
      roughness: 0.8,
      metalness: 0.2,
    });
    const deck = new THREE.Mesh(deckGeom, deckMat);
    deck.receiveShadow = !isSoftwareGl;
    scene.add(deck);

    // Support pillars beneath Level 2 deck
    const deckPillars = [
      createStructuralColumn(1.2, -10, 3.6),
      createStructuralColumn(1.2, 0.5, 3.6),
      createStructuralColumn(1.2, 11, 3.6),
      createStructuralColumn(14, -10, 3.6),
      createStructuralColumn(14, 0.5, 3.6),
      createStructuralColumn(14, 11, 3.6),
    ];
    deckPillars.forEach((p) => scene.add(p));

    // Glass safety railing around Level 2 deck
    const railingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.45,
    });
    const railOuterGeom = new THREE.BoxGeometry(0.1, 1.0, 26);
    railOuterGeom.translate(14.5, 3.6 + 0.5, 0.5);
    scene.add(new THREE.Mesh(railOuterGeom, railingMat));

    // Ramp connecting Ground to Level 2
    const rampGeom = new THREE.BoxGeometry(3.6, 0.25, 12);
    rampGeom.rotateX(-0.30);
    rampGeom.translate(7.5, 1.8, 18);
    const ramp = new THREE.Mesh(rampGeom, curbMat);
    ramp.receiveShadow = !isSoftwareGl;
    scene.add(ramp);

    // Rooftop Solar Canopy (Slender elevated glass roof so cars are visible)
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.7,
      transparent: true,
      opacity: 0.35,
    });
    const canopyRoofGeom = new THREE.BoxGeometry(13.6, 0.08, 25.6);
    canopyRoofGeom.translate(7.5, 6.8, 0.5);
    const canopyRoof = new THREE.Mesh(canopyRoofGeom, canopyMat);
    scene.add(canopyRoof);

    // 7. Entrance Gate and LPR Camera Gantry (on Level 1 Entry Lane at Z = -14)
    const entranceGateModel = createBarrierGateModel();
    entranceGateModel.group.position.set(-9.2, 0, -13.5);
    scene.add(entranceGateModel.group);

    const exitGateModel = createBarrierGateModel();
    exitGateModel.group.position.set(-5.8, 0, -13.5);
    exitGateModel.group.rotation.y = Math.PI;
    scene.add(exitGateModel.group);

    const lprGantry = createLPRGantry();
    lprGantry.position.set(-7.5, 0, -15.5);
    scene.add(lprGantry);

    // 8. Selection Ring (Visual highlight on chosen spot)
    const ringGeom = new THREE.RingGeometry(1.6, 1.85, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const selectionRing = new THREE.Mesh(ringGeom, ringMat);
    selectionRing.visible = false;
    scene.add(selectionRing);

    // 9. Interactive Spot Meshes (Decals, Vehicles, EV Pedestals, Sensors)
    const spotMeshGroup = new THREE.Group();
    scene.add(spotMeshGroup);

    const vehicleMap = new Map<string, THREE.Group>();
    const sensorMap = new Map<string, (status: any) => void>();
    const raycastClickTargets: THREE.Mesh[] = [];

    spotsRef.current.forEach((spot) => {
      // Stall Decal Ground Plane
      const decalTex = createBayDecalTexture(spot.code, spot.type);
      const decalMat = new THREE.MeshBasicMaterial({
        map: decalTex,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const decalGeom = new THREE.PlaneGeometry(2.8, 5.2);
      decalGeom.rotateX(-Math.PI / 2);
      const decalMesh = new THREE.Mesh(decalGeom, decalMat);
      decalMesh.position.set(spot.x, spot.y + 0.02, spot.z);
      decalMesh.rotation.y = spot.rotationY;
      spotMeshGroup.add(decalMesh);

      // Raycast Target Box for easy clicking
      const clickBoxGeom = new THREE.BoxGeometry(3.0, 2.2, 5.4);
      const clickBoxMat = new THREE.MeshBasicMaterial({ visible: false });
      const clickBox = new THREE.Mesh(clickBoxGeom, clickBoxMat);
      clickBox.position.set(spot.x, spot.y + 1.1, spot.z);
      clickBox.rotation.y = spot.rotationY;
      clickBox.userData = { spotId: spot.id };
      spotMeshGroup.add(clickBox);
      raycastClickTargets.push(clickBox);

      // EV Charger pedestal if EV spot
      if (spot.type === 'ev') {
        const evCharger = createEVChargerModel();
        const chargerOffsetX = spot.rotationY > 0 ? -2.2 : 2.2;
        evCharger.position.set(spot.x + chargerOffsetX, spot.y, spot.z);
        evCharger.rotation.y = spot.rotationY > 0 ? Math.PI / 2 : -Math.PI / 2;
        spotMeshGroup.add(evCharger);
      }

      // Ceiling / Overhead Sensor Pod
      const sensorPod = createSensorPod(spot.status);
      sensorPod.group.position.set(spot.x, spot.y + 3.2, spot.z);
      spotMeshGroup.add(sensorPod.group);
      sensorMap.set(spot.id, sensorPod.setStatus);

      // Vehicle model if occupied
      if (spot.status === 'occupied' && spot.vehicle) {
        const vehicle = createVehicleModel({
          color: spot.vehicle.color,
          isEV: spot.vehicle.isEV,
        });
        vehicle.position.set(spot.x, spot.y, spot.z);
        vehicle.rotation.y = spot.rotationY;
        spotMeshGroup.add(vehicle);
        vehicleMap.set(spot.id, vehicle);
      }
    });

    sceneObjectsRef.current = {
      vehicleMap,
      sensorMap,
      setEntranceOpen: entranceGateModel.setOpen,
      selectionRing,
      keyLight,
      hemiLight,
      pointLights,
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 10. Pointer Down Raycasting
    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      _mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.setFromCamera(_mouse, camera);
      const intersects = _raycaster.intersectObjects(raycastClickTargets, false);

      if (intersects.length > 0) {
        const hitSpotId = intersects[0].object.userData.spotId;
        const target = spotsRef.current.find((s) => s.id === hitSpotId);
        if (target) {
          onSelectSpotRef.current(target);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 11. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 12. Animation Loop with Exponential Damping & Software GL Pacing
    let frameId = 0;
    let lastTime = performance.now();

    function getTargetCameraValues(preset: string) {
      if (preset === 'entrance') {
        _vec3TargetPos.set(-7.5, 4.2, -21);
        _vec3TargetLook.set(-7.5, 1.2, -13);
      } else if (preset === 'evBay') {
        _vec3TargetPos.set(-14, 3.2, 6);
        _vec3TargetLook.set(-10, 1.0, 6);
      } else if (preset === 'rooftop') {
        _vec3TargetPos.set(16, 12, 12);
        _vec3TargetLook.set(7.5, 4.2, 1);
      } else if (preset === 'driver') {
        _vec3TargetPos.set(-7.5, 1.6, -9);
        _vec3TargetLook.set(-7.5, 1.2, 5);
      } else {
        // default 'overview'
        _vec3TargetPos.set(0, 22, 26);
        _vec3TargetLook.set(0, 1.5, 0);
      }
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 75);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const currentLook = new THREE.Vector3(0, 1.5, 0);

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Exponential damping: 1 - Math.exp(-k * dt)
      getTargetCameraValues(cameraPresetRef.current);
      const lerpSpeed = 1 - Math.exp(-4.5 * dt);
      camera.position.lerp(_vec3TargetPos, lerpSpeed);
      currentLook.lerp(_vec3TargetLook, lerpSpeed);
      camera.lookAt(currentLook);

      // Update Selection Ring
      const selected = spotsRef.current.find((s) => s.id === selectedSpotIdRef.current);
      if (selected && selectionRing) {
        selectionRing.visible = true;
        selectionRing.position.set(selected.x, selected.y + 0.03, selected.z);
      } else if (selectionRing) {
        selectionRing.visible = false;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      groundGeom.dispose();
      groundMat.dispose();
    };
  }, []);

  // Sync state changes
  useEffect(() => {
    if (!sceneObjectsRef.current) return;
    const { setEntranceOpen, sensorMap, keyLight, hemiLight, pointLights } = sceneObjectsRef.current;

    setEntranceOpen(entranceGate.isOpen);

    spots.forEach((spot) => {
      const updater = sensorMap.get(spot.id);
      if (updater) {
        updater(spot.status);
      }
    });

    if (nightMode) {
      keyLight.intensity = 0.45;
      hemiLight.intensity = 0.35;
      pointLights.forEach((pl) => (pl.intensity = 2.2));
    } else {
      keyLight.intensity = 1.5;
      hemiLight.intensity = 0.75;
      pointLights.forEach((pl) => (pl.intensity = 1.0));
    }
  }, [spots, entranceGate, nightMode]);

  return (
    <div
      ref={mountRef}
      data-testid="parking-3d-viewport"
      className="w-full h-full absolute inset-0 cursor-grab active:cursor-grabbing select-none"
    />
  );
};
