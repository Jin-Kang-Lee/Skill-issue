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
    const roleMatch = line.match(/^\*\*(.+?)\*\*:\s*(.+)/);

    if (roleMatch) {
      const description = roleMatch[2].trim();

      let requiredSkills = [];
      let requiredLine = ""; // ✅ Add this
      if (i + 1 < roleLines.length && /Required Skills:/i.test(roleLines[i + 1])) {
        requiredLine = roleLines[i + 1].trim(); // ✅ Save full string for UI
        const skillLine = requiredLine.split(':')[1] || '';
        requiredSkills = skillLine.split(',').map(s => s.trim()).filter(Boolean);
        i++; // skip next line
      }

      groupedRoles.push({
        job: line,
        required: requiredLine,     // ✅ this restores the UI text
        requiredSkills,             // ✅ this supports ATS logic
        description,
      });
    } else {
      groupedRoles.push({ job: line });
    }
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
      const match = role.job.match(/\*\*(.+?)\*\*:\s*(.+)/);
      const title = match ? match[1] : role.job.trim();

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

        <div className="grid sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
          {groupedRoles.map((role, idx) => {
            const match = role.job.match(/\*\*(.+?)\*\*:\s*(.+)/)
            const title = match ? match[1] : role.job.trim()
            const description = match ? match[2] : ''
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
                className="group relative bg-white border border-gray-200 rounded-2xl px-6 py-5 shadow-sm hover:shadow-md transition-all flex flex-col min-h-[240px] hover:scale-[1.02] duration-300 overflow-hidden"
              >
                {/* Top Gradient Accent Bar */}
                <div className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${gradient} rounded-t-2xl`} />

                {/* Top Icon and Title */}
                <div className="flex flex-col items-center text-center mb-3">
                  <Icon className="w-8 h-8 text-accent mb-1" />
                  <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
                </div>

                {/* Growable middle content */}
                <div className="flex flex-col flex-grow justify-start">
                  {/* JOB LINKS */}
                  <div className="flex flex-wrap gap-2 justify-center mb-2">
                    {roleLinks.length > 0 ? (
                      roleLinks.map((l, i) => (
                        <a
                          key={i}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full shadow-sm border border-gray-200 hover:bg-gray-200 transition"
                        >
                          {l.site}
                        </a>
                      ))
                    ) : (
                      <span className="text-xs text-gray-400">No links</span>
                    )}
                  </div>

                  {/* HIDDEN HOVER DESCRIPTION */}
                  <div className="overflow-hidden max-h-0 opacity-0 group-hover:max-h-[160px] group-hover:opacity-100 transition-all duration-300 ease-in-out mt-2 flex flex-col gap-1 text-left">
                    <p className="text-sm text-black-800">{description}</p>
                    {role.required && (
                      <p className="text-xs italic text-gray-500 mt-4">{role.required}</p>
                    )}
                  </div>
                </div>

                {/* ATS Button */}
                <div className="pt-4">
                  <div className="border-t border-gray-200 my-4"></div>
                  <button
                    onClick={() => {
                      handleATSCheck(title, role.requiredSkills || [])
                      setAtsVisibleIndex(idx)
                    }}
                    className="bg-accent text-white w-full text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent transition"
                  >
                    Check ATS Fit
                  </button>

                  {/* ATS RESULTS */}
                  {atsScores[title] && atsVisibleIndex === idx && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-lg text-sm">
                      <p className="text-gray-800 mb-1">
                        ATS Match Score: <strong>{atsScores[title].score}%</strong>
                      </p>
                      <p className="text-green-600">
                        ✅ Matched Skills: {atsScores[title].matched_skills.join(', ') || 'None'}
                      </p>
                      <p className="text-red-500">
                        ❌ Missing Skills: {atsScores[title].missing_skills.join(', ') || 'None'}
                      </p>
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
