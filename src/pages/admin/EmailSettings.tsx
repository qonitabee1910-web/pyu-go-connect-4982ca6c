import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Settings, LogOut, Send } from "lucide-react";

export default function EmailSettings() {
  const [activeTab, setActiveTab] = useState("provider");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState("resend");
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("noreply@pyugo.com");
  const [fromName, setFromName] = useState("PYU GO");
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    loadSettings();
    loadTemplates();
    loadLogs();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "email_provider")
        .single();

      if (data?.value) {
        const val = data.value as any;
        setProvider(val.type || "resend");
        setApiKey(val.api_key || "");
        setFromEmail(val.from_email || "noreply@pyugo.com");
        setFromName(val.from_name || "PYU GO");
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data } = await (supabase as any)
        .from("email_templates")
        .select("*")
        .order("type");
      setTemplates(data || []);
    } catch (err) {
      console.error("Error loading templates:", err);
    }
  };

  const loadLogs = async () => {
    try {
      const { data } = await (supabase as any)
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs(data || []);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  const saveConfig = async () => {
    if (!apiKey.trim()) {
      toast.error("API key diperlukan");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .update({
          value: {
            type: provider,
            api_key: apiKey,
            from_email: fromEmail,
            from_name: fromName,
            enabled: true,
          },
        })
        .eq("key", "email_provider");

      if (error) throw error;
      toast.success("Konfigurasi email berhasil disimpan!");
    } catch (err: any) {
      toast.error("Gagal menyimpan konfigurasi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast.error("Email tujuan diperlukan");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/functions/v1/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmail,
          template_type: "welcome_user",
          variables: {
            full_name: "Test User",
            app_name: "PYU GO",
            dashboard_link: "/",
            help_link: "https://help.pyugo.com",
            support_email: "support@pyugo.com",
          },
        }),
      });

      if (response.ok) {
        toast.success("Email test berhasil dikirim!");
      } else {
        toast.error("Gagal mengirim email test");
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplate = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("email_templates")
        .update({ is_active: !isActive })
        .eq("id", templateId);

      if (error) throw error;
      loadTemplates();
      toast.success("Template status berhasil diubah!");
    } catch (err: any) {
      toast.error("Gagal mengubah template: " + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      sent: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      bounced: "bg-gray-100 text-gray-800",
    };
    return <Badge className={colors[status] || ""}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-8 h-8" /> Email Settings
        </h1>
        <p className="text-slate-500 mt-2">Kelola konfigurasi email, template, dan log pengiriman</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="provider">Provider</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
          <TabsTrigger value="test">Test Email</TabsTrigger>
        </TabsList>

        {/* Email Provider Configuration */}
        <TabsContent value="provider" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Provider Configuration</CardTitle>
              <CardDescription>
                Konfigurasi email provider untuk mengirim email sistem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Email Provider</Label>
                  <select
                    id="provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="resend">Resend (Recommended)</option>
                    <option value="sendgrid">SendGrid</option>
                    <option value="smtp">SMTP</option>
                    <option value="mailgun">Mailgun</option>
                  </select>
                  <p className="text-xs text-slate-500">
                    {provider === "resend" && "Provider terpercaya dengan dokumentasi lengkap"}
                    {provider === "sendgrid" && "Solusi enterprise dengan fitur advanced"}
                    {provider === "smtp" && "Konfigurasi SMTP standar"}
                    {provider === "mailgun" && "Platform email API yang powerful"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key / Password</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Masukkan API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Dari dashboard {provider === "resend" ? "Resend" : provider === "sendgrid" ? "SendGrid" : "provider"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="noreply@pyugo.com"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    placeholder="PYU GO"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>💡 Info:</strong> Pastikan email pengirim sudah diverifikasi di dashboard provider Anda.
                </p>
              </div>

              <Button onClick={saveConfig} disabled={loading} className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                {loading ? "Menyimpan..." : "Simpan Konfigurasi"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Kelola template email sistem {templates.length} template tersedia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {templates.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{template.type}</p>
                      <p className="text-sm text-slate-500">{template.subject}</p>
                      <p className="text-xs text-slate-400 mt-1">{template.preview}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {template.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleTemplate(template.id, template.is_active)}
                      >
                        {template.is_active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Logs */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Logs</CardTitle>
              <CardDescription>
                Riwayat pengiriman email {logs.length} log terbaru
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3">Email Tujuan</th>
                      <th className="text-left p-3">Template</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs">{log.recipient_email}</td>
                        <td className="p-3 text-xs">{log.template_type}</td>
                        <td className="p-3">{getStatusBadge(log.status)}</td>
                        <td className="p-3 text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleDateString("id-ID")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Email */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kirim Email Test</CardTitle>
              <CardDescription>
                Verifikasi konfigurasi email dengan mengirim email test
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testEmail">Email Tujuan</Label>
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="admin@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  <strong>⚠️ Catatan:</strong> Email test akan mengirimkan template "welcome_user". Pastikan email tujuan sudah diatur sebelum penerima mendapat email.
                </p>
              </div>

              <Button onClick={sendTestEmail} disabled={loading} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                {loading ? "Mengirim..." : "Kirim Email Test"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
