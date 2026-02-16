import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../api/client";

const quickQuestions = [
  "How many rooms are filled on 20 Feb 2026?",
  "Is SH1 filled on 21 Feb 2026?",
  "What details are required to add a room?",
  "Show current admin stats",
];

const toNumber = (value) => Number(value || 0);

const formatStats = (summary) => {
  if (!summary) {
    return "Stats are still loading. Use refresh in the dashboard once data is available.";
  }

  return `Current totals: ${toNumber(summary.totalRooms)} rooms, ${toNumber(
    summary.totalBookings
  )} bookings, ${toNumber(summary.pendingBookings)} pending, ${toNumber(
    summary.approvedBookings
  )} approved, ${toNumber(summary.rejectedBookings)} rejected, and ${toNumber(
    summary.cancelledBookings
  )} cancelled.`;
};

const isValidDateObject = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const toIsoDate = (dateValue) => {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const prettyDate = (dateValue) => {
  const parsed = new Date(dateValue);
  if (!isValidDateObject(parsed)) return String(dateValue);
  return parsed.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
};

const parseDateFromQuestion = (question) => {
  const cleaned = question.replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1");
  const explicitYearPatterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/i,
    /\b(\d{1,2}\s+[a-zA-Z]{3,9}\s+\d{4})\b/i,
    /\b([a-zA-Z]{3,9}\s+\d{1,2},?\s+\d{4})\b/i,
  ];

  for (const pattern of explicitYearPatterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;
    const parsed = new Date(match[1]);
    if (isValidDateObject(parsed)) return parsed;
  }

  const currentYear = new Date().getFullYear();
  const shortDatePatterns = [
    /\b(\d{1,2}\s+[a-zA-Z]{3,9})\b/i,
    /\b([a-zA-Z]{3,9}\s+\d{1,2})\b/i,
  ];

  for (const pattern of shortDatePatterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;
    const parsed = new Date(`${match[1]} ${currentYear}`);
    if (isValidDateObject(parsed)) return parsed;
  }

  return null;
};

const getOccupancyIntent = (question) => {
  const normalized = question.trim().toLowerCase();
  const hasOccupancyKeyword =
    normalized.includes("filled") ||
    normalized.includes("occupied") ||
    normalized.includes("booked") ||
    normalized.includes("available");

  if (!hasOccupancyKeyword) return null;

  if (/^is\s+/.test(normalized) && normalized.includes(" on ")) {
    return "room-status";
  }

  if (
    normalized.includes("how many rooms") ||
    normalized.includes("rooms are filled") ||
    normalized.includes("rooms filled") ||
    normalized.includes("rooms occupied")
  ) {
    return "room-count";
  }

  return null;
};

const extractRoomName = (question) => {
  const compact = question.replace(/\s+/g, " ").trim();
  const patterns = [
    /\bis\s+(.+?)\s+(?:filled|occupied|available|booked)\s+on\b/i,
    /\broom\s+(.+?)\s+(?:filled|occupied|available|booked)\s+on\b/i,
    /\bstatus\s+of\s+(.+?)\s+on\b/i,
  ];

  for (const pattern of patterns) {
    const match = compact.match(pattern);
    if (!match) continue;
    return match[1].replace(/^room\s+/i, "").replace(/[?.!,]+$/g, "").trim();
  }

  return "";
};

const formatRoomSlots = (bookings = []) => {
  if (!bookings.length) return "";
  const visible = bookings.slice(0, 3).map((item) => `${item.startTime}-${item.endTime}`);
  const remaining = bookings.length - visible.length;
  return remaining > 0 ? `${visible.join(", ")} (+${remaining} more)` : visible.join(", ");
};

const buildDefaultResponse = ({ question, summary, topRoom, pendingCount }) => {
  const normalized = question.trim().toLowerCase();

  if (normalized.includes("add room") || normalized.includes("required")) {
    return (
      "To add a room, fill 3 required fields: room name, block, and capacity. " +
      "Features are optional and should be comma-separated, for example: projector, whiteboard, ac."
    );
  }

  if (
    normalized.includes("approve") ||
    normalized.includes("review") ||
    normalized.includes("pending")
  ) {
    return (
      `There are currently ${pendingCount} pending request(s). ` +
      "Open the Approvals tab, verify room/date/time/priority, then approve or reject each request."
    );
  }

  if (normalized.includes("edit room") || normalized.includes("update room")) {
    return (
      "Use the Edit Room tab, choose the room from the list, update name/block/capacity/features, " +
      "and save changes. Capacity must stay a positive number."
    );
  }

  if (normalized.includes("delete room") || normalized.includes("remove room")) {
    return (
      "Use the Delete Room tab, select the room, verify its details, and confirm deletion carefully. " +
      "Deletion removes the room record from active inventory."
    );
  }

  if (
    normalized.includes("stats") ||
    normalized.includes("analytics") ||
    normalized.includes("summary")
  ) {
    return formatStats(summary);
  }

  if (
    normalized.includes("top room") ||
    normalized.includes("most utilized") ||
    normalized.includes("utilization")
  ) {
    if (!topRoom) {
      return "Utilization data is not available yet. Refresh analytics once room booking data is loaded.";
    }

    return `${topRoom.roomName} (${topRoom.block}) is currently the top utilized room with ${toNumber(
      topRoom.totalBookings
    )} booking(s).`;
  }

  if (
    normalized.includes("help") ||
    normalized.includes("what can you do") ||
    normalized.includes("commands")
  ) {
    return (
      "I can help with required room fields, approvals workflow, current admin stats, and " +
      "date-based room occupancy checks. Try one of the quick questions above."
    );
  }

  return (
    "I can answer admin basics: required room details, booking approvals, analytics summary, and " +
    "date-based room occupancy insights."
  );
};

const buildOccupancyReply = async (question) => {
  const intent = getOccupancyIntent(question);
  if (!intent) return null;

  const parsedDate = parseDateFromQuestion(question);
  if (!parsedDate) {
    return "Please include a valid date, for example: 20 Feb 2026.";
  }

  const isoDate = toIsoDate(parsedDate);

  if (intent === "room-count") {
    try {
      const response = await apiClient.get("/admin/occupancy", { params: { date: isoDate } });
      const summary = response.data?.summary || {};
      return `On ${prettyDate(isoDate)}, ${toNumber(summary.filledRooms)} of ${toNumber(
        summary.totalRooms
      )} rooms are filled (${toNumber(summary.occupancyPercentage)}%). ${toNumber(
        summary.availableRooms
      )} room(s) are available.`;
    } catch (error) {
      return error.response?.data?.message || "I could not fetch occupancy data for that date.";
    }
  }

  const roomName = extractRoomName(question);
  if (!roomName) {
    return "Please include a room name, for example: Is SH1 filled on 21 Feb 2026?";
  }

  const asksAvailability = /\bavailable\b/i.test(question);

  try {
    const response = await apiClient.get("/admin/occupancy", {
      params: { date: isoDate, roomName },
    });
    const payload = response.data || {};
    const resolvedRoomName = payload.room?.name || roomName;
    const slots = formatRoomSlots(payload.bookings || []);

    if (asksAvailability) {
      if (payload.isFilled) {
        return `No, ${resolvedRoomName} is not available on ${prettyDate(
          isoDate
        )}. Approved slots: ${slots}.`;
      }
      return `Yes, ${resolvedRoomName} is available on ${prettyDate(isoDate)}.`;
    }

    if (payload.isFilled) {
      return `Yes, ${resolvedRoomName} is filled on ${prettyDate(isoDate)}. Approved slots: ${slots}.`;
    }

    return `No, ${resolvedRoomName} is not filled on ${prettyDate(isoDate)}.`;
  } catch (error) {
    if (error.response?.status === 404) {
      return `I could not find a room named "${roomName}".`;
    }
    return error.response?.data?.message || "I could not check that room status right now.";
  }
};

function AdminChatBot({ analytics, pendingCount }) {
  const [input, setInput] = useState("");
  const [botThinking, setBotThinking] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "bot",
      text: "Admin Assistant online. Ask for room requirements, approvals workflow, or occupancy by date.",
    },
  ]);

  const scrollRef = useRef(null);
  const messageCounterRef = useRef(1);

  const topRoom = useMemo(() => {
    const utilization = analytics?.utilization || [];
    return utilization.length > 0 ? utilization[0] : null;
  }, [analytics]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, botThinking]);

  const appendMessage = (message) => {
    setMessages((previous) => [...previous, message].slice(-20));
  };

  const nextMessageId = (prefix) => {
    const id = `${prefix}-${messageCounterRef.current}`;
    messageCounterRef.current += 1;
    return id;
  };

  const submitQuestion = async (question) => {
    const trimmed = question.trim();
    if (!trimmed || botThinking) return;

    appendMessage({ id: nextMessageId("user"), role: "user", text: trimmed });
    setBotThinking(true);

    const occupancyReply = await buildOccupancyReply(trimmed);
    const botMessage =
      occupancyReply ||
      buildDefaultResponse({
        question: trimmed,
        summary: analytics?.summary,
        topRoom,
        pendingCount: toNumber(pendingCount),
      });

    appendMessage({ id: nextMessageId("bot"), role: "bot", text: botMessage });
    setBotThinking(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!input.trim()) return;
    const question = input;
    setInput("");
    submitQuestion(question);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Admin ChatBot</h2>
            <p className="mt-1 text-xs text-slate-500">
              Quick answers for room management, approvals, and occupancy checks by date.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {quickQuestions.map((question) => (
            <button
              key={question}
              type="button"
              disabled={botThinking}
              onClick={() => submitQuestion(question)}
              className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:opacity-60"
            >
              {question}
            </button>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/80 p-3"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
                message.role === "user"
                  ? "ml-auto bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {message.text}
            </div>
          ))}

          {botThinking ? (
            <div className="max-w-[92%] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Checking live booking data...
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Example: Is SH1 filled on 21 Feb 2026?"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none ring-0 transition focus:border-slate-500"
          />
          <button
            type="submit"
            disabled={botThinking}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {botThinking ? "Checking..." : "Ask"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AdminChatBot;
