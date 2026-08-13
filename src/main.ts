import Phaser from 'phaser';
import { KurdiBirdScene, HEIGHT, WIDTH } from './game/KurdiBirdGameB';
import './styles.css';

const menu = document.getElementById('menu')!;
const gameOver = document.getElementById('game-over')!;
const score = document.getElementById('score')!;
const bestScore = document.getElementById('best-score')!;
const finalScore = document.getElementById('final-score')!;
const finalBest = document.getElementById('final-best')!;
const startButton = document.getElementById('start-button')!;
const restartButton = document.getElementById('restart-button')!;
const resetButton = document.getElementById('reset-button')!;

type GameStateView = { phase: string; score: number; bestScore: number };

const updateUI = (state: GameStateView): void => {
  score.textContent = String(state.score);
  bestScore.textContent = String(state.bestScore);
  finalScore.textContent = String(state.score);
  finalBest.textContent = String(state.bestScore);

  if (state.phase === 'menu') {
    menu.classList.remove('hidden');
    gameOver.classList.add('hidden');
    resetButton.classList.remove('visible');
  } else if (state.phase === 'playing') {
    menu.classList.add('hidden');
    gameOver.classList.add('hidden');
    resetButton.classList.add('visible');
  } else if (state.phase === 'gameover') {
    menu.classList.add('hidden');
    gameOver.classList.remove('hidden');
    resetButton.classList.add('visible');
  }
};

const scene = new KurdiBirdScene(updateUI);
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
  resetButton.classList.add('visible');
  scene.startRun();
};

startButton.addEventListener('click', begin);
restartButton.addEventListener('click', begin);
resetButton.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
  begin();
});

window.addEventListener('resize', () => game.scale.refresh());
