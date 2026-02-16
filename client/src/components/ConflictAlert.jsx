function ConflictAlert({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="font-semibold">Conflict:</span> {message}
    </div>
  );
}

export default ConflictAlert;
