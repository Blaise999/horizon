"use client";
import { supabase, throwOnError } from "./supabase";

export type Profile = {
  id: string; email: string; first_name: string; last_name: string; phone: string;
  role: "user" | "admin"; avatar_url: string | null; onboarding_complete: boolean;
  preferences: Record<string, unknown>; created_at: string;
};
export type Account = { id: string; user_id: string; kind: "checking" | "savings"; balance: number; currency: "USD" };
export type Transfer = {
  id: string; user_id: string; rail: string; beneficiary: string; amount: number;
  from_account: string; note: string; details: Record<string, unknown>;
  status: "pending" | "approved" | "rejected"; created_at: string; reviewed_at: string | null;
};
export type Transaction = {
  id: string; user_id: string; account_kind: string; amount: number;
  description: string; category: string; created_at: string;
};
export type Notice = { id: string; title: string; message: string; read_at: string | null; created_at: string };

export async function currentProfile(): Promise<Profile> {
  const client = supabase();
  const { data: session, error: sessionErr } = await client.auth.getUser();
  if (sessionErr || !session.user) throw new Error("Please sign in to continue.");
  const profile = throwOnError(await client.from("profiles").select("*").eq("id", session.user.id).single());
  return profile as Profile;
}
export async function signIn(email: string, password: string) {
  const result = await supabase().auth.signInWithPassword({ email, password });
  throwOnError(result);
  return currentProfile();
}
export async function signUp(email: string, password: string, firstName: string, lastName: string) {
  const result = await supabase().auth.signUp({
    email, password, options: { data: { first_name: firstName, last_name: lastName } },
  });
  throwOnError(result);
  return { emailConfirmationRequired: !result.data.session };
}
export async function signOut() { throwOnError(await supabase().auth.signOut()); }
export async function sendResetLink(email: string) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/dashboard/forgotpassword` : undefined;
  throwOnError(await supabase().auth.resetPasswordForEmail(email, { redirectTo }));
}
export async function setNewPassword(password: string) {
  throwOnError(await supabase().auth.updateUser({ password }));
}
export async function updateProfile(fields: Partial<Pick<Profile, "first_name" | "last_name" | "phone" | "avatar_url" | "preferences" | "onboarding_complete">>) {
  const who = await currentProfile();
  const result = await supabase().from("profiles").update(fields).eq("id", who.id).select().single();
  return throwOnError(result) as Profile;
}
export async function getCustomerData() {
  const profile = await currentProfile();
  const client = supabase();
  const [accounts, transactions, transfers, notifications] = await Promise.all([
    client.from("accounts").select("*").eq("user_id", profile.id).order("kind"),
    client.from("transactions").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(120),
    client.from("transfers").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(100),
    client.from("notifications").select("*").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(40),
  ]);
  return {
    profile,
    accounts: throwOnError(accounts) as Account[],
    transactions: throwOnError(transactions) as Transaction[],
    transfers: throwOnError(transfers) as Transfer[],
    notifications: throwOnError(notifications) as Notice[],
  };
}
export type CustomerData = Awaited<ReturnType<typeof getCustomerData>>;
export async function requestTransfer(fields: { rail: string; amount: number; beneficiary: string; account: "checking" | "savings"; note?: string; details?: Record<string, unknown> }) {
  const res = await supabase().rpc("horizon_request_transfer", {
    p_rail: fields.rail, p_amount: fields.amount, p_beneficiary: fields.beneficiary,
    p_account: fields.account, p_note: fields.note ?? "", p_details: fields.details ?? {},
  });
  return throwOnError(res) as string;
}
export async function markRead(ids: string[]) {
  if (!ids.length) return;
  const profile = await currentProfile();
  throwOnError(await supabase().from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids).eq("user_id",profile.id));
}

export async function getAdminData() {
  const me = await currentProfile();
  if (me.role !== "admin") throw new Error("This account does not have admin access.");
  const client = supabase();
  const [profiles, accounts, transfers, transactions, audit] = await Promise.all([
    client.from("profiles").select("*").order("created_at",{ ascending:false }).limit(500),
    client.from("accounts").select("*").limit(1000),
    client.from("transfers").select("*").order("created_at",{ ascending:false }).limit(500),
    client.from("transactions").select("*").order("created_at",{ ascending:false }).limit(500),
    client.from("admin_audit").select("*").order("created_at",{ ascending:false }).limit(100),
  ]);
  return {
    me,
    profiles: throwOnError(profiles) as Profile[],
    accounts: throwOnError(accounts) as Account[],
    transfers: throwOnError(transfers) as Transfer[],
    transactions: throwOnError(transactions) as Transaction[],
    audit: throwOnError(audit) as { id:string; admin_id:string; action:string; target_id:string | null; details: Record<string,unknown>;created_at:string }[],
  };
}
export type AdminData = Awaited<ReturnType<typeof getAdminData>>;
export async function reviewTransfer(id:string, action:"approve"|"reject") {
  throwOnError(await supabase().rpc("horizon_review_transfer", { p_transfer_id:id, p_action:action }));
}
export async function adjustBalance(userId:string, account:"checking"|"savings", delta:number, reason:string) {
  throwOnError(await supabase().rpc("horizon_adjust_balance", { p_user_id:userId, p_account:account, p_delta:delta, p_reason:reason }));
}
export async function sendNotice(title:string, message:string, userId?: string) {
  return throwOnError(await supabase().rpc("horizon_send_notice", { p_title:title, p_message:message, p_user_id:userId || null })) as number;
}
