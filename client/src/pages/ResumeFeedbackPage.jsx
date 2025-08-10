import React, { useContext, useEffect, useState } from 'react';
import { SuggestionsContext } from '../context/SuggestionsContext';
import { ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';


const POSITIVE_KEYS = ['good', 'strong', 'clear', 'well', 'effective', 'concise', 'relevant'];
const ISSUE_KEYS    = ['missing', 'lack', 'lacks', 'incomplete', 'unclear', 'inconsistent', 'typo', 'weak', 'outdated'];
const ACTION_KEYS   = ['suggest', 'consider', 'recommend', 'improve', 'add', 'remove', 'quantify', 'revise', 'highlight'];

const stripLeadingMarks = (s) =>
  s.replace(/^[:\-\u2022•\s]+/, '')
   .replace(/^\s+/, '')
   .replace(/\s+$/, '');

const tidyPhrasing = (s) => {
  let t = s.replace(/^could\s+|^may\s+|^might\s+/i, '')
           .replace(/^it\s+(would|could)\s+be\s+better\s+to\s+/i, 'consider ')
           .replace(/\bfor example\b/gi, 'e.g.')
           .replace(/\s+/g, ' ')
           .trim();
  t = t.charAt(0).toUpperCase() + t.slice(1);
  t = t.replace(/[:;,.!?]{2,}$/g, m => m[0]);
  return t;
};

const classifyPoint = (raw) => {
  const txt = raw.toLowerCase();
  const hasPos   = POSITIVE_KEYS.some(k => txt.includes(k));
  const hasIssue = ISSUE_KEYS.some(k => txt.includes(k));
  const hasAct   = ACTION_KEYS.some(k => txt.includes(k));

  if (hasIssue)   return 'missing';
  if (hasAct)     return 'suggestion';
  if (hasPos)     return 'good';
  return 'neutral';
};

const cleanPoint = (line) => tidyPhrasing(stripLeadingMarks(line));

const calculateScore = (sections) => {
  const weights = {
    "Summary": 20,
    "Work Experience": 25,
    "Skills": 20,
    "Education": 15,
    "Formatting & Structure": 10,
    "Overall Suggestions": 10
  };

  let total = 0, max = 0;

  for (const [section, weight] of Object.entries(weights)) {
    max += weight;

    const points = (sections[section] || []).map(cleanPoint);
    if (points.length === 0) continue;

    const classes = points.map(classifyPoint);
    const positives = classes.filter(c => c === 'good').length;
    const issues    = classes.filter(c => c === 'missing').length;
    const actions   = classes.filter(c => c === 'suggestion').length;

    const denom = positives + issues + actions || 1;
    let ratio = positives / denom;
    if (issues > 0) ratio = Math.max(ratio - 0.25 * Math.min(issues, 2), 0);

    const hasHardMissing = points.some(p => /^summary\b.*missing/i.test(p) || /^missing\b/i.test(p));
    if (hasHardMissing && (section === 'Summary' || section === 'Education')) {
      ratio = Math.min(ratio, 0.3);
    }

    total += Math.round(weight * ratio);
  }

  return Math.max(0, Math.min(100, Math.round((total / max) * 100)));
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
    const points = (sections[section] || []).map(cleanPoint);
    if (points.length === 0) {
      breakdown.push({ section, score: 0, weight, percentage: 0, status: 'weak' });
      continue;
    }

    const classes = points.map(classifyPoint);
    const positives = classes.filter(c => c === 'good').length;
    const issues    = classes.filter(c => c === 'missing').length;
    const actions   = classes.filter(c => c === 'suggestion').length;

    const denom = positives + issues + actions || 1;
    let ratio = positives / denom;
    if (issues > 0) ratio = Math.max(ratio - 0.25 * Math.min(issues, 2), 0);

    const hasHardMissing = points.some(p => /^summary\b.*missing/i.test(p) || /^missing\b/i.test(p));
    if (hasHardMissing && (section === 'Summary' || section === 'Education')) {
      ratio = Math.min(ratio, 0.3);
    }

    const sectionScore = Math.round(weight * ratio);
    const pct = Math.round((sectionScore / weight) * 100);
    const status = pct >= 80 ? 'strong' : pct >= 60 ? 'moderate' : 'weak';

    breakdown.push({ section, score: sectionScore, weight, percentage: pct, status });
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
                    <ul className="space-y-3 text-[16px] text-gray-800 leading-relaxed list-disc list-inside">
                      {(() => {
                        // Rank: Good (0) → Missing (1) → Note/Neutral (2) → Suggestion (3)
                        const rankOf = (kind) => ({ good: 0, missing: 1, note: 2, neutral: 2, suggestion: 3 }[kind] ?? 2);

                        const ordered = points
                          .map((rawPoint) => {
                            const cleaned = cleanPoint(rawPoint);
                            const kind = classifyPoint(cleaned); // returns 'good' | 'missing' | 'suggestion' | 'neutral'
                            return { cleaned, kind, rank: rankOf(kind) };
                          })
                          .sort((a, b) => a.rank - b.rank);

                        const Badge = ({ children, className }) => (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold mr-2 ${className}`}>
                            {children}
                          </span>
                        );

                        return ordered.map(({ cleaned, kind }, i) => {
                          const badge =
                            kind === 'good'       ? <Badge className="bg-green-100 text-green-700">Good</Badge> :
                            kind === 'missing'    ? <Badge className="bg-red-100 text-red-700">Missing</Badge> :
                            kind === 'suggestion' ? <Badge className="bg-yellow-100 text-yellow-700">Suggestion</Badge> :
                                                    <Badge className="bg-blue-100 text-gray-700">Note</Badge>;

                          return (
                            <li key={i} className="pl-1">
                              {badge}
                              <span className="font-medium">{emphasizeKeywords(cleaned)}</span>
                            </li>
                          );
                        });
                      })()}
                    </ul>

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
