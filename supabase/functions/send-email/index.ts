import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface EmailRequest {
  to: string;
  template_type: string;
  user_id?: string;
  variables?: Record<string, string>;
}

interface EmailTemplate {
  subject: string;
  body_html: string;
  body_text?: string;
}

// Get email provider config from app_settings
async function getEmailProvider() {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "email_provider")
      .single();
    
    return data?.value || { type: "resend", enabled: false };
  } catch (err) {
    console.error("Error fetching email provider config:", err);
    return { type: "resend", enabled: false };
  }
}

// Get SMTP config from app_settings
async function getSMTPConfig() {
  try {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "email_smtp_config")
      .single();
    
    return data?.value || null;
  } catch (err) {
    console.error("Error fetching SMTP config:", err);
    return null;
  }
}

// Get email template from database
async function getEmailTemplate(template_type: string): Promise<EmailTemplate | null> {
  try {
    const { data } = await supabase
      .from("email_templates")
      .select("subject, body_html, body_text")
      .eq("type", template_type)
      .eq("is_active", true)
      .single();
    
    return data || null;
  } catch (err) {
    console.error(`Error fetching email template ${template_type}:`, err);
    return null;
  }
}

// Check if email is blacklisted
async function isEmailBlacklisted(email: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("email_blacklist")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();
    
    return !!data;
  } catch (err) {
    // Email not found in blacklist (expected for most emails)
    return false;
  }
}

// Replace variables in template
function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    rendered = rendered.replace(regex, value);
  }
  return rendered;
}

// Send via Resend API
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  from_email: string,
  from_name: string,
  api_key: string
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${from_name} <${from_email}>`,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }

  const result = await response.json();
  return result.id; // Returns email ID from Resend
}

// Send via SendGrid API
async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
  from_email: string,
  from_name: string,
  api_key: string
) {
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from_email, name: from_name },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${error}`);
  }

  return "sent"; // SendGrid returns 202 on success
}

// Log email attempt
async function logEmail(
  recipient_email: string,
  recipient_id: string | undefined,
  template_type: string,
  subject: string,
  body_html: string,
  status: "sent" | "failed",
  error_message?: string
) {
  try {
    await supabase.from("email_logs").insert({
      recipient_email,
      recipient_id: recipient_id || null,
      template_type,
      subject,
      body_html,
      status,
      error_message: error_message || null,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error("Error logging email:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, template_type, user_id, variables = {} } = (await req.json()) as EmailRequest;

    if (!to || !template_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, template_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email template
    const template = await getEmailTemplate(template_type);
    if (!template) {
      return new Response(
        JSON.stringify({ error: `Email template '${template_type}' not found` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is blacklisted
    const blacklisted = await isEmailBlacklisted(to);
    if (blacklisted) {
      await logEmail(to, user_id, template_type, "", "", "failed", "Email address is blacklisted");
      return new Response(
        JSON.stringify({ 
          error: "Email address is blacklisted", 
          details: "This email cannot receive messages",
          logged: true 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Render template with variables
    const subject = renderTemplate(template.subject, variables);
    const body_html = renderTemplate(template.body_html, variables);

    // Get email provider config
    const emailProvider = await getEmailProvider();
    
    if (!emailProvider.enabled) {
      // Store as pending if provider is not configured
      await logEmail(to, user_id, template_type, subject, body_html, "failed", "Email provider not configured");
      return new Response(
        JSON.stringify({ 
          error: "Email provider not configured", 
          logged: true 
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    const apiKey = emailProvider.api_key;

    try {
      if (emailProvider.type === "resend") {
        result = await sendViaResend(
          to,
          subject,
          body_html,
          emailProvider.from_email || "noreply@pyugo.com",
          emailProvider.from_name || "PYU GO",
          apiKey
        );
      } else if (emailProvider.type === "sendgrid") {
        result = await sendViaSendGrid(
          to,
          subject,
          body_html,
          emailProvider.from_email || "noreply@pyugo.com",
          emailProvider.from_name || "PYU GO",
          apiKey
        );
      } else {
        throw new Error(`Unsupported email provider: ${emailProvider.type}`);
      }

      // Log successful send
      await logEmail(to, user_id, template_type, subject, body_html, "sent");

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Email sent to ${to}`,
          message_id: result 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (sendError: any) {
      // Log failed send
      await logEmail(to, user_id, template_type, subject, body_html, "failed", sendError.message);

      console.error("Error sending email:", sendError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send email", 
          details: sendError.message,
          logged: true 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
