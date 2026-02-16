import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../../api/client";
import AdminTabs from "./AdminTabs";

function AdminDeleteRoomPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRooms = useCallback(async () => {
    const response = await apiClient.get("/rooms");
    const list = response.data?.rooms || [];
    setRooms(list);
    setSelectedRoomId((current) => {
      if (list.length === 0) return "";
      return list.some((room) => room._id === current) ? current : list[0]._id;
    });
  }, []);

  useEffect(() => {
    loadRooms().catch(() => setError("Failed to load rooms."));
  }, [loadRooms]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room._id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const canDelete =
    Boolean(selectedRoom) &&
    confirmText.trim().toLowerCase() === selectedRoom.name.toLowerCase() &&
    !loading;

  const handleDelete = async () => {
    if (!canDelete || !selectedRoomId) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await apiClient.delete(`/rooms/${selectedRoomId}`);
      setMessage("Room deleted successfully.");
      setConfirmText("");
      await loadRooms();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to delete room.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Delete Room</h1>
        <p className="mt-1 text-sm text-slate-600">
          Permanently remove a room from inventory after confirmation.
        </p>
      </div>

      <AdminTabs />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold">Select Room</span>
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
              value={selectedRoomId}
              onChange={(event) => {
                setSelectedRoomId(event.target.value);
                setConfirmText("");
                setMessage("");
              }}
            >
              {rooms.length === 0 ? <option value="">No rooms available</option> : null}
              {rooms.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.name} ({room.block})
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            This action is permanent. To confirm, type the exact room name below.
          </div>

          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold">Confirm Room Name</span>
            <input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500"
              placeholder={selectedRoom ? `Type "${selectedRoom.name}"` : "Select a room first"}
              disabled={!selectedRoom}
            />
          </label>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete Room"}
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
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Room Details</h2>
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

export default AdminDeleteRoomPage;
