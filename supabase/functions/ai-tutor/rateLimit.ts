export async function checkRateLimit(supabaseUserClient: any, userId: string): Promise<{ allowed: boolean; count: number }> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { count, error } = await supabaseUserClient
    .from("ai_tutor_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", tenMinutesAgo);

  if (error) {
    console.error("Error checking rate limit:", error);
    return { allowed: true, count: 0 };
  }

  const currentCount = count || 0;
  if (currentCount >= 30) {
    return { allowed: false, count: currentCount };
  }

  await supabaseUserClient.from("ai_tutor_requests").insert({ user_id: userId });

  return { allowed: true, count: currentCount + 1 };
}
