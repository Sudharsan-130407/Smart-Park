import * as THREE from 'three';

/**
 * Creates a procedural asphalt texture with subtle grit and painted parking stripes.
 */
export function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base asphalt dark slate
  ctx.fillStyle = '#1a1f29';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle noise / aggregate specks
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Add subtle road wear lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 4;
  for (let y = 100; y < canvas.height; y += 150) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates a high-contrast parking bay line and slot number texture.
 */
export function createBayDecalTexture(code: string, type: 'standard' | 'ev' | 'accessible' | 'vip' | 'compact'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Stripe color
  let stripeColor = '#ffffff';
  let badgeText = 'PARKING';
  if (type === 'ev') {
    stripeColor = '#06b6d4'; // cyan
    badgeText = '⚡ EV ONLY';
  } else if (type === 'accessible') {
    stripeColor = '#3b82f6'; // blue
    badgeText = '♿ ACCESSIBLE';
  } else if (type === 'vip') {
    stripeColor = '#f59e0b'; // amber
    badgeText = '★ VIP RESERVED';
  } else if (type === 'compact') {
    stripeColor = '#a855f7'; // purple
    badgeText = 'COMPACT';
  }

  // Draw stall boundary lines (U-shaped stall marking)
  ctx.strokeStyle = stripeColor;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(14, 500);
  ctx.lineTo(14, 20);
  ctx.lineTo(242, 20);
  ctx.lineTo(242, 500);
  ctx.stroke();

  // Draw Bay Code
  ctx.fillStyle = stripeColor;
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(code, 128, 90);

  // Draw type subtext badge
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(badgeText, 128, 145);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates a directional arrow canvas texture for lane wayfinding.
 */
export function createArrowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

  // Draw chevron arrow pointing up
  ctx.beginPath();
  ctx.moveTo(128, 40);
  ctx.lineTo(210, 140);
  ctx.lineTo(165, 140);
  ctx.lineTo(165, 210);
  ctx.lineTo(91, 210);
  ctx.lineTo(91, 140);
  ctx.lineTo(46, 140);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Generates solar cell grid texture for rooftop canopies.
 */
export function createSolarCellTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  const step = 32;
  for (let x = 0; x <= 256; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
