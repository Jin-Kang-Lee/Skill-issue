import React, { useContext } from 'react';
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
    <div className="min-h-screen bg-background text-white px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12 flex items-center justify-center gap-3">
          <DocumentTextIcon className="w-8 h-8 text-tertiary" />
          Resume Feedback
        </h2>

        {!feedback ? (
          <div className="bg-white/10 border border-white/20 text-white p-6 rounded-lg flex items-center gap-4 shadow-inner">
            <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
            <p className="text-lg">
              No feedback found. Please upload your resume from the <strong>Home</strong> page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(parsedSections).map(([sectionTitle, points], idx) => (
              <div
                key={idx}
                className="bg-background border border-white/10 hover:border-tertiary rounded-xl shadow-md p-0 overflow-hidden transition"
              >
                {/* Section Title Bar */}
                <div className="bg-tertiary/10 border-b border-tertiary px-4 py-3">
                  <h3 className="text-lg font-bold text-tertiary tracking-wide uppercase">
                    {sectionTitle}
                  </h3>
                </div>

                {/* Feedback Body */}
                <div className="px-5 py-4">
                  <ul className="list-disc list-inside space-y-3 text-gray-300 text-sm leading-relaxed">
                    {points.map((point, i) => (
                      <li key={i}>{emphasizeKeywords(point)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
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
      <strong key={i} className="text-white font-semibold">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

export default ResumeFeedbackPage;
