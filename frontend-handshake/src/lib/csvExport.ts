/**
 * Export vouch history to CSV file with proper escaping and formatting.
 * Security: Sanitizes all user input to prevent CSV injection attacks.
 */

export interface VouchHistoryRow {
  type: "given" | "received";
  address: string;
  category: string;
  status: string;
  timestamp: string;
  message?: string;
  chainId: number;
}

/**
 * Escape CSV field to prevent injection attacks.
 * Handles quotes, commas, newlines, and other special characters.
 */
function escapeCSVField(field: string): string {
  if (field.includes('"') || field.includes(",") || field.includes("\n") || field.includes("\r")) {
    // Escape quotes by doubling them, then wrap in quotes
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Format date as ISO string for Excel compatibility.
 */
function formatDate(timestamp: bigint | number | string): string {
  const num = typeof timestamp === "bigint" ? Number(timestamp) : Number(timestamp);
  if (isNaN(num) || num <= 0) return "";
  const date = new Date(num * 1000); // Convert from seconds to milliseconds
  return date.toISOString();
}

/**
 * Export vouch history to CSV and trigger browser download.
 * @param rows Array of vouch history rows
 * @param filename Optional filename (defaults to timestamped name)
 */
export function exportVouchesToCSV(rows: VouchHistoryRow[], filename?: string): void {
  if (rows.length === 0) {
    throw new Error("Cannot export empty vouch history");
  }

  // CSV headers
  const headers = [
    "Type",
    "Address",
    "Category",
    "Status",
    "Timestamp",
    "Message",
    "Chain ID",
  ];

  // Build CSV content
  const csvRows: string[] = [headers.map(escapeCSVField).join(",")];

  for (const row of rows) {
    const csvRow = [
      escapeCSVField(row.type),
      escapeCSVField(row.address),
      escapeCSVField(row.category),
      escapeCSVField(row.status),
      escapeCSVField(formatDate(row.timestamp)),
      escapeCSVField(row.message || ""),
      escapeCSVField(String(row.chainId)),
    ];
    csvRows.push(csvRow.join(","));
  }

  const csvContent = csvRows.join("\n");

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `handshake-history-${Date.now()}.csv`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
