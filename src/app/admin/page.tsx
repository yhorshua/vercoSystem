"use client";

import { useState } from "react";

export default function AdminPage() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen p-6 bg-slate-50 text-slate-900">
      <section className="max-w-xl mx-auto">
        <h1 className="text-3xl font-semibold mb-4">Admin Dashboard</h1>
        <p className="mb-6">This is a client-side admin page.</p>
        <button
          type="button"
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => setCount((prev) => prev + 1)}
        >
          Clicked {count} times
        </button>
      </section>
    </main>
  );
}
