import React from "react";

function StudyStreak() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="relative flex min-h-[180px] items-center justify-end overflow-hidden rounded-lg bg-red-50 px-5 md:px-8">
        <img
          src="/logo3.png"
          alt="Lumo mascot celebrating your study streak"
          className="absolute left-[8%] z-0 h-48 w-72 object-contain object-bottom opacity-95 md:left-[18%] md:h-56 md:w-[26rem]"
        />
        <img
          src="/sreak.svg"
          alt=""
          aria-hidden="true"
          className="absolute right-[8%] z-0 h-32 w-32 object-contain opacity-20 md:right-[14%] md:h-44 md:w-44"
        />
        <div className="relative z-10 mr-[4%] text-right md:mr-[10%]">
          <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
            Study streak
          </p>
          <p className="mt-1 text-7xl font-black leading-none text-red-700 md:text-8xl">
            22
          </p>
          <p className="mt-2 text-sm font-medium text-red-600">days in a row</p>
        </div>
      </div>
    </div>
  );
}

export default StudyStreak;
