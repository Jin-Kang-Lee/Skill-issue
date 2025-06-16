import { createContext, useState } from 'react';

export const SuggestionsContext = createContext();

export const SuggestionsProvider = ({ children }) => {
  const [suggestions, setSuggestions] = useState(null);
  const [feedback, setFeedback] = useState(null); // ✅ New

  return (
    <SuggestionsContext.Provider value={{ suggestions, setSuggestions, feedback, setFeedback }}>
      {children}
    </SuggestionsContext.Provider>
  );
};
