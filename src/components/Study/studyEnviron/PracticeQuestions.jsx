import React from "react";

const PracticeQuestions = () => {
  const QuestionCard = () => (
    <div className="border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:border-indigo-300 transition-colors cursor-pointer">
      <span className="text-gray-600">Practice Question</span>
      <div className="flex gap-2">
        <button className="text-gray-400 hover:text-gray-600">↑</button>
        <button className="text-gray-400 hover:text-gray-600">↓</button>
      </div>
    </div>
  );

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Practice Questions
      </h3>
      <div className="space-y-3">
        <QuestionCard />
        <QuestionCard />
      </div>
      <button className="mt-4 w-full sm:w-auto px-4 py-2 bg-gray-50 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors">
        Generate Question
      </button>
    </div>
  );
};

export default PracticeQuestions;
