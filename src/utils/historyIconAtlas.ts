import type { HistoryCategory } from '../types';

const ICON_SIZE = 128;
const CATEGORIES: HistoryCategory[] = [
  'war', 'empire', 'politics', 'religion',
  'exploration', 'trade', 'culture', 'revolution',
];

type IconMapping = Record<HistoryCategory, {
  x: number; y: number; width: number; height: number; anchorY: number;
}>;

// Distinct colors per category — chosen for contrast against tan/green map land
const CATEGORY_COLORS: Record<HistoryCategory, string> = {
  war:         '#DC2626', // red
  empire:      '#F59E0B', // amber/gold
  politics:    '#3B82F6', // blue
  religion:    '#A855F7', // purple
  exploration: '#06B6D4', // cyan
  trade:       '#22C55E', // green
  culture:     '#EC4899', // pink
  revolution:  '#EF4444', // bright red-orange
};

function drawIcon(ctx: CanvasRenderingContext2D, category: HistoryCategory, ox: number) {
  ctx.save();
  ctx.translate(ox, 0);
  // Draw at 2x scale (128px icons)
  ctx.scale(2, 2);
  const color = CATEGORY_COLORS[category];
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (category) {
    case 'war': // crossed swords
      drawWarIcon(ctx);
      break;

    case 'empire': // crown
      ctx.beginPath();
      ctx.moveTo(12, 44); ctx.lineTo(12, 22); ctx.lineTo(22, 32);
      ctx.lineTo(32, 14); ctx.lineTo(42, 32); ctx.lineTo(52, 22);
      ctx.lineTo(52, 44); ctx.closePath(); ctx.fill();
      ctx.fillRect(12, 44, 40, 6);
      ctx.beginPath(); ctx.arc(12, 21, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(32, 12, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(52, 21, 4, 0, Math.PI * 2); ctx.fill();
      break;

    case 'politics': // scales of justice
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(32, 10); ctx.lineTo(32, 48); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(13, 20); ctx.lineTo(51, 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7, 36); ctx.quadraticCurveTo(13, 22, 19, 36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7, 36); ctx.lineTo(19, 36); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(45, 32); ctx.quadraticCurveTo(51, 18, 57, 32); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(45, 32); ctx.lineTo(57, 32); ctx.stroke();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(24, 48); ctx.lineTo(40, 48); ctx.stroke();
      break;

    case 'religion': // christian cross
      drawReligionIcon(ctx);
      break;

    case 'exploration': // compass rose
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(32, 32, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(32, 12); ctx.lineTo(36, 28); ctx.lineTo(32, 24); ctx.lineTo(28, 28);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(32, 52); ctx.lineTo(28, 36); ctx.lineTo(32, 40); ctx.lineTo(36, 36);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(12, 32); ctx.lineTo(28, 28); ctx.lineTo(24, 32); ctx.lineTo(28, 36);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(52, 32); ctx.lineTo(36, 36); ctx.lineTo(40, 32); ctx.lineTo(36, 28);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(32, 32, 4, 0, Math.PI * 2); ctx.fill();
      break;

    case 'trade': // coin
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(32, 32, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(32, 32, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(38, 24); ctx.quadraticCurveTo(28, 22, 26, 28);
      ctx.quadraticCurveTo(24, 33, 32, 34);
      ctx.quadraticCurveTo(40, 35, 38, 40);
      ctx.quadraticCurveTo(36, 44, 26, 42);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(32, 20); ctx.lineTo(32, 46); ctx.stroke();
      break;

    case 'culture': // temple
      ctx.beginPath();
      ctx.moveTo(32, 8); ctx.lineTo(10, 22); ctx.lineTo(54, 22); ctx.closePath(); ctx.fill();
      ctx.fillRect(10, 20, 44, 4);
      for (const x of [14, 24, 35, 45]) {
        ctx.fillRect(x, 24, 5, 20);
      }
      ctx.fillRect(10, 44, 44, 5);
      break;

    case 'revolution': // torch
      roundRect(ctx, 27, 34, 10, 20, 3); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(32, 6);
      ctx.bezierCurveTo(26, 16, 20, 18, 22, 28);
      ctx.quadraticCurveTo(24, 34, 32, 28);
      ctx.quadraticCurveTo(40, 34, 42, 28);
      ctx.bezierCurveTo(44, 18, 38, 16, 32, 6);
      ctx.closePath(); ctx.fill();
      roundRect(ctx, 24, 32, 16, 5, 1.5); ctx.fill();
      break;
  }
  ctx.restore();
}

function drawWarIcon(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.translate(32, 32);
  drawSword(ctx, -Math.PI / 4);
  drawSword(ctx, Math.PI / 4);
  ctx.restore();

  ctx.save();
  ctx.translate(32, 31);
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.quadraticCurveTo(9.5, -9, 9.5, 0);
  ctx.quadraticCurveTo(9.5, 11.5, 0, 17);
  ctx.quadraticCurveTo(-9.5, 11.5, -9.5, 0);
  ctx.quadraticCurveTo(-9.5, -9, 0, -9);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -4.5);
  ctx.lineTo(0, 9);
  ctx.moveTo(-4.5, 2);
  ctx.lineTo(4.5, 2);
  ctx.stroke();
  ctx.restore();
}

function drawSword(ctx: CanvasRenderingContext2D, rotation: number) {
  ctx.save();
  ctx.rotate(rotation);

  ctx.beginPath();
  ctx.moveTo(-2.5, -24);
  ctx.lineTo(0, -30);
  ctx.lineTo(2.5, -24);
  ctx.lineTo(2.5, 10);
  ctx.lineTo(-2.5, 10);
  ctx.closePath();
  ctx.fill();

  roundRect(ctx, -9, 10, 18, 3.5, 1.5);
  ctx.fill();
  roundRect(ctx, -2.5, 13.5, 5, 11, 1.6);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 28, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawReligionIcon(ctx: CanvasRenderingContext2D) {
  // Keep this geometry aligned with src/assets/history-icons/religion.svg.
  ctx.save();
  drawCrossFilled(ctx, 32, 31, 26, 34, 44, 8, 10, 3.5);

  ctx.globalCompositeOperation = 'destination-out';
  drawCrossFilled(ctx, 32, 31, 26, 26, 36, 2, 4, 1.5);
  ctx.restore();
}

function drawCrossFilled(
  ctx: CanvasRenderingContext2D,
  cx: number,
  stemCenterY: number,
  armCenterY: number,
  armWidth: number,
  armHeight: number,
  verticalThickness: number,
  horizontalThickness: number,
  cornerRadius: number,
) {
  roundRect(
    ctx,
    cx - verticalThickness / 2,
    stemCenterY - armHeight / 2,
    verticalThickness,
    armHeight,
    cornerRadius,
  );
  ctx.fill();
  roundRect(
    ctx,
    cx - armWidth / 2,
    armCenterY - horizontalThickness / 2,
    armWidth,
    horizontalThickness,
    cornerRadius,
  );
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

let _cached: { atlasUrl: string; mapping: IconMapping } | null = null;

export function getHistoryIconAtlas(): { atlasUrl: string; mapping: IconMapping } {
  if (_cached) return _cached;

  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE * CATEGORIES.length;
  canvas.height = ICON_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const mapping: IconMapping = {} as IconMapping;
  CATEGORIES.forEach((cat, i) => {
    drawIcon(ctx, cat, i * ICON_SIZE);
    mapping[cat] = {
      x: i * ICON_SIZE,
      y: 0,
      width: ICON_SIZE,
      height: ICON_SIZE,
      anchorY: ICON_SIZE / 2,
    };
  });

  const atlasUrl = canvas.toDataURL('image/png');
  _cached = { atlasUrl, mapping };
  return _cached;
}
