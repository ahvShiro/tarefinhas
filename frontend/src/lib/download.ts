/** Makes the browser save `blob` as a file called `fileName` (the downloads folder, or where the person picks). */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // Give the browser time to start the download before the address goes away.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * A plain text file that opens well in Notepad: UTF-8 with a BOM (so accents show in older Notepad) and Windows
 * line endings.
 */
export function textFile(text: string): Blob {
  return new Blob(['\uFEFF', text.replace(/\r?\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' })
}
