import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zoho Timelog</h1>
          <p className="text-gray-500 text-sm mt-1">Log time entries to Zoho Projects</p>
        </div>

        <div className="space-y-3">
          <Link
            href="/calendar"
            className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
          >
            Weekly Calendar
          </Link>
          <Link
            href="/timelog"
            className="block w-full text-center bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg border border-gray-200 transition-colors"
          >
            Log Time (Form)
          </Link>
          <Link
            href="/history"
            className="block w-full text-center bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg border border-gray-200 transition-colors"
          >
            View History
          </Link>
        </div>

        <div className="border-t pt-4">
          <p className="text-xs text-gray-400">
            Not connected?{" "}
            <a href="/api/zoho/auth" className="text-blue-500 hover:underline">
              Connect Zoho account
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
