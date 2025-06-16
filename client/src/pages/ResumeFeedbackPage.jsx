import React, { useContext } from 'react';
import { SuggestionsContext } from '../context/SuggestionsContext';
import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const ResumeFeedbackPage = () => {
  const { feedback } = useContext(SuggestionsContext);

  // Group feedback into sections
  const sections = {};

  if (feedback) {
    const lines = feedback.split('\n').map(line => line.trim()).filter(Boolean);
    let currentSection = null;

    for (const line of lines) {
      const sectionMatch = line.match(/^(\d+\.)?\s*(Summary|Work Experience|Skills|Education|Formatting|Overall Suggestions)/i);

      if (sectionMatch) {
        currentSection = sectionMatch[0].replace(/^(\d+\.)?\s*/, '').trim();
        sections[currentSection] = [];
      } else if (currentSection) {
        sections[currentSection].push(line);
      }
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-tertiary mb-6">Resume Feedback</h1>

      {!feedback ? (
        <div className="bg-white/10 border border-white/20 text-white p-6 rounded-lg flex items-center gap-4 shadow-inner">
          <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
          <p className="text-lg">
            No feedback found. Please upload your resume from the <strong>Home</strong> page.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(sections).map(([sectionTitle, points], idx) => (
            <div key={idx} className="bg-white p-5 rounded-md shadow border-l-4 border-tertiary">
              <h2 className="text-xl font-semibold text-tertiary mb-2">{sectionTitle}</h2>
              <ul className="list-disc list-inside space-y-1 text-gray-800">
                {points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumeFeedbackPage;
