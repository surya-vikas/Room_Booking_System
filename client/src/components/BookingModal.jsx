import { useState } from "react";

function BookingModal({
  open,
  room,
  onClose,
  onConfirm,
  loading = false,
  initialNotificationPhone = "",
  initialBookingPurpose = "",
  requireBookingPurpose = false,
}) {
  const [notificationPhone, setNotificationPhone] = useState(initialNotificationPhone || "");
  const [bookingPurpose, setBookingPurpose] = useState(initialBookingPurpose || "");

  if (!open) return null;

  const purposeTooShort = requireBookingPurpose && bookingPurpose.trim().length < 8;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-slate-900">Confirm Booking</h3>
        <p className="mt-2 text-sm text-slate-600">
          {room ? `Book ${room.name} (${room.block})?` : "Book this room?"}
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            Notification Phone
            <input
              type="text"
              value={notificationPhone}
              onChange={(e) => setNotificationPhone(e.target.value)}
              placeholder="+911234567890"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          {requireBookingPurpose ? (
            <label className="block text-sm font-medium text-slate-700">
              Brief Purpose
              <textarea
                value={bookingPurpose}
                onChange={(e) => setBookingPurpose(e.target.value)}
                placeholder="Briefly explain why this room is needed"
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          ) : null}

          {purposeTooShort ? (
            <p className="text-xs text-rose-600">
              Please add at least 8 characters in the purpose.
            </p>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !notificationPhone.trim() || purposeTooShort}
            onClick={() =>
              onConfirm?.(room, {
                studentPhone: notificationPhone.trim(),
                bookingPurpose: bookingPurpose.trim(),
              })
            }
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Booking..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
