"use client";

import dynamic from "next/dynamic";

// The form reads sign-in and the offline outbox from the device, so it renders in the browser only.
const FormScreen = dynamic(() => import("./form-screen"), {
  ssr: false,
  loading: () => <div className="grid flex-1 place-items-center text-sm text-zinc-500">Loading form…</div>,
});

export function FormLoader() {
  return <FormScreen />;
}
