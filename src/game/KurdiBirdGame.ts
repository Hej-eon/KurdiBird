import Phaser from 'phaser';
import { GameStateStore } from './GameState';

const WIDTH = 480;
const HEIGHT = 800;
const GROUND_Y = 735;
const BIRD_X = 142;
const BIRD_RADIUS = 17;
const PIPE_WIDTH = 74;
const PIPE_GAP = 205;
const PIPE_SPEED = 175;
const GRAVITY = 980;
const FLAP_VELOCITY = -350;

export class KurdiBirdScene extends Phaser.Scene {
  private birdBody!: Phaser.GameObjects.Arc;
  private birdVisual!: Phaser.GameObjects.Container;
  private wing!: Phaser.GameObjects.Ellipse;
  private pipes!: Phaser.Physics.Arcade.Group;
  private scoreZone!: Phaser.Physics.Arcade.Group;
  private state = new GameStateStore();
  private nextPipeAt = 0;
  private readonly pipeTextures = { top: 'pipe-top', bottom: 'pipe-bottom' };

  constructor() {
    super('game');
  }

  create(): void {
    this.createTextures();
    this.createWorld();
    this.createBird();
    this.pipes = this.physics.add.group({ allowGravity: false, immovable: true });
    this.scoreZone = this.physics.add.group({ allowGravity: false, immovable: true });

    this.physics.add.overlap(this.birdBody, this.pipes, () => this.endRun());
    this.physics.add.overlap(this.birdBody, this.scoreZone, (_bird, zone) => {
      const scoreObject = zone as Phaser.GameObjects.GameObject;
      if (!scoreObject.getData('scored')) {
        scoreObject.setData('scored', true);
        this.state.scorePoint();
        this.emitState();
        this.flashScore();
      }
    });

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
    (this.birdBody.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    this.nextPipeAt = 900;
    this.emitState();
  }

  update(time: number): void {
    if (!this.birdBody?.body) return;
    this.birdVisual.setPosition(this.birdBody.x, this.birdBody.y);
    if (this.state.value.phase !== 'playing') return;

    const body = this.birdBody.body as Phaser.Physics.Arcade.Body;
    this.birdVisual.rotation = Phaser.Math.Clamp(body.velocity.y / 900, -0.35, 0.65);

    if (time >= this.nextPipeAt) {
      this.spawnPipePair();
      this.nextPipeAt = time + Phaser.Math.Between(1350, 1650);
    }

    this.pipes.children.each((child) => {
      const pipe = child as Phaser.GameObjects.Image;
      if (pipe.x < -PIPE_WIDTH - 30) pipe.destroy();
      return true;
    });

    this.scoreZone.children.each((child) => {
      const zone = child as Phaser.GameObjects.Rectangle;
      if (zone.x < -40) zone.destroy();
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

    this.birdBody = this.add.arc(BIRD_X, HEIGHT * 0.48, BIRD_RADIUS * 2, BIRD_RADIUS * 2, 0, 360, false, 0xffffff, 0).setDepth(4);
    this.physics.add.existing(this.birdBody);
    const physicsBody = this.birdBody.body as Phaser.Physics.Arcade.Body;
    physicsBody
      .setCircle(BIRD_RADIUS)
      .setAllowGravity(true)
      .setGravityY(GRAVITY)
      .setCollideWorldBounds(false);
  }

  private createTextures(): void {
    const makePipe = (key: string, capTop: boolean): void => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x1d403b, 1);
      g.fillRoundedRect(8, 0, PIPE_WIDTH - 16, 120, 8);
      g.fillStyle(0x79b37a, 1);
      g.fillRoundedRect(0, capTop ? 0 : 10, PIPE_WIDTH, 24, 6);
      g.fillStyle(0xcde59a, 1);
      g.fillRoundedRect(10, capTop ? 4 : 14, 10, 14, 3);
      g.generateTexture(key, PIPE_WIDTH, 120);
      g.destroy();
    };

    makePipe(this.pipeTextures.top, true);
    makePipe(this.pipeTextures.bottom, false);
  }

  private spawnPipePair(): void {
    const gapY = Phaser.Math.Between(285, 565);
    const topHeight = gapY - PIPE_GAP / 2;
    const bottomHeight = GROUND_Y - (gapY + PIPE_GAP / 2);
    const x = WIDTH + PIPE_WIDTH;

    const top = this.pipes.create(x, topHeight / 2, this.pipeTextures.top) as Phaser.GameObjects.Image;
    top.setDisplaySize(PIPE_WIDTH, Math.max(40, topHeight));
    const topBody = top.body as Phaser.Physics.Arcade.Body;
    topBody.setSize(PIPE_WIDTH, Math.max(40, topHeight), true);
    topBody.setAllowGravity(false).setImmovable(true).setVelocityX(-PIPE_SPEED);

    const bottom = this.pipes.create(
      x,
      gapY + PIPE_GAP / 2 + bottomHeight / 2,
      this.pipeTextures.bottom,
    ) as Phaser.GameObjects.Image;
    bottom.setDisplaySize(PIPE_WIDTH, Math.max(40, bottomHeight));
    const bottomBody = bottom.body as Phaser.Physics.Arcade.Body;
    bottomBody.setSize(PIPE_WIDTH, Math.max(40, bottomHeight), true);
    bottomBody.setAllowGravity(false).setImmovable(true).setVelocityX(-PIPE_SPEED);

    const zone = this.add.rectangle(x + PIPE_WIDTH / 2, gapY, 24, PIPE_GAP, 0xffffff, 0);
    zone.setData('scored', false);
    this.physics.add.existing(zone);
    const zoneBody = zone.body as Phaser.Physics.Arcade.Body;
    zoneBody.setSize(24, PIPE_GAP, true);
    zoneBody.setAllowGravity(false).setImmovable(true).setVelocityX(-PIPE_SPEED);
    this.scoreZone.add(zone);
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
    this.scoreZone?.clear(true, true);
  }

  private emitState(): void {
    this.events.emit('state-changed', this.state.value);
  }

  private flashScore(): void {
    document.getElementById('score')?.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }],
      { duration: 180 },
    );
  }
}

export { WIDTH, HEIGHT };
