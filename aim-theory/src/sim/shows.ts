export type ShowId = "edge" | "swing" | "choice" | "isolate";

export function drawShow(ctx: CanvasRenderingContext2D, w: number, h: number, id: ShowId, beat: number, t: number): void {
  const u = Math.max(0, Math.min(1, t / 5.4));
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#17160f";
  ctx.fillRect(0, 0, w, h);
  if (id === "edge") drawEdge(ctx, w, h, beat, u);
  else if (id === "swing") drawSwing(ctx, w, h, beat, u);
  else if (id === "choice") drawChoice(ctx, w, h, beat, u);
  else drawIsolate(ctx, w, h, beat, u);
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.font = "600 13px Outfit, sans-serif";
  ctx.fillText(text, x, y);
}

function drawEdge(ctx: CanvasRenderingContext2D, w: number, h: number, beat: number, u: number): void {
  const title = beat === 0 ? "SLOW PEEK" : beat === 1 ? "WIDE SWING" : "YOU ARE HOLDING";
  label(ctx, title, 28, 36, "#f3ead7");
  const wallX = w * 0.46;
  ctx.fillStyle = "#3a3830";
  ctx.fillRect(wallX, 48, 18, h * 0.62);
  ctx.fillStyle = "#e2ff57";
  ctx.fillRect(wallX, h * 0.62, 18, 4);

  if (beat === 2) {
    const holderX = wallX + 70;
    const holderY = h * 0.42;
    const swingerX = wallX - 30 - (1 - ease(u)) * 160 + ease(u) * 20;
    person(ctx, holderX, holderY, "#9bb0c9", "YOU");
    person(ctx, swingerX, h * 0.7, "#f3ead7", "THEM");
    const seen = u > 0.55;
    tag(ctx, holderX - 10, holderY - 36, seen ? "YOU SEE THEM" : "NOT YET", seen ? "#d84a32" : "#8a8478");
    tag(ctx, swingerX - 20, h * 0.7 - 36, "THEY SEE YOU", "#2f9e6b");
    if (seen) shot(ctx, swingerX, h * 0.7, holderX, holderY);
    return;
  }

  const slow = beat === 0;
  const travel = slow ? ease(u) * 70 : ease(Math.min(1, u * 1.35)) * 210;
  const peekerX = wallX - 120 + travel;
  const peekerY = h * 0.72;
  const holderX = wallX + 78;
  const holderY = h * 0.4;
  person(ctx, holderX, holderY, "#9bb0c9", "HOLDER");
  ctx.strokeStyle = "rgba(155,176,201,0.8)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(holderX, holderY);
  ctx.lineTo(wallX + 8, h * 0.66);
  ctx.stroke();
  ctx.setLineDash([]);
  person(ctx, peekerX, peekerY, "#f3ead7", "YOU");
  const exposed = peekerX > wallX - 8;
  if (beat === 1 && exposed) {
    const ghostX = peekerX - 70;
    ctx.globalAlpha = 0.45;
    person(ctx, ghostX, peekerY, "#d84a32", "THEIR VIEW");
    ctx.globalAlpha = 1;
  }
  if (exposed && beat === 0) {
    tag(ctx, peekerX - 30, peekerY - 34, "YOU SEE THEM", "#2f9e6b");
    tag(ctx, holderX - 20, holderY - 34, "THEY SEE YOU", "#d84a32");
    shot(ctx, holderX, holderY, peekerX, peekerY);
  }
  if (exposed && beat === 1) {
    tag(ctx, peekerX - 10, peekerY - 34, "YOU SEE THEM", "#2f9e6b");
    if (u > 0.62) tag(ctx, holderX - 30, holderY - 34, "THEY SEE YOU, LATE", "#d84a32");
    else tag(ctx, holderX - 30, holderY - 34, "STILL ON THE EDGE", "#8a8478");
    if (u > 0.48) shot(ctx, peekerX, peekerY, holderX, holderY);
  }
}

function drawSwing(ctx: CanvasRenderingContext2D, w: number, h: number, beat: number, u: number): void {
  label(ctx, beat === 0 ? "CROSSHAIR ON THE WALL" : "CROSSHAIR ON THE HEAD", 28, 36, "#f3ead7");
  const edge = w * 0.42;
  ctx.fillStyle = "#3a3830";
  ctx.fillRect(0, 40, edge, h - 80);
  ctx.fillStyle = "#e2ff57";
  ctx.fillRect(edge - 3, 40, 3, h - 80);
  const open = ease(u);
  const headX = edge + 36 + open * 80;
  const headY = h * 0.46;
  ctx.beginPath();
  ctx.fillStyle = "#f4efe4";
  ctx.arc(headX, headY, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1a1814";
  ctx.beginPath();
  ctx.arc(headX, headY, 4, 0, Math.PI * 2);
  ctx.fill();
  const crossX = beat === 0 ? edge - 18 : headX;
  const crossY = beat === 0 ? headY + 30 : headY;
  cross(ctx, crossX, crossY, beat === 0 ? "#d84a32" : "#f4f1e8");
  if (beat === 0 && u > 0.55) {
    tag(ctx, edge + 20, h * 0.72, "NOW YOU HAVE TO FLICK", "#d84a32");
  }
  if (beat === 1 && u > 0.62) {
    tag(ctx, edge + 24, h * 0.72, "STOP. THEN SHOOT.", "#2f9e6b");
    ctx.strokeStyle = "#2f9e6b";
    ctx.beginPath();
    ctx.arc(headX, headY, 26, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawChoice(ctx: CanvasRenderingContext2D, w: number, h: number, beat: number, u: number): void {
  label(ctx, beat === 0 ? "WIDE SWING — TAKE THE FIGHT" : "JIGGLE — LOOK, THEN LEAVE", 28, 36, "#f3ead7");
  const wallX = w * 0.4;
  ctx.fillStyle = "#3a3830";
  ctx.fillRect(wallX, 50, w * 0.46, 22);
  const e = ease(beat === 0 ? u : u < 0.5 ? u * 2 : (1 - u) * 2);
  const x = wallX - 40 + e * (beat === 0 ? 180 : 70);
  const y = 72 + e * 20;
  person(ctx, x, y + 80, "#f3ead7", "YOU");
  person(ctx, wallX + 120, 150, "#9bb0c9", "HOLDER");
  if (beat === 0 && u > 0.55) shot(ctx, x, y + 80, wallX + 120, 150);
  if (beat === 1 && u > 0.45 && u < 0.75) tag(ctx, x - 10, y + 40, "SEEN", "#2f9e6b");
  if (beat === 1 && u > 0.8) tag(ctx, wallX - 120, h * 0.78, "BACK IN COVER", "#f3ead7");
}

function drawIsolate(ctx: CanvasRenderingContext2D, w: number, h: number, beat: number, u: number): void {
  label(ctx, beat === 0 ? "BOTH ANGLES OPEN" : "ONE ANGLE AT A TIME", 28, 36, "#f3ead7");
  ctx.fillStyle = "#3a3830";
  ctx.fillRect(w * 0.28, 70, 16, h * 0.55);
  ctx.fillRect(w * 0.58, 70, 16, h * 0.55);
  const youX = beat === 0 ? w * 0.72 : w * 0.4 + ease(u) * 30;
  const youY = h * 0.78;
  person(ctx, youX, youY, "#f3ead7", "YOU");
  person(ctx, w * 0.4, h * 0.28, "#9bb0c9", "NEAR");
  person(ctx, w * 0.74, h * 0.28, "#c9a89b", "FAR");
  if (beat === 0) {
    wedge(ctx, w * 0.4, h * 0.28, youX, youY, "#d84a32");
    wedge(ctx, w * 0.74, h * 0.28, youX, youY, "#d84a32");
    tag(ctx, w * 0.48, h * 0.5, "BOTH CAN SHOOT", "#d84a32");
  } else {
    wedge(ctx, w * 0.4, h * 0.28, youX, youY, "#2f9e6b");
    tag(ctx, w * 0.62, h * 0.48, "FAR ANGLE STILL CLOSED", "#f3ead7");
  }
}

function person(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, name: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 7, y + 12, 14, 22);
  ctx.fillStyle = "#8a8478";
  ctx.font = "500 11px Outfit, sans-serif";
  ctx.fillText(name, x - 18, y + 48);
}

function tag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string): void {
  ctx.fillStyle = color;
  ctx.font = "600 12px Outfit, sans-serif";
  ctx.fillText(text, x, y);
}

function shot(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.strokeStyle = "#e2ff57";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function cross(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x - 4, y);
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + 12, y);
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y - 4);
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x, y + 12);
  ctx.stroke();
}

function wedge(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function ease(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
