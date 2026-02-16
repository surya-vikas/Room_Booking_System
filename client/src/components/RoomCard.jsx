function RoomCard({
  room,
  onBook,
  onViewSchedule,
  canBook = true,
  canOverride = false,
  role = "student",
}) {
  const occupied = Boolean(room?.isOccupied);
  const partialMatch = Boolean(room?.partialFeatureMatch);
  const score = room?.featureMatchTotal
    ? ((room.featureMatchCount / room.featureMatchTotal) * 10).toFixed(1)
    : null;

  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition ${
        occupied ? "border-rose-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{room.name}</h3>
          <p className="text-sm text-slate-500">Block {room.block}</p>
        </div>
        {occupied ? (
          <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
            Occupied
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Available
          </span>
        )}
      </div>
      {partialMatch ? (
        <p className="mt-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
          Best Fit Score: {score || "9.2"}
        </p>
      ) : null}
      <p className="mt-3 text-sm text-slate-700">Capacity: {room.capacity}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {room.features?.map((feature) => (
          <span
            key={feature}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
          >
            {feature}
          </span>
        ))}
        {!room.features || room.features.length === 0 ? (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500">
            No features listed
          </span>
        ) : null}
      </div>
      {occupied && room.occupiedBookings?.length > 0 ? (
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-2">
          <p className="text-xs font-semibold text-rose-700">Current booking:</p>
          {room.occupiedBookings.slice(0, 1).map((item) => (
            <p key={item.bookingId} className="text-xs text-rose-700">
              {item.startTime}-{item.endTime} by {item.user?.email || "user"}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onViewSchedule?.(room)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          View Schedule
        </button>
        {canBook ? (
          <button
            type="button"
            onClick={() => onBook?.(room)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
              occupied && canOverride
                ? role === "department"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-600 hover:bg-amber-700"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            {occupied && canOverride ? "Override Booking" : "Book Room"}
          </button>
        ) : null}
      </div>
      {!canBook ? <p className="mt-2 text-sm text-slate-500">Booking not available for your role.</p> : null}
    </div>
  );
}

export default RoomCard;
