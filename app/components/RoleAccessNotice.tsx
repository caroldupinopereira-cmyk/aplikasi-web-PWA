"use client";

import { roleHasCapability } from "../roles";
import Icon from "./Icon";
import { useLanguage } from "./LanguageProvider";

export default function RoleAccessNotice({
  role,
  area = "operational",
}: {
  role: string;
  area?: "operational" | "finance";
}) {
  const { t } = useLanguage();
  if (!role) return null;

  const allowed =
    area === "finance"
      ? roleHasCapability(role, "manageFinance")
      : roleHasCapability(role, "writeOperational");
  if (allowed) return null;

  return (
    <div className="role-access-notice" role="status">
      <Icon name="shield" size={17} />
      <div>
        <strong>{t("Mode baca-saja")}</strong>
        <span>
          {t(
            area === "finance"
              ? "Peran Anda dapat melihat data keuangan, tetapi tidak dapat mengubah atau memverifikasinya."
              : "Peran Anda dapat melihat data, tetapi tidak dapat menambah, mengubah, atau menghapusnya.",
          )}
        </span>
      </div>
    </div>
  );
}
