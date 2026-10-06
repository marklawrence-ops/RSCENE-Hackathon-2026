"use client";

import { useState } from "react";
import { GUIDE, type Lang } from "./guide-content";

const LANGS: Lang[] = ["en", "fil", "war"];
const HTML_LANG: Record<Lang, string> = { en: "en", fil: "fil", war: "war" };

export function GuideScreen() {
  const [lang, setLang] = useState<Lang>("en");
  const t = GUIDE[lang];

  return (
    <main lang={HTML_LANG[lang]} className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div role="group" aria-label="Language" className="flex overflow-hidden rounded-lg border border-black/15 text-sm dark:border-white/15">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
              className={`px-3 py-1.5 ${lang === l ? "bg-[#0b5d6b] text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
            >
              {GUIDE[l].langName}
            </button>
          ))}
        </div>
        <button onClick={() => window.print()} className="rounded-lg border border-[#0b5d6b]/40 px-3 py-1.5 text-sm font-medium text-[#0b5d6b] hover:bg-[#0b5d6b]/10 dark:text-[#7fd1c7]">
          🖨 {t.print}
        </button>
      </div>

      {t.draft && (
        <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          ⚠ {t.draftNote} <span className="text-amber-700/80 dark:text-amber-300/70">(Draft translation, needs review by a native speaker.)</span>
        </p>
      )}

      <h1 className="mt-5 text-2xl font-semibold leading-tight print:mt-0">{t.title}</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400 print:text-black">{t.intro}</p>

      <section className="mt-5 rounded-2xl border border-emerald-600/30 bg-emerald-50 p-4 dark:bg-emerald-950/30 print:break-inside-avoid">
        <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">✓ {t.doTitle}</h2>
        <ul className="mt-2 space-y-2.5">
          {t.doItems.map(([from, to]) => (
            <li key={from} className="text-sm">
              <span className="font-semibold">{from}</span>
              <span className="mx-1.5 text-emerald-700" aria-hidden>
                →
              </span>
              <span>{to}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-3 rounded-2xl border border-red-600/30 bg-red-50 p-4 dark:bg-red-950/30 print:break-inside-avoid">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">✕ {t.neverTitle}</h2>
        <ul className="mt-2 list-none space-y-2 text-sm">
          {t.neverItems.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="font-bold text-red-700" aria-hidden>
                ✕
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-3 rounded-2xl border border-[#0b5d6b]/30 bg-[#0b5d6b]/5 p-4 print:break-inside-avoid">
        <h2 className="text-lg font-semibold">🛢 {t.drumTitle}</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
          {t.drumItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="mt-3 rounded-2xl border border-amber-500/40 bg-amber-50 p-4 dark:bg-amber-950/30 print:break-inside-avoid">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-200">⏱ {t.readyTitle}</h2>
        <p className="mt-2 text-sm">{t.readyText}</p>
        <p className="mt-2 text-sm font-medium">{t.askText}</p>
      </section>

      <p className="mt-4 text-xs text-zinc-500 print:text-black">{t.footer}</p>
    </main>
  );
}
