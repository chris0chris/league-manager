import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { NotificationType, GameResultsDisplay } from '../types/designer';

interface GamedayContextType {
  gamedayName: string;
  setGamedayName: (name: string) => void;
  onGenerateTournament: (() => void) | null;
  setOnGenerateTournament: (handler: (() => void) | null) => void;
  toolbarProps: {
    onImport: (json: unknown) => void;
    onExport: () => void;
    onExportTemplate?: () => void;
    gamedayStatus?: string;
    onNotify: (message: string, type: NotificationType, title?: string) => void;
    canExport: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    stats?: {
      fieldCount: number;
      gameCount: number;
      teamCount: number;
    };
  } | null;
  setToolbarProps: (props: GamedayContextType['toolbarProps']) => void;
  isLocked: boolean;
  setIsLocked: (isLocked: boolean) => void;
  resultsMode: boolean;
  setResultsMode: (mode: boolean) => void;
  gameResults: GameResultsDisplay[];
  setGameResults: (results: GameResultsDisplay[]) => void;
}

const GamedayContext = createContext<GamedayContextType | undefined>(undefined);

export const GamedayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gamedayName, setGamedayName] = useState('');
  const [onGenerateTournament, setOnGenerateTournamentInternal] = useState<(() => void) | null>(null);
  const [toolbarProps, setToolbarPropsInternal] = useState<GamedayContextType['toolbarProps']>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [resultsMode, setResultsMode] = useState(false);
  const [gameResults, setGameResultsInternal] = useState<GameResultsDisplay[]>([]);

  const setGamedayNameCb = useCallback((name: string) => setGamedayName(name), []);
  const setOnGenerateTournament = useCallback((handler: (() => void) | null) => setOnGenerateTournamentInternal(() => handler), []);
  const setToolbarProps = useCallback((props: GamedayContextType['toolbarProps']) => setToolbarPropsInternal(props), []);
  const setIsLockedCb = useCallback((locked: boolean) => setIsLocked(locked), []);
  const setGameResults = useCallback(
    (results: GameResultsDisplay[]) => setGameResultsInternal(results),
    []
  );

  const value = useMemo(() => ({ 
    gamedayName, 
    setGamedayName: setGamedayNameCb,
    onGenerateTournament,
    setOnGenerateTournament,
    toolbarProps,
    setToolbarProps,
    isLocked,
    setIsLocked: setIsLockedCb,
    resultsMode,
    setResultsMode,
    gameResults,
    setGameResults
  }), [gamedayName, setGamedayNameCb, onGenerateTournament, setOnGenerateTournament, toolbarProps, setToolbarProps, isLocked, setIsLockedCb, resultsMode, gameResults, setGameResults]);

  return (
    <GamedayContext.Provider value={value}>
      {children}
    </GamedayContext.Provider>
  );
};

export const useGamedayContext = () => {
  const context = useContext(GamedayContext);
  if (context === undefined) {
    throw new Error('useGamedayContext must be used within a GamedayProvider');
  }
  return context;
};
