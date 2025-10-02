
export {};

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) throw new Error('Canvas element not found');
const ctx = canvas.getContext('2d')!;
let DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let cssW = window.innerWidth;let cssH = window.innerHeight;
let W = Math.round(cssW * DPR);let H = Math.round(cssH * DPR);
canvas.width = W;canvas.height = H;
canvas.style.width = cssW + 'px';
canvas.style.height = cssH + 'px';ctx.setTransform(DPR,0,0,DPR,0,0);

const palette = ['#ffffff', '#ffffff', '#ffffff', '#ffffff'];

type Particle = {
	x: number;
y: number;
	vx: number;
	vy: number;
	size: number;	color: string;
alpha: number;
targetX: number;
	targetY: number;
	settled: boolean;
friction: number;
};

let particles: Particle[] = [];
let targets: { x: number; y: number }[] = [];
let paused = false;

let phraseIndex = 0;
let holding = false;
let holdTimer = 0;
let lastTime = 0;
let speedFactor = 1;

function r(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

const gradientCache = new Map<string, CanvasPattern | CanvasGradient>();

function particleGradient(size: number, color: string) {
	const key = size + '|' + color;
	if (gradientCache.has(key)) return gradientCache.get(key)!;
	const g = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size);
	g.addColorStop(0, color);
	g.addColorStop(0.3, color);
	g.addColorStop(1, 'rgba(255,255,255,0)');
	gradientCache.set(key, g);
	return g;
}

function sampleTextToTargets(text: string) {
	const buf = document.createElement('canvas');
	const bctx = buf.getContext('2d')!;
	buf.width = cssW;
	buf.height = cssH;
	let fontSize = Math.floor(Math.min(cssW, cssH) * 0.22);
	if (text.length > 18) fontSize = Math.floor(fontSize * 0.6);
	bctx.clearRect(0, 0, buf.width, buf.height);
	bctx.fillStyle = '#000';
	bctx.textBaseline = 'middle';
	bctx.textAlign = 'center';
	bctx.font = `bold ${fontSize}px system-ui, -apple-system, 'Segoe UI', Roboto`;
	bctx.fillText(text, cssW / 2, cssH / 2);
	const data = bctx.getImageData(0, 0, buf.width, buf.height).data;
	const step = 4;
	const pts: { x: number; y: number }[] = [];
	for (let y = 0; y < buf.height; y += step) {
		for (let x = 0; x < buf.width; x += step) {
			const i = (y * buf.width + x) * 4 + 3;
			if (data[i] > 128) pts.push({ x, y });
		}
	}
	return pts;
}

function initFormation(phrase: string) {

	speedFactor = 1 + Math.min(phrase.length / 20, 2);
	targets = sampleTextToTargets(phrase);
	const baseMax = 2000;
	const maxTargets = Math.min(baseMax, targets.length);
	if (targets.length > maxTargets) {
		const sampled: { x: number; y: number }[] = [];
		const step = Math.floor(targets.length / maxTargets);
		for (let i = 0; i < targets.length; i += step) sampled.push(targets[i]);
		targets = sampled;
	}
	particles = [];
	for (let i = 0; i < targets.length; i++) {
		const t = targets[i];
		const size = r(0.8, 1.6);
		const color = palette[Math.floor(Math.random() * palette.length)];
			particles.push({
				x: r(0, cssW),
				y: r(0, cssH),
				vx: r(-0.5, 0.5),
				vy: r(-0.5, 0.5),
				size,
				color,
				alpha: 0,
				targetX: t.x + r(-0.3, 0.3),
				targetY: t.y + r(-0.3, 0.3),
				settled: false,
				friction: r(0.86, 0.94),
			});
	}
}

function drawParticle(p: Particle) {
	ctx.save();
	ctx.globalAlpha = Math.min(1, p.alpha * 1.1);
	ctx.translate(p.x, p.y);
	ctx.fillStyle = particleGradient(p.size * 1.6, '#ffffff') as CanvasGradient;
	ctx.beginPath();
	ctx.arc(0, 0, p.size * 1.3, 0, Math.PI * 2);
	ctx.fill();
	ctx.globalAlpha = p.alpha;
	ctx.fillStyle = particleGradient(p.size, p.color) as CanvasGradient;
	ctx.beginPath();
	ctx.arc(0, 0, p.size, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

let formationTimer = 0;

function drawBackground() {
	ctx.fillStyle = '#0f0f0f';
	ctx.fillRect(0, 0, cssW, cssH);
	const grd = ctx.createLinearGradient(0,0,0,cssH);
	grd.addColorStop(0, 'rgba(20,20,20,0.0)');
	grd.addColorStop(1, 'rgba(10,10,10,0.6)');
	ctx.fillStyle = grd;
	ctx.fillRect(0,0,cssW,cssH);
	// no central background image drawn (cover image displayed only in the player)
}

function step(time?: number) {
	if (!time) time = performance.now();
	const dt = lastTime ? (time - lastTime) / 1000 : 0.016;
	lastTime = time;
	ctx.clearRect(0, 0, W, H);
	drawBackground();
		formationTimer += dt * 1.2 * speedFactor;
		const attractionStrength = Math.min(1.6 * speedFactor, formationTimer);
	for (let i = particles.length - 1; i >= 0; i--) {
		const p = particles[i];
		const dx = p.targetX - p.x;
		const dy = p.targetY - p.y;
		const dist = Math.sqrt(dx * dx + dy * dy) + 0.0001;
		const acc = 0.16 * attractionStrength * speedFactor;
		p.vx += (dx / dist) * acc * (1 + Math.random() * 0.2);
		p.vy += (dy / dist) * acc * (1 + Math.random() * 0.2);
		p.vx *= p.friction;
		p.vy *= p.friction;
		p.x += p.vx;
		p.y += p.vy;
		const arrive = Math.max(0, 1 - dist / 20);
		p.alpha += 0.05 * (0.25 + arrive) * speedFactor;
		if (p.alpha > 1) p.alpha = 1;
			if (dist < 1.6) {
			p.settled = true;
			p.vx = p.vy = 0;
			p.x = p.targetX;
			p.y = p.targetY;
		}
		drawParticle(p);
	}

	if (particles.length) {
		const settledCount = particles.reduce((s, p) => s + (p.settled ? 1 : 0), 0);
		const ratio = settledCount / particles.length;
		if (!holding && ratio > 0.96) {
			holding = true;
			holdTimer = 0;
		}
		if (holding) {
			holdTimer += dt;
			if (holdTimer >= 4) {
				holding = false;
				holdTimer = 0;
				phraseIndex = (phraseIndex + 1) ;
				formationTimer = 0;
			}
		}
	}

	if (!paused) requestAnimationFrame(step);
}

window.addEventListener('resize', () => {
	DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
	cssW = window.innerWidth;
	cssH = window.innerHeight;
	W = Math.round(cssW * DPR);
	H = Math.round(cssH * DPR);
	if (canvas) {
		canvas.width = W;
		canvas.height = H;
		canvas.style.width = cssW + 'px';
		canvas.style.height = cssH + 'px';
		ctx.setTransform(DPR,0,0,DPR,0,0);
	}
});


(window as any).startAnimation = function () {
	if (!paused) return;
	paused = false;
	formationTimer = 0;
	lastTime = performance.now();
	step(lastTime);
};

step(performance.now());
