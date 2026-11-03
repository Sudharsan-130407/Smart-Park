import * as THREE from 'three';
import { SpotType } from '../types/parking';
import { createSolarCellTexture } from './ProceduralTextures';

// Shared materials cache to minimize allocations and draw calls
const wheelRubberMaterial = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.85,
  metalness: 0.1,
});

const wheelRimMaterial = new THREE.MeshStandardMaterial({
  color: 0xd4d4d8,
  roughness: 0.25,
  metalness: 0.9,
});

const windowGlassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x09090b,
  roughness: 0.05,
  metalness: 0.85,
  transparent: true,
  opacity: 0.75,
});

const headlightMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffee,
  emissiveIntensity: 1.5,
  roughness: 0.1,
});

const taillightMaterial = new THREE.MeshStandardMaterial({
  color: 0xff2222,
  emissive: 0xff0000,
  emissiveIntensity: 2.0,
  roughness: 0.1,
});

const contactShadowMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});

/**
 * Creates a soft radial contact shadow circle geometry.
 */
function createContactShadow(width: number, length: number): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(width, length);
  geom.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geom, contactShadowMaterial);
  mesh.position.y = 0.015;
  return mesh;
}

/**
 * Creates a composite 3-12 part procedural vehicle model.
 */
export function createVehicleModel(options: {
  color?: string;
  isEV?: boolean;
  modelType?: 'sedan' | 'suv' | 'cyber';
}): THREE.Group {
  const group = new THREE.Group();
  const carColor = options.color || '#2563eb';

  // Body paint material
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(carColor),
    roughness: 0.25,
    metalness: 0.65,
  });

  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.3,
  });

  // Part 1: Primary silhouette - Lower chassis
  const chassisGeom = new THREE.BoxGeometry(1.9, 0.55, 4.2);
  chassisGeom.translate(0, 0.45, 0);
  const chassis = new THREE.Mesh(chassisGeom, bodyMaterial);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Part 2: Front and rear bumpers
  const frontBumperGeom = new THREE.BoxGeometry(1.86, 0.28, 0.4);
  frontBumperGeom.translate(0, 0.3, 2.15);
  const frontBumper = new THREE.Mesh(frontBumperGeom, trimMaterial);
  group.add(frontBumper);

  const rearBumperGeom = new THREE.BoxGeometry(1.86, 0.28, 0.4);
  rearBumperGeom.translate(0, 0.3, -2.15);
  const rearBumper = new THREE.Mesh(rearBumperGeom, trimMaterial);
  group.add(rearBumper);

  // Part 3: Secondary Read - Cabin / Greenhouse
  const cabinGeom = new THREE.BoxGeometry(1.6, 0.52, 2.3);
  cabinGeom.translate(0, 0.95, -0.2);
  const cabin = new THREE.Mesh(cabinGeom, bodyMaterial);
  cabin.castShadow = true;
  group.add(cabin);

  // Part 4: Windshields & Windows
  const windshieldGeom = new THREE.BoxGeometry(1.56, 0.48, 2.22);
  windshieldGeom.translate(0, 0.96, -0.2);
  const windshield = new THREE.Mesh(windshieldGeom, windowGlassMaterial);
  group.add(windshield);

  // Parts 5-8: 4 Wheels (Rubber tires + alloy rims)
  const wheelGeom = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
  wheelGeom.rotateZ(Math.PI / 2);
  const rimGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.26, 16);
  rimGeom.rotateZ(Math.PI / 2);

  const wheelPositions = [
    [-0.92, 0.34, 1.25],  // front-left
    [0.92, 0.34, 1.25],   // front-right
    [-0.92, 0.34, -1.25], // rear-left
    [0.92, 0.34, -1.25],  // rear-right
  ];

  for (const [wx, wy, wz] of wheelPositions) {
    const wheel = new THREE.Mesh(wheelGeom, wheelRubberMaterial);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    const rim = new THREE.Mesh(rimGeom, wheelRimMaterial);
    wheel.add(rim);
    group.add(wheel);
  }

  // Parts 9-10: Headlights
  const headlightGeom = new THREE.BoxGeometry(0.35, 0.12, 0.08);
  const hlLeft = new THREE.Mesh(headlightGeom, headlightMaterial);
  hlLeft.position.set(-0.65, 0.52, 2.12);
  const hlRight = new THREE.Mesh(headlightGeom, headlightMaterial);
  hlRight.position.set(0.65, 0.52, 2.12);
  group.add(hlLeft, hlRight);

  // Parts 11-12: Taillights
  const taillightGeom = new THREE.BoxGeometry(1.5, 0.08, 0.06);
  const tl = new THREE.Mesh(taillightGeom, taillightMaterial);
  tl.position.set(0, 0.55, -2.12);
  group.add(tl);

  // Part 13: Side mirrors
  const mirrorGeom = new THREE.BoxGeometry(0.18, 0.1, 0.12);
  const mirrorL = new THREE.Mesh(mirrorGeom, trimMaterial);
  mirrorL.position.set(-0.95, 0.85, 0.6);
  const mirrorR = new THREE.Mesh(mirrorGeom, trimMaterial);
  mirrorR.position.set(0.95, 0.85, 0.6);
  group.add(mirrorL, mirrorR);

  // Part 14: Soft Ground Contact Shadow
  const shadow = createContactShadow(2.3, 4.6);
  group.add(shadow);

  return group;
}

/**
 * Creates an entrance/exit boom barrier gate unit with animated arm.
 */
export function createBarrierGateModel(): {
  group: THREE.Group;
  armGroup: THREE.Group;
  trafficLightMesh: THREE.Mesh;
  setOpen: (open: boolean) => void;
} {
  const group = new THREE.Group();

  // Part 1: Heavy Cabinet Pedestal
  const cabinetMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.4,
  });
  const cabinetGeom = new THREE.BoxGeometry(0.5, 1.2, 0.5);
  cabinetGeom.translate(0, 0.6, 0);
  const cabinet = new THREE.Mesh(cabinetGeom, cabinetMat);
  cabinet.castShadow = true;
  group.add(cabinet);

  // Part 2: Pivot Motor Housing
  const motorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.8,
  });
  const motorGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 16);
  motorGeom.rotateX(Math.PI / 2);
  const motor = new THREE.Mesh(motorGeom, motorMat);
  motor.position.set(0.28, 1.05, 0);
  group.add(motor);

  // Part 3: Barrier Arm Group (Rotates open/closed)
  const armGroup = new THREE.Group();
  armGroup.position.set(0.35, 1.05, 0);

  // Striped Arm
  const armGeom = new THREE.BoxGeometry(3.6, 0.12, 0.08);
  armGeom.translate(1.8, 0, 0);
  const armMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Yellow warning
    roughness: 0.35,
    metalness: 0.2,
  });
  const arm = new THREE.Mesh(armGeom, armMat);
  arm.castShadow = true;

  // Arm LED red warning line
  const ledGeom = new THREE.BoxGeometry(3.5, 0.03, 0.09);
  ledGeom.translate(1.8, 0, 0);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xef4444,
    emissiveIntensity: 1.2,
  });
  const armLed = new THREE.Mesh(ledGeom, ledMat);
  armGroup.add(arm, armLed);
  group.add(armGroup);

  // Part 4: Ticket / Scanner Kiosk Pillar
  const kioskGeom = new THREE.BoxGeometry(0.35, 1.1, 0.35);
  kioskGeom.translate(0, 0.55, 1.2);
  const kioskMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.4,
    metalness: 0.6,
  });
  const kiosk = new THREE.Mesh(kioskGeom, kioskMat);
  
  // Screen on Kiosk
  const screenGeom = new THREE.PlaneGeometry(0.22, 0.25);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.position.set(-0.18, 0.75, 1.2);
  screen.rotation.y = -Math.PI / 2;
  group.add(kiosk, screen);

  // Part 5: Traffic Light
  const tlHousingGeom = new THREE.BoxGeometry(0.18, 0.4, 0.18);
  tlHousingGeom.translate(0, 1.45, 0);
  const tlHousing = new THREE.Mesh(tlHousingGeom, motorMat);
  
  const tlLightGeom = new THREE.SphereGeometry(0.07, 16, 16);
  const tlLightMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.5,
  });
  const trafficLightMesh = new THREE.Mesh(tlLightGeom, tlLightMat);
  trafficLightMesh.position.set(-0.1, 1.45, 0);
  group.add(tlHousing, trafficLightMesh);

  // Part 6: Contact Shadow
  const shadow = createContactShadow(1.2, 1.2);
  shadow.position.set(0, 0, 0.5);
  group.add(shadow);

  const setOpen = (open: boolean) => {
    // Open raises arm to Math.PI / 2 (~90 deg)
    const targetAngle = open ? Math.PI / 2.2 : 0;
    armGroup.rotation.z = targetAngle;
    tlLightMat.color.setHex(open ? 0x22c55e : 0xef4444);
    tlLightMat.emissive.setHex(open ? 0x22c55e : 0xef4444);
  };

  return { group, armGroup, trafficLightMesh, setOpen };
}

/**
 * Creates an EV Fast-Charging Station pedestal model.
 */
export function createEVChargerModel(): THREE.Group {
  const group = new THREE.Group();

  // Part 1: Kiosk body
  const bodyGeom = new THREE.BoxGeometry(0.45, 1.6, 0.35);
  bodyGeom.translate(0, 0.8, 0);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.8,
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.castShadow = true;
  group.add(body);

  // Part 2: Glowing cyan accent ring
  const ringGeom = new THREE.CylinderGeometry(0.24, 0.24, 0.08, 24);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.0,
  });
  const ring = new THREE.Mesh(ringGeom, ringMat);
  ring.position.set(0, 1.52, 0);
  group.add(ring);

  // Part 3: Interactive Display Screen
  const screenGeom = new THREE.PlaneGeometry(0.3, 0.4);
  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
  });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.position.set(0, 1.15, 0.18);
  group.add(screen);

  // Part 4: Cable holster and tube
  const cableCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0.22, 1.1, 0),
    new THREE.Vector3(0.38, 0.8, 0.2),
    new THREE.Vector3(0.32, 0.4, 0.3),
    new THREE.Vector3(0.18, 0.8, 0.15)
  );
  const cableGeom = new THREE.TubeGeometry(cableCurve, 16, 0.03, 8, false);
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
  const cable = new THREE.Mesh(cableGeom, cableMat);
  group.add(cable);

  // Part 5: Contact shadow
  group.add(createContactShadow(0.8, 0.8));

  return group;
}

/**
 * Creates ceiling ultrasonic / optical occupancy sensor pod.
 */
export function createSensorPod(initialStatus: 'available' | 'occupied' | 'reserved'): {
  group: THREE.Group;
  setStatus: (status: 'available' | 'occupied' | 'reserved' | 'maintenance') => void;
} {
  const group = new THREE.Group();

  // Stem
  const stemGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12);
  stemGeom.translate(0, 0.3, 0);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
  const stem = new THREE.Mesh(stemGeom, stemMat);
  group.add(stem);

  // Sensor dome
  const domeGeom = new THREE.SphereGeometry(0.12, 16, 16);
  const domeMat = new THREE.MeshStandardMaterial({
    color: initialStatus === 'available' ? 0x22c55e : (initialStatus === 'reserved' ? 0x3b82f6 : 0xef4444),
    emissive: initialStatus === 'available' ? 0x22c55e : (initialStatus === 'reserved' ? 0x3b82f6 : 0xef4444),
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });
  const dome = new THREE.Mesh(domeGeom, domeMat);
  dome.position.set(0, 0.02, 0);
  group.add(dome);

  const setStatus = (status: 'available' | 'occupied' | 'reserved' | 'maintenance') => {
    let hex = 0x22c55e; // green
    if (status === 'occupied') hex = 0xef4444; // red
    else if (status === 'reserved') hex = 0x3b82f6; // blue
    else if (status === 'maintenance') hex = 0xf59e0b; // amber
    domeMat.color.setHex(hex);
    domeMat.emissive.setHex(hex);
  };

  return { group, setStatus };
}

/**
 * Creates overhead LPR Camera Gantry truss with overhead dynamic LED matrix display.
 */
export function createLPRGantry(): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.8,
  });

  // Dual Vertical Support Posts
  const postGeom = new THREE.CylinderGeometry(0.12, 0.12, 4.5, 12);
  postGeom.translate(0, 2.25, 0);
  const postL = new THREE.Mesh(postGeom, steelMat);
  postL.position.set(-4.5, 0, 0);
  const postR = new THREE.Mesh(postGeom, steelMat);
  postR.position.set(4.5, 0, 0);
  group.add(postL, postR);

  // Cross Beam Truss
  const beamGeom = new THREE.BoxGeometry(9.2, 0.25, 0.25);
  beamGeom.translate(0, 4.4, 0);
  const beam = new THREE.Mesh(beamGeom, steelMat);
  group.add(beam);

  // Overhead Dynamic Matrix Display Panel
  const panelGeom = new THREE.BoxGeometry(4.0, 0.9, 0.15);
  panelGeom.translate(0, 3.8, 0);
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.2,
    metalness: 0.9,
  });
  const panel = new THREE.Mesh(panelGeom, panelMat);
  group.add(panel);

  // LED Screen
  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 512;
  ledCanvas.height = 128;
  const ctx = ledCanvas.getContext('2d')!;
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('AEROPARK • SMART ENTRY', 256, 48);
  ctx.fillStyle = '#38bdf8';
  ctx.font = '28px monospace';
  ctx.fillText('LPR AUTO-SCAN ACTIVE', 256, 95);

  const ledTex = new THREE.CanvasTexture(ledCanvas);
  ledTex.colorSpace = THREE.SRGBColorSpace;
  const screenGeom = new THREE.PlaneGeometry(3.9, 0.8);
  const screenMat = new THREE.MeshBasicMaterial({ map: ledTex });
  const screen = new THREE.Mesh(screenGeom, screenMat);
  screen.position.set(0, 3.8, 0.08);
  group.add(screen);

  // 2 LPR High-speed Camera housings
  const camMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });
  const camGeom = new THREE.BoxGeometry(0.2, 0.15, 0.3);
  camGeom.rotateX(0.25);

  const cam1 = new THREE.Mesh(camGeom, camMat);
  cam1.position.set(-1.8, 4.1, 0.2);
  const cam2 = new THREE.Mesh(camGeom, camMat);
  cam2.position.set(1.8, 4.1, 0.2);
  group.add(cam1, cam2);

  return group;
}

/**
 * Creates structural columns with level markers.
 */
export function createStructuralColumn(x: number, z: number, height: number = 4.8): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const columnGeom = new THREE.BoxGeometry(0.7, height, 0.7);
  columnGeom.translate(0, height / 2, 0);
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.7,
    metalness: 0.2,
  });
  const col = new THREE.Mesh(columnGeom, columnMat);
  col.castShadow = true;
  group.add(col);

  // Yellow and black warning hazard base
  const baseGeom = new THREE.BoxGeometry(0.74, 0.6, 0.74);
  baseGeom.translate(0, 0.3, 0);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.5,
  });
  const base = new THREE.Mesh(baseGeom, baseMat);
  group.add(base);

  return group;
}

/**
 * Creates Rooftop Solar Canopy structure.
 */
export function createSolarCanopy(width: number, length: number): THREE.Group {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.4,
    metalness: 0.8,
  });

  // Cantilever Support Columns
  const postGeom = new THREE.CylinderGeometry(0.14, 0.14, 3.2, 12);
  postGeom.translate(0, 1.6, 0);
  const post1 = new THREE.Mesh(postGeom, steelMat);
  post1.position.set(-width / 3, 0, 0);
  const post2 = new THREE.Mesh(postGeom, steelMat);
  post2.position.set(width / 3, 0, 0);
  group.add(post1, post2);

  // Tilted Canopy Frame
  const frameGeom = new THREE.BoxGeometry(width, 0.1, length);
  frameGeom.rotateX(0.12);
  frameGeom.translate(0, 3.2, 0);

  const solarTexture = createSolarCellTexture();
  const solarMat = new THREE.MeshStandardMaterial({
    map: solarTexture,
    roughness: 0.2,
    metalness: 0.7,
  });
  const frame = new THREE.Mesh(frameGeom, solarMat);
  frame.castShadow = true;
  group.add(frame);

  return group;
}
