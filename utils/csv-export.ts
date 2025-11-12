/**
 * CSV Export Utility
 *
 * Provides functions to export data to CSV format
 */

/**
 * Converts an array of objects to CSV format
 * @param data - Array of objects to convert
 * @param filename - Name of the file to download
 * @param columns - Optional custom column configuration
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Determine columns
  const cols = columns || Object.keys(data[0]).map(key => ({ key, label: key }));

  // Create CSV header
  const headers = cols.map(col => escapeCSVValue(col.label)).join(',');

  // Create CSV rows
  const rows = data.map(row => {
    return cols.map(col => {
      const value = row[col.key];
      return escapeCSVValue(formatValue(value));
    }).join(',');
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows].join('\n');

  // Create BOM for Excel Korean character support
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  // Create and trigger download
  downloadCSV(csvWithBOM, filename);
}

/**
 * Escapes and formats a value for CSV
 */
function escapeCSVValue(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quotes, or newlines, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Formats various data types for CSV export
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString('ko-KR');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Triggers browser download of CSV content
 */
function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', ensureCSVExtension(filename));
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Ensures filename has .csv extension
 */
function ensureCSVExtension(filename: string): string {
  return filename.endsWith('.csv') ? filename : `${filename}.csv`;
}

/**
 * Generates a timestamp-based filename
 */
export function generateCSVFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${timestamp}.csv`;
}
