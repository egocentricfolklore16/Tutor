export interface AuthUserResponse {
  data: { user: { id: string } | null } | null;
  error?: any;
}

export interface SupabaseAuthClient {
  getUser: (token: string) => Promise<AuthUserResponse>;
}

export async function verifyAuthorization(
  authHeader: string | null,
  supabaseAuth: SupabaseAuthClient
): Promise<{ status: number; userId?: string; error?: string }> {
  if (!authHeader) {
    return { status: 401, error: "Missing Authorization header" };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseAuth.getUser(token);
  if (userError || !userData?.user) {
    return { status: 401, error: "Unauthorized: Invalid or expired token" };
  }

  return { status: 200, userId: userData.user.id };
}
