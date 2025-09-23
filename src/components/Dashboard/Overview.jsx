import React, { useEffect, useState } from "react";
import TextType from "../common/TargetCursor";
import QuickActions from "./QuickActions";
import RecentActivity from "./RecentActivity";
import PerformanceDashboard from "./StudyStats";
import StudyStreak from "./StudyStreak";
import UpcomingSession from "./UpcomingSession";
import AISuggestions from "./AISuggestions";
import supabase from "../../lib/supabase";

function Overview() {
    const [fetchError, setFetchError] = useState("");
  const [userName, setUserName] = useState({
    username: "",
  })
  useEffect(() => {
    const fetchUsername = async() => {
      setFetchError("");
      try {
        // Get the current user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setFetchError("User not authenticated");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id); // Filter by current user's ID

        if (error) {
          setFetchError(
            "An error occurred while loading username: " + error.message
          );
          console.error("Supabase fetch error:", error);
        } else {
          setFetchError("");
          setUserName(data);
        }
      } catch (err) {
        setFetchError("An unexpected error occurred while loading username");
        console.error("Unexpected error:", err);
      }          
    }
    fetchUsername();
  });
  const greetings = {
    headings: [
      `Welcome back, [Name]`,
      "Ready to learn, [Name]?",
      "Your study buddy missed you",
      "Hey [Name], time to grow smarter",
      "Back to the grind, [Name]",
      "The knowledge hub awaits you",
      "Hypertutor is ready for you",
      "Good to see you, [Name]",
      "Learning never stops, [Name]",
      "Back on track, [Name]",
    ],
    paragraphs: [
      "Let’s make progress together today.",
      "Your learning journey continues right here.",
      "Time to sharpen your skills, one step at a time.",
      "Small steps today lead to big wins tomorrow.",
      "Hypertutor’s got your back—let’s dive in.",
      "Knowledge is calling—ready to answer?",
      "Consistency is the secret. Let’s build it.",
      "Let’s pick up right where you left off.",
      "Your growth is just one session away.",
      "The best investment is in your learning.",
    ],
  };

  const randomHeading =
    greetings.headings[Math.floor(Math.random() * greetings.headings.length)];
  const randomParagraph =
    greetings.paragraphs[
      Math.floor(Math.random() * greetings.paragraphs.length)
    ];
  const user = userName;

  const personalizedHeading = randomHeading.replace("[Name]", user);

  return (
    <>
      <div className="">
        <h1 className="ml-17 lg:ml-0 z-[100] px-3 py-3  fixed w-full border-b-2 border-black bg-white text-3xl font-bold [text-shadow:_2px_2px_0px_rgba(0,0,0,0.5)]">
          Dashboard
        </h1>

        <div className="px-6">
          <h1 className="pt-20 text-green-600 text-2xl font-bold">
            <TextType
              text={personalizedHeading}
              typingSpeed={75}
              pauseDuration={1500}
              showCursor={true}
              cursorCharacter="|"
            />
          </h1>
          <p className="mt-3 mb-3">{randomParagraph}</p>
        </div>
      </div>
      <div className="w-[90%] lg:w-[96%] mx-6 grid grid-cols-1 lg:grid-cols-3 lg:grid-row-11 gap-6 p-2 [box-shadow:rgba(128,128,128,0.5)_3px_3px_6px_0px_inset,rgba(255,255,255,0.5)_-3px_-3px_6px_1px_inset]">
        <div className="lg:col-span-2 lg:row-span-5">
          <PerformanceDashboard />
        </div>
        <div className="lg:col-span-1 row-span-5 ">
          <UpcomingSession />
        </div>

        <div className="lg:col-span-1 row-span-3">
          <QuickActions />
        </div>

        <div className="lg:col-span-2">
          <div className="row-span-6 mb-6">
            <StudyStreak />
          </div>

          <div className="lg:col-span-2 row-span-3">
            <AISuggestions />
          </div>
        </div>
      </div>
    </>
  );
}

export default Overview;
