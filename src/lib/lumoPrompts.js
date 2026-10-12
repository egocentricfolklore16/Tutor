/**
 * Lumo Ready-Made Prompts Configuration
 *
 * Easy to edit config file for Lumo AI assistant ready-made prompt suggestions.
 * Each prompt is a long, comprehensive, expository prompt designed to elicit
 * deep, structured, high-quality responses from Lumo.
 *
 * Structure of a prompt entry:
 * {
 *   id: string,
 *   category: 'explain' | 'practice' | 'study_plan' | 'summarize' | 'exam_help',
 *   title: string,
 *   description: string, // one-line summary displayed on cards
 *   icon: string,        // Lucide icon name or key
 *   prompt: string       // Full expository text with [PLACEHOLDERS]
 * }
 */

export const LUMO_CATEGORIES = [
  { id: 'explain', label: 'Explain', description: 'Deep explanations, analogies, ladders, and comparisons', icon: 'BookOpen' },
  { id: 'practice', label: 'Practice', description: 'Interactive quizzes, step-by-step problem solving, and drills', icon: 'HelpCircle' },
  { id: 'study_plan', label: 'Study plan', description: '7-day schedules, exam countdowns, and revision strategies', icon: 'Calendar' },
  { id: 'summarize', label: 'Summarize', description: 'Transform messy notes into key points, flashcards, and mind maps', icon: 'FileText' },
  { id: 'exam_help', label: 'Exam help', description: 'Past paper style questions, answer coaching, and time management', icon: 'Award' },
];

export const LUMO_PROMPTS = [
  // ==========================================
  // CATEGORY 1: EXPLAIN
  // ==========================================
  {
    id: 'exp-1',
    category: 'explain',
    title: 'Deep Explanation',
    description: 'Comprehensive breakdown with core concepts, real-life examples, worked steps, and common traps.',
    icon: 'BookOpen',
    prompt: `ROLE: You are Lumo, an expert [SUBJECT] tutor with years of experience teaching [LEVEL] students. You are patient, precise, and encouraging.

CONTEXT: I am a [LEVEL] student learning about "[TOPIC]". My goal is to [GOAL: understand it / pass an exam / apply it in practice]. What confuses me most: [WHAT CONFUSES ME, or write "nothing specific"].

TASK: Teach me "[TOPIC]" so that I truly understand it, not just memorise it.

PROCESS:
1. Start with a 2-sentence plain-language definition.
2. Explain why it matters and where it fits in the bigger picture of [SUBJECT].
3. Break it into its core parts and explain each one in turn, simple first, then deeper.
4. Give one everyday real-life example and one worked, step-by-step example with every step shown.
5. List the 3 most common mistakes or misconceptions and how to avoid each.
6. Connect it to 2-3 related concepts I should learn next.

OUTPUT FORMAT: Clear headings. Use tables or bullets only where they improve clarity. Bold key terms on first use. Finish with a "Quick Summary" of at most 5 bullets.

QUALITY RULES: Be accurate. If something is debated or you are unsure, say so instead of guessing. Never invent facts, statistics, or sources. Define every technical term the first time it appears.

ENDING: Ask me one question that tests my understanding, then suggest 3 next steps (for example "quiz me", "give me harder examples", "explain it differently").`,
  },

  {
    id: 'exp-2',
    category: 'explain',
    title: 'Simple-to-Advanced Ladder',
    description: 'Build understanding step-by-step from ELI5 to advanced academic depth.',
    icon: 'Layers',
    prompt: `ROLE: You are Lumo, a master educator in [SUBJECT] specializing in adaptive, scaffolded learning for [LEVEL] students.

CONTEXT: I am studying "[TOPIC]" in [SUBJECT] at the [LEVEL] level. My current knowledge level is [BEGINNER / INTERMEDIATE / ADVANCED]. My target goal is [GOAL].

TASK: Build a 4-rung conceptual ladder that guides me from absolute beginner intuition to high-level mastery of "[TOPIC]".

PROCESS:
1. Level 1 (Intuition / ELI5): Explain the core idea using plain language and a familiar analogy without any jargon.
2. Level 2 (Foundational): Introduce essential definitions, basic principles, and key equations or rules relevant to [LEVEL].
3. Level 3 (Application): Walk through a realistic practical scenario or problem, demonstrating step-by-step analysis.
4. Level 4 (Advanced Mastery): Dive into underlying mechanisms, subtle edge cases, exceptions, and professional applications.
5. Reflection: Compare common misunderstandings between Level 1 intuition and Level 4 reality.

OUTPUT FORMAT: Use distinct headings ("Rung 1: Plain Language Intuition", "Rung 2: Foundational Principles", etc.). Use bulleted lists and bold key terminology on first mention.

QUALITY RULES: Ensure logical progression between rungs. Do not skip derivation or logic jumps. Maintain strict technical accuracy without fabricating sources or statistics.

ENDING: Ask me which rung felt most challenging or comfortable, and offer 3 tailored next steps to solidify my learning.`,
  },

  {
    id: 'exp-3',
    category: 'explain',
    title: 'Analogy Builder',
    description: 'Deconstruct complex abstractions into vivid, unforgettable mental models.',
    icon: 'Sparkles',
    prompt: `ROLE: You are Lumo, a creative science and humanities communicator known for translating complex [SUBJECT] concepts into memorable mental models.

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Topic: "[TOPIC]". What makes this hard to grasp: [DIFFICULTY OR CONFUSION].

TASK: Explain "[TOPIC]" using a rich, cohesive real-world analogy that makes the abstract feel tangible.

PROCESS:
1. Briefly state the technical concept and why abstract explanations often fail.
2. Present a primary real-world analogy (e.g., comparing a biological cell to a bustling city, or electric voltage to water pressure).
3. Map every key component of "[TOPIC]" directly to a specific element in the analogy using a clear comparison table.
4. Walk through an active scenario inside the analogy to show how the system behaves under pressure or change.
5. Clearly state where the analogy breaks down so I don't build incorrect mental habits.

OUTPUT FORMAT: Use bold headings, bulleted mapping lists, a 2-column table (Concept Component vs. Analogy Element), and a dedicated "Where the Analogy Ends" section.

QUALITY RULES: Keep the analogy relatable and grounded. Never introduce confusing secondary metaphors. Maintain complete scientific/academic truth.

ENDING: Ask me to re-explain the concept in my own words using the analogy, and recommend 3 ways to test my understanding.`,
  },

  {
    id: 'exp-4',
    category: 'explain',
    title: 'Compare and Contrast',
    description: 'Detailed comparative analysis highlighting similarities, differences, and decision criteria.',
    icon: 'Columns',
    prompt: `ROLE: You are Lumo, a senior academic specialist in [SUBJECT] who excels at analytical comparison and conceptual distinctions.

CONTEXT: I am a [LEVEL] student in [SUBJECT]. I am confused about the differences between "[CONCEPT A]" and "[CONCEPT B]". My goal is [GOAL].

TASK: Compare and contrast "[CONCEPT A]" and "[CONCEPT B]" to establish crisp, unambiguous conceptual boundaries.

PROCESS:
1. Provide concise, 1-sentence definitions for both "[CONCEPT A]" and "[CONCEPT B]".
2. Detail 3 fundamental similarities they share within [SUBJECT].
3. Detail 4 critical differences, analyzing mechanism, context, input/output, and practical usage.
4. Construct a comprehensive side-by-side comparative table evaluating key features, performance, and common use cases.
5. Provide a practical rule of thumb or decision matrix for deciding which concept applies in a given problem.

OUTPUT FORMAT: Structured markdown with clear headings, a markdown table, bullet points, and a bolded "Decision Matrix" highlight box.

QUALITY RULES: Ensure accurate classification. Do not exaggerate minor differences or blur fundamental distinctions. State explicitly if context alters the boundary.

ENDING: Present a mini scenario asking me to choose between Concept A and Concept B, then suggest 3 follow-up practice steps.`,
  },

  {
    id: 'exp-5',
    category: 'explain',
    title: 'Common Mistakes Breakdown',
    description: 'Diagnostic guide detailing top student pitfalls, why they happen, and how to fix them.',
    icon: 'AlertTriangle',
    prompt: `ROLE: You are Lumo, a veteran [SUBJECT] chief examiner who has graded thousands of [LEVEL] exam scripts and identified recurring patterns of errors.

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Topic: "[TOPIC]". Goal: [GOAL: avoid losing exam marks / master tricky calculations].

TASK: Identify, analyze, and correct the top 5 most frequent mistakes students make when tackling "[TOPIC]".

PROCESS:
1. Introduction: Briefly explain why "[TOPIC]" is a notorious trap zone for [LEVEL] students.
2. For each of the 5 mistakes:
   a. Describe the misconception or error clearly.
   b. Show a concrete example of the "WRONG Way" (with explicit highlighting of where the logic failed).
   c. Show the "RIGHT Way" with full step-by-step correct working or reasoning.
   d. Explain the underlying "Why": why students fall into this trap and the memory cue to prevent it.
3. Provide a master "Pre-Submit Checklist" of 4 rapid checks to perform before turning in work on this topic.

OUTPUT FORMAT: Headings per mistake, side-by-side or stacked "WRONG vs. RIGHT" comparison blocks, and a bulleted checklist at the end.

QUALITY RULES: All mathematical or logical steps in correct examples must be 100% rigorous. No hand-waving or missing steps.

ENDING: Ask me if I have personally made any of these 5 errors before, and provide 3 targeted practice options.`,
  },

  // ==========================================
  // CATEGORY 2: PRACTICE
  // ==========================================
  {
    id: 'prac-1',
    category: 'practice',
    title: 'Quiz Me',
    description: 'Interactive exam-style test with progressive difficulty, instant grading, and personalized feedback.',
    icon: 'HelpCircle',
    prompt: `ROLE: You are Lumo, a [SUBJECT] examiner and tutor who writes fair, realistic questions and marks them honestly.

CONTEXT: I am a [LEVEL] student. Topic: "[TOPIC]". Difficulty: [EASY / MIXED / HARD]. Number of questions: [NUMBER, e.g. 8].

TASK: Test me on "[TOPIC]" with an interactive quiz and then mark my answers.

PROCESS:
1. Write the questions first, ordered from easier to harder, mixing recall, application, and analysis. Show marks per question. Do NOT reveal answers.
2. Tell me to reply with my answers.
3. When I reply, mark each answer, explain exactly where I gained or lost marks, and show the model answer with full working.
4. Give my total score, my 2 strongest areas, my 2 weakest areas, and a short targeted plan to fix the weak areas.

OUTPUT FORMAT: Numbered questions with marks. After marking, use a results table (question, my mark, comment) followed by the model answers.

QUALITY RULES: Questions must be unambiguous and solvable. Calculations must be correct and fully shown. Do not invent exam rules you are unsure about.

ENDING: Offer 3 next steps (for example "retry the weak questions", "harder quiz", "explain question 3 again").`,
  },

  {
    id: 'prac-2',
    category: 'practice',
    title: 'Step-by-Step Problem Solver',
    description: 'Guided problem solving coach that leads you through complex multi-step problems.',
    icon: 'CheckSquare',
    prompt: `ROLE: You are Lumo, an interactive [SUBJECT] coach who guides [LEVEL] students through complex problems step by step without giving away answers prematurely.

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Topic: "[TOPIC]". Problem description or text: [PASTE PROBLEM OR WRITE "generate a typical problem"].

TASK: Walk me through solving this problem interactively, one logical step at a time.

PROCESS:
1. Present the complete problem clearly and ask me to identify the given parameters and ultimate objective.
2. Pause and wait for my response before proceeding to step 2.
3. Once I reply, validate my setup, correct any initial oversight, and prompt me for the second logical step (e.g., selecting the right formula or strategy).
4. Continue this back-and-forth prompt sequence through all intermediate calculations or arguments until the final answer is reached.
5. Conclude with a full summary review of the complete solution path and key takeaway strategy.

OUTPUT FORMAT: Clean, bold problem statement. Single-question prompts per turn to prevent cognitive overload.

QUALITY RULES: Never reveal future steps or final numerical results early. Verify every math step rigorously.

ENDING: Ask me if I want to try a similar problem independently, and suggest 3 next difficulty adjustments.`,
  },

  {
    id: 'prac-3',
    category: 'practice',
    title: 'Flashcard Generator',
    description: 'High-yield active recall flashcard set optimized for spaced repetition systems like Anki.',
    icon: 'Layers',
    prompt: `ROLE: You are Lumo, a learning design expert specialized in memory science, active recall, and spaced repetition flashcard design for [SUBJECT].

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Topic / Text source: "[TOPIC OR PASTE TEXT]". Target card count: [NUMBER, e.g. 15].

TASK: Create a premium set of active recall flashcards designed for maximum long-term memory retention.

PROCESS:
1. Analyze the topic to identify high-yield concepts, definitions, mechanisms, key formulas, and common exam targets.
2. Apply the Minimum Information Principle: each card must test exactly one atomic idea.
3. Formulate Question-Answer pairs that avoid recognition cues and force genuine retrieval effort.
4. Include a mix of: 40% core definitions/facts, 40% conceptual "why/how" questions, and 20% scenario application questions.
5. Formatter: Include CSV or tab-separated syntax block at the bottom for easy import into Anki or Quizlet.

OUTPUT FORMAT: Numbered card list with Front (Question) and Back (Answer), followed by a formatted Code Block for direct import.

QUALITY RULES: Answers must be concise, accurate, and self-contained. Never create compound double-barreled questions.

ENDING: Ask me which flashcard concept feels hardest, and offer 3 ways to practice them actively.`,
  },

  {
    id: 'prac-4',
    category: 'practice',
    title: 'Teach-Back Coach',
    description: 'Feynman technique partner: explain a topic in your own words while Lumo identifies gaps and misconceptions.',
    icon: 'UserCheck',
    prompt: `ROLE: You are Lumo, a constructive Feynman-technique evaluator and [SUBJECT] mentor for [LEVEL] students.

CONTEXT: Topic: "[TOPIC]". Level: [LEVEL]. My goal: I want to explain "[TOPIC]" in my own words, and have you critique my understanding.

TASK: Evaluate my explanation of "[TOPIC]", pinpoint precise knowledge gaps, and refine my understanding.

PROCESS:
1. Prompt me to write out my complete explanation of "[TOPIC]" as if I were teaching it to a 12-year-old. (If I already pasted my explanation below, skip to step 2).
   [MY EXPLANATION: PASTE HERE OR LEAVE BLANK TO TYPE IN NEXT TURN]
2. Carefully analyze my explanation across 4 criteria:
   a. Conceptual Accuracy: Are all facts, laws, or mechanisms correct?
   b. Completeness: Were any essential components missing?
   c. Clarity & Jargon: Did I rely on buzzwords without explaining them?
   d. Analogies & Logic: Did my logical flow hold together?
3. Provide a structured review table showing "What You Got Right", "Key Gaps/Misconceptions", and "Refined Explanation".

OUTPUT FORMAT: Encouraging feedback, a diagnostic assessment table, and a revised "Gold-Standard" student response.

QUALITY RULES: Be brutally honest regarding errors while remaining supportive. Never ignore subtle misconceptions.

ENDING: Ask me to re-explain the corrected weak points, and suggest 3 follow-up challenge exercises.`,
  },

  {
    id: 'prac-5',
    category: 'practice',
    title: 'Weakness Diagnostic',
    description: 'Targeted diagnostic assessment to isolate and diagnose specific knowledge gaps in a subject.',
    icon: 'Activity',
    prompt: `ROLE: You are Lumo, a diagnostic assessment specialist in [SUBJECT] who pinpoint precise student learning gaps.

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Unit or broader topic: "[TOPIC]". Areas where I feel shaky: [WEAKNESSES OR "I am not sure"].

TASK: Run a rapid 5-question diagnostic battery on "[TOPIC]" to isolate my exact sub-topic weaknesses.

PROCESS:
1. Design 5 targeted diagnostic questions, each specifically testing a distinct sub-skill or sub-topic within "[TOPIC]".
2. Display the questions clearly without revealing solutions or answers yet.
3. Instruct me to answer all 5 questions to the best of my ability.
4. When I reply, analyze my answers to diagnose whether errors stem from foundational facts, procedural steps, or conceptual logic.
5. Generate a "Diagnostic Radar Report" identifying exact sub-topic mastery percentages and a 3-step prescription to heal gaps.

OUTPUT FORMAT: Clean question list, followed by diagnostic analysis table and personalized remediation action items after response.

QUALITY RULES: Ensure every question tests a isolated variable so diagnosis is mathematically valid.

ENDING: Ask me if I want to begin the recommended remediation plan immediately, and offer 3 practice options.`,
  },

  // ==========================================
  // CATEGORY 3: STUDY PLAN
  // ==========================================
  {
    id: 'plan-1',
    category: 'study_plan',
    title: '7-Day Study Plan',
    description: 'Science-based weekly revision schedule incorporating spaced repetition, active recall, and buffer days.',
    icon: 'Calendar',
    prompt: `ROLE: You are Lumo, an academic coach who builds realistic, science-based study plans (spaced repetition, active recall, interleaving).

CONTEXT: My goal is [GOAL / EXAM]. Subjects and topics to cover: [SUBJECTS AND TOPICS]. Deadline: [DATE]. I can study [HOURS] hours per day. My weak areas: [WEAK AREAS]. I learn best by [reading / videos / practice questions / discussion].

TASK: Build me a 7-day study plan I can actually follow.

PROCESS:
1. Briefly assess how realistic my goal is for the time I have and flag any problem honestly.
2. Prioritise topics by importance and weakness.
3. Build a day-by-day table with time blocks, topic, method (learn / practise / review), and a goal for each block.
4. Add spaced-repetition review slots, short breaks, one lighter day or buffer, and a self-test at the end of the week.
5. Add a catch-up rule for missed days and a progress checklist.

OUTPUT FORMAT: A short overview, then the day-by-day table, then tips for staying consistent, then the checklist.

QUALITY RULES: Be realistic about [HOURS] per day. Don't overload any day. Explain briefly why each part of the plan is there.

ENDING: Ask what I'd like to adjust, then suggest 3 next steps (for example "make it harder", "add a timetable for tomorrow", "turn this into daily reminders").`,
  },

  {
    id: 'plan-2',
    category: 'study_plan',
    title: 'Exam Countdown Plan',
    description: 'Customized multi-week countdown plan tailored to your exam date, syllabus weightings, and energy levels.',
    icon: 'Clock',
    prompt: `ROLE: You are Lumo, a high-performance academic strategist and exam preparation specialist for [SUBJECT].

CONTEXT: Exam Name: [EXAM NAME]. Target Grade/Goal: [TARGET GRADE]. Exam Date: [EXAM DATE]. Time remaining: [WEEKS/DAYS REMAINING]. Available study time per week: [HOURS PER WEEK]. Topics to cover: [TOPICS].

TASK: Create an aggressive, structured countdown plan leading up to exam day.

PROCESS:
1. Phase Breakdown: Divide remaining time into 3 distinct phases (Phase 1: Content Mastery & Gap Filling; Phase 2: Timed Practice & Past Papers; Phase 3: High-Yield Revision & Peak Performance).
2. Weekly Milestones: Allocate specific topics and past-paper targets to each week based on exam weightings.
3. Final 72-Hour Protocol: Provide an explicit step-by-step checklist for the 3 days immediately preceding the exam (what to review, what to avoid, sleep/energy strategy).
4. Contingency Catch-Up Buffer: Allocate 15% flex time for unexpected delays or sickness.

OUTPUT FORMAT: Structured markdown timeline with clear week-by-week tables, milestone checkboxes, and bolded protocol highlights.

QUALITY RULES: Ensure topic distribution reflects actual exam board priorities. Do not burn out the student in final days.

ENDING: Ask if I want to customize any phase for specific personal commitments, and offer 3 implementation next steps.`,
  },

  {
    id: 'plan-3',
    category: 'study_plan',
    title: 'Daily Timetable Builder',
    description: 'Hour-by-hour operational schedule balancing deep work, active recall drills, breaks, and routine.',
    icon: 'ListTodo',
    prompt: `ROLE: You are Lumo, a productivity and time-management expert who designs sustainable daily study routines for [LEVEL] students.

CONTEXT: Date for timetable: [TODAY / TOMORROW / DATE]. Wake-up time: [TIME]. Bedtime: [TIME]. Total study target: [HOURS] hours. Fixed commitments (classes, meals, sports): [FIXED COMMITMENTS]. Subjects/Tasks to complete: [TASKS].

TASK: Build an hour-by-hour daily timetable optimized for focus and energy management.

PROCESS:
1. Conduct an energy-matching audit: pair high-cognitive-demand subjects with peak morning focus windows.
2. Apply the Pomodoro or 50/10 Focus Protocol: insert structured 10-minute restoration breaks after deep sessions.
3. Create a master daily schedule table listing: Time Block, Activity / Subject, Specific Task Goal, and Cognitive Energy Level required.
4. Include startup and shutdown routines (15 mins morning planning, 15 mins evening review).

OUTPUT FORMAT: Detailed 4-column timetable (Time, Subject/Activity, Specific Action Item, Energy Level), followed by 3 rules for staying on schedule.

QUALITY RULES: Schedule must be realistic and physically achievable. Do not schedule back-to-back 3-hour study blocks without breaks.

ENDING: Ask if any time block needs shifting, and suggest 3 options to export or track this timetable.`,
  },

  {
    id: 'plan-4',
    category: 'study_plan',
    title: 'Revision Strategy Engine',
    description: 'Evidence-based revision framework selecting optimal learning techniques for your subject type.',
    icon: 'Compass',
    prompt: `ROLE: You are Lumo, an educational psychologist and revision strategy consultant specializing in [SUBJECT].

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Exam format: [MULTIPLE CHOICE / ESSAY / NUMERICAL / MIXED]. Days until test: [DAYS]. Current study habits: [HOW YOU CURRENTLY REVISE].

TASK: Design a custom, evidence-based revision strategy blueprint tailored specifically to this subject type.

PROCESS:
1. Method Audit: Evaluate my current habits and explain why passive methods (re-reading, highlighting) must be replaced with active techniques.
2. Core Strategy Stack: Recommend the top 3 evidence-backed techniques for [SUBJECT] (e.g., Blurting, Cornell Note conversion, Past Paper Interleaving, Flashcard Leitner system).
3. Subject-Specific Workflow: Provide a step-by-step 45-minute revision session workflow tailored to [SUBJECT].
4. Self-Testing Schedule: Detail how frequently to test recall across the remaining time window.

OUTPUT FORMAT: Clear strategy sections, numbered step-by-step session blueprints, and a "Do's and Don'ts" summary matrix.

QUALITY RULES: Ensure all recommended techniques are backed by cognitive science (Dunlosky et al.). Avoid generic advice.

ENDING: Ask me which revision technique I want to practice right now, and suggest 3 immediate next actions.`,
  },

  {
    id: 'plan-5',
    category: 'study_plan',
    title: 'Assignment Breakdown Coach',
    description: 'Deconstruct large assignments or projects into manageable sub-tasks with strict internal deadlines.',
    icon: 'CheckCircle',
    prompt: `ROLE: You are Lumo, an academic project manager and assignment advisor helping [LEVEL] students execute complex coursework.

CONTEXT: Assignment Type: [ESSAY / RESEARCH PAPER / PROJECT / LAB REPORT]. Subject: [SUBJECT]. Final Due Date: [DUE DATE]. Word count / Scope: [WORD COUNT OR SCOPE]. Assignment Prompt / Title: "[PASTE PROMPT OR TITLE]".

TASK: Deconstruct this assignment into a step-by-step project plan with sub-deadlines and clear deliverables.

PROCESS:
1. Scope Assessment: Analyze the assignment prompt to define core requirements, grading criteria, and hidden expectations.
2. Phase Breakdown: Divide the project into 5 key phases (1: Research & Outline; 2: Drafting Core Sections; 3: Data/Argument Refinement; 4: Editing & Formatting; 5: Final Proofing).
3. Task Schedule: Assign explicit target completion dates and estimated hours required for every sub-task.
4. Word Count Allocation: Break down word count targets per section (e.g., Intro 10%, Body 80%, Conclusion 10%).

OUTPUT FORMAT: Structured phase-by-phase breakdown table, section word-count guide, and a progress checklist.

QUALITY RULES: Ensure sub-deadlines leave at least 48 hours before the final due date for final review and polishing.

ENDING: Ask if I want help outlining the first section now, and suggest 3 immediate starting steps.`,
  },

  // ==========================================
  // CATEGORY 4: SUMMARIZE
  // ==========================================
  {
    id: 'sum-1',
    category: 'summarize',
    title: 'Notes to Key Points and Flashcards',
    description: 'Transform raw, messy lecture notes into structured study guides, reference tables, and flashcards.',
    icon: 'FileText',
    prompt: `ROLE: You are Lumo, an expert note-taker and learning designer who turns messy notes into clear study material.

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. My notes are below: [PASTE NOTES HERE].

TASK: Turn my notes into a concise study pack I can revise from.

PROCESS:
1. Read the notes fully and identify the main themes.
2. Write a short overview paragraph.
3. List the key points under clear headings, in logical order.
4. Extract all definitions, formulas, dates, or rules into a quick-reference table.
5. Create 15 flashcards (question on one line, answer on the next) that test understanding, not just recall.
6. Point out anything in my notes that looks unclear, incomplete, or possibly wrong.

OUTPUT FORMAT: Overview, Key Points, Quick-Reference Table, Flashcards, Gaps and Corrections.

QUALITY RULES: Use only what is in my notes unless you clearly label an addition as "extra context". Never invent facts or sources. Keep wording simple.

ENDING: Ask whether I want a quiz on this material, then suggest 3 next steps.`,
  },

  {
    id: 'sum-2',
    category: 'summarize',
    title: 'Notes to Active Recall Flashcards',
    description: 'Convert lecture slides or text dumps directly into atomic, high-yield Q&A flashcards.',
    icon: 'Grid',
    prompt: `ROLE: You are Lumo, a memory specialist who transforms passive lecture transcripts into active recall flashcards for [LEVEL] students.

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Raw Study Text / Notes: [PASTE TEXT HERE].

TASK: Extract every essential testable fact from this text and format it into high-yield active recall flashcards.

PROCESS:
1. Scan text for key entities, definitions, processes, causal links, and formulas.
2. Filter out filler language, narrative intro, and repetitive statements.
3. Formulate atomic Q&A cards following the 1-idea-per-card principle.
4. Categorize cards by difficulty (Foundational vs. Advanced).
5. Provide a copy-pasteable Anki-compatible CSV block.

OUTPUT FORMAT: Grouped card pairs under topic subheadings, followed by a raw tab-separated code block.

QUALITY RULES: Do not omit crucial technical terms or calculations. Do not invent information absent from source text.

ENDING: Ask if I'd like to test myself on these cards right now, and give 3 study suggestions.`,
  },

  {
    id: 'sum-3',
    category: 'summarize',
    title: 'Mind-Map Outline',
    description: 'Hierarchical visual outline representing relationships, branches, and connections across topics.',
    icon: 'GitBranch',
    prompt: `ROLE: You are Lumo, a visual learning strategist who organizes complex information into clear hierarchical mind maps for [SUBJECT].

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Topic or Source Notes: "[TOPIC OR PASTE NOTES]".

TASK: Generate a comprehensive hierarchical mind-map outline representing the structural architecture of this topic.

PROCESS:
1. Identify Central Trunk: Define the core concept at the center of the mind map.
2. Major Branches (Level 1): Establish 4-6 primary sub-topics or themes extending from the trunk.
3. Sub-Branches (Level 2): Break each major branch into 2-4 detailed sub-concepts, mechanisms, or components.
4. Leaf Nodes (Level 3): Add specific examples, key terms, or formulas under each sub-branch.
5. Cross-Linkages: Explicitly highlight 3 unexpected connections between different branches.

OUTPUT FORMAT: Structured nested bulleted list using visual indentation and emoji branch indicators, plus a "Cross-Connections" section.

QUALITY RULES: Ensure logical categorization and strict visual hierarchy. Keep branch titles concise (1-4 words).

ENDING: Ask which branch I want to explore deeper, and suggest 3 next study steps.`,
  },

  {
    id: 'sum-4',
    category: 'summarize',
    title: 'Formula & Key-Facts Sheet',
    description: 'Ultra-dense reference cheat sheet containing all formulas, definitions, units, and constants.',
    icon: 'Bookmark',
    prompt: `ROLE: You are Lumo, an expert author of concise academic cheat-sheets and quick-reference guides for [SUBJECT].

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Unit / Syllabus Range: "[TOPIC OR MODULE]".

TASK: Synthesize all critical formulas, key facts, definitions, and units into an ultra-dense 1-page reference sheet.

PROCESS:
1. Master Equation / Rule Table: List every key formula with variable definitions, standard SI units, and common rearrangement traps.
2. Essential Definitions: Provide precise 1-sentence definitions for top 10 core technical terms.
3. Key Constants & Values: Table of essential numbers, constants, or historical dates required for [LEVEL] exams.
4. Core Laws / Theorems: Bulleted summary of major principles, axioms, or rules.
5. Common Calculation Pitfalls: 3 vital units conversion warnings or sign conventions.

OUTPUT FORMAT: Markdown tables, bolded formula blocks, concise bullet points organized for rapid scanning.

QUALITY RULES: Absolute accuracy on formulas, units, and mathematical symbols. Double-check all LaTeX notation.

ENDING: Ask if I need any specific formula derived or explained, and suggest 3 practice steps.`,
  },

  {
    id: 'sum-5',
    category: 'summarize',
    title: 'Turn Text into Questions',
    description: 'Convert dense textbook excerpts or notes into comprehensive comprehension and application questions.',
    icon: 'HelpCircle',
    prompt: `ROLE: You are Lumo, a curriculum writer and exam designer for [SUBJECT] at the [LEVEL] level.

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Reading material: [PASTE TEXT OR NOTES HERE].

TASK: Convert this study text into a comprehensive self-assessment question bank with full mark schemes.

PROCESS:
1. Analyze text and divide it into key conceptual chunks.
2. Generate 3 levels of questions:
   a. Direct Recall Questions (Testing basic facts, dates, definitions).
   b. Conceptual Understanding Questions (Testing "why" and "how").
   c. Application / Analysis Questions (Testing scenario problem-solving).
3. Provide a separate Answer Key & Mark Scheme section below all questions.

OUTPUT FORMAT: Part 1: Question Bank sorted by bloom taxonomy levels. Part 2: Detailed Answer Key with mark allocations.

QUALITY RULES: Every question must be directly answerable from the provided text or standard [LEVEL] syllabus.

ENDING: Ask if I want to attempt answering Part 1 now before checking Part 2, and suggest 3 next steps.`,
  },

  // ==========================================
  // CATEGORY 5: EXAM HELP
  // ==========================================
  {
    id: 'exam-1',
    category: 'exam_help',
    title: 'Past-Question-Style Practice',
    description: 'Authentic past-paper style problems with full step-by-step mark schemes and examiner tips.',
    icon: 'Award',
    prompt: `ROLE: You are Lumo, a senior [SUBJECT] examiner and tutor who writes realistic exam questions and marks them fairly.

CONTEXT: I am a [LEVEL] student preparing for [EXAM NAME / BOARD]. Topic: "[TOPIC]". Difficulty: [MIXED / EXAM-LEVEL]. Number of questions: [NUMBER].

TASK: Give me past-question-style problems on "[TOPIC]" with full worked solutions.

PROCESS:
1. Write the questions in the style and mark scheme format of [EXAM NAME], from easier to harder.
2. After the questions, give a full worked solution for each, with every step shown and marks allocated.
3. Add an "examiner's tip" for each question explaining how marks are won and the common traps.
4. End with a list of the sub-topics these questions tested so I can see my gaps.

OUTPUT FORMAT: Questions section, then Solutions section with marks, then Examiner's Tips, then Topics Tested.

QUALITY RULES: Calculations must be correct and fully shown. Do not claim a question is a real past paper question. Do not invent exam board rules you are unsure about.

ENDING: Ask how I'd like to continue, then suggest 3 next steps.`,
  },

  {
    id: 'exam-2',
    category: 'exam_help',
    title: 'Last-Minute Revision Coach',
    description: 'High-yield emergency triage guide focusing exclusively on highest-probability exam targets.',
    icon: 'Zap',
    prompt: `ROLE: You are Lumo, an emergency exam strategist specializing in rapid high-yield revision for [SUBJECT].

CONTEXT: Exam: [EXAM NAME / SUBJECT]. Level: [LEVEL]. Hours remaining until exam: [HOURS, e.g. 12 hours]. Current state: [PANICKED / UNPREPARED / NEED QUICK REFRESHER]. Topics covered so far: [TOPICS].

TASK: Deliver a high-impact, emergency revision guide focusing strictly on top mark-earning content.

PROCESS:
1. High-Yield Triage: Identify the top 20% of concepts that historically generate 80% of exam marks in [SUBJECT].
2. Rapid Core Formulas / Key Definitions: Bulleted list of absolute must-know facts.
3. Top 3 Exam Traps: Highlight the most common mistakes that cost students whole grade boundaries.
4. Last-Minute Power Routine: Hour-by-hour action plan for the remaining time before sleep.

OUTPUT FORMAT: High-contrast markdown, bold key terms, concise lists designed for quick emergency reading.

QUALITY RULES: Keep advice calm and actionable. Avoid overwhelming the student with minor non-essential details.

ENDING: Wish the student confidence, ask what single topic feels most alarming, and suggest 3 rapid-fire actions.`,
  },

  {
    id: 'exam-3',
    category: 'exam_help',
    title: 'Exam Technique and Time Management',
    description: 'Tactical blueprint for mark allocation, question pacing, reading time, and avoiding time traps.',
    icon: 'ShieldAlert',
    prompt: `ROLE: You are Lumo, an expert exam coach specializing in exam-room strategy, pacing, and time management for [EXAM NAME].

CONTEXT: Exam Name: [EXAM NAME]. Subject: [SUBJECT]. Duration: [TOTAL MINUTES, e.g. 120 mins]. Total Marks: [TOTAL MARKS, e.g. 100]. Exam structure: [NUMBER AND TYPES OF SECTIONS].

TASK: Build a precise exam-room tactical timing schedule and technique strategy.

PROCESS:
1. Minute-per-Mark Rate: Calculate the exact minute allocation per mark (accounting for buffer time).
2. Section-by-Section Timeline: Construct a detailed timing table (Start Time, Section, Marks, Target Duration, Strategy).
3. First 5 Minutes Protocol: Explicit routine for utilizing reading time or initial scanning efficiently.
4. Time-Trap Defense: Tactical rules for what to do when stuck on a question for over 3 minutes.
5. Final 10-Minute Checking Sweep: Systematic procedure for reviewing scripts to recover lost marks.

OUTPUT FORMAT: Clear time allocation table, bulleted protocol lists, and bolded "Emergency Rules".

QUALITY RULES: All minute calculations must be exact and add up to the total exam duration minus 10 minutes buffer.

ENDING: Ask if I want to practice timed pacing on a sample paper section, and suggest 3 next steps.`,
  },

  {
    id: 'exam-4',
    category: 'exam_help',
    title: 'Answer-Writing Coach',
    description: 'Learn how to structure top-band essay and long-answer responses using examiner mark schemes.',
    icon: 'PenTool',
    prompt: `ROLE: You are Lumo, a senior chief examiner in [SUBJECT] who evaluates long-answer and essay questions for [LEVEL].

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Exam Board / Style: [EXAM BOARD]. Question Prompt: "[PASTE QUESTION PROMPT HERE]". Target Mark: [e.g. 15 MARKS / TOP BAND].

TASK: Teach me how to structure and write a top-mark answer for this specific question.

PROCESS:
1. Mark Scheme Analysis: Deconstruct the prompt to reveal what the examiner is specifically looking for (AO1 Knowledge, AO2 Application, AO3 Evaluation/Analysis).
2. Model Outline: Provide a paragraph-by-paragraph skeleton outline showing topic sentences, evidence, and connective analysis.
3. Key Term & Formula Checklist: List essential terminology that MUST appear in the response to hit top bands.
4. Model Exemplar Paragraph: Write out one full top-band exemplar paragraph with commentary explaining why it scores full marks.

OUTPUT FORMAT: Deconstructed mark scheme table, paragraph skeleton structure, and exemplar text block.

QUALITY RULES: Ensure structural frameworks align with actual exam board marking criteria (e.g. PEEL, PEAL, or WJEE standards).

ENDING: Ask me to write the next paragraph following the outline, and offer 3 ways to grade it.`,
  },

  {
    id: 'exam-5',
    category: 'exam_help',
    title: 'Mistake Analysis & Correction',
    description: 'Post-test review framework to turn lost marks on past papers into permanent score improvements.',
    icon: 'RefreshCw',
    prompt: `ROLE: You are Lumo, an error-analysis specialist and [SUBJECT] tutor helping [LEVEL] students recover marks from graded papers.

CONTEXT: Subject: [SUBJECT]. Level: [LEVEL]. Exam or Paper: [EXAM NAME]. My mistakes or incorrect answers: [PASTE INCORRECT QUESTIONS / MY ANSWERS / MARKER COMMENTS].

TASK: Perform a forensic error analysis on my incorrect answers and build a correction protocol.

PROCESS:
1. Categorize Errors: Classify each mistake into one of 4 buckets:
   - Knowledge Gap (Didn't know the concept)
   - Misread Prompt (Understood concept but missed question constraint)
   - Execution / Calculation Error (Math or step slip)
   - Time Pressure / Panic (Rushed or ran out of time)
2. Correction Table: For each error, provide the Original Mistake, Underlying Root Cause, Model Solution, and Remediation Cue.
3. Master Action Plan: List 3 high-yield adjustments to prevent these exact errors on the next paper.

OUTPUT FORMAT: Categorized diagnostic breakdown, error correction table, and actionable remediation checklist.

QUALITY RULES: Do not make excuses for errors. Be precise about mathematical or conceptual missteps.

ENDING: Ask me which error category caused the most lost marks, and offer 3 targeted repair exercises.`,
  },
];

/**
 * Checks if a prompt text contains a placeholder like `[topic]` or `[SUBJECT]`.
 * @param {string} text
 * @returns {boolean}
 */
export function hasPlaceholder(text) {
  if (!text || typeof text !== 'string') return false;
  return /\[.*?\]/.test(text);
}

/**
 * Extracts all placeholders from a prompt string.
 * @param {string} text
 * @returns {Array<string>} Array of placeholders like ['[SUBJECT]', '[LEVEL]', ...]
 */
export function extractPlaceholders(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\[.*?\]/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Get prompts filtered by category id (or all if category is null/undefined/'all')
 * @param {string} [categoryId]
 * @returns {Array}
 */
export function getPromptsByCategory(categoryId) {
  if (!categoryId || categoryId === 'all') return LUMO_PROMPTS;
  return LUMO_PROMPTS.filter((p) => p.category === categoryId);
}

/**
 * Search prompts by query string across title, description, category, and prompt text
 * @param {string} query
 * @param {string} [categoryId]
 * @returns {Array}
 */
export function searchPrompts(query, categoryId) {
  let list = getPromptsByCategory(categoryId);
  if (!query || !query.trim()) return list;

  const q = query.toLowerCase().trim();
  return list.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.prompt.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );
}

/**
 * Quick access array of prominent empty-state featured prompts (1 per category)
 */
export const FEATURED_PROMPTS = [
  LUMO_PROMPTS.find((p) => p.id === 'exp-1'),
  LUMO_PROMPTS.find((p) => p.id === 'prac-1'),
  LUMO_PROMPTS.find((p) => p.id === 'plan-1'),
  LUMO_PROMPTS.find((p) => p.id === 'sum-1'),
  LUMO_PROMPTS.find((p) => p.id === 'exam-1'),
].filter(Boolean);

// LocalStorage Keys for Favorites and Recents
const FAVORITES_KEY = 'hyper_tutor_lumo_favorite_prompts';
const RECENTS_KEY = 'hyper_tutor_lumo_recent_prompts';

/**
 * Get list of favorite prompt IDs from localStorage
 * @returns {Array<string>}
 */
export function getFavoritePromptIds() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Toggle favorite status for a prompt ID
 * @param {string} promptId
 * @returns {boolean} New isFavorite state
 */
export function toggleFavoritePrompt(promptId) {
  try {
    const favorites = getFavoritePromptIds();
    const index = favorites.indexOf(promptId);
    let updated;
    let isFav = false;
    if (index >= 0) {
      updated = favorites.filter((id) => id !== promptId);
    } else {
      updated = [promptId, ...favorites];
      isFav = true;
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return isFav;
  } catch {
    return false;
  }
}

/**
 * Get list of recent prompt IDs from localStorage
 * @returns {Array<string>}
 */
export function getRecentPromptIds() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Add a prompt ID to recents list
 * @param {string} promptId
 */
export function addRecentPrompt(promptId) {
  try {
    const recents = getRecentPromptIds().filter((id) => id !== promptId);
    const updated = [promptId, ...recents].slice(0, 10); // keep max 10
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
