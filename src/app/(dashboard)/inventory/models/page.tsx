"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { BikeModel, BikeColor } from "@/types";
import { toast } from "sonner";
import {
  Plus,
  Bike,
  ChevronRight,
  Zap,
  Fuel,
  Edit2,
  Palette,
  X,
  Check,
  Trash2,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  scooter: "Scooter",
  motorbike: "Motorbike",
  moped: "Moped",
  "3w": "3-Wheeler",
};

const FUEL_ICONS: Record<string, React.ReactNode> = {
  petrol: <Fuel className="h-3 w-3" />,
  electric: <Zap className="h-3 w-3" />,
};

export default function ModelsPage() {
  const [models, setModels] = useState<(BikeModel & { bike_colors: BikeColor[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModel, setShowAddModel] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [addingColor, setAddingColor] = useState<string | null>(null);
  const [newColorName, setNewColorName] = useState("");
  const [newColorHex, setNewColorHex] = useState("#FF4C00");

  const loadModels = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bike_models")
      .select("*, bike_colors(id, name, hex_code, is_active)")
      .order("name");
    if (error) toast.error("Failed to load models");
    else setModels(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  async function handleAddColor(modelId: string) {
    if (!newColorName.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.from("bike_colors").insert({
      model_id: modelId,
      name: newColorName.trim(),
      hex_code: newColorHex,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Color added");
      setAddingColor(null);
      setNewColorName("");
      setNewColorHex("#FF4C00");
      loadModels();
    }
  }

  async function handleDeleteColor(colorId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("bike_colors").delete().eq("id", colorId);
    if (error) toast.error(error.message);
    else {
      toast.success("Color removed");
      loadModels();
    }
  }

  async function toggleModelStatus(model: BikeModel) {
    const supabase = createClient();
    await supabase
      .from("bike_models")
      .update({ is_active: !model.is_active })
      .eq("id", model.id);
    loadModels();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Bike Models
          </h2>
          <p className="text-sm text-[#9A9A9A] mt-0.5">
            {models.filter((m) => m.is_active).length} active models · Manage colors and pricing
          </p>
        </div>
        <button
          onClick={() => setShowAddModel(true)}
          className="flex items-center gap-2 h-9 px-4 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Model
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#EFEFEF] p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#F0F0F0]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#F0F0F0] rounded w-48" />
                  <div className="h-3 bg-[#F0F0F0] rounded w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {models.map((model) => (
            <div
              key={model.id}
              className={`bg-white rounded-2xl border transition-all ${
                expandedModel === model.id ? "border-[#FF4C00]/30 shadow-[0_4px_20px_rgba(255,76,0,0.08)]" : "border-[#EFEFEF]"
              }`}
            >
              {/* Model Header */}
              <div
                className="flex items-center gap-4 p-5 cursor-pointer"
                onClick={() =>
                  setExpandedModel(expandedModel === model.id ? null : model.id)
                }
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    model.is_active ? "bg-[#FF4C00]/10" : "bg-[#F0F0F0]"
                  }`}
                >
                  <Bike
                    className={`h-5 w-5 ${model.is_active ? "text-[#FF4C00]" : "text-[#ABABAB]"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={`text-base font-bold leading-none ${model.is_active ? "text-[#0A0A0A]" : "text-[#9A9A9A]"}`}
                      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
                    >
                      {model.name}
                    </p>
                    <span className="text-xs px-2 py-0.5 bg-[#F5F5F5] text-[#6B6B6B] rounded-full font-medium">
                      {CATEGORY_LABELS[model.bike_category]}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        model.fuel_type === "electric"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {FUEL_ICONS[model.fuel_type]}
                      {model.fuel_type.charAt(0).toUpperCase() + model.fuel_type.slice(1)}
                    </span>
                    {!model.is_active && (
                      <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-[#9A9A9A]">
                      MRP: <span className="font-semibold text-[#4A4A4A]">Rs. {model.mrp.toLocaleString()}</span>
                    </span>
                    <span className="text-xs text-[#9A9A9A]">
                      Selling: <span className="font-semibold text-[#FF4C00]">Rs. {model.selling_price.toLocaleString()}</span>
                    </span>
                    <span className="text-xs text-[#9A9A9A]">
                      {model.bike_colors?.length || 0} colors
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleModelStatus(model);
                    }}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      model.is_active
                        ? "bg-[#F5F5F5] text-[#6B6B6B] hover:bg-red-50 hover:text-red-600"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {model.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <ChevronRight
                    className={`h-4 w-4 text-[#ABABAB] transition-transform ${
                      expandedModel === model.id ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>

              {/* Expanded: Colors */}
              {expandedModel === model.id && (
                <div className="px-5 pb-5 border-t border-[#F5F5F5] pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-[#8A8A8A] uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5" /> Colors
                    </p>
                    <button
                      onClick={() => {
                        setAddingColor(addingColor === model.id ? null : model.id);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#FF4C00] hover:underline"
                    >
                      <Plus className="h-3 w-3" /> Add Color
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {model.bike_colors?.map((color) => (
                      <div
                        key={color.id}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-[#FAFAFA] border border-[#EFEFEF] rounded-xl text-sm"
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-[#E5E5E5] flex-shrink-0"
                          style={{ backgroundColor: color.hex_code || "#888" }}
                        />
                        <span className="text-[#4A4A4A] font-medium">{color.name}</span>
                        <button
                          onClick={() => handleDeleteColor(color.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#ABABAB] hover:text-red-500 transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {(!model.bike_colors || model.bike_colors.length === 0) && addingColor !== model.id && (
                      <p className="text-sm text-[#ABABAB] italic">No colors added yet</p>
                    )}
                  </div>

                  {/* Add Color inline form */}
                  {addingColor === model.id && (
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        type="color"
                        value={newColorHex}
                        onChange={(e) => setNewColorHex(e.target.value)}
                        className="w-9 h-9 rounded-xl border border-[#E5E5E5] cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={newColorName}
                        onChange={(e) => setNewColorName(e.target.value)}
                        placeholder="Color name (e.g. Metallic Red)"
                        autoFocus
                        className="flex-1 h-9 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
                        onKeyDown={(e) => e.key === "Enter" && handleAddColor(model.id)}
                      />
                      <button
                        onClick={() => handleAddColor(model.id)}
                        className="w-9 h-9 bg-[#FF4C00] text-white rounded-xl flex items-center justify-center hover:bg-[#E64400] transition-all"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setAddingColor(null)}
                        className="w-9 h-9 border border-[#E5E5E5] text-[#6B6B6B] rounded-xl flex items-center justify-center hover:bg-[#F5F5F5] transition-all"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Price info */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[#F5F5F5]">
                    <div className="p-3 bg-[#FAFAFA] rounded-xl">
                      <p className="text-xs text-[#9A9A9A] font-medium">MRP</p>
                      <p className="text-sm font-bold text-[#0A0A0A] mt-0.5">
                        Rs. {model.mrp.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-[#FAFAFA] rounded-xl">
                      <p className="text-xs text-[#9A9A9A] font-medium">Discount</p>
                      <p className="text-sm font-bold text-amber-600 mt-0.5">
                        Rs. {model.default_discount.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-[#FF4C00]/5 rounded-xl border border-[#FF4C00]/10">
                      <p className="text-xs text-[#9A9A9A] font-medium">Selling Price</p>
                      <p className="text-sm font-bold text-[#FF4C00] mt-0.5">
                        Rs. {model.selling_price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModel && (
        <AddModelModal
          onClose={() => setShowAddModel(false)}
          onSuccess={() => {
            setShowAddModel(false);
            loadModels();
          }}
        />
      )}
    </div>
  );
}

function AddModelModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    tvs_category: "2W",
    bike_category: "scooter",
    fuel_type: "petrol",
    mrp: "",
    default_discount: "",
    selling_price: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("bike_models").insert({
      name: form.name.toUpperCase(),
      tvs_category: form.tvs_category,
      bike_category: form.bike_category,
      fuel_type: form.fuel_type,
      mrp: parseFloat(form.mrp) || 0,
      default_discount: parseFloat(form.default_discount) || 0,
      selling_price: parseFloat(form.selling_price) || 0,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Model added successfully");
      onSuccess();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#EFEFEF] z-10">
        <div className="flex items-center justify-between p-6 border-b border-[#F0F0F0]">
          <h3
            className="text-lg font-bold text-[#0A0A0A]"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
          >
            Add New Model
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#F5F5F5]">
            <X className="h-4 w-4 text-[#6B6B6B]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#1A1A1A]">Model Name <span className="text-[#FF4C00]">*</span></label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. TVS RAIDER 125"
              required
              className="w-full h-10 px-4 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] transition-all uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Category</label>
              <select
                value={form.bike_category}
                onChange={(e) => setForm({ ...form, bike_category: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
              >
                <option value="scooter">Scooter</option>
                <option value="motorbike">Motorbike</option>
                <option value="moped">Moped</option>
                <option value="3w">3-Wheeler</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Fuel Type</label>
              <select
                value={form.fuel_type}
                onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00] bg-white"
              >
                <option value="petrol">Petrol</option>
                <option value="electric">Electric</option>
                <option value="diesel">Diesel</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">MRP (Rs.)</label>
              <input
                type="number"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Discount (Rs.)</label>
              <input
                type="number"
                value={form.default_discount}
                onChange={(e) => setForm({ ...form, default_discount: e.target.value })}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Selling (Rs.)</label>
              <input
                type="number"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                placeholder="0"
                className="w-full h-10 px-3 rounded-xl border border-[#E5E5E5] text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4C00]/20 focus:border-[#FF4C00]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[#E5E5E5] text-sm font-semibold text-[#4A4A4A] hover:bg-[#F5F5F5]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 bg-[#FF4C00] hover:bg-[#E64400] text-white text-sm font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? "Saving..." : "Add Model"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
