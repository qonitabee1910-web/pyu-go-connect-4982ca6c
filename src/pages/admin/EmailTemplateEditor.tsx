import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Edit2, Save, X, Eye, Copy } from "lucide-react";

interface EmailTemplate {
  id: string;
  type: string;
  subject: string;
  body_html: string;
  body_text?: string;
  preview?: string;
  is_active: boolean;
  updated_at: string;
}

export default function EmailTemplateEditor() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [editData, setEditData] = useState({
    subject: "",
    body_html: "",
    body_text: "",
    preview: "",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await (supabase as any)
        .from("email_templates")
        .select("*")
        .order("type");
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplate(data[0]);
        setEditData({
          subject: data[0].subject,
          body_html: data[0].body_html,
          body_text: data[0].body_text || "",
          preview: data[0].preview || "",
        });
      }
    } catch (err) {
      console.error("Error loading templates:", err);
      toast.error("Gagal memuat templates");
    }
  };

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(false);
    setEditData({
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || "",
      preview: template.preview || "",
    });
  };

  const saveTemplate = async () => {
    if (!selectedTemplate) return;

    if (!editData.subject.trim() || !editData.body_html.trim()) {
      toast.error("Subject dan body tidak boleh kosong");
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("email_templates")
        .update({
          subject: editData.subject,
          body_html: editData.body_html,
          body_text: editData.body_text || null,
          preview: editData.preview || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTemplate.id);

      if (error) throw error;

      toast.success("Template berhasil disimpan!");
      setIsEditing(false);
      loadTemplates();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTemplateActive = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from("email_templates")
        .update({ is_active: !isActive })
        .eq("id", templateId);

      if (error) throw error;
      toast.success(isActive ? "Template dinonaktifkan" : "Template diaktifkan");
      loadTemplates();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const copyTemplateCode = () => {
    navigator.clipboard.writeText(editData.body_html);
    toast.success("HTML code berhasil disalin!");
  };

  const getTemplateLabel = (type: string) => {
    const labels: Record<string, string> = {
      user_verification: "Verifikasi Email User",
      driver_verification: "Verifikasi Email Driver",
      password_reset: "Reset Password",
      welcome_user: "Welcome User",
      welcome_driver: "Welcome Driver",
      documents_requested: "Documents Requested",
      payment_received: "Payment Received",
      withdrawal_processed: "Withdrawal Processed",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Email Template Editor</h1>
        <p className="text-slate-500 mt-2">Kelola dan edit template email sistem</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Templates</CardTitle>
              <CardDescription>{templates.length} templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => selectTemplate(template)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? "bg-primary/10 border border-primary"
                      : "border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 truncate">
                        {getTemplateLabel(template.type)}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{template.type}</p>
                    </div>
                    {template.is_active ? (
                      <Badge className="bg-green-100 text-green-800 whitespace-nowrap">Active</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 whitespace-nowrap">Inactive</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-3">
          {selectedTemplate ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>{getTemplateLabel(selectedTemplate.type)}</CardTitle>
                  <CardDescription>{selectedTemplate.type}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? "Edit" : "Preview"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => toggleTemplateActive(selectedTemplate.id, selectedTemplate.is_active)}
                    variant={selectedTemplate.is_active ? "destructive" : "default"}
                  >
                    {selectedTemplate.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardHeader>

              {showPreview ? (
                <CardContent className="space-y-4">
                  <div className="border rounded-lg overflow-hidden bg-slate-50 max-h-96 overflow-y-auto">
                    <div
                      className="p-6"
                      dangerouslySetInnerHTML={{ __html: editData.body_html }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Preview of rendered HTML. Variables will be replaced with actual values.
                  </p>
                </CardContent>
              ) : (
                <CardContent className="space-y-6">
                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Email Subject</Label>
                    {isEditing ? (
                      <Input
                        id="subject"
                        value={editData.subject}
                        onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                        placeholder="Email subject"
                        disabled={loading}
                      />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-900">{editData.subject}</p>
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      Available variables: {'{{full_name}}'}, {'{{verification_code}}'}, etc.
                    </p>
                  </div>

                  {/* HTML Body */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="html">HTML Body</Label>
                      {!isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={copyTemplateCode}
                          className="gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </Button>
                      )}
                    </div>
                    {isEditing ? (
                      <textarea
                        id="html"
                        value={editData.body_html}
                        onChange={(e) => setEditData({ ...editData, body_html: e.target.value })}
                        placeholder="HTML content"
                        className="w-full h-48 p-3 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary"
                        disabled={loading}
                      />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 h-48 overflow-y-auto">
                        <pre className="text-xs text-slate-600 whitespace-pre-wrap break-words font-mono">
                          {editData.body_html.substring(0, 500)}...
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Text Body */}
                  <div className="space-y-2">
                    <Label htmlFor="text">Plain Text Body (Optional)</Label>
                    {isEditing ? (
                      <textarea
                        id="text"
                        value={editData.body_text}
                        onChange={(e) => setEditData({ ...editData, body_text: e.target.value })}
                        placeholder="Plain text version (optional)"
                        className="w-full h-24 p-3 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary"
                        disabled={loading}
                      />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
                        {editData.body_text || "(Not set)"}
                      </div>
                    )}
                  </div>

                  {/* Preview Text */}
                  <div className="space-y-2">
                    <Label htmlFor="preview">Preview Text</Label>
                    {isEditing ? (
                      <Input
                        id="preview"
                        value={editData.preview}
                        onChange={(e) => setEditData({ ...editData, preview: e.target.value })}
                        placeholder="Short preview (shown in email clients)"
                        disabled={loading}
                      />
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-600">{editData.preview || "(Not set)"}</p>
                      </div>
                    )}
                  </div>

                  {/* Last Updated */}
                  <div className="text-xs text-slate-500">
                    Last updated: {new Date(selectedTemplate.updated_at).toLocaleDateString(
                      "id-ID",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-slate-200">
                    {isEditing ? (
                      <>
                        <Button onClick={saveTemplate} disabled={loading} className="gap-2 flex-1">
                          <Save className="w-4 h-4" />
                          {loading ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setEditData({
                              subject: selectedTemplate.subject,
                              body_html: selectedTemplate.body_html,
                              body_text: selectedTemplate.body_text || "",
                              preview: selectedTemplate.preview || "",
                            });
                          }}
                          disabled={loading}
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Batal
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setIsEditing(true)} className="gap-2 flex-1">
                        <Edit2 className="w-4 h-4" />
                        Edit Template
                      </Button>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-slate-500">Pilih template untuk diedit</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>💡 Tips:</strong> Gunakan variabel seperti {'{{full_name}}'}, {'{{verification_code}}'}, {'{{reset_link}}'} dalam template. Variabel ini akan otomatis diganti dengan nilai nyata saat email dikirim.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
