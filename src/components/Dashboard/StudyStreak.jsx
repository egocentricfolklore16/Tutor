import React from "react";

function StudyStreak({ streak }) {
  const currentStreak = streak?.display_current_streak || 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`relative flex min-h-[180px] items-center overflow-hidden rounded-lg px-5 md:px-8 ${currentStreak === 0 ? "justify-center bg-sky-50" : "justify-end bg-red-50"}`}>
        {currentStreak === 0 ? <div className="relative z-10 flex flex-col items-center text-center"><img src="/logo5-removebg-preview.png" alt="Lumo ready to help you focus" className="h-44 w-56 object-contain md:h-52 md:w-64" /><p className="mt-1 text-2xl font-black text-sky-800">Let&apos;s get focused</p><p className="mt-1 text-sm font-medium text-sky-600">Start a session to build your streak.</p></div> : <>
        <img
          src="/logo8-removebg-preview.png"
          alt="Lumo mascot celebrating your study streak"
          className="absolute left-[8%] z-0 h-48 w-72 object-contain object-bottom opacity-95 md:left-[18%] md:h-56 md:w-[26rem]"
        />
        <div className="relative z-10 mr-[4%] text-center md:mr-[10%]">
          <img
            src="/sreak.svg"
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 object-contain opacity-20 md:h-80 md:w-80"
          />
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
            Study streak
          </p>
          <p className="relative z-10 mt-1 text-7xl font-black leading-none text-red-700 md:text-8xl">
            {currentStreak}
          </p>
          <p className="mt-2 text-sm font-medium text-red-600">days in a row</p>
        </div></>}
      </div>
    </div>
  );
}

export default StudyStreak;
