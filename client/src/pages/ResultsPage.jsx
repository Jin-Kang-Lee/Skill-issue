import React, { useContext, useState, useEffect } from 'react'
import { SuggestionsContext } from '../context/SuggestionsContext'
import {
  BriefcaseIcon,
  SparklesIcon,
  AcademicCapIcon,
  LightBulbIcon,
  ChartBarIcon,
  CodeBracketIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/solid'

//Add gradient purple to the top of the cards
// function getGradientAndIcon(title) {
//   return {
//     gradient: 'from-[#5353d7] to-[#5353d7]', // consistent purple
//     watermarkIcon: '💡',
//   }
// }

function ResultsPage() {
  const { suggestions } = useContext(SuggestionsContext)
  const roleLines = suggestions?.split('\n').filter(Boolean) || [];
  const groupedRoles = [];

  for (let i = 0; i < roleLines.length; i++) {
    const titleMatch = roleLines[i].match(/^\*\*(.+?)\*\*/);
    if (!titleMatch) continue;
    

    const title = titleMatch[1].trim();
    if (/^Job\s+\d+$/i.test(title) || title.toLowerCase().includes("untitled")) continue;
    let description = '';
    let whySuggested = '';
    let requiredLine = '';
    let requiredSkills = [];

    let j = i + 1;
    while (j < roleLines.length && !/^\*\*/.test(roleLines[j])) {
      const line = roleLines[j];

      if (/^Job Description:/i.test(line)) {
        description = line.replace(/^Job Description:\s*/i, '').trim();
      } else if (/^Why Suggested:/i.test(line)) {
        whySuggested = line.replace(/^Why Suggested:\s*/i, '').trim();
      } else if (/^Required Skills:/i.test(line)) {
        requiredLine = line.trim();
        const skillLine = line.split(':')[1] || '';
        requiredSkills = skillLine.split(',').map(s => s.trim()).filter(Boolean);
      }

      j++;
    }

    groupedRoles.push({
      parsedTitle: title,
      description,
      whySuggested,
      required: requiredLine,
      requiredSkills,
    });

    i = j - 1; // ✅ Skip ahead to avoid parsing the same block again
  }




  const [links, setLinks] = useState({})
  const [atsScores, setAtsScores] = useState({});
  const [atsVisibleIndex, setAtsVisibleIndex] = useState(null);

  // Automatically fetch all job links once suggestions are parsed
  useEffect(() => {
    groupedRoles.forEach((role, idx) => {
      const title = role.parsedTitle || "Untitled Role";

      if (!links[idx]) {
        fetch(`https://skill-issue-backend.onrender.com/api/search-links/?role=${encodeURIComponent(title)}`)
          .then((res) => res.json())
          .then((data) => {
            setLinks((prev) => ({ ...prev, [idx]: data }));
          })
          .catch((err) => {
            console.error('Failed to load links', err);
          });
      }
    });
  }, [groupedRoles]); // rerun when groupedRoles changes


  const handleATSCheck = async (roleTitle, requiredSkills) => {
    const resumeText = localStorage.getItem("resume_text") || "";

    if (!resumeText) {
      alert("Resume text not found. Please upload your resume again.");
      return;
    }

    const form = new URLSearchParams();
    form.append("role", roleTitle);
    form.append("resume_text", resumeText);
    form.append("skills_csv", requiredSkills.join(","));

    console.log("Sending ATS check for", roleTitle)
    console.log("With resume_text:", resumeText.slice(0, 100)) // Just preview
    console.log("With requiredSkills:", requiredSkills)

    try {
      const res = await fetch(`https://skill-issue-backend.onrender.com/ats-score/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });

      const data = await res.json();
      setAtsScores(prev => ({ ...prev, [roleTitle]: data }));
    } catch (err) {
      console.error("Failed to get ATS score:", err);
    }
  };


  

  return (
    <div className="min-h-screen bg-background px-6 py-16 text-heading">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-extrabold text-center mb-12 flex items-center justify-center gap-3">
          <SparklesIcon className="w-8 h-8 text-tertiary" />
          Job Role Suggestions
        </h2>

        <div className="flex flex-col gap-6">
          {groupedRoles.map((role, idx) => {
            // const match = role.job.match(/\*\*(.+?)\*\*:\s*(.+)/)
            // const title = match ? match[1] : role.job.trim()\
            const title = role.parsedTitle || "Untitled Role"
            const description = role.description || ''
            const roleLinks = links[idx] || []
            const icons = [
              BriefcaseIcon,
              AcademicCapIcon,
              LightBulbIcon,
              ChartBarIcon,
              CodeBracketIcon,
              Cog6ToothIcon
            ];
            const Icon = icons[idx % icons.length];

            return (
              <div
                key={idx}
                className={`group relative flex justify-between items-center bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm transition-all duration-300 ${
                  atsVisibleIndex === idx ? 'z-[100]' : 'hover:shadow-md hover:scale-[1.01]'
                }`}
              >
                {/* Left Side Content */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Role Icon */}
                  <div className="flex-shrink-0">
                    <Icon className="w-10 h-10 text-accent" />
                  </div>

                  {/* Title + Description */}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>

                    {description && (
                      <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                        <strong className="text-gray-800">Job Description:</strong> {description}
                      </p>
                    )}

                    {/* Optional required skills */}
                    {role.whySuggested && (
                      <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                        <strong className="text-gray-800">Why Suggested:</strong> {role.whySuggested}
                      </p>
                    )}

                    {role.required && (
                      <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                        <strong className="text-gray-800">Required Skills:</strong> {role.required}
                      </p>
                    )}

                    {/* Tags like job links */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {roleLinks.length > 0 ? (
                        roleLinks.map((l, i) => (
                          <a
                            key={i}
                            href={l.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full border border-gray-200 hover:bg-gray-200 transition"
                          >
                            {l.site}
                          </a>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">No links</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: ATS Button */}
                <div
                  className="ml-6 flex flex-col items-end justify-center relative"
                  onMouseEnter={() => {
                    if (!atsScores[title]) {
                      handleATSCheck(title, role.requiredSkills || []);
                    }
                    setAtsVisibleIndex(idx); // set hovered
                  }}
                  onMouseLeave={() => {
                    setAtsVisibleIndex(null); // hide when hover ends
                  }}
                >
                  <button
                    className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Check ATS Fit
                  </button>

                  {atsScores[title] && atsVisibleIndex === idx && (
                    <div
                      className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-xl shadow-md p-4 z-[9999] w-72 text-sm transition-all duration-300 ease-in-out opacity-100"

                    >
                      <p className="text-gray-800 mb-2">
                        ATS Score: <strong>{atsScores[title].score}%</strong>
                      </p>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {atsScores[title].matched_skills.map((skill, i) => (
                          <span
                            key={i}
                            className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full"
                          >
                            ✅ {skill}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {atsScores[title].missing_skills.map((skill, i) => (
                          <span
                            key={i}
                            className="bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full"
                          >
                            ❌ {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>
      </div>
    </div>

  )


}

export default ResultsPage
