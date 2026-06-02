"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Calendar, ChevronLeft, ChevronRight, Save, UserCheck, UserX, Clock, Stethoscope, Umbrella, Sun } from "lucide-react";

type AttendanceStatus = "present" | "absent" | "half_day" | "sick_leave" | "casual_leave" | "holiday";

interface Employee {
  id: string;
  full_name: string;
  type: "director" | "worker";
  employee_code?: string;
  is_active: boolean;
}

interface AttendanceRecord {
  employee_id: string;
  status: AttendanceStatus;
  check_in?: string;
  check_out?: string;
  ot_hours?: number;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; icon: React.ElementType; color: string; bg: string }[] = [
  { value: "present", label: "Present", icon: UserCheck, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  { value: "absent", label: "Absent", icon: UserX, color: "text-red-600", bg: "bg-red-50 border-red-200" },
  { value: "half_day", label: "Half Day", icon: Clock, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  { value: "sick_leave", label: "Sick Leave", icon: Stethoscope, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { value: "casual_leave", label: "Casual Leave", icon: Umbrella, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  { value: "holiday", label: "Holiday", icon: Sun, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
];

function getStatusStyle(status: AttendanceStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
}

export default function AttendancePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [hasExisting, setHasExisting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [empResult, attResult] = await Promise.all([
      supabase.from("employees").select("id, full_name, type, employee_code, is_active").eq("is_active", true).order("full_name"),
      supabase.from("attendance").select("*").eq("date", selectedDate),
    ]);

    const emps = empResult.data || [];
    const existingAtt = attResult.data || [];

    setEmployees(emps);
    setHasExisting(existingAtt.length > 0);

    // Build attendance map: default all to present
    const attMap: Record<string, AttendanceRecord> = {};
    emps.forEach((emp) => {
      const existing = existingAtt.find((a) => a.employee_id === emp.id);
      attMap[emp.id] = existing
        ? { employee_id: emp.id, status: existing.status, check_in: existing.check_in, check_out: existing.check_out, ot_hours: existing.ot_hours }
        : { employee_id: emp.id, status: "present" };
    });
    setAttendance(attMap);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  function setStatus(empId: string, status: AttendanceStatus) {
    setAttendance((prev) => ({ ...prev, [empId]: { ...prev[empId], status } }));
  }

  function markAll(status: AttendanceStatus) {
    const updated = { ...attendance };
    Object.keys(updated).forEach((id) => { updated[id] = { ...updated[id], status }; });
    setAttendance(updated);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    const records = Object.values(attendance).map((rec) => ({
      employee_id: rec.employee_id,
      date: selectedDate,
      status: rec.status,
      check_in: rec.check_in || null,
      check_out: rec.check_out || null,
      ot_hours: rec.ot_hours || 0,
    }));

    const { error } = await supabase
      .from("attendance")
      .upsert(records, { onConflict: "employee_id,date" });

    if (error) toast.error(error.message);
    else {
      toast.success("Attendance saved successfully");
      setHasExisting(true);
    }
    setSaving(false);
  }

  function changeDate(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split("T")[0]);
  }

  const counts = {
    present: Object.values(attendance).filter((a) => a.status === "present").length,
    absent: Object.values(attendance).filter((a) => a.status === "absent").length,
    half_day: Object.values(attendance).filter((a) => a.status === "half_day").length,
    leave: Object.values(attendance).filter((a) => ["sick_leave", "casual_leave"].includes(a.status)).length,
    holiday: Object.values(attendance).filter((a) => a.status === "holiday").length,
  };

  const dateDisplay = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="r-page-title">Attendance</h1>
            <p className="r-page-sub">{employees.length} active employees</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="r-btn-primary disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : hasExisting ? "Update Attendance" : "Save Attendance"}
        </button>
      </div>

      {/* Date picker + summary */}
      <div className="r-card-p flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E8E8E8] hover:bg-[#F5F5F5] transition-all">
            <ChevronLeft className="h-4 w-4 text-[#6B6B6B]" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <Calendar className="h-3.5 w-3.5 text-[#FF4C00]" />
            <span className="text-[13px] font-semibold text-[#0A0A0A]">{dateDisplay}</span>
            {isToday && <span className="r-badge bg-[#FF4C00] text-white">Today</span>}
          </div>
          <button onClick={() => changeDate(1)} disabled={isToday} className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E8E8E8] hover:bg-[#F5F5F5] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <ChevronRight className="h-4 w-4 text-[#6B6B6B]" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="r-input w-auto"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {[
            { label: "Present",  value: counts.present,  cls: "r-badge-green" },
            { label: "Absent",   value: counts.absent,   cls: "r-badge-red" },
            { label: "Half Day", value: counts.half_day, cls: "r-badge-amber" },
            { label: "Leave",    value: counts.leave,    cls: "r-badge-blue" },
          ].map(({ label, value, cls }) => value > 0 ? (
            <span key={label} className={`${cls} text-[11px] font-bold`}>{value} {label}</span>
          ) : null)}
        </div>
      </div>

      {/* Quick mark all */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mr-1">Mark all:</span>
        {STATUS_OPTIONS.slice(0, 3).map((s) => (
          <button
            key={s.value}
            onClick={() => markAll(s.value)}
            className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-semibold border transition-all hover:opacity-80 ${s.bg} ${s.color}`}
          >
            <s.icon className="h-3 w-3" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Attendance List */}
      <div className="r-card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#F5F5F5]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-[#F0F0F0]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F0F0F0] rounded w-40" />
                  <div className="h-3 bg-[#F0F0F0] rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[13px] font-medium text-[#6B6B6B]">No active employees</p>
            <p className="text-[11px] text-[#ABABAB] mt-1">Add employees in the Employees section first</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F5F5F5]">
            {employees.map((emp) => {
              const rec = attendance[emp.id];
              const currentStatus = rec?.status || "present";
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const style = getStatusStyle(currentStatus);

              return (
                <div key={emp.id} className="flex items-center gap-5 px-5 py-3 hover:bg-[#FAFAFA] transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold ${emp.type === "director" ? "bg-[#FF4C00]/15 text-[#FF4C00]" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                    {emp.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>

                  <div className="w-52 flex-shrink-0">
                    <p className="text-[13px] font-semibold text-[#0A0A0A] truncate">{emp.full_name}</p>
                    <p className="text-[11px] text-[#9A9A9A] capitalize">{emp.type}{emp.employee_code ? ` · ${emp.employee_code}` : ""}</p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setStatus(emp.id, s.value)}
                        className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap ${
                          currentStatus === s.value
                            ? `${s.bg} ${s.color}`
                            : "border-[#E8E8E8] text-[#9A9A9A] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] hover:border-[#D0D0D0]"
                        }`}
                      >
                        <s.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {s.label}
                      </button>
                    ))}
                  </div>

                  {currentStatus === "present" && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-[#9A9A9A] font-medium">OT</span>
                      <input
                        type="number"
                        min="0"
                        max="12"
                        step="0.5"
                        value={rec?.ot_hours || ""}
                        onChange={(e) =>
                          setAttendance((prev) => ({
                            ...prev,
                            [emp.id]: { ...prev[emp.id], ot_hours: parseFloat(e.target.value) || 0 },
                          }))
                        }
                        placeholder="0"
                        className="w-14 h-7 px-2 rounded-lg border border-[#E8E8E8] text-[11px] text-center focus:outline-none focus:border-[#FF4C00]"
                      />
                      <span className="text-[11px] text-[#9A9A9A]">hrs</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {employees.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="r-btn-primary disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}
    </div>
  );
}
