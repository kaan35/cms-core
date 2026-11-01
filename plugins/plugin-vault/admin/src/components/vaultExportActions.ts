import { toast, triggerBlobDownload } from "@cms/admin-shell";

export async function downloadVaultExport(format: "xlsx" | "csv"): Promise<void> {
  const res = await fetch(`/api/vault/export?format=${format}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Export failed with status: ${res.status}`);
  }

  const disposition = res.headers.get("Content-Disposition");
  let filename = "";
  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match?.[1]) filename = match[1];
  }
  if (!filename) {
    filename = `vault-export-${new Date().toISOString().slice(0, 10)}.${format}`;
  }

  const blob = await res.blob();
  triggerBlobDownload(blob, filename);

  toast.success(
    format === "xlsx"
      ? "Excel spreadsheet exported successfully"
      : "CSV document exported successfully",
  );
}

export function downloadVaultTemplate(format: "xlsx" | "csv"): void {
  window.location.href = `/api/vault/template?format=${format}`;
}
