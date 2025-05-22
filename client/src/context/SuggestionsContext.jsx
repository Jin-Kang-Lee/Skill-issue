import React, { createContext, useState } from 'react';

export const SuggestionsContext = createContext({
  suggestions: null,
  setSuggestions: () => {},
});

export const SuggestionsProvider = ({ children }) => {
  const [suggestions, setSuggestions] = useState(null);
  return (
    <SuggestionsContext.Provider value={{ suggestions, setSuggestions }}>
      {children}
    </SuggestionsContext.Provider>
  );
};
