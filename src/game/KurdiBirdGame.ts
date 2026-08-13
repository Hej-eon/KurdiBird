import Phaser from 'phaser';
import { GameStateStore } from './GameState';

const WIDTH = 480;
const HEIGHT = 800;
const GROUND_Y = 735;
const BIRD_X = 142;
const BIRD_RADIUS = 15;
const PIPE_WIDTH = 76;
const PIPE_GAP = 215;
const PIPE_SPEED = 175;
const GRAVITY = 980;
const FLAP_VELOCITY = -350;

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
  private wing!: Phaser.GameObjects.Ellipse;
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
    this.wing.rotation = -0.25;
    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    body.reset(BIRD_X, HEIGHT * 0.48);
    body.setVelocity(0, 0);
    this.nextPipeAt = 900;
    this.emitState();
  }

  update(time: number, delta: number): void {
    if (!this.birdBody?.body) return;

    this.birdVisual.setPosition(this.birdBody.x, this.birdBody.y);
    if (this.state.value.phase !== 'playing') return;

    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    this.birdVisual.rotation = Phaser.Math.Clamp(body.velocity.y / 900, -0.35, 0.65);

    if (time >= this.nextPipeAt) {
      this.spawnPipePair();
      this.nextPipeAt = time + Phaser.Math.Between(1350, 1650);
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

    this.wing = this.add.ellipse(-7, 8, 25, 15, 0xd94a4a)
      .setRotation(-0.25)
      .setOrigin(0.9, 0.5);
    const body = this.add.ellipse(0, 0, 46, 34, 0xf4c95d).setStrokeStyle(3, 0x172b3a);
    const eye = this.add.circle(13, -8, 5, 0xfff8e7);
    const pupil = this.add.circle(15, -8, 2.5, 0x172b3a);
    const beak = this.add.triangle(29, 1, 0, 0, 16, 6, 0, 12, 0xf4a84e);
    const scarf = this.add.rectangle(-13, 11, 20, 7, 0x5c9b69).setRotation(-0.15);

    this.birdVisual.add([body, this.wing, eye, pupil, beak, scarf]);

    this.birdBody = this.add.ellipse(BIRD_X, HEIGHT * 0.48, BIRD_RADIUS * 2, BIRD_RADIUS * 2, 0xffffff, 0).setDepth(4);
    this.physics.add.existing(this.birdBody);
    const physicsBody = this.birdBody.body as Phaser.Physics.Arcade.Body;
    physicsBody
      .setCircle(BIRD_RADIUS)
      .setAllowGravity(true)
      .setGravityY(GRAVITY)
      .setCollideWorldBounds(false);
  }

  private spawnPipePair(): void {
    const gapY = Phaser.Math.Between(300, 550);
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
    this.wing.rotation = -0.1;
    this.tweens.add({
      targets: this.wing,
      rotation: 0.55,
      duration: 90,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: this.birdVisual,
      scaleX: 1.05,
      scaleY: 0.96,
      duration: 70,
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
