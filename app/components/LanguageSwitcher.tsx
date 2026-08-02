"use client";

import { useEffect, useRef, useState } from "react";
import { localeOptions, type Locale } from "../i18n";
import { useLanguage } from "./LanguageProvider";
import Icon from "./Icon";

const flagPath = (locale: Locale) =>
  `/images/flags/${locale === "tet" ? "tl" : locale}.svg`;

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected =
    localeOptions.find((option) => option.locale === locale) ?? localeOptions[2];

  useEffect(() => {
    function closeWhenOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeWhenOutside);
    return () => document.removeEventListener("mousedown", closeWhenOutside);
  }, []);

  return (
    <div className="language-switcher" ref={containerRef}>
      <span className="sr-only">Bahasa / Língua / Lian</span>
      <button
        className="language-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((value) => !value)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagPath(selected.locale)} alt="" aria-hidden="true" />
        <span>{selected.name}</span>
        <Icon
          name="chevron-down"
          size={16}
          className={open ? "language-arrow open" : "language-arrow"}
        />
      </button>
      {open && (
        <div className="language-menu" role="listbox" aria-label="Bahasa / Língua / Lian">
          {localeOptions.map((option) => (
            <button
              className={option.locale === locale ? "selected" : ""}
              key={option.locale}
              type="button"
              role="option"
              aria-selected={option.locale === locale}
              onClick={() => {
                setLocale(option.locale);
                setOpen(false);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagPath(option.locale)} alt="" aria-hidden="true" />
              <span>{option.name}</span>
              {option.locale === locale && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
