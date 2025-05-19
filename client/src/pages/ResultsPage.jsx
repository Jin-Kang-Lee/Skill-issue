import React from 'react';
import { useLocation } from 'react-router-dom';

function ResultsPage() {
  const location = useLocation();
  const suggestions = location.state?.suggestions;

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-8">
      <h2 className="text-3xl font-bold text-blue-600 mb-4">Suggested Job Roles</h2>
      {suggestions ? (
        <div className="text-gray-700 whitespace-pre-line max-w-2xl">
          {suggestions}
        </div>
      ) : (
        <p className="text-gray-600 text-center">
          No suggestions available. Please upload your resume or enter your skills to get suggestions.
        </p>
      )}
    </div>
  );
}

export default ResultsPage;
