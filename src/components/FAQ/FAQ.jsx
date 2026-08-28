import { useMemo, useState } from "react";
import { ChevronDown, HelpCircle, Search } from "lucide-react";

const faqs = [
  ["Getting started", "What is Hyper Tutor?", "Hyper Tutor is a learning companion that combines planning, AI tutoring, active recall, progress tracking, and study resources in one workspace."],
  ["Getting started", "How do I complete onboarding?", "Answer each onboarding step, then select Start learning. Your answers are saved to your private learning profile and used to personalize the app."],
  ["Getting started", "Can I change my onboarding answers?", "Yes. Open Settings to update your profile preferences. Your planner and recommendations will use the updated information."],
  ["Getting started", "What happens after I confirm my email?", "You are sent to the onboarding flow. Once it is complete, Hyper Tutor takes you to your dashboard."],
  ["Getting started", "Can I use Hyper Tutor as a working professional?", "Yes. Choose Lifelong learner or Working professional during onboarding so your goals and flexible routine can guide recommendations."],
  ["Account", "How do I change my profile picture?", "Open Settings, choose an image, and select Save picture. Your new picture appears in the sidebar after it uploads."],
  ["Account", "What image types are supported?", "Most browser-supported image formats are accepted. Images must be smaller than 5 MB."],
  ["Account", "Who can see my profile picture?", "Your profile picture is stored privately and is available to your account inside Hyper Tutor."],
  ["Account", "How do I sign out?", "Select Log out beneath New Study Session in the sidebar."],
  ["Account", "What if I forget my password?", "Select Forgot password on the login page, enter your email, and follow the reset link."],
  ["Study planning", "What is the Planner for?", "Planner helps you schedule study sessions, assignments, reviews, deadlines, recurring work, and time blocks."],
  ["Study planning", "How does Hyper Tutor choose my planner subjects?", "The planner uses the subjects selected during onboarding. You can still choose from the available subject list when creating a session."],
  ["Study planning", "Does my preferred study time affect sessions?", "Yes. Your preferred time supplies a useful starting time for new planner sessions."],
  ["Study planning", "How should I choose weekly study hours?", "Choose the time you can consistently protect. A realistic routine is more useful than an ambitious plan you cannot maintain."],
  ["Study planning", "Can I study on multiple days?", "Yes. Select every day that works for you during onboarding, then use recurring sessions or time blocks in Planner."],
  ["Study sessions", "How do I create a study session?", "Select New Study Session in the sidebar or open Study and choose the create-session action."],
  ["Study sessions", "What can I track in a session?", "You can track the subject, topic, status, date, start time, duration, notes, flashcards, resources, and session activity."],
  ["Study sessions", "What is the Pomodoro timer?", "It breaks focused work into timed intervals with short breaks, helping you sustain attention without losing track of time."],
  ["Study sessions", "What are active-recall tools?", "Notes, flashcards, and practice questions help you retrieve knowledge instead of only rereading it."],
  ["Study sessions", "Can I attach resources to a session?", "Yes. Upload resources from the study environment. They are associated with that session and stored in your private resource library."],
  ["AI tutor", "What can the AI tutor help with?", "Ask for explanations, step-by-step guidance, study plans, examples, summaries, or practice questions for your current topic."],
  ["AI tutor", "Will the AI tutor do my work for me?", "It is designed to guide understanding. Ask for hints or a walkthrough first, and use its answers to check your own reasoning."],
  ["AI tutor", "How does my learning style affect AI help?", "Your selected learning style helps shape suggested study activities, such as visual review, practice, step-by-step explanations, or conversation."],
  ["AI tutor", "Can I ask follow-up questions?", "Yes. Continue the conversation with clarifying questions, examples, or a request to explain the idea in a different way."],
  ["Progress", "What does the Progress page show?", "It summarizes completed time, sessions, plan completion, resources, study days, and subject activity."],
  ["Progress", "How is plan completion calculated?", "Hyper Tutor compares recorded study time with the total duration of your planned sessions."],
  ["Progress", "Why is my dashboard empty?", "Create a study session or resource first. New accounts start with an empty activity history so your progress reflects your own work."],
  ["Privacy and access", "Who can access my study data?", "Your account is scoped to your own profile, sessions, notes, flashcards, and resources through Supabase access policies."],
  ["Privacy and access", "What accessibility preferences can I select?", "You can select screen reader support, text-to-speech, high contrast, larger text, or None during onboarding."],
  ["Privacy and access", "Can I use Hyper Tutor with a screen reader?", "The app includes accessibility preferences and semantic controls. Select Screen reader in onboarding and report any issue through support."],
];

function FAQ() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [openQuestion, setOpenQuestion] = useState(0);
  const categories = ["All", ...new Set(faqs.map(([itemCategory]) => itemCategory))];
  const filteredFaqs = useMemo(() => faqs.filter(([itemCategory, question, answer]) => {
    const matchesCategory = category === "All" || itemCategory === category;
    const text = `${question} ${answer}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase().trim());
  }), [category, query]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 pb-12 pt-20 text-slate-900 md:px-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><HelpCircle size={25} /></div><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Support center</p><h1 className="text-3xl font-bold">Frequently Asked Questions</h1></div></div>
        <p className="mt-4 max-w-2xl text-slate-600">Find clear answers about your account, study routine, AI tutor, progress, and privacy.</p>
        <label className="relative mt-8 block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-4 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></label>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{categories.map((itemCategory) => <button key={itemCategory} type="button" onClick={() => setCategory(itemCategory)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${category === itemCategory ? "bg-emerald-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-emerald-300"}`}>{itemCategory}</button>)}</div>
        <div className="mt-6 space-y-3">{filteredFaqs.length ? filteredFaqs.map(([itemCategory, question, answer], index) => { const isOpen = openQuestion === question; return <article key={question} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><button type="button" aria-expanded={isOpen} onClick={() => setOpenQuestion(isOpen ? null : question)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold hover:bg-slate-50"><span><span className="mr-3 text-xs font-medium uppercase tracking-wider text-emerald-600">{itemCategory}</span>{question}</span><ChevronDown size={19} className={`shrink-0 transition-transform ${isOpen ? "rotate-180 text-emerald-600" : "text-slate-400"}`} /></button>{isOpen && <p className="border-t border-slate-100 px-5 pb-5 pt-4 leading-7 text-slate-600">{answer}</p>}</article>; }) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No questions matched your search.</div>}</div>
        <p className="mt-6 text-center text-sm text-slate-500">Showing {filteredFaqs.length} of {faqs.length} questions</p>
      </div>
    </main>
  );
}

export default FAQ;
