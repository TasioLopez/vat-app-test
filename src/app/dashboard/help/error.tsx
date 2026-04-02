"use client";

export default function HelpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-10 max-w-lg mx-auto text-center space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Er is iets misgegaan</h1>
      <p className="text-gray-600 text-sm">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-purple-700 text-white font-medium"
      >
        Opnieuw proberen
      </button>
    </div>
  );
}
