"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Bell, CheckCheck, AlertTriangle, Info, CheckCircle2, XCircle, Clock, CreditCard, Hash, DollarSign } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message?: string;
  type: "info" | "warning" | "success" | "error";
  is_read: boolean;
  link?: string;
  created_at: string;
}

interface SystemAlert {
  type: "warning" | "info";
  title: string;
  message: string;
  icon: React.ElementType;
  link?: string;
}

const TYPE_CONFIG = {
  info: { icon: Info, style: "bg-blue-50 text-blue-700 border-blue-100" },
  warning: { icon: AlertTriangle, style: "bg-amber-50 text-amber-700 border-amber-100" },
  success: { icon: CheckCircle2, style: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  error: { icon: XCircle, style: "bg-red-50 text-red-600 border-red-100" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    // Get user notifications
    const { data: { user } } = await supabase.auth.getUser();
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user?.id || "")
      .order("created_at", { ascending: false })
      .limit(50);

    setNotifications(notifs || []);

    // Generate system alerts from real data
    const alerts: SystemAlert[] = [];

    // Check pending cheques due in 3 days
    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);
    const { data: urgentCheques } = await supabase
      .from("cheques")
      .select("id, cheque_number, amount, payment_date")
      .eq("status", "pending")
      .lte("payment_date", in3Days.toISOString().split("T")[0])
      .gte("payment_date", new Date().toISOString().split("T")[0]);

    if ((urgentCheques || []).length > 0) {
      alerts.push({
        type: "warning",
        title: `${urgentCheques!.length} cheque${urgentCheques!.length > 1 ? "s" : ""} due within 3 days`,
        message: urgentCheques!.map((c) => `${c.cheque_number} — Rs. ${c.amount.toLocaleString()}`).join(", "),
        icon: CreditCard,
        link: "/cheques/tvs",
      });
    }

    // Check overdue cheques
    const { data: overdueCheques } = await supabase
      .from("cheques")
      .select("id")
      .eq("status", "pending")
      .lt("payment_date", new Date().toISOString().split("T")[0]);

    if ((overdueCheques || []).length > 0) {
      alerts.push({
        type: "warning",
        title: `${overdueCheques!.length} overdue cheque${overdueCheques!.length > 1 ? "s" : ""}`,
        message: "These cheques have passed their payment date and are still pending",
        icon: AlertTriangle,
        link: "/cheques/tvs",
      });
    }

    // Pending CR records
    const { data: pendingCR } = await supabase
      .from("cr_number_plates")
      .select("id")
      .eq("cr_status", "pending");
    if ((pendingCR || []).length > 0) {
      alerts.push({
        type: "info",
        title: `${pendingCR!.length} pending CR registration${pendingCR!.length > 1 ? "s" : ""}`,
        message: "Vehicle registration documents are awaiting processing",
        icon: Hash,
        link: "/cr-plates",
      });
    }

    // Pending number plates
    const { data: pendingPlates } = await supabase
      .from("cr_number_plates")
      .select("id")
      .eq("plate_status", "pending");
    if ((pendingPlates || []).length > 0) {
      alerts.push({
        type: "info",
        title: `${pendingPlates!.length} number plate${pendingPlates!.length > 1 ? "s" : ""} pending`,
        message: "Number plates are awaiting allocation and delivery",
        icon: Hash,
        link: "/cr-plates",
      });
    }

    // Payroll drafts
    const now = new Date();
    const { data: draftPayroll } = await supabase
      .from("payroll")
      .select("id")
      .eq("month", now.getMonth() + 1)
      .eq("year", now.getFullYear())
      .eq("status", "draft");
    if ((draftPayroll || []).length > 0) {
      alerts.push({
        type: "info",
        title: `${draftPayroll!.length} payroll record${draftPayroll!.length > 1 ? "s" : ""} in draft`,
        message: "Monthly payroll has been calculated but not yet approved",
        icon: DollarSign,
        link: "/hr/payroll",
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        type: "info",
        title: "All clear! No urgent alerts",
        message: "Everything is up to date. Check back later for new notifications.",
        icon: CheckCircle2,
      });
    }

    setSystemAlerts(alerts);
    setLoading(false);
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  async function markAllRead() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user?.id || "");
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success("All marked as read");
  }

  async function markRead(id: string) {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF4C00]/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-[#FF4C00]" />
          </div>
          <div>
            <h1 className="r-page-title">Notifications</h1>
            <p className="r-page-sub">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}` : "All caught up"}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="r-btn-secondary">
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* System Alerts */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider px-0.5">System Alerts</p>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#F5F5F5] rounded-2xl animate-pulse" />
          ))
        ) : (
          systemAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border ${
                alert.type === "warning"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                alert.type === "warning" ? "bg-amber-100" : "bg-blue-100"
              }`}>
                <alert.icon className={`h-4 w-4 ${alert.type === "warning" ? "text-amber-700" : "text-blue-600"}`} />
              </div>
              <div className="flex-1">
                <p className={`text-[13px] font-semibold ${alert.type === "warning" ? "text-amber-800" : "text-blue-800"}`}>
                  {alert.title}
                </p>
                <p className={`text-[11px] mt-0.5 ${alert.type === "warning" ? "text-amber-700" : "text-blue-600"}`}>
                  {alert.message}
                </p>
              </div>
              {alert.link && (
                <a
                  href={alert.link}
                  className={`text-[11px] font-semibold flex-shrink-0 ${alert.type === "warning" ? "text-amber-700" : "text-blue-600"}`}
                >
                  View →
                </a>
              )}
            </div>
          ))
        )}
      </div>

      {/* Activity feed */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider px-0.5">Activity</p>
        {notifications.length === 0 ? (
          <div className="r-card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
              <Bell className="h-7 w-7 text-[#ABABAB]" />
            </div>
            <p className="text-[13px] font-semibold text-[#4A4A4A]">No notifications yet</p>
            <p className="text-[11px] text-[#ABABAB] mt-1">Activity notifications will appear here</p>
          </div>
        ) : (
          <div className="r-card overflow-hidden">
            <div className="divide-y divide-[#F5F5F5]">
              {notifications.map((notif) => {
                const cfg = TYPE_CONFIG[notif.type];
                return (
                  <button
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`w-full flex items-start gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[#FAFAFA] ${!notif.is_read ? "bg-[#FF4C00]/[0.02]" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.style}`}>
                      <cfg.icon className={`h-3.5 w-3.5 ${cfg.style.split(" ")[1]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold ${!notif.is_read ? "text-[#0A0A0A]" : "text-[#4A4A4A]"}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-[11px] text-[#9A9A9A] mt-0.5 truncate">{notif.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-[#FF4C00]" />}
                      <span className="text-[11px] text-[#ABABAB]">
                        {new Date(notif.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
