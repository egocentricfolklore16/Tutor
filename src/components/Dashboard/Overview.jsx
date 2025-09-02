import React from 'react'
import QuickActions from './QuickActions'
import RecentActivity from './RecentActivity'
import HyperTutorDashboard from './StudyStats'
import StudyStreak from './StudyStreak'
import UpcomingSession from './UpcomingSession'
import AISuggestions from './AISuggestions'

function Overview() {

  const greetings = {
    headings: [
      "Welcome back, [Name]",
      "Good to see you again",
      "Hey [Name], glad you’re back",
      "Look who’s here",
      "Back at it",
      "The dashboard missed you, [Name]",
      "Captain [Name], reporting for duty",
      "Guess who just leveled up again",
      "Mission control ready",
      "Always a pleasure having you here, [Name]",
    ],
    paragraphs: [
      "Ready to get things done?",
      "Let’s make today productive.",
      "Let’s dive in.",
      "Let’s keep up the momentum.",
      "Here’s to progress—let’s get started.",
      "You got this.",
      "Glad to have you back in the driver’s seat.",
      "Back again? You must love it here.",
      "Your space, your tools, your dashboard—ready when you are.",
      "Let’s make today count.",
    ],
  };

  const randomHeading =
    greetings.headings[Math.floor(Math.random() * greetings.headings.length)];
const randomParagraph =
  greetings.paragraphs[
    Math.floor(Math.random() * greetings.paragraphs.length)
  ];

  const personalizedHeading = randomHeading.replace("[Name]", "Egocentricfolkore16");


  return (
    <>
      <div className="">
        <h1 className="px-6 py-3  fixed w-full border-b-2 border-black bg-white text-3xl font-bold [text-shadow:_2px_2px_0px_rgba(0,0,0,0.5)]">
          Dashboard
        </h1>
        <div className="px-6">
          <h1 className="pt-20 text-green-600 text-2xl font-bold">
            {personalizedHeading}
          </h1>
          <p className="mt-3 mb-3">{randomParagraph}</p>
        </div>
      </div>
      <div className="w-[96%] mx-6 grid grid-cols-1 lg:grid-cols-3 lg:grid-row-12 gap-6 p-2 [box-shadow:rgba(128,128,128,0.5)_3px_3px_6px_0px_inset,rgba(255,255,255,0.5)_-3px_-3px_6px_1px_inset]">
        <div className="lg:col-span-2 lg:row-span-5">
          <HyperTutorDashboard />
        </div>
        <div className="lg:col-span-1 row-span-5 ">
          <UpcomingSession />
           <StudyStreak />
          <QuickActions />
          <RecentActivity />
          <AISuggestions /> 
        </div>
      </div>
    </>
  );
}

export default Overview