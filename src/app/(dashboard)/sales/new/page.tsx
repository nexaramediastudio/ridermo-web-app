"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bike,
  User,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  Search,
  X,
  Plus,
  Building2,
  Shield,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
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

// ─── Step indicator ──────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Bike", icon: Bike },
  { id: 2, label: "Customer", icon: User },
  { id: 3, label: "Payment", icon: CreditCard },
  { id: 4, label: "Confirm", icon: CheckCircle2 },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? "bg-[#FF4C00] text-white"
                    : "bg-[#F0F0F0] text-[#ABABAB]"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
              </div>
              <span
                className={`text-xs font-semibold ${
                  active ? "text-[#FF4C00]" : done ? "text-emerald-600" : "text-[#ABABAB]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-1 mb-5 transition-all ${
                  step.id < current ? "bg-emerald-400" : "bg-[#EFEFEF]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function NewSalePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Bike
  const [bikeSearch, setBikeSearch] = useState("");
  const [bikes, setBikes] = useState<StockBike[]>([]);
  const [bikesLoading, setBikesLoading] = useState(false);
  const [selectedBike, setSelectedBike] = useState<StockBike | null>(null);
  const [salePrice, setSalePrice] = useState("");

  // Step 2: Customer
  const [customerMode, setCustomerMode] = useState<"new" | "existing">("new");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    full_name: "", phone: "", nic: "", address: "", email: "",
  });

  // Step 3: Payment
  const [paymentType, setPaymentType] = useState<"cash" | "finance">("cash");
  const [financeCompanies, setFinanceCompanies] = useState<FinanceCompany[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [finance, setFinance] = useState({
    company_id: "", loan_amount: "", approved_amount: "", commission: "", downpayment: "",
  });
  const [insurance, setInsurance] = useState({
    company_id: "", amount: "", commission: "",
  });
  const [tvsCommission, setTvsCommission] = useState("");
  const [discount, setDiscount] = useState("");

  // ── Loaders ──
  const searchBikes = useCallback(async (q: string) => {
    setBikesLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("inventory_bikes")
      .select("id, round_number, chassis_number, engine_number, selling_price, bike_models(id, name, bike_category, fuel_type), bike_colors(id, name, hex_code)")
      .eq("status", "in_stock")
      .order("round_number");
    if (q) query = query.ilike("round_number", `%${q}%`);
    const { data } = await query.limit(20);
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

  // ── Derived ──
  const finalPrice = parseFloat(salePrice) || selectedBike?.selling_price || 0;
  const discountAmt = parseFloat(discount) || 0;
  const totalAmount = finalPrice - discountAmt;

  function selectBike(bike: StockBike) {
    setSelectedBike(bike);
    setSalePrice(bike.selling_price.toString());
  }

  // ── Submit ──
  async function handleSubmit() {
    setSaving(true);
    const supabase = createClient();

    try {
      // 1. Create or use customer
      let customerId: string;
      if (customerMode === "new") {
        const { data: cust, error: custErr } = await supabase
          .from("customers")
          .insert({ ...newCustomer })
          .select("id")
          .single();
        if (custErr) throw custErr;
        customerId = cust.id;
      } else {
        if (!selectedCustomer) throw new Error("Please select a customer");
        customerId = selectedCustomer.id;
      }

      // 2. Generate invoice number
      const { data: invData } = await supabase.rpc("generate_invoice_number");
      const invoiceNumber = invData || `INV-${Date.now()}`;

      // 3. Create sale
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
          status: "completed",
        })
        .select("id")
        .single();
      if (saleErr) throw saleErr;

      // 4. Update bike status to sold
      await supabase
        .from("inventory_bikes")
        .update({ status: "sold" })
        .eq("id", selectedBike!.id);

      // 5. Create CR & Plate record
      await supabase.from("cr_number_plates").insert({
        sale_id: sale.id,
        bike_id: selectedBike!.id,
        customer_id: customerId,
        cr_status: "pending",
        plate_status: "pending",
      });

      toast.success(`Sale completed! Invoice: ${invoiceNumber}`);
      router.push(`/sales`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to complete sale");
    }

    setSaving(false);
  }

  // ── Render ──
  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#E5E5E5] hover:bg-[#F5F5F5] transition-all"
        >
          <ArrowLeft className="h-4 w-4 text-[#6B6B6B]" />
        </button>
        <div>
          <h2
            className="text-xl font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            New Sale
          </h2>
          <p className="text-sm text-[#9A9A9A]">Complete the sale step by step</p>
        </div>
      </div>

      {/* Step bar */}
      <div className="bg-white rounded-2xl border border-[#EFEFEF] p-6 flex justify-center">
        <StepBar current={step} />
      </div>

      {/* ── STEP 1: BIKE ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-6 space-y-5">
          <h3
            className="text-lg font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Select Bike
          </h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ABABAB]" />
            <input
              value={bikeSearch}
              onChange={(e) => setBikeSearch(e.target.value)}
              placeholder="Search by Round Number..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] transition-all"
            />
          </div>

          {/* Bike List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {bikesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[#F5F5F5] animate-pulse" />
              ))
            ) : bikes.length === 0 ? (
              <div className="text-center py-8 text-[#ABABAB]">
                <Bike className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No bikes in stock</p>
              </div>
            ) : (
              bikes.map((bike) => (
                <button
                  key={bike.id}
                  onClick={() => selectBike(bike)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                    selectedBike?.id === bike.id
                      ? "border-[#FF4C00] bg-[#FF4C00]/5"
                      : "border-[#EFEFEF] hover:border-[#FF4C00]/30 hover:bg-[#FAFAFA]"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      selectedBike?.id === bike.id ? "bg-[#FF4C00]/15" : "bg-[#F5F5F5]"
                    }`}
                  >
                    <Bike className={`h-5 w-5 ${selectedBike?.id === bike.id ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#FF4C00]">{bike.round_number}</span>
                      <span className="text-sm font-semibold text-[#0A0A0A]">{bike.bike_models?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {bike.bike_colors?.hex_code && (
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 rounded-full border border-[#E5E5E5]" style={{ backgroundColor: bike.bike_colors.hex_code }} />
                          <span className="text-xs text-[#9A9A9A]">{bike.bike_colors.name}</span>
                        </div>
                      )}
                      <span className="text-xs text-[#9A9A9A] font-mono">{bike.chassis_number}</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-[#0A0A0A] flex-shrink-0">
                    Rs. {bike.selling_price.toLocaleString()}
                  </span>
                  {selectedBike?.id === bike.id && (
                    <CheckCircle2 className="h-5 w-5 text-[#FF4C00] flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Selected — price override */}
          {selectedBike && (
            <div className="p-4 bg-[#FF4C00]/5 rounded-xl border border-[#FF4C00]/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#FF4C00]">
                  {selectedBike.round_number} — {selectedBike.bike_models?.name}
                </span>
                <button onClick={() => setSelectedBike(null)} className="text-[#ABABAB] hover:text-[#FF4C00]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6B6B6B]">Sale Price (Rs.)</label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full h-10 px-3 mt-1 rounded-xl border border-[#E5E5E5] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              disabled={!selectedBike}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 h-10 px-6 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40"
            >
              Next: Customer <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: CUSTOMER ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-6 space-y-5">
          <h3
            className="text-lg font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Customer Details
          </h3>

          {/* Mode tabs */}
          <div className="flex items-center gap-1 bg-[#F5F5F5] rounded-xl p-1 w-fit">
            {(["new", "existing"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCustomerMode(m)}
                className={`h-8 px-4 rounded-lg text-xs font-semibold transition-all ${
                  customerMode === m ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#6B6B6B]"
                }`}
              >
                {m === "new" ? "New Customer" : "Existing Customer"}
              </button>
            ))}
          </div>

          {customerMode === "new" ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "full_name", label: "Full Name", required: true, placeholder: "Customer full name" },
                { key: "phone", label: "Phone Number", required: true, placeholder: "07X XXX XXXX" },
                { key: "nic", label: "NIC Number", placeholder: "XXXXXXXXXX" },
                { key: "email", label: "Email (optional)", placeholder: "email@example.com" },
              ].map(({ key, label, required, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1A1A1A]">
                    {label} {required && <span className="text-[#FF4C00]">*</span>}
                  </label>
                  <input
                    type={key === "email" ? "email" : "text"}
                    value={newCustomer[key as keyof typeof newCustomer]}
                    onChange={(e) => setNewCustomer({ ...newCustomer, [key]: e.target.value })}
                    placeholder={placeholder}
                    required={required}
                    className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] transition-all"
                  />
                </div>
              ))}
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">Address</label>
                <input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Full address"
                  className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] transition-all"
                />
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
                  className="w-full h-10 pl-9 pr-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] transition-all"
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      selectedCustomer?.id === c.id ? "border-[#FF4C00] bg-[#FF4C00]/5" : "border-[#EFEFEF] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-[#FF4C00]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#FF4C00]">
                        {c.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#0A0A0A]">{c.full_name}</p>
                      <p className="text-xs text-[#9A9A9A]">{c.phone} · {c.nic}</p>
                    </div>
                    {selectedCustomer?.id === c.id && <CheckCircle2 className="h-4 w-4 text-[#FF4C00]" />}
                  </button>
                ))}
                {customerSearch.length >= 2 && customers.length === 0 && (
                  <div className="text-center py-6 text-[#ABABAB]">
                    <p className="text-sm">No customers found</p>
                    <button
                      onClick={() => setCustomerMode("new")}
                      className="mt-2 text-xs text-[#FF4C00] font-semibold hover:underline flex items-center gap-1 mx-auto"
                    >
                      <Plus className="h-3 w-3" /> Add New Customer
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 h-10 px-5 border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] rounded-xl hover:bg-[#F5F5F5]">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              disabled={customerMode === "new" ? !newCustomer.full_name || !newCustomer.phone : !selectedCustomer}
              onClick={() => setStep(3)}
              className="flex items-center gap-2 h-10 px-6 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-40"
            >
              Next: Payment <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PAYMENT ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-[#EFEFEF] p-6 space-y-5">
          <h3
            className="text-lg font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Payment Details
          </h3>

          {/* Payment type */}
          <div className="grid grid-cols-2 gap-3">
            {(["cash", "finance"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPaymentType(type)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  paymentType === type
                    ? "border-[#FF4C00] bg-[#FF4C00]/5"
                    : "border-[#EFEFEF] hover:border-[#FF4C00]/20"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${paymentType === type ? "bg-[#FF4C00]/15" : "bg-[#F5F5F5]"}`}>
                  {type === "cash" ? (
                    <span className={`text-base ${paymentType === type ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`}>₨</span>
                  ) : (
                    <Building2 className={`h-4 w-4 ${paymentType === type ? "text-[#FF4C00]" : "text-[#9A9A9A]"}`} />
                  )}
                </div>
                <p className={`text-sm font-bold ${paymentType === type ? "text-[#FF4C00]" : "text-[#0A0A0A]"}`}>
                  {type === "cash" ? "Full Cash" : "Finance"}
                </p>
                <p className="text-xs text-[#9A9A9A] mt-0.5">
                  {type === "cash" ? "Customer pays full amount" : "Via finance company"}
                </p>
              </button>
            ))}
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Discount (Rs.)</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">TVS Commission (Rs.)</label>
              <input
                type="number"
                value={tvsCommission}
                onChange={(e) => setTvsCommission(e.target.value)}
                placeholder="0"
                className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
              />
            </div>
          </div>

          {/* Finance details */}
          {paymentType === "finance" && (
            <div className="space-y-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Finance Details
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">Finance Company</label>
                <select
                  value={finance.company_id}
                  onChange={(e) => setFinance({ ...finance, company_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
                >
                  <option value="">Select finance company...</option>
                  {financeCompanies.map((fc) => (
                    <option key={fc.id} value={fc.id}>{fc.name} ({fc.commission_rate}%)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "loan_amount", label: "Loan Amount (Rs.)" },
                  { key: "approved_amount", label: "Approved Amount (Rs.)" },
                  { key: "commission", label: "Finance Commission (Rs.)" },
                  { key: "downpayment", label: "Customer Downpayment (Rs.)" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-sm font-medium text-[#1A1A1A]">{label}</label>
                    <input
                      type="number"
                      value={finance[key as keyof typeof finance]}
                      onChange={(e) => setFinance({ ...finance, [key]: e.target.value })}
                      placeholder="0"
                      className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insurance */}
          <div className="space-y-4 p-4 bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl">
            <p className="text-sm font-semibold text-[#4A4A4A] flex items-center gap-2">
              <Shield className="h-4 w-4" /> Insurance (Optional)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3 space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">Insurance Company</label>
                <select
                  value={insurance.company_id}
                  onChange={(e) => setInsurance({ ...insurance, company_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
                >
                  <option value="">Select insurance company...</option>
                  {insuranceCompanies.map((ic) => (
                    <option key={ic.id} value={ic.id}>{ic.name} ({ic.commission_rate}%)</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">Amount (Rs.)</label>
                <input type="number" value={insurance.amount} onChange={(e) => setInsurance({ ...insurance, amount: e.target.value })} placeholder="0" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1A1A1A]">Commission (Rs.)</label>
                <input type="number" value={insurance.commission} onChange={(e) => setInsurance({ ...insurance, commission: e.target.value })} placeholder="0" className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white" />
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 h-10 px-5 border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] rounded-xl hover:bg-[#F5F5F5]">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex items-center gap-2 h-10 px-6 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all"
            >
              Review Sale <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: CONFIRM ── */}
      {step === 4 && selectedBike && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#EFEFEF] p-6 space-y-4">
            <h3
              className="text-lg font-bold text-[#0A0A0A]"
              style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
            >
              Review & Confirm
            </h3>

            {/* Bike */}
            <div className="p-4 bg-[#FAFAFA] rounded-xl space-y-2">
              <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Bike</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF4C00]/10 rounded-xl flex items-center justify-center">
                  <Bike className="h-5 w-5 text-[#FF4C00]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#0A0A0A]">{selectedBike.bike_models?.name}</p>
                  <p className="text-xs text-[#9A9A9A]">Round No: {selectedBike.round_number} · Chassis: {selectedBike.chassis_number}</p>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="p-4 bg-[#FAFAFA] rounded-xl space-y-2">
              <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Customer</p>
              <p className="text-sm font-bold text-[#0A0A0A]">
                {customerMode === "new" ? newCustomer.full_name : selectedCustomer?.full_name}
              </p>
              <p className="text-xs text-[#9A9A9A]">
                {customerMode === "new" ? `${newCustomer.phone} · ${newCustomer.nic}` : `${selectedCustomer?.phone} · ${selectedCustomer?.nic}`}
              </p>
            </div>

            {/* Financials */}
            <div className="p-4 bg-[#FAFAFA] rounded-xl space-y-2.5">
              <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider">Summary</p>
              {[
                { label: "Sale Price", value: `Rs. ${finalPrice.toLocaleString()}` },
                { label: "Discount", value: discountAmt > 0 ? `- Rs. ${discountAmt.toLocaleString()}` : "—" },
                { label: "Payment Type", value: paymentType === "cash" ? "Full Cash" : "Finance" },
                ...(tvsCommission ? [{ label: "TVS Commission", value: `Rs. ${parseFloat(tvsCommission).toLocaleString()}` }] : []),
                ...(insurance.commission ? [{ label: "Insurance Commission", value: `Rs. ${parseFloat(insurance.commission).toLocaleString()}` }] : []),
                ...(finance.commission ? [{ label: "Finance Commission", value: `Rs. ${parseFloat(finance.commission).toLocaleString()}` }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-[#6B6B6B]">{label}</span>
                  <span className="font-semibold text-[#0A0A0A]">{value}</span>
                </div>
              ))}
              <div className="border-t border-[#E5E5E5] pt-2.5 flex items-center justify-between">
                <span className="text-sm font-bold text-[#0A0A0A]">Total Amount</span>
                <span className="text-lg font-bold text-[#FF4C00]">Rs. {totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                This will mark the bike as <strong>Sold</strong> and automatically create CR &amp; Number Plate tracking records.
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="flex items-center gap-2 h-10 px-5 border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] rounded-xl hover:bg-[#F5F5F5]">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 h-11 px-8 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Confirm Sale
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
