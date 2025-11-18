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
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">Fleet Management</h1>
              <p className="text-sm text-slate-400">
                Manage your tow trucks and their status
              </p>
            </div>
            <button
              onClick={openAddModal}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm"
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
            <div className="border border-slate-800 bg-slate-950/80 rounded-xl p-8 text-center">
              <p className="text-slate-400 mb-4">No trucks added yet</p>
              <button
                onClick={openAddModal}
                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm"
              >
                Add Your First Truck
              </button>
            </div>
          )}

          {trucks.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trucks.map((truck) => (
                <div
                  key={truck.id}
                  className="border border-slate-800 bg-slate-950/80 rounded-xl p-4 hover:border-slate-700 transition-colors"
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

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(truck)}
                      className="flex-1 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(truck.id)}
                      className="px-3 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 text-xs"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingTruck ? "Edit Truck" : "Add New Truck"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Truck Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="e.g., Tow Truck #1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    License Plate
                  </label>
                  <input
                    type="text"
                    value={formData.license_plate}
                    onChange={(e) =>
                      setFormData({ ...formData, license_plate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="ABC-1234"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as Truck["status"],
                      })
                    }
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                  <label className="block text-sm text-slate-300 mb-1">Make</label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="Ford"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Model</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) =>
                      setFormData({ ...formData, model: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="F-550"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-300 mb-1">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) =>
                      setFormData({ ...formData, year: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    placeholder="2023"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">VIN</label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) =>
                    setFormData({ ...formData, vin: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  placeholder="1FTRF3A69HED12345"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-md bg-slate-950 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !formData.name.trim()}
                className="flex-1 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
