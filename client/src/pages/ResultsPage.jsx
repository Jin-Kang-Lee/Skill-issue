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
function getGradientAndIcon(title) {
  return {
    gradient: 'from-[#5353d7] to-[#5353d7]', // consistent purple
    watermarkIcon: '💡',
  }
}

function ResultsPage() {
  const { suggestions } = useContext(SuggestionsContext)
  const roleLines = suggestions?.split('\n').filter(Boolean) || []
  const groupedRoles = []

  
  for (let i = 0; i < roleLines.length; i++) {
    const line = roleLines[i];

    // Attempt to match role title and description
    const match = line.match(/^\*\*(.+?)\*\*:\s*(.+)/);

    let title = "Unknown Role";
    let description = "";
    let requiredSkills = [];
    let requiredLine = "";

    if (match) {
      title = match[1].trim();
      description = match[2].trim();
    } else if (line.includes("**") && line.includes(":")) {
      // Backup parsing if format is messy but contains both
      const parts = line.split(":");
      title = parts[0].replace(/\*/g, "").trim();
      description = parts[1].trim();
    } else {
      // Last fallback: use entire line as title
      title = line.trim();
    }

    // Check if next line contains required skills
    if (i + 1 < roleLines.length && /Required Skills:/i.test(roleLines[i + 1])) {
      requiredLine = roleLines[i + 1].trim();
      const skillLine = requiredLine.split(':')[1] || '';
      requiredSkills = skillLine.split(',').map(s => s.trim()).filter(Boolean);
      i++; // skip next line
    }

    groupedRoles.push({
      job: line,
      required: requiredLine,
      requiredSkills,
      description,
      parsedTitle: title,
    });
  }


  const [activeIndex, setActiveIndex] = useState(null)
  const [links, setLinks] = useState({})
  const [loadingIndex, setLoadingIndex] = useState(null)
  const [atsScores, setAtsScores] = useState({});
  const [atsVisibleIndex, setAtsVisibleIndex] = useState(null);

  // const handleCardClick = async (index, title) => {
  //   if (activeIndex === index) {
  //     setActiveIndex(null)
  //     return
  //   }

  //   setActiveIndex(index)
  //   setLoadingIndex(index)
  //   try {
  //     const res = await fetch(`http://localhost:8000/api/search-links/?role=${encodeURIComponent(title)}`)
  //     const data = await res.json()
  //     setLinks((prev) => ({ ...prev, [index]: data }))
  //   } catch (err) {
  //     console.error('Failed to load links', err)
  //   } finally {
  //     setLoadingIndex(null)
  //   }
  // }

  // Automatically fetch all job links once suggestions are parsed
  useEffect(() => {
    groupedRoles.forEach((role, idx) => {
      const title = role.parsedTitle || "Untitled Role";

      if (!links[idx]) {
        fetch(`http://localhost:8000/api/search-links/?role=${encodeURIComponent(title)}`)
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
      const res = await fetch("http://localhost:8000/ats-score/", {
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
            const match = role.job.match(/\*\*(.+?)\*\*:\s*(.+)/)
            const title = match ? match[1] : role.job.trim()
            const description = role.description || ''
            const roleLinks = links[idx] || []
            const { gradient, watermarkIcon } = getGradientAndIcon(title);
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
                className="group flex justify-between items-center bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] duration-300"
              >
                {/* Left Side Content */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Role Icon */}
                  <div className="flex-shrink-0">
                    <Icon className="w-10 h-10 text-accent" />
                  </div>

                  {/* Title + Description */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{description}</p>

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

                    {/* Optional required skills */}
                    {role.required && (
                      <p className="text-xs italic text-gray-500 mt-2">{role.required}</p>
                    )}
                  </div>
                </div>

                {/* Right Side: ATS Button */}
                <div className="ml-6 flex flex-col items-end justify-center">
                  <button
                    onClick={() => {
                      if (atsVisibleIndex === idx) {
                        // If already open, close it
                        setAtsVisibleIndex(null);
                      } else {
                        // Otherwise, fetch and show
                        handleATSCheck(title, role.requiredSkills || []);
                        setAtsVisibleIndex(idx);
                      }
                    }}
                    className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent transition"
                  >
                    Check ATS Fit
                  </button>

                  {atsScores[title] && (
                    <div
                      className={`absolute right-6 top-20 bg-white border border-gray-200 rounded-xl shadow-md p-4 z-10 w-72 text-sm transition-all duration-300 ease-in-out ${
                        atsVisibleIndex === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <p className="text-gray-800 mb-2">
                        ATS Score: <strong>{atsScores[title].score}%</strong>
                      </p>

                      {/* ✅ Matched Skills */}
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

                      {/* ❌ Missing Skills */}
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
