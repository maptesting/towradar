// pages/trucks.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabaseClient";

type Truck = {
  id: string;
  name: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  vin: string | null;
  status: "available" | "on_job" | "maintenance" | "out_of_service";
  notes: string | null;
};

export default function TrucksPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    license_plate: "",
    make: "",
    model: "",
    year: "",
    vin: "",
    status: "available" as Truck["status"],
    notes: "",
  });

  // Auth check
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/auth");
        return;
      }
      setUserId(user.id);
      setAuthChecked(true);
    })();
  }, [router]);

  // Load company
  useEffect(() => {
    if (!authChecked || !userId) return;

    (async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Company load error:", error);
        setErrorMsg("Error loading company profile.");
        return;
      }

      if (!data) {
        setErrorMsg("No company profile found. Please set up your company first.");
        return;
      }

      setCompanyId(data.id);
    })();
  }, [authChecked, userId]);

  // Load trucks
  useEffect(() => {
    if (!companyId) return;
    loadTrucks();
  }, [companyId]);

  async function loadTrucks() {
    if (!companyId) return;
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("trucks")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Trucks load error:", error);
      setErrorMsg("Error loading trucks.");
      setTrucks([]);
    } else {
      setTrucks(data || []);
    }

    setLoading(false);
  }

  function openAddModal() {
    setFormData({
      name: "",
      license_plate: "",
      make: "",
      model: "",
      year: "",
      vin: "",
      status: "available",
      notes: "",
    });
    setEditingTruck(null);
    setShowAddModal(true);
  }

  function openEditModal(truck: Truck) {
    setFormData({
      name: truck.name,
      license_plate: truck.license_plate || "",
      make: truck.make || "",
      model: truck.model || "",
      year: truck.year?.toString() || "",
      vin: truck.vin || "",
      status: truck.status,
      notes: truck.notes || "",
    });
    setEditingTruck(truck);
    setShowAddModal(true);
  }

  async function handleSave() {
    if (!companyId || !formData.name.trim()) return;

    setLoading(true);
    const truckData = {
      company_id: companyId,
      name: formData.name.trim(),
      license_plate: formData.license_plate.trim() || null,
      make: formData.make.trim() || null,
      model: formData.model.trim() || null,
      year: formData.year ? parseInt(formData.year) : null,
      vin: formData.vin.trim() || null,
      status: formData.status,
      notes: formData.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingTruck) {
      const result = await supabase
        .from("trucks")
        .update(truckData)
        .eq("id", editingTruck.id);
      error = result.error;
    } else {
      const result = await supabase.from("trucks").insert([truckData]);
      error = result.error;
    }

    if (error) {
      console.error("Save error:", error);
      setErrorMsg(`Error ${editingTruck ? "updating" : "adding"} truck.`);
    } else {
      setShowAddModal(false);
      loadTrucks();
    }

    setLoading(false);
  }

  async function handleDelete(truckId: string) {
    if (!confirm("Are you sure you want to delete this truck?")) return;

    setLoading(true);
    const { error } = await supabase.from("trucks").delete().eq("id", truckId);

    if (error) {
      console.error("Delete error:", error);
      setErrorMsg("Error deleting truck.");
    } else {
      loadTrucks();
    }

    setLoading(false);
  }

  const statusColors = {
    available: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
    on_job: "bg-blue-500/10 text-blue-300 border-blue-500/40",
    maintenance: "bg-yellow-500/10 text-yellow-300 border-yellow-500/40",
    out_of_service: "bg-rose-500/10 text-rose-300 border-rose-500/40",
  };

  const statusLabels = {
    available: "Available",
    on_job: "On Job",
    maintenance: "Maintenance",
    out_of_service: "Out of Service",
  };

  return (
    <div className="min-h-screen text-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Fleet Management</h1>
              <p className="text-base text-slate-400 mt-2">
                Manage your tow trucks and their status
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="px-6 py-3 rounded-lg gradient-emerald text-white font-semibold shadow-glow hover:scale-105 transition-transform"
            >
              + Add Truck
            </button>
          </header>

          {errorMsg && (
            <p className="text-sm text-rose-400 border border-rose-500/40 bg-rose-950/40 rounded-md px-3 py-2">
              {errorMsg}
            </p>
          )}

          {!loading && trucks.length === 0 && (
            <div className="glass-strong rounded-2xl p-12 text-center border border-slate-700/50">
              <p className="text-slate-300 mb-6 text-lg">No trucks added yet</p>
              <button
                onClick={openAddModal}
                className="px-6 py-3 rounded-lg gradient-emerald text-white font-semibold shadow-glow hover:scale-105 transition-transform"
              >
                Add Your First Truck
              </button>
            </div>
          )}

          {trucks.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {trucks.map((truck) => (
                <div
                  key={truck.id}
                  className="glass-strong rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-100">{truck.name}</h3>
                      {truck.license_plate && (
                        <p className="text-xs text-slate-400 mt-1">
                          {truck.license_plate}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        statusColors[truck.status]
                      }`}
                    >
                      {statusLabels[truck.status]}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 mb-4">
                    {truck.make && (
                      <p>
                        {truck.year && `${truck.year} `}
                        {truck.make} {truck.model}
                      </p>
                    )}
                    {truck.vin && <p className="text-slate-500">VIN: {truck.vin}</p>}
                    {truck.notes && (
                      <p className="text-slate-400 italic">{truck.notes}</p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => openEditModal(truck)}
                      className="flex-1 px-4 py-2 rounded-lg glass border border-slate-700/50 hover:bg-white/5 text-slate-100 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(truck.id)}
                      className="px-4 py-2 rounded-lg glass border border-rose-500/50 hover:bg-rose-500/10 text-rose-300 text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-strong border border-slate-700/50 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              {editingTruck ? "Edit Truck" : "Add New Truck"}
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Truck Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  placeholder="e.g., Tow Truck #1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    License Plate
                  </label>
                  <input
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) =>
                      setFormData({ ...formData, license_plate: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="ABC-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Truck["status"],
                      })
                    }
                    className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  >
                    <option value="available">Available</option>
                    <option value="on_job">On Job</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Make</label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="Ford"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="F-550"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                    placeholder="2023"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">VIN</label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) =>
                    setFormData({ ...formData, vin: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  placeholder="1FTRF3A69HED12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 rounded-lg glass border border-slate-700/50 hover:bg-white/5 text-slate-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.name.trim()}
                className="flex-1 px-6 py-3 rounded-lg gradient-emerald text-white font-semibold shadow-glow hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? "Saving..." : editingTruck ? "Update" : "Add Truck"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
