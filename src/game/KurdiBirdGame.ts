import Phaser from 'phaser';
import { GameStateStore } from './GameState';

const WIDTH = 480;
const HEIGHT = 800;
const GROUND_Y = 735;
const BIRD_X = 142;
const PIPE_WIDTH = 74;
const PIPE_GAP = 190;
const PIPE_SPEED = 175;
const GRAVITY = 980;
const FLAP_VELOCITY = -350;

export class KurdiBirdScene extends Phaser.Scene {
  private bird!: Phaser.GameObjects.Container;
  private birdBody!: Phaser.GameObjects.Ellipse;
  private pipes!: Phaser.Physics.Arcade.Group;
  private scoreZone!: Phaser.Physics.Arcade.StaticGroup;
  private state = new GameStateStore();
  private nextPipeAt = 0;
  private lastScore = -1;
  private readonly pipeTextures = { top: 'pipe-top', bottom: 'pipe-bottom' };

  constructor() { super('game'); }

  create(): void {
    this.createTextures();
    this.createWorld();
    this.createBird();
    this.pipes = this.physics.add.group({ allowGravity: false, immovable: true });
    this.scoreZone = this.physics.add.staticGroup();

    this.physics.add.overlap(this.bird, this.pipes, () => this.endRun());
    this.physics.add.overlap(this.bird, this.scoreZone, (_bird, zone) => {
      const scored = zone as Phaser.GameObjects.GameObject & { scored?: boolean };
      if (!scored.scored) {
        scored.scored = true;
        this.state.scorePoint();
        this.emitState();
        this.flashScore();
      }
    });

    this.physics.world.setBoundsCollision(true, true, false, false);
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
    this.bird.setPosition(BIRD_X, HEIGHT * 0.48);
    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.nextPipeAt = 850;
    this.lastScore = -1;
    this.emitState();
  }

  update(time: number): void {
    this.paintSky(time);
    if (this.state.value.phase !== 'playing') return;

    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    this.bird.rotation = Phaser.Math.Clamp(body.velocity.y / 900, -0.35, 0.65);

    if (time >= this.nextPipeAt) {
      this.spawnPipePair();
      this.nextPipeAt = time + Phaser.Math.Between(1250, 1650);
    }

    this.pipes.children.each((child) => {
      const pipe = child as Phaser.GameObjects.Image;
      if (pipe.x < -PIPE_WIDTH - 20) pipe.destroy();
      return true;
    });

    this.scoreZone.children.each((child) => {
      const zone = child as Phaser.GameObjects.Rectangle;
      if (zone.x < -30) zone.destroy();
      return true;
    });

    if (this.bird.y > GROUND_Y - 20 || this.bird.y < 20) this.endRun();
  }

  private createWorld(): void {
    this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x83b7c9).setDepth(-10);
    this.add.rectangle(WIDTH / 2, 280, WIDTH, 260, 0xa9ced4).setDepth(-9);

    const far = this.add.graphics().setDepth(-8);
    far.fillStyle(0x537d86, 1);
    far.beginPath();
    far.moveTo(0, 520);
    for (let x = 0; x <= WIDTH; x += 60) far.lineTo(x, 470 - Math.sin(x / 85) * 45);
    far.lineTo(WIDTH, 735); far.lineTo(0, 735); far.closePath(); far.fillPath();

    const near = this.add.graphics().setDepth(-7);
    near.fillStyle(0x365d58, 1);
    near.beginPath();
    near.moveTo(0, 600);
    for (let x = 0; x <= WIDTH; x += 48) near.lineTo(x, 565 - Math.sin(x / 72) * 55);
    near.lineTo(WIDTH, 735); near.lineTo(0, 735); near.closePath(); near.fillPath();

    this.add.rectangle(WIDTH / 2, GROUND_Y + 32, WIDTH, 64, 0x203b38).setDepth(2);
    this.add.rectangle(WIDTH / 2, GROUND_Y + 4, WIDTH, 8, 0xf4c95d).setDepth(3);
  }

  private createBird(): void {
    this.bird = this.add.container(BIRD_X, HEIGHT * 0.48).setDepth(5);
    this.birdBody = this.add.ellipse(0, 0, 46, 34, 0xf4c95d).setStrokeStyle(3, 0x172b3a);
    const wing = this.add.ellipse(-3, 8, 24, 14, 0xd94a4a).setRotation(-0.3);
    const eye = this.add.circle(13, -8, 5, 0xfff8e7);
    const pupil = this.add.circle(15, -8, 2.5, 0x172b3a);
    const beak = this.add.triangle(29, 1, 0, 0, 16, 6, 0, 12, 0xf4a84e);
    const scarf = this.add.rectangle(-13, 11, 20, 7, 0x5c9b69).setRotation(-0.15);
    this.bird.add([this.birdBody, wing, eye, pupil, beak, scarf]);
    this.physics.add.existing(this.birdBody);
    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    body.setCircle(18, 5, -17).setAllowGravity(true).setGravityY(GRAVITY).setCollideWorldBounds(false);
  }

  private createTextures(): void {
    const makePipe = (key: string, capTop: boolean): void => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x365d58, 1);
      g.fillRoundedRect(8, capTop ? 0 : 18, PIPE_WIDTH - 16, 100, 7);
      g.fillStyle(0x5c9b69, 1);
      g.fillRoundedRect(0, capTop ? 0 : 10, PIPE_WIDTH, 22, 5);
      g.generateTexture(key, PIPE_WIDTH, 120);
      g.destroy();
    };
    makePipe(this.pipeTextures.top, true);
    makePipe(this.pipeTextures.bottom, false);
  }

  private spawnPipePair(): void {
    const gapY = Phaser.Math.Between(300, 570);
    const topHeight = gapY - PIPE_GAP / 2;
    const bottomHeight = GROUND_Y - (gapY + PIPE_GAP / 2);
    const x = WIDTH + PIPE_WIDTH;

    const top = this.pipes.create(x, topHeight / 2, this.pipeTextures.top) as Phaser.GameObjects.Image;
    top.setDisplaySize(PIPE_WIDTH, Math.max(40, topHeight));
    top.setData('kind', 'pipe');
    const topBody = top.body as Phaser.Physics.Arcade.Body;
    topBody.setAllowGravity(false).setImmovable(true);

    const bottom = this.pipes.create(x, gapY + PIPE_GAP / 2 + bottomHeight / 2, this.pipeTextures.bottom) as Phaser.GameObjects.Image;
    bottom.setDisplaySize(PIPE_WIDTH, Math.max(40, bottomHeight));
    const bottomBody = bottom.body as Phaser.Physics.Arcade.Body;
    bottomBody.setAllowGravity(false).setImmovable(true);

    this.physics.moveToX(top, -PIPE_SPEED, PIPE_SPEED);
    this.physics.moveToX(bottom, -PIPE_SPEED, PIPE_SPEED);

    const zone = this.add.rectangle(x + PIPE_WIDTH / 2 + 18, gapY, 20, PIPE_GAP, 0xffffff, 0);
    zone.setData('scored', false);
    (zone as Phaser.GameObjects.Rectangle & { scored?: boolean }).scored = false;
    this.physics.add.existing(zone, true);
    this.scoreZone.add(zone);
    this.physics.moveToX(zone, -PIPE_SPEED, PIPE_SPEED);
  }

  private flap(): void {
    if (this.state.value.phase !== 'playing') return;
    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(FLAP_VELOCITY);
    this.tweens.add({ targets: this.bird, scaleX: 1.08, scaleY: 0.94, duration: 70, yoyo: true });
  }

  private endRun(): void {
    if (this.state.value.phase !== 'playing') return;
    this.state.gameOver();
    this.emitState();
    this.cameras.main.shake(140, 0.008);
  }

  private clearPipes(): void {
    this.pipes?.clear(true, true);
    this.scoreZone?.clear(true, true);
  }

  private emitState(): void {
    this.events.emit('state-changed', this.state.value);
  }

  private flashScore(): void {
    const score = document.getElementById('score');
    score?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 180 });
  }

  private paintSky(time: number): void {
    const drift = Math.sin(time / 5000) * 8;
    this.children.getByName('sun')?.setX(370 + drift);
  }
}

export { WIDTH, HEIGHT };
