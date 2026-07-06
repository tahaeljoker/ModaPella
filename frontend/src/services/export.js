/**
 * Export data to a UTF-8 BOM CSV file for Excel compatibility (with Arabic support).
 * @param {string} filename Name of the file without extension
 * @param {string[]} headers CSV Column headers
 * @param {any[][]} rows CSV Rows (array of arrays)
 */
export const exportToCSV = (filename, headers, rows) => {
  const content = [
    '\ufeff' + headers.join(','),
    ...rows.map(row => row.map(val => {
      const cleanVal = String(val === null || val === undefined ? '' : val).replace(/"/g, '""');
      return cleanVal.includes(',') || cleanVal.includes('\n') || cleanVal.includes('"') ? `"${cleanVal}"` : cleanVal;
    }).join(','))
  ].join('\r\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
