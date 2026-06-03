"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bike, User, CreditCard, CheckCircle2, ChevronRight,
  Search, X, Plus, Building2, Shield, AlertCircle, ArrowLeft,
} from "lucide-react";
import { calcDealershipIncome } from "@/lib/finance/dealership-income";
import { createPendingCommissionRecords } from "@/lib/finance/commission-records";

interface StockBike {
  id: string;
  round_number: string;
  chassis_number: string;
  engine_number: string;
  selling_price: number;
  bike_models: { id: string; name: string; bike_category: string; fuel_type: string } | null;
  bike_colors: { id: string; name: string; hex_code?: string } | null;
}

interface FinanceCompany {
  id: string;
  name: string;
  commission_rate: number;
}

interface InsuranceCompany {
  id: string;
  name: string;
  commission_rate: number;
}

interface CustomerOption {
  id: string;
  full_name: string;
  phone?: string;
  nic?: string;
}

const STEPS = [
  { id: 1, label: "Bike",     icon: Bike },
  { id: 2, label: "Customer", icon: User },
  { id: 3, label: "Payment",  icon: CreditCard },
  { id: 4, label: "Confirm",  icon: CheckCircle2 },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const done   = step.id < current;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                done ? "bg-emerald-500 text-white" : active ? "bg-[#FF4C00] text-white" : "bg-[#F0F0F0] text-[#ABABAB]"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <span className={`text-[11px] font-semibold ${active ? "text-[#FF4C00]" : done ? "text-emerald-600" : "text-[#ABABAB]"}`}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`w-20 h-0.5 mx-2 mb-5 transition-all ${step.id < current ? "bg-emerald-400" : "bg-[#EBEBEB]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Shared label + input wrapper
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="r-label">{label} {required && <span className="text-[#FF4C00]">*</span>}</label>
      {children}
    </div>
  );
}

export default function NewSalePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [bikeSearch, setBikeSearch]     = useState("");
  const [bikes, setBikes]               = useState<StockBike[]>([]);
  const [bikesLoading, setBikesLoading] = useState(false);
  const [selectedBike, setSelectedBike] = useState<StockBike | null>(null);
  const [salePrice, setSalePrice]       = useState("");

  const [customerMode, setCustomerMode]         = useState<"new" | "existing">("new");
  const [customerSearch, setCustomerSearch]     = useState("");
  const [customers, setCustomers]               = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [newCustomer, setNewCustomer]           = useState({ full_name: "", phone: "", nic: "", address: "", email: "" });

  const [paymentType, setPaymentType]           = useState<"cash" | "finance">("cash");
  const [financeCompanies, setFinanceCompanies] = useState<FinanceCompany[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [finance, setFinance]   = useState({ company_id: "", loan_amount: "", approved_amount: "", commission: "", downpayment: "" });
  const [insurance, setInsurance] = useState({ company_id: "", amount: "", commission: "" });
  const [tvsCommission, setTvsCommission] = useState("");
  const [transportCharges, setTransportCharges] = useState("");
  const [documentationCharges, setDocumentationCharges] = useState("");
  const [otherEarnings, setOtherEarnings] = useState("");
  const [discount, setDiscount]           = useState("");

  const searchBikes = useCallback(async (q: string) => {
    setBikesLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("inventory_bikes")
      .select("id, round_number, chassis_number, engine_number, selling_price, bike_models(id, name, bike_category, fuel_type), bike_colors(id, name, hex_code)")
      .eq("status", "in_stock")
      .order("round_number");
    if (q) query = query.ilike("round_number", `%${q}%`);
    const { data } = await query.limit(30);
    setBikes((data as unknown as StockBike[]) || []);
    setBikesLoading(false);
  }, []);

  const searchCustomers = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setCustomers([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("id, full_name, phone, nic")
      .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,nic.ilike.%${q}%`)
      .limit(10);
    setCustomers(data || []);
  }, []);

  useEffect(() => { searchBikes(bikeSearch); }, [bikeSearch, searchBikes]);
  useEffect(() => { searchCustomers(customerSearch); }, [customerSearch, searchCustomers]);
  useEffect(() => {
    const supabase = createClient();
    supabase.from("finance_companies").select("id, name, commission_rate").eq("is_active", true).order("name")
      .then(({ data }) => setFinanceCompanies(data || []));
    supabase.from("insurance_companies").select("id, name, commission_rate").eq("is_active", true).order("name")
      .then(({ data }) => setInsuranceCompanies(data || []));
  }, []);

  const finalPrice  = parseFloat(salePrice) || selectedBike?.selling_price || 0;
  const discountAmt = parseFloat(discount) || 0;
  const totalAmount = finalPrice - discountAmt;
  const dealershipIncome = calcDealershipIncome({
    tvs_commission: parseFloat(tvsCommission) || 0,
    finance_commission: parseFloat(finance.commission) || 0,
    insurance_commission: parseFloat(insurance.commission) || 0,
    transport_charges: parseFloat(transportCharges) || 0,
    documentation_charges: parseFloat(documentationCharges) || 0,
    other_earnings: parseFloat(otherEarnings) || 0,
  });

  function selectBike(bike: StockBike) {
    setSelectedBike(bike);
    setSalePrice(bike.selling_price.toString());
  }

  async function handleSubmit() {
    setSaving(true);
    const supabase = createClient();
    try {
      let customerId: string;
      if (customerMode === "new") {
        const { data: cust, error: custErr } = await supabase.from("customers").insert({ ...newCustomer }).select("id").single();
        if (custErr) throw custErr;
        customerId = cust.id;
      } else {
        if (!selectedCustomer) throw new Error("Please select a customer");
        customerId = selectedCustomer.id;
      }
      const { data: invData } = await supabase.rpc("generate_invoice_number");
      const invoiceNumber = invData || `INV-${Date.now()}`;
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          invoice_number: invoiceNumber,
          bike_id: selectedBike!.id,
          customer_id: customerId,
          selling_price: finalPrice,
          discount: discountAmt,
          total_amount: totalAmount,
          payment_type: paymentType,
          finance_company_id: finance.company_id || null,
          loan_amount: parseFloat(finance.loan_amount) || 0,
          approved_amount: parseFloat(finance.approved_amount) || 0,
          finance_commission: parseFloat(finance.commission) || 0,
          customer_downpayment: parseFloat(finance.downpayment) || 0,
          insurance_company_id: insurance.company_id || null,
          insurance_amount: parseFloat(insurance.amount) || 0,
          insurance_commission: parseFloat(insurance.commission) || 0,
          tvs_commission: parseFloat(tvsCommission) || 0,
          transport_charges: parseFloat(transportCharges) || 0,
          documentation_charges: parseFloat(documentationCharges) || 0,
          other_earnings: parseFloat(otherEarnings) || 0,
          status: "completed",
        })
        .select("id")
        .single();
      if (saleErr) throw saleErr;
      await supabase.from("inventory_bikes").update({ status: "sold" }).eq("id", selectedBike!.id);
      await supabase.from("cr_number_plates").insert({ sale_id: sale.id, bike_id: selectedBike!.id, customer_id: customerId, cr_status: "pending", plate_status: "pending" });

      // ── Pending commission records (revenue recognized when marked Received) ──
      await createPendingCommissionRecords(supabase, sale.id, {
        tvs_commission: parseFloat(tvsCommission) || 0,
        finance_commission: parseFloat(finance.commission) || 0,
        insurance_commission: parseFloat(insurance.commission) || 0,
        transport_charges: parseFloat(transportCharges) || 0,
        documentation_charges: parseFloat(documentationCharges) || 0,
        other_earnings: parseFloat(otherEarnings) || 0,
      });

      // ── Worker commissions (pending until sale commissions are all received) ──
      const saleDate = new Date().toISOString().split("T")[0];
      const { data: workers } = await supabase
        .from("employees")
        .select("id, per_bike_commission")
        .eq("type", "worker")
        .eq("is_active", true)
        .gt("per_bike_commission", 0);

      if (workers && workers.length > 0) {
        const workerIds = workers.map((w) => w.id);
        const { data: attendance } = await supabase
          .from("attendance")
          .select("employee_id, status")
          .eq("date", saleDate)
          .in("employee_id", workerIds)
          .in("status", ["present", "half_day"]);

        const presentIds = new Set((attendance || []).map((a) => a.employee_id));
        const commissions = workers
          .filter((w) => presentIds.has(w.id))
          .map((w) => ({
            sale_id: sale.id,
            employee_id: w.id,
            sale_date: saleDate,
            amount: w.per_bike_commission,
            status: "pending",
          }));

        if (commissions.length > 0) {
          await supabase.from("worker_commissions").insert(commissions);
        }
      }

      toast.success(`Sale completed! Invoice: ${invoiceNumber}. Commissions pending until marked Received.`);
      router.push(`/sales`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to complete sale");
    }
    setSaving(false);
  }

  // ── Summary sidebar (always visible) ────────────────────────────────────────
  function SaleSummary() {
    return (
      <div className="r-card p-5 space-y-4 sticky top-4">
        <p className="text-[11px] font-bold text-[#9A9A9A] uppercase tracking-wider">Sale Summary</p>

        {/* Bike */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-[#ABABAB] uppercase tracking-wider">Bike</p>
          {selectedBike ? (
            <div className="flex items-center gap-2.5 p-3 bg-[#FF4C00]/5 border border-[#FF4C00]/20 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[#FF4C00]/15 flex items-center justify-center flex-shrink-0">
                <Bike className="h-4 w-4 text-[#FF4C00]" />
              </div>
              <div className="min-w-0">
                <p className="text-[12px] font-bold text-[#0A0A0A] truncate">{selectedBike.bike_models?.name}</p>
                <p className="text-[10px] text-[#FF4C00] font-mono">{selectedBike.round_number}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-[#F5F5F5] rounded-xl">
              <p className="text-[11px] text-[#ABABAB]">Not selected</p>
            </div>
          )}
        </div>

        {/* Customer */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-[#ABABAB] uppercase tracking-wider">Customer</p>
          {(customerMode === "new" && newCustomer.full_name) || selectedCustomer ? (
            <div className="p-3 bg-[#F5F5F5] rounded-xl">
              <p className="text-[12px] font-bold text-[#0A0A0A]">
                {customerMode === "new" ? newCustomer.full_name : selectedCustomer?.full_name}
              </p>
              <p className="text-[10px] text-[#9A9A9A]">
                {customerMode === "new" ? newCustomer.phone : selectedCustomer?.phone}
              </p>
            </div>
          ) : (
            <div className="p-3 bg-[#F5F5F5] rounded-xl">
              <p className="text-[11px] text-[#ABABAB]">Not set</p>
            </div>
          )}
        </div>

        {/* Financials */}
        <div className="space-y-2 pt-1 border-t border-[#F0F0F0]">
          {[
            { label: "Vehicle Sale Price", value: finalPrice  > 0 ? `Rs. ${finalPrice.toLocaleString()}`  : "—" },
            { label: "Discount",           value: discountAmt > 0 ? `- Rs. ${discountAmt.toLocaleString()}` : "—" },
            { label: "Customer Pays",      value: totalAmount > 0 ? `Rs. ${totalAmount.toLocaleString()}` : "—" },
            { label: "Payment",            value: paymentType === "cash" ? "Cash" : "Finance" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11px] text-[#9A9A9A]">{label}</span>
              <span className="text-[11px] font-semibold text-[#0A0A0A]">{value}</span>
            </div>
          ))}
        </div>

        {/* Dealership income */}
        {dealershipIncome > 0 && (
          <div className="pt-2 border-t border-[#F0F0F0]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-emerald-700">Dealership Income</span>
              <span className="text-[16px] font-bold text-emerald-600">Rs. {dealershipIncome.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-[#ABABAB] mt-1">Pending until marked Received in Finance</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-xl border border-[#E8E8E8] hover:bg-[#F5F5F5] transition-all flex-shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-[#6B6B6B]" />
        </button>
        <div>
          <h1 className="r-page-title">New Sale</h1>
          <p className="r-page-sub">Complete the sale step by step</p>
        </div>
      </div>

      {/* Step bar */}
      <div className="r-card p-5">
        <StepBar current={step} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5 items-start">

        {/* ── LEFT: Main content ── */}
        <div>

          {/* ── STEP 1: BIKE ── */}
          {step === 1 && (
            <div className="r-card p-6 space-y-5">
              <div>
                <h2 className="r-section-title">Select Bike</h2>
                <p className="text-[11px] text-[#ABABAB] mt-0.5">Choose a bike from in-stock inventory</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
                <input
                  value={bikeSearch}
                  onChange={(e) => setBikeSearch(e.target.value)}
                  placeholder="Search by Round Number..."
                  className="r-input pl-9"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
                {bikesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-[#F5F5F5] animate-pulse" />
                  ))
                ) : bikes.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                      <Bike className="h-6 w-6 text-[#ABABAB]" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#4A4A4A]">No bikes in stock</p>
                  </div>
                ) : (
                  bikes.map((bike) => (
                    <button
                      key={bike.id}
                      onClick={() => selectBike(bike)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        selectedBike?.id === bike.id
                          ? "border-[#FF4C00] bg-[#FF4C00]/5"
                          : "border-[#E8E8E8] hover:border-[#FF4C00]/30 hover:bg-[#FAFAFA]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedBike?.id === bike.id ? "bg-[#FF4C00]/15" : "bg-[#F5F5F5]"}`}>
                        <Bike className={`h-5 w-5 ${selectedBike?.id === bike.id ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#FF4C00]">{bike.round_number}</span>
                          <span className="text-[13px] font-semibold text-[#0A0A0A]">{bike.bike_models?.name}</span>
                          {bike.bike_colors?.hex_code && (
                            <div className="flex items-center gap-1 ml-1">
                              <div className="w-3 h-3 rounded-full border border-[#E8E8E8]" style={{ backgroundColor: bike.bike_colors.hex_code }} />
                              <span className="text-[11px] text-[#9A9A9A]">{bike.bike_colors.name}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[#9A9A9A] font-mono mt-0.5">{bike.chassis_number}</p>
                      </div>
                      <span className="text-[13px] font-bold text-[#0A0A0A] flex-shrink-0">
                        Rs. {bike.selling_price.toLocaleString()}
                      </span>
                      {selectedBike?.id === bike.id && <CheckCircle2 className="h-4 w-4 text-[#FF4C00] flex-shrink-0" />}
                    </button>
                  ))
                )}
              </div>

              {selectedBike && (
                <div className="flex items-end gap-4 p-4 bg-[#FF4C00]/5 rounded-xl border border-[#FF4C00]/20">
                  <div className="flex-1">
                    <label className="r-label">Sale Price (Rs.)</label>
                    <input
                      type="number"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="r-input"
                    />
                  </div>
                  <button onClick={() => setSelectedBike(null)} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-[#FF4C00]/10 text-[#ABABAB] hover:text-[#FF4C00] transition-all flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  disabled={!selectedBike}
                  onClick={() => setStep(2)}
                  className="r-btn-primary disabled:opacity-40"
                >
                  Next: Customer <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: CUSTOMER ── */}
          {step === 2 && (
            <div className="r-card p-6 space-y-5">
              <div>
                <h2 className="r-section-title">Customer Details</h2>
                <p className="text-[11px] text-[#ABABAB] mt-0.5">Add new or select existing customer</p>
              </div>

              <div className="r-tabs w-fit">
                {(["new", "existing"] as const).map((m) => (
                  <button key={m} onClick={() => setCustomerMode(m)} className={m === customerMode ? "r-tab-on" : "r-tab-off"}>
                    {m === "new" ? "New Customer" : "Existing Customer"}
                  </button>
                ))}
              </div>

              {customerMode === "new" ? (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "full_name", label: "Full Name",    required: true,  placeholder: "Customer full name" },
                    { key: "phone",     label: "Phone Number", required: true,  placeholder: "07X XXX XXXX" },
                    { key: "nic",       label: "NIC Number",   required: false, placeholder: "XXXXXXXXXX" },
                    { key: "email",     label: "Email",        required: false, placeholder: "email@example.com" },
                  ].map(({ key, label, required, placeholder }) => (
                    <Field key={key} label={label} required={required}>
                      <input
                        type={key === "email" ? "email" : "text"}
                        value={newCustomer[key as keyof typeof newCustomer]}
                        onChange={(e) => setNewCustomer({ ...newCustomer, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="r-input"
                      />
                    </Field>
                  ))}
                  <div className="col-span-2">
                    <Field label="Address">
                      <input
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                        placeholder="Full address"
                        className="r-input"
                      />
                    </Field>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by name, phone or NIC..."
                      className="r-input pl-9"
                    />
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                          selectedCustomer?.id === c.id ? "border-[#FF4C00] bg-[#FF4C00]/5" : "border-[#E8E8E8] hover:bg-[#FAFAFA]"
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#FF4C00]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-[#FF4C00]">
                            {c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#0A0A0A]">{c.full_name}</p>
                          <p className="text-[11px] text-[#9A9A9A]">{c.phone} · {c.nic}</p>
                        </div>
                        {selectedCustomer?.id === c.id && <CheckCircle2 className="h-4 w-4 text-[#FF4C00]" />}
                      </button>
                    ))}
                    {customerSearch.length >= 2 && customers.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-[12px] text-[#9A9A9A]">No customers found</p>
                        <button
                          onClick={() => setCustomerMode("new")}
                          className="mt-2 text-[11px] text-[#FF4C00] font-semibold flex items-center gap-1 mx-auto hover:underline"
                        >
                          <Plus className="h-3 w-3" /> Add New Customer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(1)} className="r-btn-secondary">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  disabled={customerMode === "new" ? !newCustomer.full_name || !newCustomer.phone : !selectedCustomer}
                  onClick={() => setStep(3)}
                  className="r-btn-primary disabled:opacity-40"
                >
                  Next: Payment <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: PAYMENT ── */}
          {step === 3 && (
            <div className="r-card p-6 space-y-5">
              <div>
                <h2 className="r-section-title">Payment Details</h2>
                <p className="text-[11px] text-[#ABABAB] mt-0.5">Choose payment method and add commission details</p>
              </div>

              {/* Payment type */}
              <div className="grid grid-cols-2 gap-3">
                {(["cash", "finance"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPaymentType(type)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      paymentType === type ? "border-[#FF4C00] bg-[#FF4C00]/5" : "border-[#E8E8E8] hover:border-[#FF4C00]/20"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${paymentType === type ? "bg-[#FF4C00]/15" : "bg-[#F5F5F5]"}`}>
                      {type === "cash"
                        ? <span className={`text-sm ${paymentType === type ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`}>₨</span>
                        : <Building2 className={`h-4 w-4 ${paymentType === type ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />}
                    </div>
                    <p className={`text-[13px] font-bold ${paymentType === type ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`}>
                      {type === "cash" ? "Full Cash" : "Finance"}
                    </p>
                    <p className="text-[11px] text-[#9A9A9A] mt-0.5">
                      {type === "cash" ? "Customer pays full amount" : "Via finance company"}
                    </p>
                  </button>
                ))}
              </div>

              {/* Discount + TVS commission */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Discount (Rs.)">
                  <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="r-input" />
                </Field>
                <Field label="TVS Commission (Rs.)">
                  <input type="number" value={tvsCommission} onChange={(e) => setTvsCommission(e.target.value)} placeholder="0" className="r-input" />
                </Field>
              </div>

              {/* Dealership charges (actual revenue) */}
              <div className="space-y-4 p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl">
                <p className="text-[12px] font-semibold text-emerald-800 flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5" /> Dealership Earnings
                  <span className="text-[10px] font-normal text-emerald-600">— counted as revenue</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Transport (Rs.)">
                    <input type="number" value={transportCharges} onChange={(e) => setTransportCharges(e.target.value)} placeholder="0" className="r-input" />
                  </Field>
                  <Field label="Documentation (Rs.)">
                    <input type="number" value={documentationCharges} onChange={(e) => setDocumentationCharges(e.target.value)} placeholder="0" className="r-input" />
                  </Field>
                  <Field label="Other Earnings (Rs.)">
                    <input type="number" value={otherEarnings} onChange={(e) => setOtherEarnings(e.target.value)} placeholder="0" className="r-input" />
                  </Field>
                </div>
                {dealershipIncome > 0 && (
                  <p className="text-[11px] font-semibold text-emerald-700">
                    Total dealership income from this sale: Rs. {dealershipIncome.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Finance details */}
              {paymentType === "finance" && (
                <div className="space-y-4 p-4 bg-blue-50/60 border border-blue-100 rounded-xl">
                  <p className="text-[12px] font-semibold text-blue-800 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> Finance Details
                  </p>
                  <Field label="Finance Company">
                    <select
                      value={finance.company_id}
                      onChange={(e) => setFinance({ ...finance, company_id: e.target.value })}
                      className="r-select"
                    >
                      <option value="">Select finance company...</option>
                      {financeCompanies.map((fc) => (
                        <option key={fc.id} value={fc.id}>{fc.name} ({fc.commission_rate}%)</option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "loan_amount",      label: "Loan Amount (Rs.)" },
                      { key: "approved_amount",  label: "Approved Amount (Rs.)" },
                      { key: "commission",       label: "Finance Commission (Rs.)" },
                      { key: "downpayment",      label: "Customer Downpayment (Rs.)" },
                    ].map(({ key, label }) => (
                      <Field key={key} label={label}>
                        <input
                          type="number"
                          value={finance[key as keyof typeof finance]}
                          onChange={(e) => setFinance({ ...finance, [key]: e.target.value })}
                          placeholder="0"
                          className="r-input"
                        />
                      </Field>
                    ))}
                  </div>
                </div>
              )}

              {/* Insurance */}
              <div className="space-y-4 p-4 bg-[#FAFAFA] border border-[#E8E8E8] rounded-xl">
                <p className="text-[12px] font-semibold text-[#4A4A4A] flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5" /> Insurance <span className="text-[#ABABAB] font-normal">(optional)</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-3">
                    <Field label="Insurance Company">
                      <select
                        value={insurance.company_id}
                        onChange={(e) => setInsurance({ ...insurance, company_id: e.target.value })}
                        className="r-select"
                      >
                        <option value="">Select insurance company...</option>
                        {insuranceCompanies.map((ic) => (
                          <option key={ic.id} value={ic.id}>{ic.name} ({ic.commission_rate}%)</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label="Amount (Rs.)">
                    <input type="number" value={insurance.amount} onChange={(e) => setInsurance({ ...insurance, amount: e.target.value })} placeholder="0" className="r-input" />
                  </Field>
                  <Field label="Commission (Rs.)">
                    <input type="number" value={insurance.commission} onChange={(e) => setInsurance({ ...insurance, commission: e.target.value })} placeholder="0" className="r-input" />
                  </Field>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(2)} className="r-btn-secondary">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button onClick={() => setStep(4)} className="r-btn-primary">
                  Review Sale <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: CONFIRM ── */}
          {step === 4 && selectedBike && (
            <div className="r-card p-6 space-y-5">
              <div>
                <h2 className="r-section-title">Review & Confirm</h2>
                <p className="text-[11px] text-[#ABABAB] mt-0.5">Check all details before completing the sale</p>
              </div>

              {/* Detail rows */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#FAFAFA] rounded-xl">
                  <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-2">Bike</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#FF4C00]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Bike className="h-4 w-4 text-[#FF4C00]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#0A0A0A]">{selectedBike.bike_models?.name}</p>
                      <p className="text-[11px] text-[#9A9A9A]">Round {selectedBike.round_number}</p>
                      <p className="text-[10px] text-[#ABABAB] font-mono">{selectedBike.chassis_number}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#FAFAFA] rounded-xl">
                  <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-2">Customer</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#0A0A0A]">
                        {customerMode === "new" ? newCustomer.full_name : selectedCustomer?.full_name}
                      </p>
                      <p className="text-[11px] text-[#9A9A9A]">
                        {customerMode === "new" ? newCustomer.phone : selectedCustomer?.phone}
                      </p>
                      <p className="text-[10px] text-[#ABABAB]">
                        {customerMode === "new" ? newCustomer.nic : selectedCustomer?.nic}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financials breakdown */}
              <div className="p-4 bg-[#FAFAFA] rounded-xl space-y-2.5">
                <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider">Vehicle &amp; Customer</p>
                {[
                  { label: "Vehicle Sale Price", value: `Rs. ${finalPrice.toLocaleString()}` },
                  { label: "Discount",           value: discountAmt > 0 ? `- Rs. ${discountAmt.toLocaleString()}` : "—" },
                  { label: "Customer Pays",      value: `Rs. ${totalAmount.toLocaleString()}` },
                  { label: "Payment Type",       value: paymentType === "cash" ? "Full Cash" : "Finance" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[12px] text-[#6B6B6B]">{label}</span>
                    <span className="text-[12px] font-semibold text-[#0A0A0A]">{value}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2.5">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Expected Dealership Income (Pending)</p>
                {[
                  ...(tvsCommission ? [{ label: "TVS Commission", value: `Rs. ${parseFloat(tvsCommission).toLocaleString()}` }] : []),
                  ...(insurance.commission ? [{ label: "Insurance Commission", value: `Rs. ${parseFloat(insurance.commission).toLocaleString()}` }] : []),
                  ...(finance.commission ? [{ label: "Finance Commission", value: `Rs. ${parseFloat(finance.commission).toLocaleString()}` }] : []),
                  ...(transportCharges ? [{ label: "Transport Charges", value: `Rs. ${parseFloat(transportCharges).toLocaleString()}` }] : []),
                  ...(documentationCharges ? [{ label: "Documentation Charges", value: `Rs. ${parseFloat(documentationCharges).toLocaleString()}` }] : []),
                  ...(otherEarnings ? [{ label: "Other Earnings", value: `Rs. ${parseFloat(otherEarnings).toLocaleString()}` }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[12px] text-emerald-800">{label}</span>
                    <span className="text-[12px] font-semibold text-emerald-900">{value}</span>
                  </div>
                ))}
                <div className="border-t border-emerald-200 pt-2.5 flex items-center justify-between">
                  <span className="text-[13px] font-bold text-emerald-800">Total Expected Income</span>
                  <span className="text-[18px] font-bold text-emerald-600">Rs. {dealershipIncome.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3.5 bg-amber-50 border border-amber-100 rounded-xl">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-[11px] text-amber-700">
                  This will mark the bike as <strong>Sold</strong> and automatically create CR &amp; Number Plate tracking records.
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <button onClick={() => setStep(3)} className="r-btn-secondary">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="r-btn-primary disabled:opacity-60 h-10 px-8"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Confirm Sale</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary sidebar ── */}
        <div className="hidden xl:block">
          <SaleSummary />
        </div>
      </div>
    </div>
  );
}
