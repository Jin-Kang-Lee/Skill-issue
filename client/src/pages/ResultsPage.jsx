import React, { useContext, useState } from 'react'
import { SuggestionsContext } from '../context/SuggestionsContext'
import { BriefcaseIcon, SparklesIcon } from '@heroicons/react/24/solid'

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

  const handleCardClick = async (index, title) => {
    if (activeIndex === index) {
      setActiveIndex(null)
      return
    }

    setActiveIndex(index)
    setLoadingIndex(index)
    try {
      const res = await fetch(`http://localhost:8000/api/search-links/?role=${encodeURIComponent(title)}`)
      const data = await res.json()
      setLinks((prev) => ({ ...prev, [index]: data }))
    } catch (err) {
      console.error('Failed to load links', err)
    } finally {
      setLoadingIndex(null)
    }
  }


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
    <div className="min-h-screen bg-background text-white px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-8 flex items-center justify-center gap-3">
          <SparklesIcon className="w-8 h-8 text-tertiary" />
          Job Role Suggestions
        </h2>

        {groupedRoles.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {groupedRoles.map((role, idx) => {
              const match = role.job.match(/\*\*(.+?)\*\*:\s*(.+)/)
              const title = match ? match[1] : role.job.trim()
              const description = match ? match[2] : ''

              const isActive = activeIndex === idx
              const roleLinks = links[idx] || []

              return (
                <div
                  key={idx}
                  className="bg-background border border-white/10 hover:border-tertiary p-5 rounded-lg shadow-sm transition"
                >
                  <div
                    className="cursor-pointer flex items-start gap-4"
                    onClick={() => handleCardClick(idx, title)}
                  >
                    <BriefcaseIcon className="w-6 h-6 text-tertiary mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
                      <p className="text-sm text-gray-300 leading-relaxed mb-2">{description}</p>
                      {role.required && (
                        <p className="text-xs italic text-accent">{role.required}</p>
                      )}
                    </div>
                  </div>

                  {isActive && (
                    <div className="mt-4 border-t border-white/10 pt-4 text-sm">
                      {loadingIndex === idx ? (
                        <p className="text-gray-400">Loading job links...</p>
                      ) : (
                        <>
                          <h4 className="font-semibold text-white mb-2">Search links</h4>
                          <ul className="space-y-1">
                            {roleLinks.map((l, i) => (
                              <li key={i}>
                                <a
                                  href={l.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-tertiary hover:underline"
                                >
                                  🔗 Search on {l.site}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      <button
                        onClick={() => handleATSCheck(title, role.requiredSkills || [])}
                        className="mt-4 bg-tertiary text-white px-3 py-1 rounded text-sm hover:bg-tertiary/80"
                      >
                        🎯 Check ATS Fit
                      </button>

                      {atsScores[title] && (
                        <div className="mt-4 text-sm bg-white/10 border border-white/20 p-4 rounded text-white">
                          <p>
                            ATS Match Score: <strong>{atsScores[title].score}%</strong>
                          </p>
                          <p className="text-green-300">
                            ✅ Matched Skills: {atsScores[title].matched_skills.join(", ") || "None"}
                          </p>
                          <p className="text-red-300">
                            ❌ Missing Skills: {atsScores[title].missing_skills.join(", ") || "None"}
                          </p>
                        </div>
                      )}


                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center mt-12 text-white">
            <p className="text-lg">No suggestions available</p>
            <p className="text-sm">Try uploading your resume or entering your skills again.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsPage
