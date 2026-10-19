import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  CheckCircle2,
  Lock,
  Flag,
  Trash2,
  Edit2,
  Send,
  Loader2,
  AlertCircle,
  Eye,
  Check,
  X,
  Sparkles,
  LockKeyholeOpen,
} from "lucide-react";
import supabase from "../../lib/supabase";
import Avatar from "../common/Avatar";
import PageContainer from "../common/PageContainer";

export default function ForumPostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();

  const [currentUserId, setCurrentUserId] = useState(null);
  const [post, setPost] = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [answerAuthorsMap, setAnswerAuthorsMap] = useState({});
  const [myVotes, setMyVotes] = useState(new Set()); // set of target_ids

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // New Answer Input
  const [answerInput, setAnswerInput] = useState("");
  const [postingAnswer, setPostingAnswer] = useState(false);

  // Realtime Banner
  const [hasNewAnswers, setHasNewAnswers] = useState(false);

  // Report Modal
  const [reportTarget, setReportTarget] = useState(null); // { type: 'post'|'answer', id }
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // Edit Post Modal
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchPostDetails = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // 1. Increment view count
      try {
        await supabase.rpc("increment_post_views", { p_post_id: postId });
      } catch {
        // ignore view error
      }

      // 2. Fetch post
      const { data: postData, error: postErr } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (postErr || !postData) throw new Error("Question not found.");

      setPost(postData);
      setEditTitle(postData.title);
      setEditBody(postData.body);

      // Fetch author profile
      if (postData.author_id) {
        const { data: aProf } = await supabase
          .from("community_profiles")
          .select("*")
          .eq("user_id", postData.author_id)
          .maybeSingle();

        setAuthorProfile(aProf);
      }

      // 3. Fetch answers
      const { data: ansRows, error: ansErr } = await supabase
        .from("forum_answers")
        .select("*")
        .eq("post_id", postId);

      if (ansErr) throw ansErr;

      const items = ansRows || [];

      // Sort answers: accepted first, then votes_count desc, then created_at asc
      items.sort((a, b) => {
        if (a.id === postData.accepted_answer_id) return -1;
        if (b.id === postData.accepted_answer_id) return 1;
        if (b.votes_count !== a.votes_count) return b.votes_count - a.votes_count;
        return new Date(a.created_at) - new Date(b.created_at);
      });

      setAnswers(items);

      // Collect answer author profiles
      const ansAuthorIds = Array.from(new Set(items.map((a) => a.author_id).filter(Boolean)));
      if (ansAuthorIds.length > 0) {
        const { data: ansProfs } = await supabase
          .from("community_profiles")
          .select("*")
          .in("user_id", ansAuthorIds);

        const map = {};
        (ansProfs || []).forEach((p) => {
          map[p.user_id] = p;
        });
        setAnswerAuthorsMap(map);
      }

      // 4. Fetch my votes
      if (user) {
        const targetIds = [postId, ...items.map((a) => a.id)];
        const { data: voteRows } = await supabase
          .from("forum_votes")
          .select("target_id")
          .eq("user_id", user.id)
          .in("target_id", targetIds);

        const vSet = new Set((voteRows || []).map((v) => v.target_id));
        setMyVotes(vSet);
      }
    } catch (err) {
      console.error("Error fetching question:", err);
      setErrorMsg(err.message || "Failed to load question details.");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  // Realtime subscription for new answers
  useEffect(() => {
    if (!postId) return;

    const channelName = `forum_answers:${postId}:${crypto.randomUUID()}`;
    const sub = supabase.channel(channelName);

    sub.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "forum_answers",
        filter: `post_id=eq.${postId}`,
      },
      () => {
        setHasNewAnswers(true);
      }
    );

    sub.subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [postId]);

  // Toggle Upvote
  const handleToggleVote = async (targetType, targetId) => {
    if (!currentUserId) return;

    const hasVoted = myVotes.has(targetId);

    try {
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from("forum_votes")
          .delete()
          .eq("target_type", targetType)
          .eq("target_id", targetId)
          .eq("user_id", currentUserId);

        if (error) throw error;

        setMyVotes((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        // Insert vote
        const { error } = await supabase.from("forum_votes").insert({
          target_type: targetType,
          target_id: targetId,
          user_id: currentUserId,
        });

        if (error) {
          if (
            error.message?.toLowerCase().includes("own") ||
            error.message?.toLowerCase().includes("self") ||
            error.code === "P0001"
          ) {
            showToast("You can't vote on your own content.");
            return;
          }
          throw error;
        }

        setMyVotes((prev) => new Set(prev).add(targetId));
      }

      fetchPostDetails();
    } catch (err) {
      console.error("Error toggling vote:", err);
      showToast(err.message || "Could not toggle vote.");
    }
  };

  // Submit Answer
  const handlePostAnswer = async (e) => {
    e.preventDefault();
    if (!currentUserId || !answerInput.trim() || post?.status === "closed") return;

    setPostingAnswer(true);
    try {
      const { error } = await supabase.from("forum_answers").insert({
        post_id: postId,
        body: answerInput.trim(),
      });

      if (error) {
        if (
          error.message?.toLowerCase().includes("fast") ||
          error.message?.toLowerCase().includes("rate limit")
        ) {
          showToast("You are posting too fast. Please wait a moment.");
          return;
        }
        throw error;
      }

      setAnswerInput("");
      fetchPostDetails();
    } catch (err) {
      console.error("Error posting answer:", err);
      showToast(err.message || "Failed to post answer.");
    } finally {
      setPostingAnswer(false);
    }
  };

  // Accept Answer (Question Author only)
  const handleAcceptAnswer = async (answerId) => {
    try {
      const { error } = await supabase.rpc("accept_forum_answer", {
        p_answer_id: answerId,
      });

      if (error) throw error;

      showToast("Answer accepted!");
      fetchPostDetails();
    } catch (err) {
      console.error("Error accepting answer:", err);
      showToast(err.message || "Failed to accept answer.");
    }
  };

  // Submit Report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportTarget || !reportReason.trim() || !currentUserId) return;

    setSubmittingReport(true);
    try {
      const { error } = await supabase.from("forum_reports").insert({
        target_type: reportTarget.type,
        target_id: reportTarget.id,
        reason: reportReason.trim(),
      });

      if (error) {
        if (
          error.code === "23505" ||
          error.message?.toLowerCase().includes("unique") ||
          error.message?.toLowerCase().includes("duplicate")
        ) {
          showToast("Already reported.");
          setReportTarget(null);
          return;
        }
        throw error;
      }

      showToast("Report submitted for review.");
      setReportTarget(null);
      setReportReason("");
    } catch (err) {
      console.error("Error submitting report:", err);
      showToast(err.message || "Failed to submit report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Toggle Post Status (Author)
  const handleTogglePostStatus = async () => {
    if (!post) return;
    const newStatus = post.status === "closed" ? "open" : "closed";
    try {
      const { error } = await supabase
        .from("forum_posts")
        .update({ status: newStatus })
        .eq("id", post.id);

      if (error) throw error;
      fetchPostDetails();
    } catch (err) {
      console.error("Error updating post status:", err);
    }
  };

  // Delete Post (Author)
  const handleDeletePost = async () => {
    if (!post || !window.confirm("Delete this question permanently?")) return;
    try {
      const { error } = await supabase.from("forum_posts").delete().eq("id", post.id);
      if (error) throw error;
      navigate("/community/help");
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  // Update Post (Author)
  const handleSavePostEdit = async (e) => {
    e.preventDefault();
    if (!post) return;
    try {
      const { error } = await supabase
        .from("forum_posts")
        .update({ title: editTitle.trim(), body: editBody.trim() })
        .eq("id", post.id);

      if (error) throw error;
      setEditingPost(false);
      fetchPostDetails();
    } catch (err) {
      console.error("Error updating post:", err);
    }
  };

  if (loading) {
    return (
      <PageContainer maxWidth="max-w-4xl">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-[#14171c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="mt-3 text-xs text-slate-500">Loading question details...</p>
        </div>
      </PageContainer>
    );
  }

  if (errorMsg || !post) {
    return (
      <PageContainer maxWidth="max-w-4xl">
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <AlertCircle className="h-10 w-10 text-rose-600" />
          <p className="mt-3 text-base font-bold text-rose-900 dark:text-rose-200">{errorMsg || "Question not found."}</p>
          <button
            type="button"
            onClick={() => navigate("/community/help")}
            className="mt-4 rounded-2xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700"
          >
            Back to Help Forum
          </button>
        </div>
      </PageContainer>
    );
  }

  const isPostAuthor = currentUserId === post.author_id;

  return (
    <PageContainer maxWidth="max-w-4xl">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-[300] rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl flex items-center gap-2 border border-slate-700">
          <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation */}
      <button
        type="button"
        onClick={() => navigate("/community/help")}
        className="mb-4 inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Help Forum
      </button>

      {/* Realtime Banner if new answers arrived */}
      {hasNewAnswers && (
        <div
          onClick={() => {
            setHasNewAnswers(false);
            fetchPostDetails();
          }}
          className="mb-4 cursor-pointer rounded-2xl bg-emerald-600 p-3 text-center text-xs font-bold text-white shadow-md hover:bg-emerald-700 flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          <span>New answer posted! Click to refresh answers list.</span>
        </div>
      )}

      {/* Main Question Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
        {editingPost ? (
          <form onSubmit={handleSavePostEdit} className="space-y-3">
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
            <textarea
              required
              rows={4}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPost(false)}
                className="rounded-xl bg-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {post.subject}
                </span>

                {post.status === "closed" && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Lock className="h-3.5 w-3.5" /> Closed
                  </span>
                )}
              </div>

              {/* Author Post Controls */}
              {isPostAuthor && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTogglePostStatus}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {post.status === "closed" ? (
                      <>
                        <LockKeyholeOpen className="h-3.5 w-3.5" /> Reopen
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" /> Close
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingPost(true)}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    title="Edit Question"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeletePost}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    title="Delete Question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
              {post.title}
            </h1>

            {/* Author info & post date */}
            <div className="mt-3 flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 text-xs">
              <div
                onClick={() => post.author_id && navigate(`/community/u/${post.author_id}`)}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80"
              >
                <Avatar
                  src={authorProfile?.user_img}
                  name={authorProfile?.full_name}
                  username={authorProfile?.username}
                  size="sm"
                  level={authorProfile?.level}
                />
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {authorProfile?.full_name || authorProfile?.username || "Learner"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Asked {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 font-semibold">
                <Eye className="h-4 w-4" />
                <span>{post.views_count || 0} views</span>
              </div>
            </div>

            {/* Post Body */}
            <div className="mt-4 text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {post.body}
            </div>

            {/* Tags & Vote Action */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <div className="flex flex-wrap gap-1.5">
                {(post.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleVote("post", post.id)}
                  className={`inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition ${
                    myVotes.has(post.id)
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  <ThumbsUp className={`h-4 w-4 ${myVotes.has(post.id) ? "fill-current" : ""}`} />
                  <span>{post.votes_count || 0} Upvotes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportTarget({ type: "post", id: post.id })}
                  className="rounded-2xl p-2 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  title="Report question"
                >
                  <Flag className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Answers Section */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-emerald-600" />
          <span>Answers ({answers.length})</span>
        </h2>

        {answers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-[#14171c]">
            No answers posted yet. Be the first to help out!
          </div>
        ) : (
          answers.map((ans) => {
            const ansAuthor = answerAuthorsMap[ans.author_id];
            const isAccepted = post.accepted_answer_id === ans.id;

            return (
              <div
                key={ans.id}
                className={`rounded-3xl border p-5 shadow-xs transition ${
                  isAccepted
                    ? "border-emerald-500 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-[#14171c]"
                }`}
              >
                {/* Accepted Answer Badge */}
                {isAccepted && (
                  <div className="mb-3 inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                    <CheckCircle2 className="h-4 w-4" /> Accepted Answer
                  </div>
                )}

                <div className="flex items-center justify-between text-xs mb-3">
                  <div
                    onClick={() => ans.author_id && navigate(`/community/u/${ans.author_id}`)}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                  >
                    <Avatar
                      src={ansAuthor?.user_img}
                      name={ansAuthor?.full_name}
                      username={ansAuthor?.username}
                      size="sm"
                      level={ansAuthor?.level}
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {ansAuthor?.full_name || ansAuthor?.username || "Learner"}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {new Date(ans.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Accept Answer button for question author */}
                  {isPostAuthor && !isAccepted && (
                    <button
                      type="button"
                      onClick={() => handleAcceptAnswer(ans.id)}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-xs"
                    >
                      <Check className="h-3.5 w-3.5" /> Accept Answer
                    </button>
                  )}
                </div>

                <div className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {ans.body}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleVote("answer", ans.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-bold transition ${
                      myVotes.has(ans.id)
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <ThumbsUp className={`h-3.5 w-3.5 ${myVotes.has(ans.id) ? "fill-current" : ""}`} />
                    <span>{ans.votes_count || 0} Upvotes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportTarget({ type: "answer", id: ans.id })}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    title="Report answer"
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Answer Composer */}
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#14171c]">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
          Your Answer
        </h3>

        {post.status === "closed" ? (
          <p className="text-xs font-semibold text-slate-500 italic">
            This question has been closed and is no longer accepting new answers.
          </p>
        ) : (
          <form onSubmit={handlePostAnswer} className="space-y-3">
            <textarea
              required
              rows={4}
              value={answerInput}
              onChange={(e) => setAnswerInput(e.target.value)}
              placeholder="Write a clear, helpful solution..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={postingAnswer || !answerInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {postingAnswer ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>Post Answer</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Report Reason Modal */}
      {reportTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs"
          onClick={() => setReportTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#14171c]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Report {reportTarget.type === "post" ? "Question" : "Answer"}
              </h3>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-3">
              <textarea
                required
                rows={3}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason for reporting (e.g. spam, inappropriate content, plagiarism)..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-[#18211f] dark:text-white"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportTarget(null)}
                  className="rounded-2xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {submittingReport && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Submit Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
