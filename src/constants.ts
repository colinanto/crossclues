import { GameMetadata } from './types';

export const GRID_ROWS = ['A', 'B', 'C', 'D', 'E'];
export const GRID_COLS = ['1', '2', '3', '4', '5'];

export const INITIAL_GAME_METADATA: GameMetadata = {
  rows: {
    'A': 'CANE',
    'B': 'LETTERA',
    'C': 'AUTOMOBILE',
    'D': 'GIOCO',
    'E': 'LUNA'
  },
  cols: {
    '1': 'BEVANDA',
    '2': 'FILM',
    '3': 'MEZZO',
    '4': 'SPORT',
    '5': 'OROLOGIO'
  }
};
