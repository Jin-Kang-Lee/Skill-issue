import React, { useContext, useEffect, useState } from 'react';
import { SuggestionsContext } from '../context/SuggestionsContext';
import { ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';


//Helper function to calculate resume score
const calculateScore = (sections) => {
  const weights = {
    "Summary": 20,
    "Work Experience": 25,
    "Skills": 20,
    "Education": 15,
    "Formatting & Structure": 10,
    "Overall Suggestions": 10
  };

  let score = 0;
  let maxScore = 0;

  for (const [section, weight] of Object.entries(weights)) {
    maxScore += weight;
    const content = sections[section];
    if (content) {
      const hasMissing = content.some(line => line.toLowerCase().includes('missing'));
      const hasSuggestion = content.some(line => line.toLowerCase().includes('suggest'));

      if (!hasMissing) {
        score += weight;
      } else if (!hasSuggestion) {
        score += weight * 0.6;
      } else {
        score += weight * 0.4;
      }
    }
  }

  const percentage = Math.round((score / maxScore) * 100);
  return percentage;
};


//Helper function to breakdown section score
const getSectionBreakdown = (sections) => {
  const weights = {
    "Summary": 20,
    "Work Experience": 25,
    "Skills": 20,
    "Education": 15,
    "Formatting & Structure": 10,
    "Overall Suggestions": 10
  };

  const breakdown = [];

  for (const [section, weight] of Object.entries(weights)) {
    const content = sections[section] || [];
    const hasMissing = content.some(line => line.toLowerCase().includes('missing'));
    const hasSuggestion = content.some(line => line.toLowerCase().includes('suggest'));

    let score = 0;
    if (!hasMissing) {
      score = weight;
    } else if (!hasSuggestion) {
      score = weight * 0.6;
    } else {
      score = weight * 0.4;
    }

    breakdown.push({
      section,
      score,
      weight,
      percentage: Math.round((score / weight) * 100),
      status: !hasMissing ? 'strong' : (!hasSuggestion ? 'moderate' : 'weak')
    });
  }

  return breakdown;
};




const DonutChart = ({ percentage }) => {
  const radius = 60;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (percentage >= 80) return "#22c55e"; // green-500
    if (percentage >= 60) return "#facc15"; // yellow-400
    return "#ef4444"; // red-500
  };

  return (
    <svg height={radius * 2} width={radius * 2}>
      <circle
        stroke="#e5e7eb" // gray-200 bg ring
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke={getColor()}
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference + ' ' + circumference}
        style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
        transform={`rotate(-90 ${radius} ${radius})`}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="18"
        className="font-bold"
        fill={getColor()}
      >
        {percentage}%
      </text>
    </svg>
  );
};




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

  const readinessScore = calculateScore(parsedSections);
  const sectionBreakdown = getSectionBreakdown(parsedSections);


  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16 text-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <h2 className="text-4xl font-extrabold text-center mb-12 flex items-center justify-center gap-3">
          <DocumentTextIcon className="w-8 h-8 text-accent" />
          <span className="w-8 h-8 text-tertiary">Resume Insights</span>
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
            {/* Feedback - Left */}
            <div className="w-full lg:w-2/3 flex flex-col gap-8">
              {Object.entries(parsedSections).map(([sectionTitle, points], idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 rounded-2xl shadow-[0_3px_10px_rgb(0,0,0,0.06)] transition-all p-8 space-y-6"
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                      {sectionTitle}
                    </h3>
                    <span className="text-sm bg-accent/10 text-accent font-medium px-3 py-1 rounded-full">
                      Feedback
                    </span>
                  </div>

                  {/* Feedback List */}
                  <div className="space-y-5 text-[16px] text-gray-800 leading-relaxed">
                    <p className="text-base">
                      {points.map((point, i) => {
                        const raw = point.replace(/^-\s*/, '');
                        const labelMatch = raw.match(/^(Good|Missing.*|Suggestions?)[:：]/i);
                        const label = labelMatch?.[1] ?? '';
                        const description = raw.replace(/^(Good|Missing.*|Suggestions?)[:：]/i, '').trim();

                        const labelFormatted = (() => {
                          if (label.toLowerCase().startsWith('good')) return <strong className="text-green-700">Good:</strong>;
                          if (label.toLowerCase().startsWith('missing')) return <strong className="text-red-700">Missing:</strong>;
                          if (label.toLowerCase().startsWith('suggestion')) return <strong className="text-yellow-700">Suggestion:</strong>;
                          return <strong className="text-gray-700">{label}:</strong>;
                        })();

                        return (
                          <span key={i} className="block mb-3">
                            {labelFormatted} <span className="font-medium">{emphasizeKeywords(description)}</span>
                          </span>
                        );
                      })}
                    </p>
                  </div>

                </div>
              ))}
            </div>



            {/* Readiness Score - Right */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6 sticky top-28 h-fit">
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200 min-h-[320px]">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Resume Readiness</h3>

                <div className="flex justify-center mb-4">
                  <DonutChart percentage={readinessScore} />
                </div>

                <p className="text-base text-center text-gray-700 mb-2">
                  Your resume is <strong style={{ color: readinessScore >= 80 ? '#22c55e' : readinessScore >= 60 ? '#facc15' : '#ef4444' }}>{readinessScore}% ready</strong> for job applications.
                </p>

                <p className="text-sm text-gray-500 text-center italic mb-4">
                  {
                    readinessScore >= 80
                      ? "Looks solid! Just refine your wording and make sure it fits target job postings."
                      : readinessScore >= 60
                      ? "Decent progress. Strengthen weak sections and add more quantifiable achievements."
                      : "Needs work. Add missing sections and improve structure for stronger first impressions."
                  }
                </p>

                {/* 💡 New: Section Breakdown */}
                <div className="space-y-3 text-sm mt-4">
                  {sectionBreakdown.map(({ section, percentage, status }) => (
                    <div key={section} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{section}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        status === 'strong' ? 'bg-green-100 text-green-600' :
                        status === 'moderate' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)} ({percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
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
