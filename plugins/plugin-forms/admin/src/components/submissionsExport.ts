import { toast, triggerBlobDownload } from "@cms/admin-shell";

export async function downloadSubmissionsExport(
  formId: string,
  formTitle: string | undefined,
  format: "xlsx" | "csv",
): Promise<void> {
  const res = await fetch(`/api/forms/${formId}/submissions/export?format=${format}`, {
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
    const safeTitle = (formTitle || "form-submissions").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    filename = `${safeTitle}-submissions-${new Date().toISOString().slice(0, 10)}.${format}`;
  }

  const blob = await res.blob();
  triggerBlobDownload(blob, filename);

  toast.success(
    format === "xlsx"
      ? "Excel spreadsheet downloaded successfully"
      : "CSV document downloaded successfully",
  );
}
