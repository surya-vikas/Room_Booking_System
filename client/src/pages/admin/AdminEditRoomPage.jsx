import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import AdminTabs from "./AdminTabs";

const featureSuggestions = [
  "Projector",
  "Whiteboard",
  "Video Conferencing",
  "AC",
  "Smart Display",
  "Audio System",
];

const parseFeatures = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function AdminEditRoomPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [form, setForm] = useState({ name: "", block: "", capacity: "", featuresText: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fill = useCallback((room) => {
    setForm({
      name: room?.name || "",
      block: room?.block || "",
      capacity: room?.capacity ? String(room.capacity) : "",
      featuresText: room?.features?.join(", ") || "",
    });
  }, []);

  const loadRooms = useCallback(async () => {
    const response = await apiClient.get("/rooms");
    const list = response.data?.rooms || [];
    setRooms(list);

    setSelectedRoomId((currentId) => {
      if (list.length === 0) {
        fill(null);
        return "";
      }

      const selectedRoom = list.find((item) => item._id === currentId) || list[0];
      fill(selectedRoom);
      return selectedRoom._id;
    });
  }, [fill]);

  useEffect(() => {
    loadRooms().catch(() => setError("Failed to load rooms."));
  }, [loadRooms]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room._id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const onSelectRoom = (roomId) => {
    setSelectedRoomId(roomId);
    const room = rooms.find((item) => item._id === roomId);
    fill(room);
    setMessage("");
    setError("");
  };

  const toggleFeatureSuggestion = (feature) => {
    setForm((prev) => {
      const features = parseFeatures(prev.featuresText);
      const exists = features.some((item) => item.toLowerCase() === feature.toLowerCase());
      const nextFeatures = exists
        ? features.filter((item) => item.toLowerCase() !== feature.toLowerCase())
        : [...features, feature];

      return {
        ...prev,
        featuresText: nextFeatures.join(", "),
      };
    });
  };

  const selectedFeatures = parseFeatures(form.featuresText);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedRoomId) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await apiClient.put(`/rooms/${selectedRoomId}`, {
        name: form.name,
        block: form.block,
        capacity: Number(form.capacity),
        features: parseFeatures(form.featuresText),
      });
      setMessage("Room updated successfully.");
      await loadRooms();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Edit Room</h1>
        <p className="mt-1 text-sm text-slate-600">
          Select a room from inventory and update details safely.
        </p>
      </div>

      <AdminTabs />

      <div className="grid gap-4 xl:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"
        >
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold">Select Room</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
              value={selectedRoomId}
              onChange={(event) => onSelectRoom(event.target.value)}
            >
              {rooms.length === 0 ? <option value="">No rooms available</option> : null}
              {rooms.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.name} ({room.block})
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-semibold">Room Name</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                required
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-semibold">Block</span>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
                value={form.block}
                onChange={(event) => updateField("block", event.target.value)}
                required
              />
            </label>

            <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
              <span className="font-semibold">Capacity</span>
              <input
                type="number"
                min="1"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
                value={form.capacity}
                onChange={(event) => updateField("capacity", event.target.value)}
                required
              />
            </label>
          </div>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold">Features</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
              placeholder="Comma separated values"
              value={form.featuresText}
              onChange={(event) => updateField("featuresText", event.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {featureSuggestions.map((feature) => {
              const selected = selectedFeatures.some(
                (item) => item.toLowerCase() === feature.toLowerCase()
              );

              return (
                <button
                  key={feature}
                  type="button"
                  onClick={() => toggleFeatureSuggestion(feature)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    selected
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {feature}
                </button>
              );
            })}
          </div>

          <button
            disabled={loading || !selectedRoomId}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

          {message ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </form>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Selected Room Snapshot</h2>
          {!selectedRoom ? (
            <p className="mt-3 text-sm text-slate-600">No room selected.</p>
          ) : (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                Name: {selectedRoom.name}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                Block: {selectedRoom.block}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                Capacity: {selectedRoom.capacity}
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                Features:{" "}
                {selectedRoom.features?.length > 0
                  ? selectedRoom.features.join(", ")
                  : "No features configured"}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

export default AdminEditRoomPage;
