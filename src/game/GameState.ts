export type GamePhase = 'menu' | 'playing' | 'gameover';

export interface GameState {
  phase: GamePhase;
  score: number;
  bestScore: number;
}

const STORAGE_KEY = 'kurdibird-best-score';

export class GameStateStore {
  private state: GameState = {
    phase: 'menu',
    score: 0,
    bestScore: Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10) || 0,
  };

  get value(): GameState { return { ...this.state }; }

  start(): void { this.state.phase = 'playing'; this.state.score = 0; }

  scorePoint(): void { this.state.score += 1; }

  gameOver(): void {
    this.state.phase = 'gameover';
    if (this.state.score > this.state.bestScore) {
      this.state.bestScore = this.state.score;
      localStorage.setItem(STORAGE_KEY, String(this.state.bestScore));
    }
  }

  menu(): void { this.state.phase = 'menu'; this.state.score = 0; }
}
