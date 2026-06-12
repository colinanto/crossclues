export type CoordinateValue = 'A' | 'B' | 'C' | 'D' | 'E' | '1' | '2' | '3' | '4' | '5';

export interface GameMetadata {
  rows: Record<string, string>;
  cols: Record<string, string>;
}

export interface PlayerClue {
  coordinate: string; // e.g. "A1"
  clue: string;
  authorId: string;
}

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
}

export interface LobbySettings {
  maxPlayers: number;
  timeLimit: number; // in minutes
}

export interface GameState {
  players: LobbyPlayer[];
  clues: PlayerClue[];
  currentTurn: number;
  settings: LobbySettings;
}
