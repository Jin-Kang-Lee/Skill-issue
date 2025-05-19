import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const [file, setFile] = useState(null); //Store the uploaded file (PDF or DOCX)
  const [skills, setSkills] = useState(""); //Store the manually entered skills text
  const navigate = useNavigate();

  //Triggered when the user selects a file (resume upload)
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  //Triggered when the user types into the skills textarea
  const handleSkillsChange = (e) => {
    setSkills(e.target.value);
  };

  //Called when the user clicks the Submit button
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    if (file) {
      formData.append("file", file);
    } else if (skills.trim()) {
      formData.append("skills", skills);
    } else {
      alert("Please upload a resume or enter your skills.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/upload-resume/", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Server error");
      }

      const data = await res.json();
      console.log("✅ Server Response:", data);

      if (data.job_suggestions) {
        navigate("/results", { state: { suggestions: data.job_suggestions } });
      } else {
        alert("No job suggestions received.");
      }
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-blue-600 mb-4 text-center">
          Discover Your Career Path
        </h2>
        <p className="text-gray-600 text-center mb-8">
          Upload your resume or enter your skills to let our AI help you explore
          suitable job roles.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Upload Resume (PDF or DOCX)
            </label>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Or Enter Skills
            </label>
            <textarea
              value={skills}
              onChange={handleSkillsChange}
              placeholder="e.g. Python, Excel, Teamwork, Data Analysis"
              rows="4"
              className="w-full border border-gray-300 rounded px-3 py-2 resize-none"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white w-full py-2 rounded hover:bg-blue-700 transition"
          >
            Get Suggestions
          </button>
        </form>
      </div>
    </div>
  );
}

export default HomePage;
