import React, { createContext, useContext, useState, ReactNode } from 'react';
import { NotificationType } from '../types/designer';

interface GamedayContextType {
  gamedayName: string;
  setGamedayName: (name: string) => void;
  onGenerateTournament: (() => void) | null;
  setOnGenerateTournament: (handler: (() => void) | null) => void;
  toolbarProps: {
    onImport: (json: unknown) => void;
    onExport: () => void;
    gamedayStatus?: string;
    onNotify: (message: string, type: NotificationType, title?: string) => void;
    canExport: boolean;
  } | null;
  setToolbarProps: (props: GamedayContextType['toolbarProps']) => void;
  isLocked: boolean;
  setIsLocked: (isLocked: boolean) => void;
}

const GamedayContext = createContext<GamedayContextType | undefined>(undefined);

export const GamedayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gamedayName, setGamedayName] = useState('');
  const [onGenerateTournament, setOnGenerateTournament] = useState<(() => void) | null>(null);
  const [toolbarProps, setToolbarProps] = useState<GamedayContextType['toolbarProps']>(null);
  const [isLocked, setIsLocked] = useState(false);

  return (
    <GamedayContext.Provider value={{ 
      gamedayName, 
      setGamedayName,
      onGenerateTournament,
      setOnGenerateTournament,
      toolbarProps,
      setToolbarProps,
      isLocked,
      setIsLocked
    }}>
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
