import React from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="bg-white shadow p-4 flex justify-between">
      <h1 className="text-xl font-bold text-blue-600">SkillIssue.AI</h1>
      <div className="space-x-4">
        <Link to="/" className="text-gray-700 hover:text-blue-600">Home</Link>
        <Link to="/results" className="text-gray-700 hover:text-blue-600">Results</Link>
      </div>
    </nav>
  );
}

export default Navbar;
