"use client";

import { useState } from "react";
import {
  DOCUMENT_NUMBER_TYPES,
  type DocumentNumberType,
} from "../document-number";
import { useLanguage } from "./LanguageProvider";

type Props = {
  documentType: DocumentNumberType;
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
  const documentCode = DOCUMENT_NUMBER_TYPES[documentType];

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
    <span className="auto-number-tools">
      <button
        className="auto-number-button"
        disabled={loading || !date}
        onClick={generate}
        type="button"
      >
        {t(loading ? "Membuat..." : "Buat Nomor Otomatis")}
      </button>
      <small className="official-code-hint">
        {t("Kode resmi")}: <strong>{documentCode.prefix}</strong> — {t(documentCode.label)}
      </small>
    </span>
  );
}
