import Phaser from 'phaser';
import { KurdiBirdScene, HEIGHT, WIDTH } from './game/KurdiBirdGame';
import './styles.css';

const menu = document.getElementById('menu')!;
const gameOver = document.getElementById('game-over')!;
const score = document.getElementById('score')!;
const bestScore = document.getElementById('best-score')!;
const finalScore = document.getElementById('final-score')!;
const finalBest = document.getElementById('final-best')!;
const startButton = document.getElementById('start-button')!;
const restartButton = document.getElementById('restart-button')!;

const scene = new KurdiBirdScene();
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#83b7c9',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT,
  },
  render: { antialias: true, pixelArt: false, roundPixels: true },
  scene,
});

const begin = (): void => {
  menu.classList.add('hidden');
  gameOver.classList.add('hidden');
  scene.startRun();
};

startButton.addEventListener('click', begin);
restartButton.addEventListener('click', begin);

scene.events.on('state-changed', (state: { phase: string; score: number; bestScore: number }) => {
  score.textContent = String(state.score);
  bestScore.textContent = String(state.bestScore);
  finalScore.textContent = String(state.score);
  finalBest.textContent = String(state.bestScore);

  if (state.phase === 'menu') {
    menu.classList.remove('hidden');
    gameOver.classList.add('hidden');
  } else if (state.phase === 'playing') {
    menu.classList.add('hidden');
    gameOver.classList.add('hidden');
  } else if (state.phase === 'gameover') {
    gameOver.classList.remove('hidden');
  }
});

window.addEventListener('resize', () => game.scale.refresh());
