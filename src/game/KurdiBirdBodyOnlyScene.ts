import Phaser from 'phaser';
import { KurdiBirdLayeredScene } from './KurdiBirdLayeredScene';

export class KurdiBirdBodyOnlyScene extends KurdiBirdLayeredScene {
  preload(): void {
    super.preload();
    this.load.svg('kurdi-body-only', 'assets/kurdi-bird-body-bonly.svg', { width: 160, height: 100 });
  }

  create(): void {
    super.create();

    for (const child of this.children.list) {
      const image = child as Phaser.GameObjects.Image;
      const textureKey = image.texture?.key ?? '';
      if (textureKey === 'kurdi-body-layer') {
        image.setTexture('kurdi-body-only');
      }
      if (textureKey.startsWith('kurdi-wing-')) {
        image.setVisible(false);
      }
    }
  }
}

export { WIDTH, HEIGHT } from './KurdiBirdLayeredScene';
