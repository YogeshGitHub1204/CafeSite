import * as THREE from 'three';

function finalizeTexture(
  canvas: HTMLCanvasElement,
  renderer: THREE.WebGLRenderer,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

export function createTerrazzoTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e7e1d8';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle tile grid lines
  ctx.strokeStyle = 'rgba(120, 113, 108, 0.14)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Deterministic mineral flecks
  const flecks = ['#c8bfb2', '#a8a29e', '#78716c', '#d6ccc2', '#9a6b48'];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 650; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const r = 1 + rand() * 3.8;
    ctx.fillStyle = flecks[Math.floor(rand() * flecks.length)];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + r, y + r * 0.4);
    ctx.lineTo(x + r * 0.3, y + r * 1.1);
    ctx.closePath();
    ctx.fill();
  }

  return finalizeTexture(canvas, renderer, 4, 4);
}

export function createWoodGrainTexture(
  renderer: THREE.WebGLRenderer,
  baseHex = '#6e4a32',
  grainHex = '#4b301e'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = grainHex;
  ctx.globalAlpha = 0.28;
  for (let y = 0; y < 512; y += 5) {
    ctx.lineWidth = 1 + (y % 3) * 0.7;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      const wave = Math.sin(x * 0.02 + y * 0.08) * 3.5;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return finalizeTexture(canvas, renderer, 2, 2);
}

export function createPlasterTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ece7df';
  ctx.fillRect(0, 0, 512, 512);

  let seed = 99;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 420; i++) {
    const x = rand() * 512;
    const y = rand() * 512;
    const rad = 12 + rand() * 38;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, rand() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(160,150,138,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  return finalizeTexture(canvas, renderer, 2, 1);
}

export function createLatteArtTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Rich crema base
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 124);
  grad.addColorStop(0, '#c08552');
  grad.addColorStop(0.7, '#9c6234');
  grad.addColorStop(1, '#71401b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Microfoam rosetta leaves
  ctx.fillStyle = '#f6efe6';
  for (let i = 0; i < 5; i++) {
    const y = 166 - i * 22;
    const w = 44 - i * 6;
    ctx.beginPath();
    ctx.ellipse(128 - w * 0.45, y, w * 0.52, 9, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(128 + w * 0.45, y, w * 0.52, 9, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  // Heart crown & stem
  ctx.beginPath();
  ctx.arc(128, 66, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f6efe6';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(128, 56);
  ctx.lineTo(128, 186);
  ctx.stroke();

  return finalizeTexture(canvas, renderer, 1, 1);
}

export function createCoffeeBagLabelTexture(
  renderer: THREE.WebGLRenderer,
  variant: 'obsidian' | 'linen'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  const isDark = variant === 'obsidian';
  ctx.fillStyle = isDark ? '#1c1917' : '#e4dacb';
  ctx.fillRect(0, 0, 256, 384);

  ctx.strokeStyle = isDark ? '#b98349' : '#574c41';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 24, 216, 336);

  ctx.fillStyle = isDark ? '#e6c391' : '#292524';
  ctx.textAlign = 'center';
  ctx.font = '600 22px Georgia, serif';
  ctx.fillText('AURORA', 128, 112);

  ctx.font = '500 13px sans-serif';
  ctx.fillText('ROASTERS', 128, 134);

  ctx.fillStyle = isDark ? '#d6d3d1' : '#44403c';
  ctx.font = '600 17px sans-serif';
  ctx.fillText(isDark ? 'OBSIDIAN' : 'LINEN', 128, 206);

  ctx.font = '400 12px monospace';
  ctx.fillText(isDark ? 'ESPRESSO BLEND' : 'ETHIOPIA HALO', 128, 232);
  ctx.fillText('250G · WHOLE BEAN', 128, 296);

  return finalizeTexture(canvas, renderer, 1, 1);
}

export function createMenuBoardTexture(
  renderer: THREE.WebGLRenderer,
  roastNote: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = '#a87c4f';
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 14, 484, 228);

  ctx.fillStyle = '#f5efe6';
  ctx.font = '600 26px Georgia, serif';
  ctx.fillText('AURORA ROASTERS', 38, 62);

  ctx.fillStyle = '#c99762';
  ctx.font = '500 14px monospace';
  ctx.fillText('TODAY ON BAR & ROASTERY', 38, 92);

  ctx.fillStyle = '#e7e5e4';
  ctx.font = '400 15px sans-serif';
  ctx.fillText('House Brass Cortado ............... $5.50', 38, 134);
  ctx.fillText('Yirgacheffe Halo V60 .............. $7.50', 38, 162);
  ctx.fillText('Cardamom Brioche Knot ............. $5.75', 38, 190);

  ctx.fillStyle = '#a8a29e';
  ctx.font = '400 12px monospace';
  ctx.fillText(roastNote.slice(0, 54), 38, 224);

  return finalizeTexture(canvas, renderer, 1, 1);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(20, 16, 12, 0.42)');
  grad.addColorStop(0.6, 'rgba(20, 16, 12, 0.14)');
  grad.addColorStop(1, 'rgba(20, 16, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createVinylTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#141312';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle concentric grooves
  for (let r = 46; r < 122; r += 4) {
    ctx.strokeStyle = r % 8 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(128, 128, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Warm brass center label
  ctx.fillStyle = '#c58b47';
  ctx.beginPath();
  ctx.arc(128, 128, 38, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(128, 128, 6, 0, Math.PI * 2);
  ctx.fill();

  return finalizeTexture(canvas, renderer, 1, 1);
}

export function createTravelMugWrapTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#252321';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = '#c9924b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 118, 28, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#e7dfd4';
  ctx.textAlign = 'center';
  ctx.font = '600 18px Georgia, serif';
  ctx.fillText('AURORA', 128, 174);

  return finalizeTexture(canvas, renderer, 1, 1);
}

