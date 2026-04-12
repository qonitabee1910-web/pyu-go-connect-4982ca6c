
import { supabase } from "@/integrations/supabase/client";

/**
 * Utility for OTP (One Time Password) operations
 * In production, this would call a secure Edge Function to send real SMS/Email.
 */
export const otpService = {
  requestOTP: async (userId: string, target: string, type: 'email' | 'phone') => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await (supabase.from("otp_verifications") as any).insert({
      user_id: userId,
      target,
      type,
      code,
      expires_at: expiresAt,
    });

    if (error) throw error;
    console.log(`[MOCK OTP] Sent to ${target}: ${code}`);
    return true;
  },

  verifyOTP: async (userId: string, target: string, code: string) => {
    const { data, error } = await (supabase.from("otp_verifications") as any)
      .select("*")
      .eq("user_id", userId)
      .eq("target", target)
      .eq("code", code)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, message: "Kode OTP tidak valid atau sudah kadaluarsa." };

    await (supabase.from("otp_verifications") as any)
      .update({ verified_at: new Date().toISOString() })
      .eq("id", data.id);

    return { success: true };
  }
};
