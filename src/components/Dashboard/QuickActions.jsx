import React from 'react'

function QuickActions() {
  return (
    <div className="border border-gray-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm p-3">
      <div className="flex gap-3 items-center mb-4">
        <svg
          className="text-emerald-600 dark:text-emerald-400"
          stroke="currentColor"
          fill="currentColor"
          strokeWidth="0"
          viewBox="0 0 16 16"
          height="1.75em"
          width="1.75em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.04 10h2.58l.65 1H2.54l-.5-.5v-9l.5-.5h12l.5.5v4.77l-1-1.75V2h-11v8zm5.54 1l-1.41 3.47h2.2L15 8.7 14.27 7h-1.63l.82-1.46L12.63 4H9.76l-.92.59-2.28 5L7.47 11h1.11zm1.18-6h2.87l-1.87 3h3.51l-5.76 5.84L10.2 10H7.47l2.29-5zM6.95 7H4.04V6H7.4l-.45 1zm-.9 2H4.04V8H6.5l-.45 1z"
          ></path>
        </svg>
        <h1 className="font-bold text-xl text-slate-900 dark:text-slate-100">Quick Actions</h1>
      </div>
      {["Continue Session", "Library", "Flashcards", "Planner", "Progress", "Settings"].map((title) => (
        <div
          key={title}
          className="border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 rounded-lg shadow-sm mb-1.5 w-full hover:shadow-md hover:scale-[1.01] transition duration-200 ease-in-out hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <div className="flex justify-between items-center p-3 text-sm font-semibold">
            <h2>{title}</h2>
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 24 24"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <path fill="none" d="M0 0h24v24H0z"></path>
                <path d="M10 6v2H5v11h11v-5h2v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6zm11-3v8h-2V6.413l-7.793 7.794-1.414-1.414L17.585 5H13V3h8z"></path>
              </g>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

export default QuickActions