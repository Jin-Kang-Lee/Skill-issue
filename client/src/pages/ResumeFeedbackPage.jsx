import React, { useContext, useEffect, useState } from 'react';
import { SuggestionsContext } from '../context/SuggestionsContext';
import { ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';


const ResumeFeedbackPage = () => {
  const { feedback } = useContext(SuggestionsContext);


  const parsedSections = React.useMemo(() => {
    const sections = {};
    if (feedback && feedback.trim()) {
      const lines = feedback.split('\n').map(line => line.trim()).filter(Boolean);
      let currentSection = null;
      for (const line of lines) {
        const sectionMatch = line.match(/^(\d+\.)?\s*(Summary|Work Experience|Skills|Education|Formatting(?: & Structure)?|Overall Suggestions)/i);
        if (sectionMatch) {
          currentSection = sectionMatch[0].replace(/^(\d+\.)?\s*/, '').trim();
          sections[currentSection] = [];
        } else if (currentSection) {
          if (!sections[currentSection]) sections[currentSection] = [];
          sections[currentSection].push(line);
        }
      }
    }
    return sections;
  }, [feedback]);


  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16 text-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-4xl font-extrabold text-center mb-12 flex items-center justify-center gap-3">
          <DocumentTextIcon className="w-8 h-8 text-accent" />
          <span className="text-accent">Resume Insights</span>
        </h2>

        {/* No Feedback Message */}
        {!feedback ? (
          <div className="bg-white border border-dashed border-gray-300 p-6 rounded-xl flex items-center gap-4 shadow-sm text-gray-700">
            <ExclamationTriangleIcon className="w-7 h-7 text-yellow-400" />
            <p className="text-base">
              <strong className="text-red-500">No feedback found.</strong> Please upload your resume from the <strong className="text-accent">Home</strong> page.
            </p>
          </div>
        ) : (
          // Feedback Grid
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Feedback - Right */}
            <div className="w-full lg:w-1/2 flex flex-col gap-6">
              {Object.entries(parsedSections).map(([sectionTitle, points], idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-100 rounded-2xl shadow-md hover:shadow-lg transition-all p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 tracking-wide">{sectionTitle}</h3>
                    <span className="text-xs bg-accent/10 text-accent font-semibold px-3 py-1 rounded-full">
                      Section Feedback
                    </span>
                  </div>
                  <ul className="list-disc list-inside space-y-3 text-sm text-gray-700 leading-relaxed">
                    {points.map((point, i) => (
                      <li key={i}><span className="font-medium">{emphasizeKeywords(point)}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

        )}
      </div>
    </div>
  );



};

// ✨ Bold common key terms
const emphasizeKeywords = (text) => {
  const keywords = [
    'should', 'consider', 'important', 'avoid', 'highlight',
    'recommended', 'lacks', 'strong', 'missing', 'ensure',
    'add', 'remove', 'improve'
  ];
  const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  return text.split(regex).map((part, i) =>
    keywords.includes(part.toLowerCase()) ? (
      <strong key={i} className="text-accent font-semibold">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};


export default ResumeFeedbackPage;
