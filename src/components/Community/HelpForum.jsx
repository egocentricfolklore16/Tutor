import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  HelpCircle,
  Plus,
  Search,
  MessageSquare,
  ThumbsUp,
  CheckCircle2,
  Lock,
  Clock,
  Tag,
  Loader2,
  AlertCircle,
  Filter,
  Eye,
} from "lucide-react";
import supabase from "../../lib/supabase";
import Avatar from "../common/Avatar";
import AskQuestionModal from "./AskQuestionModal";

export default function HelpForum({ user, userSubjects = [] }) {
  const navigate = useNavigate();

  const [activeSubTab, setActiveSubTab] = useState("latest"); // 'latest' | 'unanswered' | 'answered' | 'my'
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // 'newest' | 'top'
  const [searchQuery, setSearchQuery] = useState("");

  const [posts, setPosts] = useState([]);
  const [authorsMap, setAuthorsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [showAskModal, setShowAskModal] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      let query = supabase.from("forum_posts").select("*");

      // Filter subtabs
      if (activeSubTab === "unanswered") {
        query = query.eq("answers_count", 0);
      } else if (activeSubTab === "answered") {
        query = query.gt("answers_count", 0);
      } else if (activeSubTab === "my" && user) {
        query = query.eq("author_id", user.id);
      }

      // Subject filter
      if (selectedSubject !== "all") {
        query = query.eq("subject", selectedSubject);
      }

      // Text search
      if (searchQuery.trim()) {
        query = query.textSearch("search_vector", searchQuery.trim(), {
          type: "websearch",
          config: "english",
        });
      }

      // Sorting
      if (sortBy === "top") {
        query = query.order("votes_count", { ascending: false }).order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      query = query.limit(20);

      const { data: postRows, error: postErr } = await query;
      if (postErr) throw postErr;

      const items = postRows || [];
      setPosts(items);

      // Collect author_ids and fetch public profiles
      const authorIds = Array.from(new Set(items.map((p) => p.author_id).filter(Boolean)));
      if (authorIds.length > 0) {
        const profsList = await Promise.all(
          authorIds.map(async (uid) => {
            const { data, error } = await supabase.rpc("get_public_profile", {
              p_user_id: uid,
            });
            if (error) return null;
            return { user_id: uid, ...data };
          })
        );

        const aMap = {};
        profsList.forEach((p) => {
          if (p) aMap[p.user_id] = p;
        });
        setAuthorsMap(aMap);
      } else {
        setAuthorsMap({});
      }
    } catch (err) {
      console.error("Error fetching forum posts:", err);
      setErrorMsg(err.message || "Failed to load forum questions.");
    } finally {
      setLoading(false);
    }
  }, [activeSubTab, selectedSubject, sortBy, searchQuery, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="space-y-6">
      {/* Forum Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-300 mb-1">
            <HelpCircle className="h-4 w-4" /> Peer-to-Peer Help Forum
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            Ask Questions, Get Help, Earn XP
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowAskModal(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" /> Ask Question
        </button>
      </div>

      {/* Sub-tabs & Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-slate-100 p-1 dark:bg-[#18211f]">
            {[
              { id: "latest", label: "Latest" },
              { id: "unanswered", label: "Unanswered" },
              { id: "answered", label: "Answered" },
              { id: "my", label: "My Questions" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition shrink-0 ${
                  activeSubTab === tab.id
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white py-1.5 px-3 text-xs font-bold text-slate-700 outline-none dark:border-slate-700 dark:bg-[#14171c] dark:text-slate-300"
            >
              <option value="newest">Newest First</option>
              <option value="top">Most Upvoted</option>
            </select>
          </div>
        </div>

        {/* Search & Subject Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help questions..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#14171c] dark:text-white"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setSelectedSubject("all")}
              className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                selectedSubject === "all"
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-700 dark:bg-[#14171c] dark:text-slate-300"
              }`}
            >
              All Subjects
            </button>
            {userSubjects.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition shrink-0 ${
                  selectedSubject === sub
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-700 dark:bg-[#14171c] dark:text-slate-300"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions Feed */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs text-slate-500">Loading forum questions...</p>
        </div>
      ) : errorMsg ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <AlertCircle className="h-8 w-8 text-rose-600" />
          <p className="mt-2 text-xs font-bold text-rose-800 dark:text-rose-200">{errorMsg}</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#14171c]">
          <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
            No questions found
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-xs">
            Ask a question to get step-by-step help from fellow learners!
          </p>
          <button
            type="button"
            onClick={() => setShowAskModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Ask First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const author = authorsMap[post.author_id];
            const isClosed = post.status === "closed";
            const hasAcceptedAnswer = Boolean(post.accepted_answer_id);

            return (
              <div
                key={post.id}
                onClick={() => navigate(`/community/help/${post.id}`)}
                className="relative overflow-hidden cursor-pointer rounded-2xl border border-violet-500/20 bg-violet-600 p-4 text-white shadow-surface hover:shadow-surface-hover transition dark:border-white/5 dark:bg-[#18211f] dark:bg-gradient-to-br dark:from-violet-500/10 dark:via-transparent dark:to-transparent dark:hover:border-violet-500/30"
              >
                <div className="absolute -right-5 -top-8 text-white/20 dark:text-violet-400/20 pointer-events-none">
                  <HelpCircle size={120} />
                </div>

                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4 text-white/90 dark:text-violet-400" />
                        <span className="inline-flex items-center gap-1 rounded-2xl bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-violet-950 dark:text-violet-300">
                          {post.subject}
                        </span>
                      </div>

                      {hasAcceptedAnswer && (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/30 text-white dark:bg-emerald-600 px-2 py-0.5 text-[10px] font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Answered
                        </span>
                      )}

                      {isClosed && (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-white/20 text-white dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                          <Lock className="h-3 w-3" /> Closed
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-medium text-white/80 dark:text-gray-400">
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="mt-2 text-base font-bold text-white dark:text-white line-clamp-1">
                    {post.title}
                  </h3>

                  <p className="mt-1 text-xs text-violet-100 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {post.body}
                  </p>

                  {/* Tags */}
                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {post.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white/90 dark:bg-slate-800 dark:text-slate-300"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Author & Footer stats */}
                  <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={author?.user_img}
                        name={author?.full_name}
                        username={author?.username}
                        size="xs"
                        userId={post.author_id}
                      />
                      <span className="font-bold text-white dark:text-slate-200 truncate max-w-[120px]">
                        {author?.full_name || author?.username || "Learner"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-bold text-white/90 dark:text-violet-400">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        {post.votes_count || 0}
                      </span>

                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {post.answers_count || 0}
                      </span>

                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {post.views_count || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ask Question Modal */}
      {showAskModal && (
        <AskQuestionModal
          user={user}
          userSubjects={userSubjects}
          onClose={() => setShowAskModal(false)}
          onSuccess={(postId) => {
            setShowAskModal(false);
            fetchPosts();
            navigate(`/community/help/${postId}`);
          }}
        />
      )}
    </div>
  );
}
