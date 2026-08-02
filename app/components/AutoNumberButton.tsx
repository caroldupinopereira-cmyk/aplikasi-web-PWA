"use client";

import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

type Props = {
  documentType: "incoming" | "outgoing" | "report";
  date: string;
  onNumber: (number: string) => void;
};

export default function AutoNumberButton({
  documentType,
  date,
  onNumber,
}: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const response = await fetch("/api/document-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType, date }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Nomor belum dapat dibuat.");
      }
      onNumber(result.number);
    } catch (error) {
      window.alert(
        t(error instanceof Error ? error.message : "Nomor belum dapat dibuat."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="auto-number-button"
      disabled={loading || !date}
      onClick={generate}
      type="button"
    >
      {t(loading ? "Membuat..." : "Buat Nomor Otomatis")}
    </button>
  );
}
