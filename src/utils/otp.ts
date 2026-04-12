
import { supabase } from "@/integrations/supabase/client";

/**
 * Utility for OTP (One Time Password) operations
 * In production, this would call a secure Edge Function to send real SMS/Email.
 */
export const otpService = {
  /**
   * Request an OTP for a target (email or phone)
   */
  requestOTP: async (userId: string, target: string, type: 'email' | 'phone') => {
    // 1. Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // 2. Save to database
    const { error } = await supabase.from("otp_verifications").insert({
      user_id: userId,
      target,
      type,
      code,
      expires_at: expiresAt,
    });

    if (error) throw error;

    // 3. Mock sending (in production, use Twilio or similar)
    console.log(`[MOCK OTP] Sent to ${target}: ${code}`);
    
    // Return a success indicator (no real code returned to client for security)
    return true;
  },

  /**
   * Verify an OTP code
   */
  verifyOTP: async (userId: string, target: string, code: string) => {
    const { data, error } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("user_id", userId)
      .eq("target", target)
      .eq("code", code)
      .is("verified_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error) throw error;
    if (!data) return { success: false, message: "Kode OTP tidak valid atau sudah kadaluarsa." };

    // Mark as verified
    await supabase
      .from("otp_verifications")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", data.id);

    return { success: true };
  }
};
