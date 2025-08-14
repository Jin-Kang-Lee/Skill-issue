import React, { useContext, useEffect, useState } from 'react';
import { SuggestionsContext } from '../context/SuggestionsContext';
import { ExclamationTriangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';


const POSITIVE_KEYS = ['good', 'strong', 'clear', 'well', 'effective', 'concise', 'relevant'];
const ISSUE_KEYS    = ['missing', 'lack', 'lacks', 'incomplete', 'unclear', 'inconsistent', 'typo', 'outdated'];
const ACTION_KEYS = [
  'suggest', 'consider', 'recommend', 'improve', 'add', 'remove', 'quantify',
  'revise', 'highlight', 'should', 'ensure', 'include', 'update', 'rewrite',
  'provide', 'clarify', 'reword', 'expand'
];


const SECTION_ALIASES = {
  'summary': 'Summary',
  'work experience': 'Work Experience',
  'experience': 'Work Experience',
  'skills': 'Skills',
  'education': 'Education',
  'formatting': 'Formatting & Structure',
  'formatting & structure': 'Formatting & Structure',
  'formatting and structure': 'Formatting & Structure',
  'overall suggestions': 'Overall Suggestions',
  'overall': 'Overall Suggestions'
};

//Normalizes section names to a standard format based on aliases (e.g., "Experience" → "Work Experience")
const normalizeSection = (s) => {
  const key = s.toLowerCase().trim();
  return SECTION_ALIASES[key] || s;
};


const isMetaLine = (line) => {
  const t = line.trim();
  if (!t) return true;
  if (/^(strong|moderate|weak)\s*\(?\d+%?\)?$/i.test(t)) return true;
  if (/^\(?\d+%?\)?$/.test(t)) return true;
  if (/^score\s*:\s*\d+%?$/i.test(t)) return true;
  if (/^(note|notes?)$/i.test(t)) return true;

  // Lone labels like "Good", "(Good)", "Missing:", "[Suggestion]" (with optional punctuation)
  if (/^\s*[\(\[\{]?\s*(?:good|missing|weakness(?:es)?|suggestion(?:s)?|improvements?)\s*[\]\)\}]?\s*[:\-–—]?\s*$/iu.test(t)) {
    return true;
  }
  return false;
};



//Removes leading punctuation, bullet points, or whitespace from a feedback point
const stripLeadingMarks = (s) =>
  s.replace(/^[:\-\u2022•\s]+/, '')
   .replace(/^\s+/, '')
   .replace(/\s+$/, '');


// Matches optional label prefixes like:
// "(Good) ", "Good:", "[Suggestion] -", "Weaknesses/Missing Parts —", etc.
const CATEGORY_PREFIX_RE =
  /^\s*(?:[\(\[\{]?\s*)?(?:good|strengths?|positives?|what(?:['’])s\s+good|missing|weakness(?:es)?(?:\/missing\s*parts?)?|issues?|gaps?|suggestion(?:s)?|improvements?|to\s+improve|action\s+items?)\s*(?:[\]\)\}]|:|[-–—])?\s*/iu;

const stripCategoryPrefix = (s) => {
  let t = s.trim();
  while (CATEGORY_PREFIX_RE.test(t)) {
    t = t.replace(CATEGORY_PREFIX_RE, '').trim();
  }
  return t;
};



//Cleans up phrasing in feedback points: removes weak modal verbs, shortens "for example" → "e.g.", trims spaces, and capitalizes
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

//Classifies a feedback point as 'good', 'missing', 'suggestion', or 'neutral' based on keyword matching
const classifyPoint = (raw) => {
  const txt = cleanPoint(raw).toLowerCase();
  if (!txt) return 'neutral';

  const hasIssue = ISSUE_KEYS.some(k => txt.includes(k));
  const hasAct   = ACTION_KEYS.some(k => txt.includes(k));
  const hasPos   = POSITIVE_KEYS.some(k => txt.includes(k));

  if (hasIssue) return 'missing';
  if (hasAct)   return 'suggestion';  // <-- action outranks positive
  if (hasPos)   return 'good';
  return 'neutral';
};


//Cleans a feedback point by stripping leading marks and tidying phrasing
const cleanPoint = (line) => {
  const noMarks = stripLeadingMarks(line);
  const noLabels = stripCategoryPrefix(noMarks);
  // If a line becomes empty after stripping, return empty for skipping later
  if (!noLabels.trim()) return '';
  return tidyPhrasing(noLabels);
};


const sectionWeights = {
  "Summary": 20,
  "Work Experience": 25,
  "Skills": 20,
  "Education": 15,
  "Formatting & Structure": 10,
  "Overall Suggestions": 10
};

const hardMissingRegex = {
  'Summary': /\b(missing|absent|no)\b.*\b(summary|profile|objective)\b/i,
  'Education': /\b(missing|absent|no)\b.*\b(education|degree|institution)\b/i
};

//Computes a normalized "quality ratio" for a section based on counts of good/missing/suggestion points
const computeSectionRatio = (points, section) => {
  const classes = points.map(classifyPoint);
  const positives = classes.filter(c => c === 'good').length;
  const issues    = classes.filter(c => c === 'missing').length;
  const actions   = classes.filter(c => c === 'suggestion').length;

  // Suggestions count as half-credit
  const posLike = positives + 0.5 * actions;
  const negLike = issues;

  // Laplace smoothing to avoid extreme ratios with few points
  const smoothedNumerator = posLike + 0.5;
  const smoothedDenom     = posLike + negLike + 1;

  let ratio = smoothedNumerator / smoothedDenom;

  // Gentle penalty for issues
  if (issues > 0) ratio = Math.max(ratio - 0.15 * Math.min(issues, 2), 0);

  // Hard penalty if feedback explicitly says the section is missing
  const hasHardMissing = points.some(p => {
    const rx = hardMissingRegex[section];
    return rx ? rx.test(p) : false;
  });
  if (hasHardMissing && (section === 'Summary' || section === 'Education')) {
    ratio = Math.min(ratio, 0.4);
  }

  return Math.max(0, Math.min(1, ratio));
};

//Calculates the overall resume readiness score (0–100%) using weighted section scores
const calculateScore = (sections) => {
  let total = 0, max = 0;

  for (const [section, weight] of Object.entries(sectionWeights)) {
    max += weight;
    const points = (sections[section] || []).map(cleanPoint);
    if (points.length === 0) continue;

    const ratio = computeSectionRatio(points, section);
    total += Math.round(weight * ratio);
  }

  return Math.max(0, Math.min(100, Math.round((total / max) * 100)));
};


//Creates a breakdown of each section's score, percentage, and strength label ('weak', 'moderate', 'strong')
const getSectionBreakdown = (sections) => {
  const breakdown = [];

  for (const [section, weight] of Object.entries(sectionWeights)) {
    const points = (sections[section] || []).map(cleanPoint);
    if (points.length === 0) {
      breakdown.push({ section, score: 0, weight, percentage: 0, status: 'weak' });
      continue;
    }

    const ratio = computeSectionRatio(points, section);
    const sectionScore = Math.round(weight * ratio);
    const pct = Math.round((sectionScore / weight) * 100);
    const status = pct >= 80 ? 'strong' : pct >= 60 ? 'moderate' : 'weak';

    breakdown.push({ section, score: sectionScore, weight, percentage: pct, status });
  }

  return breakdown;
};


//Displays a donut chart visualizing a percentage value with color-coded rings
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
        const sectionMatch = line.match(
          /^(\d+\.)?\s*(Summary|Work Experience|Experience|Skills|Education|Formatting(?:\s*&\s*Structure)?|Formatting\s+and\s+Structure|Overall(?:\s*Suggestions)?)/i
        );
        if (sectionMatch) {
          const rawTitle = sectionMatch[0].replace(/^(\d+\.)?\s*/, '').trim();
          currentSection = normalizeSection(rawTitle);
          sections[currentSection] = sections[currentSection] || [];
        } else if (currentSection) {
          if (!isMetaLine(line)) {
            sections[currentSection].push(line);
          }
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

                        const seen = new Set();
                        const ordered = points
                          .map((rawPoint) => {
                            if (isMetaLine(rawPoint)) return null;
                            const cleaned = cleanPoint(rawPoint);
                            if (!cleaned) return null; // skip empties after stripping
                            const key = cleaned.toLowerCase();
                            if (seen.has(key)) return null; // dedupe
                            seen.add(key);
                            const kind = classifyPoint(cleaned);
                            return { cleaned, kind, rank: rankOf(kind) };
                          })
                          .filter(Boolean)
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
