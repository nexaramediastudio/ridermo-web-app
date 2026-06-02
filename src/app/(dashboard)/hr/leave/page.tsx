"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Plus, X, Umbrella, CheckCircle2, XCircle,
  Clock, Users, CalendarDays, Search, Trash2,
} from "lucide-react";

interface LeaveRequest {
  id: string;
  type: string;
  from_date: string;
  to_date: string;
  days: number;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  employees: { full_name: string } | null;
}

const LEAVE_TYPES: Record<string, string> = {
  casual: "Casual Leave",
  sick:   "Sick Leave",
  annual: "Annual Leave",
  other:  "Other",
};

const STATUS_CONFIG = {
  pending:  { badge: "r-badge-amber",  label: "Pending"  },
  approved: { badge: "r-badge-green",  label: "Approved" },
  rejected: { badge: "r-badge-red",    label: "Rejected" },
};

export default function LeavePage() {
  const [leaves, setLeaves]         = useState<LeaveRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAdd, setShowAdd]       = useState(false);
  const [employees, setEmployees]   = useState<{ id: string; full_name: string }[]>([]);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [form, setForm]             = useState({ employee_id: "", type: "casual", from_date: "", to_date: "", reason: "" });
  const [saving, setSaving]         = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [leavesRes, empRes] = await Promise.all([
      supabase
        .from("leaves")
        .select("*, employees!leaves_employee_id_fkey(full_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("employees")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name"),
    ]);
    if (leavesRes.error) {
      toast.error("Failed to load leave requests: " + leavesRes.error.message);
    }
    setLeaves((leavesRes.data as unknown as LeaveRequest[]) || []);
    setEmployees(empRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id)  { toast.error("Please select an employee"); return; }
    if (!form.from_date)    { toast.error("Please set a start date");    return; }
    if (!form.to_date)      { toast.error("Please set an end date");     return; }

    const from = new Date(form.from_date);
    const to   = new Date(form.to_date);
    if (to < from) { toast.error("End date must be after start date"); return; }

    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("leaves").insert({ ...form, days, status: "pending" });
    if (error) toast.error(error.message);
    else {
      toast.success("Leave request added");
      setShowAdd(false);
      setForm({ employee_id: "", type: "casual", from_date: "", to_date: "", reason: "" });
      loadData();
    }
    setSaving(false);
  }

  async function deleteLeave(id: string) {
    if (!window.confirm("Delete this leave request?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("leaves").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Leave request deleted"); loadData(); }
  }

  async function updateStatus(id: string, status: "approved" | "rejected") {
    const supabase = createClient();
    const { error } = await supabase.from("leaves").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Leave ${status}`); loadData(); }
  }

  const filtered = leaves.filter((l) => {
    const matchSearch = !search || l.employees?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount  = leaves.filter((l) => l.status === "pending").length;
  const approvedCount = leaves.filter((l) => l.status === "approved").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Umbrella className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="r-page-title">Leave Management</h1>
            <p className="r-page-sub">{pendingCount} pending · {leaves.length} total requests</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="r-btn-primary">
          <Plus className="h-4 w-4" /> Add Leave
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending",  value: pendingCount,  icon: Clock,        color: "text-amber-600" },
          { label: "Approved", value: approvedCount, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Total",    value: leaves.length, icon: Users,        color: "text-[#0A0A0A]" },
        ].map((k) => (
          <div key={k.label} className="r-kpi">
            <div className="flex items-center justify-between mb-3">
              <span className="r-page-sub">{k.label}</span>
              <k.icon className="h-4 w-4 text-[#ABABAB]" />
            </div>
            <p className={`text-2xl font-bold font-display ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="r-card overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-[#F0F0F0] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="r-input pl-9"
            />
          </div>
          <div className="r-tabs">
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? "r-tab-on" : "r-tab-off"}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s].label}
                {s !== "all" && (
                  <span className="ml-1 text-[10px] font-bold text-[#9A9A9A]">
                    {leaves.filter((l) => l.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <span className="ml-auto text-[11px] text-[#ABABAB] font-medium">{filtered.length} requests</span>
        </div>

        <table className="r-table">
          <thead>
            <tr className="r-thead-row">
              <th className="r-th">Employee</th>
              <th className="r-th">Type</th>
              <th className="r-th">From</th>
              <th className="r-th">To</th>
              <th className="r-th">Days</th>
              <th className="r-th">Reason</th>
              <th className="r-th">Requested</th>
              <th className="r-th">Status</th>
              <th className="r-th">Actions</th>
              <th className="r-th w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F5F5F5]">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="r-td">
                      <div className="h-4 bg-[#F0F0F0] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                    <Umbrella className="h-7 w-7 text-[#ABABAB]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[#4A4A4A]">
                    {search || statusFilter !== "all" ? "No matching leave requests" : "No leave requests yet"}
                  </p>
                  <p className="text-[11px] text-[#ABABAB] mt-1">
                    {!search && statusFilter === "all" && "Click 'Add Leave' to create a request"}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((leave) => {
                const sc = STATUS_CONFIG[leave.status];
                return (
                  <tr key={leave.id} className="r-tr group">
                    <td className="r-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] font-bold text-purple-600">
                            {leave.employees?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?"}
                          </span>
                        </div>
                        <span className="text-[13px] font-semibold text-[#0A0A0A]">
                          {leave.employees?.full_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="r-td">
                      <span className="text-[12px] text-[#4A4A4A]">
                        {LEAVE_TYPES[leave.type] || leave.type}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className="text-[12px] text-[#4A4A4A]">
                        {new Date(leave.from_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className="text-[12px] text-[#4A4A4A]">
                        {new Date(leave.to_date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className="text-[13px] font-bold text-[#0A0A0A]">{leave.days}d</span>
                    </td>
                    <td className="r-td">
                      <span className="text-[12px] text-[#6B6B6B] max-w-[180px] truncate block">
                        {leave.reason || "—"}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className="text-[11px] text-[#9A9A9A]">
                        {new Date(leave.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </td>
                    <td className="r-td">
                      <span className={sc.badge}>{sc.label}</span>
                    </td>
                    <td className="r-td">
                        {leave.status === "pending" ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateStatus(leave.id, "approved")}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold hover:bg-emerald-100 transition-all"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                          <button
                            onClick={() => updateStatus(leave.id, "rejected")}
                            className="flex items-center gap-1 h-7 px-2.5 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold hover:bg-red-100 transition-all"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      ) : null}
                    </td>
                    <td className="r-td">
                      <button
                        onClick={() => deleteLeave(leave.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-[#ABABAB] transition-all"
                        title="Delete leave request"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F0F0F0] bg-[#FAFAFA] flex items-center justify-between">
            <span className="text-[11px] text-[#ABABAB]">{filtered.length} of {leaves.length} requests</span>
          </div>
        )}
      </div>

      {/* Add Leave Modal */}
      {showAdd && (
        <div className="r-modal-overlay">
          <div className="absolute inset-0" onClick={() => setShowAdd(false)} />
          <div className="r-modal relative max-w-md w-full">
            <div className="r-modal-header">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                </div>
                <h3 className="text-[15px] font-bold text-[#0A0A0A] font-display">Add Leave Request</h3>
              </div>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5]">
                <X className="h-4 w-4 text-[#6B6B6B]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="r-modal-body">
              <div>
                <label className="r-label">Employee <span className="text-[#FF4C00]">*</span></label>
                <select
                  value={form.employee_id}
                  onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                  required
                  className="r-select"
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="r-label">Leave Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="r-select"
                >
                  {Object.entries(LEAVE_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="r-label">From Date <span className="text-[#FF4C00]">*</span></label>
                  <input
                    type="date"
                    value={form.from_date}
                    onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                    required
                    className="r-input"
                  />
                </div>
                <div>
                  <label className="r-label">To Date <span className="text-[#FF4C00]">*</span></label>
                  <input
                    type="date"
                    value={form.to_date}
                    onChange={(e) => setForm({ ...form, to_date: e.target.value })}
                    required
                    min={form.from_date}
                    className="r-input"
                  />
                </div>
              </div>

              {/* Days preview */}
              {form.from_date && form.to_date && new Date(form.to_date) >= new Date(form.from_date) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F5] rounded-xl">
                  <CalendarDays className="h-3.5 w-3.5 text-[#9A9A9A]" />
                  <span className="text-[12px] text-[#6B6B6B]">
                    Duration: <strong className="text-[#0A0A0A]">
                      {Math.ceil((new Date(form.to_date).getTime() - new Date(form.from_date).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                    </strong>
                  </span>
                </div>
              )}

              <div>
                <label className="r-label">Reason (optional)</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Reason for leave..."
                  rows={3}
                  className="r-textarea"
                />
              </div>
            </form>

            <div className="r-modal-footer">
              <button type="button" onClick={() => setShowAdd(false)} className="r-btn-secondary">Cancel</button>
              <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving} className="r-btn-primary disabled:opacity-60">
                {saving ? "Saving..." : "Add Leave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
