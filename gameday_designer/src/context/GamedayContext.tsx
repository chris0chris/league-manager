import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GamedayContextType {
  gamedayName: string;
  setGamedayName: (name: string) => void;
}

const GamedayContext = createContext<GamedayContextType | undefined>(undefined);

export const GamedayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gamedayName, setGamedayName] = useState('');

  return (
    <GamedayContext.Provider value={{ gamedayName, setGamedayName }}>
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
