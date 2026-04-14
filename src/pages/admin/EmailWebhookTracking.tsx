import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Trash2,
  RefreshCw,
  Mail,
  AlertCircle,
  TrendingUp,
  Eye,
  Download,
} from "lucide-react";

const EventTypeColors: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  bounced: "bg-red-100 text-red-800",
  complained: "bg-orange-100 text-orange-800",
  opened: "bg-purple-100 text-purple-800",
  clicked: "bg-cyan-100 text-cyan-800",
  unsubscribed: "bg-gray-100 text-gray-800",
  failed: "bg-red-100 text-red-800",
};

interface WebhookEvent {
  id: string;
  event_type: string;
  provider: string;
  recipient_email: string;
  bounce_type?: string;
  bounce_subtype?: string;
  error_message?: string;
  created_at: string;
}

interface BlacklistEntry {
  id: string;
  email: string;
  reason: string;
  bounce_type?: string;
  bounce_subtype?: string;
  created_at: string;
  notes?: string;
}

interface Metrics {
  metric_date: string;
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_complained: number;
  total_opened: number;
  delivery_rate: number;
  bounce_rate: number;
  open_rate: number;
}

interface WebhookConfig {
  id: string;
  provider: string;
  webhook_url: string;
  is_active: boolean;
  last_test_status?: string;
  last_test_at?: string;
}

export default function EmailWebhookTracking() {
  const { toast } = useToast();
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [blacklistEntries, setBlacklistEntries] = useState<BlacklistEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [webhookConfigs, setWebhookConfigs] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventFilter, setEventFilter] = useState<string>("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBlacklistId, setSelectedBlacklistId] = useState<string>("");
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [webhookSecrets, setWebhookSecrets] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    try {
      setLoading(true);

      // Load webhook events
      let query = (supabase as any)
        .from("email_webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (eventFilter) {
        query = query.eq("event_type", eventFilter);
      }
      if (providerFilter) {
        query = query.eq("provider", providerFilter);
      }

      const { data: events, error: eventsError } = await query;
      if (eventsError) throw eventsError;
      setWebhookEvents(events || []);

      // Load blacklist
      const { data: blacklist, error: blacklistError } = await (supabase as any)
        .from("email_blacklist")
        .select("*")
        .order("created_at", { ascending: false });

      if (blacklistError) throw blacklistError;
      setBlacklistEntries(blacklist || []);

      // Load metrics
      const { data: metricsData, error: metricsError } = await (supabase as any)
        .from("email_delivery_metrics")
        .select("*")
        .order("metric_date", { ascending: false })
        .limit(30);

      if (metricsError) throw metricsError;
      setMetrics((metricsData || []).reverse());

      // Load webhook configs
      const { data: configs, error: configError } = await (supabase as any)
        .from("email_webhook_config")
        .select("*");

      if (configError) throw configError;
      setWebhookConfigs(configs || []);

      toast({
        title: "Data loaded",
        description: "Webhook events, blacklist, and metrics updated",
      });
    } catch (error) {
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventFilter, providerFilter]);

  const removeFromBlacklist = async (id: string, email: string) => {
    try {
      setDeleteDialogOpen(false);
      const { error } = await supabase
        .from("email_blacklist")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBlacklistEntries(
        blacklistEntries.filter((entry) => entry.id !== id)
      );
      toast({
        title: "Email removed",
        description: `${email} removed from blacklist`,
      });
    } catch (error) {
      toast({
        title: "Error removing email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const addToBlacklist = async (email: string) => {
    try {
      const { error } = await supabase
        .from("email_blacklist")
        .insert({
          email,
          reason: "manual",
          notes: "Manually added by admin",
        });

      if (error?.code === "23505") {
        // Unique constraint violation
        toast({
          title: "Email already in blacklist",
          description: `${email} is already blacklisted`,
        });
        return;
      }

      if (error) throw error;

      loadData();
      toast({
        title: "Email added",
        description: `${email} added to blacklist`,
      });
    } catch (error) {
      toast({
        title: "Error adding email",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
  };

  const toggleSecretVisibility = (provider: string) => {
    setWebhookSecrets({
      ...webhookSecrets,
      [provider]: !webhookSecrets[provider],
    });
  };

  const deliveryData = metrics.map((m) => ({
    date: new Date(m.metric_date).toLocaleDateString("id-ID", {
      month: "short",
      day: "numeric",
    }),
    Terkirim: m.total_delivered,
    Gagal: m.total_bounced,
    Komplain: m.total_complained,
  }));

  const eventDistribution = [
    {
      name: "Terkirim",
      value: webhookEvents.filter((e) => e.event_type === "delivered").length,
      color: "#10b981",
    },
    {
      name: "Gagal",
      value: webhookEvents.filter((e) => e.event_type === "bounced").length,
      color: "#ef4444",
    },
    {
      name: "Komplain",
      value: webhookEvents.filter((e) => e.event_type === "complained").length,
      color: "#f97316",
    },
    {
      name: "Dibuka",
      value: webhookEvents.filter((e) => e.event_type === "opened").length,
      color: "#8b5cf6",
    },
  ];

  const totalMetrics = {
    sent: webhookEvents.filter((e) => e.event_type === "sent").length,
    delivered: webhookEvents.filter((e) => e.event_type === "delivered").length,
    bounced: webhookEvents.filter((e) => e.event_type === "bounced").length,
    complained: webhookEvents.filter((e) => e.event_type === "complained").length,
    opened: webhookEvents.filter((e) => e.event_type === "opened").length,
  };

  const deliveryRate =
    totalMetrics.sent > 0
      ? ((totalMetrics.delivered / totalMetrics.sent) * 100).toFixed(1)
      : "0";
  const bounceRate =
    totalMetrics.sent > 0
      ? ((totalMetrics.bounced / totalMetrics.sent) * 100).toFixed(1)
      : "0";
  const openRate =
    totalMetrics.delivered > 0
      ? ((totalMetrics.opened / totalMetrics.delivered) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Webhook Tracking</h1>
          <p className="text-gray-600 mt-1">
            Monitor email delivery events and manage bounced addresses
          </p>
        </div>
        <Button onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Muat Ulang
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Terkirim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.delivered}</div>
            <p className="text-xs text-gray-500 mt-1">Dari {totalMetrics.sent} dikirim</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Bounce Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{bounceRate}%</div>
            <p className="text-xs text-gray-500 mt-1">{totalMetrics.bounced} bounced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{deliveryRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Open Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{openRate}%</div>
            <p className="text-xs text-gray-500 mt-1">{totalMetrics.opened} dibuka</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Blacklisted Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blacklistEntries.length}</div>
            <p className="text-xs text-gray-500 mt-1">Email tidak valid</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="events">Webhook Events</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="blacklist">Blacklist</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        {/* Webhook Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Events</CardTitle>
              <CardDescription>
                Last 100 events dari Resend dan SendGrid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="event-filter" className="text-xs">
                      Filter by Event Type
                    </Label>
                    <Select value={eventFilter} onValueChange={setEventFilter}>
                      <SelectTrigger id="event-filter">
                        <SelectValue placeholder="Semua event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Semua event</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="bounced">Bounced</SelectItem>
                        <SelectItem value="complained">Complained</SelectItem>
                        <SelectItem value="opened">Opened</SelectItem>
                        <SelectItem value="clicked">Clicked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="provider-filter" className="text-xs">
                      Filter by Provider
                    </Label>
                    <Select value={providerFilter} onValueChange={setProviderFilter}>
                      <SelectTrigger id="provider-filter">
                        <SelectValue placeholder="Semua provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Semua provider</SelectItem>
                        <SelectItem value="resend">Resend</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          <AlertCircle className="w-4 h-4 inline mr-2" />
                          Tidak ada webhook events
                        </TableCell>
                      </TableRow>
                    ) : (
                      webhookEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Badge className={EventTypeColors[event.event_type]}>
                              {event.event_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{event.recipient_email}</TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline">{event.provider}</Badge>
                          </TableCell>
                          <TableCell>
                            {event.bounce_type && (
                              <div className="text-sm">
                                <span className="font-medium">
                                  {event.bounce_type}
                                </span>
                                {event.bounce_subtype && (
                                  <span className="text-gray-500">
                                    {" "}
                                    - {event.bounce_subtype}
                                  </span>
                                )}
                                {event.error_message && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    {event.error_message}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(event.created_at).toLocaleString("id-ID")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Metrics (30 hari terakhir)</CardTitle>
                <CardDescription>
                  Tren pengiriman email - Terkirim vs Gagal vs Komplain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={deliveryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Terkirim" stroke="#10b981" />
                    <Line type="monotone" dataKey="Gagal" stroke="#ef4444" />
                    <Line type="monotone" dataKey="Komplain" stroke="#f97316" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Distribution</CardTitle>
                <CardDescription>
                  Distribusi event dalam 100 webhook terakhir
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={eventDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {eventDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Blacklist Tab */}
        <TabsContent value="blacklist">
          <Card>
            <CardHeader>
              <CardTitle>Blacklisted Emails</CardTitle>
              <CardDescription>
                Email yang tidak dapat dikirimi (bounced, complained, invalid)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex gap-2">
                  <Input
                    id="new-email"
                    placeholder="Masukkan email untuk di-blacklist"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        const email = (e.target as HTMLInputElement).value;
                        if (email) {
                          addToBlacklist(email);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      const input = document.getElementById(
                        "new-email"
                      ) as HTMLInputElement;
                      if (input.value) {
                        addToBlacklist(input.value);
                        input.value = "";
                      }
                    }}
                  >
                    Tambah ke Blacklist
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Ditambahkan</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blacklistEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4">
                          <AlertCircle className="w-4 h-4 inline mr-2" />
                          Tidak ada email di blacklist
                        </TableCell>
                      </TableRow>
                    ) : (
                      blacklistEntries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-sm">
                            {entry.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{entry.reason}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.bounce_type && (
                              <div>
                                <span className="font-medium">
                                  {entry.bounce_type}
                                </span>
                                {entry.bounce_subtype && (
                                  <span className="text-gray-500">
                                    {" "}
                                    - {entry.bounce_subtype}
                                  </span>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {new Date(entry.created_at).toLocaleDateString(
                              "id-ID"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedBlacklistId(entry.id);
                                setSelectedEmail(entry.email);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure webhook URLs dan secrets dari email providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {webhookConfigs.map((config) => (
                  <div
                    key={config.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg capitalize">
                        {config.provider}
                      </h3>
                      <Badge
                        variant={config.is_active ? "default" : "secondary"}
                      >
                        {config.is_active ? "Aktif" : "Tidak Aktif"}
                      </Badge>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border border-dashed space-y-2">
                      <div className="text-sm">
                        <Label className="text-xs font-semibold text-gray-600">
                          Webhook URL:
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-white border rounded px-2 py-1 text-xs flex-1 overflow-auto">
                            {config.webhook_url}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyWebhookUrl(config.webhook_url)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Copy URL di atas ke dashboard {config.provider} untuk
                          setup webhook
                        </p>
                      </div>
                    </div>

                    {config.last_test_at && (
                      <div className="text-xs text-gray-600">
                        <span>Last test: </span>
                        <span>
                          {new Date(config.last_test_at).toLocaleString("id-ID")}
                        </span>
                        {config.last_test_status && (
                          <Badge
                            className="ml-2"
                            variant={
                              config.last_test_status === "success"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {config.last_test_status}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {webhookConfigs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Belum ada webhook configuration</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Remove from Blacklist?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <code>{selectedEmail}</code> from
            the blacklist? It can receive emails again.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                removeFromBlacklist(selectedBlacklistId, selectedEmail)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Remove from Blacklist
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
