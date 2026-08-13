import Phaser from 'phaser';
import { GameStateStore } from './GameState';

const WIDTH = 480;
const HEIGHT = 800;
const GROUND_Y = 735;
const BIRD_X = 142;
const BIRD_RADIUS = 15;
const PIPE_WIDTH = 76;
const PIPE_GAP = 225;
const PIPE_SPEED = 165;
const GRAVITY = 860;
const FLAP_VELOCITY = -365;
const MAX_FALL_SPEED = 520;

type GameStateView = { phase: string; score: number; bestScore: number };

interface PipePair {
  top: Phaser.GameObjects.Rectangle;
  bottom: Phaser.GameObjects.Rectangle;
  topCap: Phaser.GameObjects.Rectangle;
  bottomCap: Phaser.GameObjects.Rectangle;
  topHeight: number;
  bottomY: number;
  scored: boolean;
}

export class KurdiBirdScene extends Phaser.Scene {
  private birdBody!: Phaser.GameObjects.Ellipse;
  private birdVisual!: Phaser.GameObjects.Container;
  private wing!: Phaser.GameObjects.Container;
  private beak!: Phaser.GameObjects.Triangle;
  private pipes!: Phaser.GameObjects.Group;
  private pipePairs: PipePair[] = [];
  private state = new GameStateStore();
  private nextPipeAt = 0;
  private readonly onStateChange?: (state: GameStateView) => void;

  constructor(onStateChange?: (state: GameStateView) => void) {
    super('game');
    this.onStateChange = onStateChange;
  }

  create(): void {
    this.createWorld();
    this.createBird();
    this.pipes = this.add.group();

    this.input.on('pointerdown', () => this.flap());
    this.input.keyboard?.on('keydown-SPACE', (event: KeyboardEvent) => {
      event.preventDefault();
      this.flap();
    });

    this.time.delayedCall(300, () => this.emitState());
  }

  startRun(): void {
    this.state.start();
    this.clearPipes();
    this.birdBody.setPosition(BIRD_X, HEIGHT * 0.48);
    this.birdVisual.setPosition(BIRD_X, HEIGHT * 0.48);
    this.birdVisual.rotation = 0;
    this.birdVisual.scale = 1;
    this.wing.rotation = -0.22;
    this.beak.scaleX = 1;

    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    body.reset(BIRD_X, HEIGHT * 0.48);
    body.setVelocity(0, 0);
    this.nextPipeAt = 1050;
    this.emitState();
  }

  update(time: number, delta: number): void {
    if (!this.birdBody?.body) return;

    this.birdVisual.setPosition(this.birdBody.x, this.birdBody.y);
    if (this.state.value.phase !== 'playing') {
      const idleBob = Math.sin(time / 240) * 4;
      this.birdVisual.y += idleBob;
      return;
    }

    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y > MAX_FALL_SPEED) body.setVelocityY(MAX_FALL_SPEED);
    this.birdVisual.rotation = Phaser.Math.Clamp(body.velocity.y / 820, -0.42, 0.7);
    this.beak.rotation = Phaser.Math.Clamp(body.velocity.y / 1600, -0.03, 0.12);

    if (time >= this.nextPipeAt) {
      this.spawnPipePair();
      this.nextPipeAt = time + Phaser.Math.Between(1400, 1750);
    }

    const moveX = (PIPE_SPEED * delta) / 1000;
    const birdLeft = this.birdBody.x - BIRD_RADIUS;
    const birdRight = this.birdBody.x + BIRD_RADIUS;
    const birdTop = this.birdBody.y - BIRD_RADIUS;
    const birdBottom = this.birdBody.y + BIRD_RADIUS;

    for (const pair of this.pipePairs) {
      pair.top.x -= moveX;
      pair.bottom.x -= moveX;
      pair.topCap.x -= moveX;
      pair.bottomCap.x -= moveX;

      const pipeLeft = pair.top.x - PIPE_WIDTH / 2;
      const pipeRight = pair.top.x + PIPE_WIDTH / 2;
      const capLeft = pair.topCap.x - (PIPE_WIDTH + 12) / 2;
      const capRight = pair.topCap.x + (PIPE_WIDTH + 12) / 2;

      const hitsHorizontalPipe = birdRight > pipeLeft && birdLeft < pipeRight;
      const hitsHorizontalCap = birdRight > capLeft && birdLeft < capRight;
      const hitsTop = birdTop < pair.topHeight;
      const hitsBottom = birdBottom > pair.bottomY;

      if ((hitsHorizontalPipe || hitsHorizontalCap) && (hitsTop || hitsBottom)) {
        this.endRun();
        break;
      }

      if (!pair.scored && pipeRight <= this.birdBody.x) {
        pair.scored = true;
        this.state.scorePoint();
        this.emitState();
        this.flashScore();
      }
    }

    this.pipePairs = this.pipePairs.filter((pair) => {
      if (pair.top.x < -PIPE_WIDTH - 50) {
        pair.top.destroy();
        pair.bottom.destroy();
        pair.topCap.destroy();
        pair.bottomCap.destroy();
        return false;
      }
      return true;
    });

    if (this.birdBody.y > GROUND_Y - BIRD_RADIUS || this.birdBody.y < BIRD_RADIUS) {
      this.endRun();
    }
  }

  private createWorld(): void {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x83b7c9).setDepth(-10);
    this.add.circle(380, 145, 54, 0xf4c95d).setAlpha(0.9).setDepth(-9).setName('sun');

    const far = this.add.graphics().setDepth(-8);
    far.fillStyle(0x537d86, 1).beginPath();
    far.moveTo(0, 520);
    for (let x = 0; x <= WIDTH; x += 60) far.lineTo(x, 470 - Math.sin(x / 85) * 45);
    far.lineTo(WIDTH, 735).lineTo(0, 735).closePath().fillPath();

    const near = this.add.graphics().setDepth(-7);
    near.fillStyle(0x365d58, 1).beginPath();
    near.moveTo(0, 600);
    for (let x = 0; x <= WIDTH; x += 48) near.lineTo(x, 565 - Math.sin(x / 72) * 55);
    near.lineTo(WIDTH, 735).lineTo(0, 735).closePath().fillPath();

    this.add.rectangle(WIDTH / 2, GROUND_Y + 32, WIDTH, 64, 0x203b38).setDepth(2);
    this.add.rectangle(WIDTH / 2, GROUND_Y + 4, WIDTH, 8, 0xf4c95d).setDepth(3);
  }

  private createBird(): void {
    this.birdVisual = this.add.container(BIRD_X, HEIGHT * 0.48).setDepth(5);

    // Bold concept: clean golden body, large expressive eye, strong red wing,
    // small green accent, and one subtle textile-inspired diamond motif.
    const tailGold = this.add.ellipse(-20, 5, 22, 15, 0xe1ad39)
      .setRotation(-0.05)
      .setStrokeStyle(2, 0x8f6c18);
    const tailRed = this.add.triangle(-28, 2, 0, 7, -23, -4, -22, 18, 0xd94a4a)
      .setRotation(-0.02)
      .setStrokeStyle(1.5, 0x8d2b34);
    const tailGreen = this.add.triangle(-27, 10, 0, 6, -21, -4, -23, 16, 0x5c9b69)
      .setRotation(0.12)
      .setStrokeStyle(1.5, 0x365d40);

    const body = this.add.ellipse(0, 0, 48, 36, 0xf4c95d)
      .setStrokeStyle(3, 0x172b3a);

    this.wing = this.add.container(-9, 7).setSize(31, 38);
    const wingBack = this.add.ellipse(-3, 5, 26, 38, 0xb62f39)
      .setRotation(-0.1)
      .setStrokeStyle(2, 0x7a2230);
    const wingMid = this.add.ellipse(1, 0, 25, 34, 0xd94a4a)
      .setRotation(-0.15)
      .setStrokeStyle(2, 0x8d2b34);
    const wingFront = this.add.ellipse(5, -4, 22, 28, 0xe95b61)
      .setRotation(-0.18)
      .setStrokeStyle(2, 0x8d2b34);
    const wingAccent = this.add.ellipse(7, -1, 17, 11, 0x5c9b69)
      .setRotation(-0.15)
      .setStrokeStyle(1.5, 0x365d40);
    this.wing.add([wingBack, wingMid, wingFront, wingAccent]);

    const motif = this.add.container(-7, 11);
    const diamondOuter = this.add.polygon(0, 0, [0, -6, 8, 0, 0, 6, -8, 0], 0xd94a4a)
      .setStrokeStyle(1.5, 0x8d2b34);
    const diamondInner = this.add.polygon(0, 0, [0, -3, 4, 0, 0, 3, -4, 0], 0x5c9b69)
      .setStrokeStyle(1, 0x365d40);
    motif.add([diamondOuter, diamondInner]);

    const eyeRing = this.add.circle(14, -9, 7, 0xfff8e7)
      .setStrokeStyle(2, 0x172b3a);
    const pupil = this.add.circle(16, -9, 3.2, 0x172b3a);
    const eyeHighlight = this.add.circle(17, -10, 1.2, 0xffffff);

    this.beak = this.add.triangle(29, 1, 0, 0, 17, 7, 0, 14, 0xf4a84e)
      .setStrokeStyle(2, 0xb86f25)
      .setOrigin(0.15, 0.5);

    this.birdVisual.add([
      tailGold,
      tailRed,
      tailGreen,
      body,
      this.wing,
      motif,
      eyeRing,
      pupil,
      eyeHighlight,
      this.beak,
    ]);

    this.birdBody = this.add.ellipse(
      BIRD_X,
      HEIGHT * 0.48,
      BIRD_RADIUS * 2,
      BIRD_RADIUS * 2,
      0xffffff,
      0,
    ).setDepth(4);
    this.physics.add.existing(this.birdBody);
    const physicsBody = this.birdBody.body as Phaser.Physics.Arcade.Body;
    physicsBody
      .setCircle(BIRD_RADIUS)
      .setOffset(0, 0)
      .setAllowGravity(true)
      .setGravityY(GRAVITY)
      .setCollideWorldBounds(false);
  }

  private spawnPipePair(): void {
    const gapY = Phaser.Math.Between(305, 545);
    const topHeight = gapY - PIPE_GAP / 2;
    const bottomY = gapY + PIPE_GAP / 2;
    const bottomHeight = GROUND_Y - bottomY;
    const x = WIDTH + PIPE_WIDTH;

    const top = this.add.rectangle(x, topHeight / 2, PIPE_WIDTH, Math.max(40, topHeight), 0xb73b47)
      .setStrokeStyle(3, 0x7a2230)
      .setDepth(1);
    const bottom = this.add.rectangle(
      x,
      bottomY + bottomHeight / 2,
      PIPE_WIDTH,
      Math.max(40, bottomHeight),
      0xb73b47,
    ).setStrokeStyle(3, 0x7a2230).setDepth(1);

    const topCap = this.add.rectangle(x, topHeight - 3, PIPE_WIDTH + 12, 18, 0xf4c95d)
      .setStrokeStyle(2, 0x8a6a18)
      .setDepth(2);
    const bottomCap = this.add.rectangle(
      x,
      bottomY + 3,
      PIPE_WIDTH + 12,
      18,
      0xf4c95d,
    ).setStrokeStyle(2, 0x8a6a18).setDepth(2);

    this.pipes.addMultiple([top, bottom, topCap, bottomCap]);
    this.pipePairs.push({ top, bottom, topCap, bottomCap, topHeight, bottomY, scored: false });
  }

  private flap(): void {
    if (this.state.value.phase !== 'playing') return;

    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(FLAP_VELOCITY);

    this.tweens.killTweensOf(this.wing);
    this.tweens.killTweensOf(this.birdVisual);
    this.wing.rotation = -0.12;

    this.tweens.add({
      targets: this.wing,
      rotation: 0.68,
      duration: 85,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: this.birdVisual,
      scaleX: 1.05,
      scaleY: 0.96,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  private endRun(): void {
    if (this.state.value.phase !== 'playing') return;
    this.state.gameOver();
    this.emitState();
    this.cameras.main.shake(140, 0.008);
  }

  private clearPipes(): void {
    this.pipes?.clear(true, true);
    this.pipePairs = [];
  }

  private emitState(): void {
    const state = this.state.value;
    this.events.emit('state-changed', state);
    this.onStateChange?.(state);

    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best-score');
    const finalScoreEl = document.getElementById('final-score');
    const finalBestEl = document.getElementById('final-best');
    const menu = document.getElementById('menu');
    const gameOver = document.getElementById('game-over');
    const reset = document.getElementById('reset-button');

    if (scoreEl) scoreEl.textContent = String(state.score);
    if (bestEl) bestEl.textContent = String(state.bestScore);
    if (finalScoreEl) finalScoreEl.textContent = String(state.score);
    if (finalBestEl) finalBestEl.textContent = String(state.bestScore);

    if (state.phase === 'menu') {
      menu?.classList.remove('hidden');
      gameOver?.classList.add('hidden');
      reset?.classList.remove('visible');
    } else if (state.phase === 'playing') {
      menu?.classList.add('hidden');
      gameOver?.classList.add('hidden');
      reset?.classList.add('visible');
    } else {
      menu?.classList.add('hidden');
      gameOver?.classList.remove('hidden');
      reset?.classList.add('visible');
    }
  }

  private flashScore(): void {
    document.getElementById('score')?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
      { duration: 180 },
    );
  }
}

export { WIDTH, HEIGHT };
