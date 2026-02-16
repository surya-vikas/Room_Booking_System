import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";
import { getCurrentUser } from "../auth/currentUser";
import { getRoleCapabilities } from "../auth/rolePermissions";
import BookingModal from "../components/BookingModal";
import ConflictAlert from "../components/ConflictAlert";
import RoomCard from "../components/RoomCard";
import RoomScheduleModal from "../components/RoomScheduleModal";

const FEATURE_OPTIONS = [
  "projector",
  "ac",
  "wifi",
  "computers",
  "smartboard",
  "sound-system",
];

const initialSearchForm = {
  date: "",
  startTime: "",
  endTime: "",
  attendees: "",
  requiredFeatures: [],
};

const formatFeatureLabel = (feature) =>
  feature
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatNoticeTimestamp = (value) => {
  if (!value) return "--";
  return new Date(value).toLocaleString();
};

function SearchPage() {
  const currentUser = getCurrentUser();
  const capabilities = getRoleCapabilities(currentUser.role);

  const [searchForm, setSearchForm] = useState(initialSearchForm);
  const [rooms, setRooms] = useState([]);
  const [searching, setSearching] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generalMessage, setGeneralMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [savingNotes, setSavingNotes] = useState(false);
  const [noticeMeta, setNoticeMeta] = useState({ updatedAt: null, updatedBy: null });
  const [notesMessage, setNotesMessage] = useState("");

  const [scheduleRoom, setScheduleRoom] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const isAdmin = capabilities.role === "admin";

  const loadNoticeBoard = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setNoticeLoading(true);
    }

    try {
      const response = await apiClient.get("/notice-board");
      const notice = response.data?.notice || {};
      setAdminNotes(notice.content || "");
      setNoticeMeta({
        updatedAt: notice.updatedAt || null,
        updatedBy: notice.updatedBy || null,
      });
      if (!silent) {
        setNotesMessage("");
      }
    } catch (requestError) {
      if (!silent) {
        setNotesMessage(requestError.response?.data?.message || "Failed to load notice board.");
      }
    } finally {
      if (!silent) {
        setNoticeLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadNoticeBoard();

    const intervalId = setInterval(() => {
      loadNoticeBoard({ silent: true }).catch(() => {});
    }, 15000);

    return () => clearInterval(intervalId);
  }, [loadNoticeBoard]);

  const updateField = (field, value) => {
    setSearchForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (feature) => {
    setSearchForm((prev) => {
      const exists = prev.requiredFeatures.includes(feature);
      return {
        ...prev,
        requiredFeatures: exists
          ? prev.requiredFeatures.filter((item) => item !== feature)
          : [...prev.requiredFeatures, feature],
      };
    });
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setSearching(true);
    setConflictMessage("");
    setSuccessMessage("");
    setGeneralMessage("");

    try {
      const payload = {
        date: searchForm.date,
        startTime: searchForm.startTime,
        endTime: searchForm.endTime,
        attendees: Number(searchForm.attendees),
        requiredFeatures: searchForm.requiredFeatures,
      };
      const response = await apiClient.post("/rooms/search", payload);
      const fetchedRooms = response.data.rooms || [];
      setRooms(fetchedRooms);
      if (response.data.fallbackUsed) {
        setGeneralMessage(
          fetchedRooms.length > 0
            ? `No exact feature match found. Showing ${fetchedRooms.length} closest room(s) for your capacity and time.`
            : "No rooms found for the selected filters."
        );
      } else if (response.data.includesOccupiedRooms) {
        setGeneralMessage(
          fetchedRooms.length > 0
            ? `Found ${fetchedRooms.length} room(s). Occupied rooms can be requested for override.`
            : "No rooms found for the selected filters."
        );
      } else {
        setGeneralMessage(
          fetchedRooms.length > 0
            ? `Found ${fetchedRooms.length} available room(s).`
            : "No available rooms for the selected filters."
        );
      }
    } catch (error) {
      setRooms([]);
      setGeneralMessage(error.response?.data?.message || "Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleReset = () => {
    setSearchForm(initialSearchForm);
    setRooms([]);
    setConflictMessage("");
    setSuccessMessage("");
    setGeneralMessage("");
  };

  const handleBookClick = (room) => {
    if (!capabilities.canBook) {
      setConflictMessage("Your role does not have booking access.");
      return;
    }
    setConflictMessage("");
    setSuccessMessage("");
    setSelectedRoom(room);
    setOpenModal(true);
  };

  const handleConfirm = async (room, contacts = {}) => {
    if (!room) return;
    setBookingLoading(true);
    setConflictMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        roomId: room._id || room.id,
        date: searchForm.date,
        startTime: searchForm.startTime,
        endTime: searchForm.endTime,
        attendees: Number(searchForm.attendees),
        requiredFeatures: searchForm.requiredFeatures,
        studentPhone: contacts.studentPhone,
        bookingPurpose: contacts.bookingPurpose,
      };
      const response = await apiClient.post("/bookings", payload);
      const outcome = response.data.bookingOutcome;

      if (outcome === "REJECTED") {
        const reason =
          response.data?.booking?.overrideReason ||
          response.data?.message ||
          "Booking rejected";
        setConflictMessage(reason);
      } else if (outcome === "PENDING") {
        setSuccessMessage("Booking request submitted. Waiting for admin approval.");
      } else {
        const message =
          outcome === "OVERRIDDEN"
            ? "Booking approved and lower-priority conflicts were overridden."
            : "Booking approved successfully.";
        setSuccessMessage(message);
      }
      setOpenModal(false);
    } catch (error) {
      const errorPayload = error.response?.data;
      const reason =
        errorPayload?.booking?.overrideReason ||
        errorPayload?.message ||
        "Booking request failed.";
      setConflictMessage(reason);
      setOpenModal(false);
    } finally {
      setBookingLoading(false);
    }
  };

  const recommendedRooms = useMemo(
    () =>
      [...rooms]
        .sort((a, b) => {
          const aScore = a.featureMatchCount || 0;
          const bScore = b.featureMatchCount || 0;
          return bScore - aScore;
        })
        .slice(0, 3),
    [rooms]
  );

  const openSchedule = (room) => {
    setScheduleRoom(room);
    setScheduleOpen(true);
  };

  const handleSaveNotes = () => {
    if (!isAdmin || savingNotes) return;
    setSavingNotes(true);
    setNotesMessage("");

    apiClient
      .put("/notice-board", { content: adminNotes })
      .then((response) => {
        const notice = response.data?.notice || {};
        setAdminNotes(notice.content || "");
        setNoticeMeta({
          updatedAt: notice.updatedAt || null,
          updatedBy: notice.updatedBy || null,
        });
        setNotesMessage("Notice board updated.");
      })
      .catch((requestError) => {
        setNotesMessage(requestError.response?.data?.message || "Failed to update notice board.");
      })
      .finally(() => {
        setSavingNotes(false);
      });
  };

  const handleClearNotes = () => {
    if (!isAdmin || savingNotes) return;
    setSavingNotes(true);
    setNotesMessage("");

    apiClient
      .put("/notice-board", { content: "" })
      .then((response) => {
        const notice = response.data?.notice || {};
        setAdminNotes(notice.content || "");
        setNoticeMeta({
          updatedAt: notice.updatedAt || null,
          updatedBy: notice.updatedBy || null,
        });
        setNotesMessage("Notice board cleared.");
      })
      .catch((requestError) => {
        setNotesMessage(requestError.response?.data?.message || "Failed to clear notice board.");
      })
      .finally(() => {
        setSavingNotes(false);
      });
  };

  const hasResults = rooms.length > 0;

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Room Search
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Find the Right Room</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Search by date, time, attendees, and features. Open schedule from each result card
          before booking.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <form
          onSubmit={handleSearch}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-semibold">Date</span>
              <input
                type="date"
                value={searchForm.date}
                onChange={(event) => updateField("date", event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500"
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-semibold">Attendees</span>
              <input
                type="number"
                min="1"
                value={searchForm.attendees}
                onChange={(event) => updateField("attendees", event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500"
                placeholder="e.g. 40"
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-semibold">Start Time</span>
              <input
                type="time"
                value={searchForm.startTime}
                onChange={(event) => updateField("startTime", event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500"
                required
              />
            </label>
            <label className="space-y-1 text-sm text-slate-700">
              <span className="font-semibold">End Time</span>
              <input
                type="time"
                value={searchForm.endTime}
                onChange={(event) => updateField("endTime", event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500"
                required
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">Required Features</p>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((feature) => {
                const selected = searchForm.requiredFeatures.includes(feature);
                return (
                  <button
                    key={feature}
                    type="button"
                    onClick={() => toggleFeature(feature)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      selected
                        ? "bg-slate-900 text-white"
                        : "border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {formatFeatureLabel(feature)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search Rooms"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={searching}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Reset
            </button>
          </div>
        </form>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Notice Board</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin
              ? "Write announcements for all users."
              : "Admin announcements are shown here."}
          </p>

          <textarea
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
            readOnly={!isAdmin || noticeLoading}
            placeholder={isAdmin ? "Write notice board updates..." : "Admin notice board"}
            className="mt-3 h-48 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500"
          />

          {noticeLoading ? (
            <p className="mt-2 text-xs font-medium text-slate-500">Loading notice board...</p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={!isAdmin || savingNotes || noticeLoading}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {savingNotes ? "Saving..." : "Save Notice"}
            </button>
            <button
              type="button"
              onClick={handleClearNotes}
              disabled={!isAdmin || savingNotes || noticeLoading}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          {notesMessage ? (
            <p className="mt-2 text-xs font-medium text-slate-600">{notesMessage}</p>
          ) : null}

          <p className="mt-2 text-xs text-slate-500">
            Last updated: {formatNoticeTimestamp(noticeMeta.updatedAt)}
            {noticeMeta.updatedBy
              ? ` by ${noticeMeta.updatedBy.name || noticeMeta.updatedBy.email}`
              : ""}
          </p>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Current Role</p>
            <p className="mt-1 uppercase tracking-wide">{capabilities.role}</p>
          </div>
        </aside>
      </div>

      <ConflictAlert message={conflictMessage} />

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-semibold">Success:</span> {successMessage}
        </div>
      ) : null}

      {generalMessage ? (
        <div className="rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {generalMessage}
        </div>
      ) : null}

      {recommendedRooms.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">Recommended Rooms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recommendedRooms.map((room) => {
              const score = room.featureMatchTotal
                ? ((room.featureMatchCount / room.featureMatchTotal) * 10).toFixed(1)
                : "9.2";
              return (
                <span
                  key={room._id || room.id}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {room.name} - Score {score}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {searching ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          Searching rooms...
        </div>
      ) : null}

      {hasResults ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((room) => (
            <RoomCard
              key={room._id || room.id}
              room={room}
              onBook={handleBookClick}
              onViewSchedule={openSchedule}
              canBook={capabilities.canBook}
              canOverride={["department", "admin"].includes(capabilities.role)}
              role={capabilities.role}
            />
          ))}
        </div>
      ) : null}

      <BookingModal
        key={openModal ? "booking-modal-open" : "booking-modal-closed"}
        open={openModal}
        room={selectedRoom}
        onClose={() => setOpenModal(false)}
        onConfirm={handleConfirm}
        loading={bookingLoading}
        initialNotificationPhone=""
        initialBookingPurpose=""
        requireBookingPurpose={capabilities.role !== "admin"}
      />

      <RoomScheduleModal
        open={scheduleOpen}
        room={scheduleRoom}
        onClose={() => setScheduleOpen(false)}
      />
    </section>
  );
}

export default SearchPage;
