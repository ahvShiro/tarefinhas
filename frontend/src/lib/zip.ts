// A minimal .zip writer, enough to download many photos at once. Files are stored without compression: photos
// (JPEG, PNG, WebP) are compressed already, so compressing again would only cost time.

export interface ZipFile {
  name: string
  data: Uint8Array
  date: Date
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Date and time in the MS-DOS format that .zip uses (local time, 2-second steps, from 1980). */
function dosDateTime(date: Date): { time: number; day: number } {
  const year = Math.max(date.getFullYear(), 1980)
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/** Builds a .zip with the files, in order. Names are UTF-8 (accents work). Repeated names get "-2", "-3"… */
export function createZip(files: ZipFile[]): Blob {
  const encoder = new TextEncoder()
  const used = new Set<string>()
  const parts: BlobPart[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = uniqueName(file.name, used)
    const nameBytes = encoder.encode(name)
    const crc = crc32(file.data)
    const { time, day } = dosDateTime(file.date)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true) // local file header
    local.setUint16(4, 20, true) // version needed
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true) // stored
    local.setUint16(10, time, true)
    local.setUint16(12, day, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, file.data.length, true)
    local.setUint32(22, file.data.length, true)
    local.setUint16(26, nameBytes.length, true)
    local.setUint16(28, 0, true)
    parts.push(local.buffer, nameBytes, file.data as Uint8Array<ArrayBuffer>)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true) // central directory header
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, time, true)
    entry.setUint16(14, day, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, file.data.length, true)
    entry.setUint32(24, file.data.length, true)
    entry.setUint16(28, nameBytes.length, true)
    entry.setUint32(42, offset, true)
    const header = new Uint8Array(46 + nameBytes.length)
    header.set(new Uint8Array(entry.buffer), 0)
    header.set(nameBytes, 46)
    central.push(header)

    offset += 30 + nameBytes.length + file.data.length
  }

  const centralSize = central.reduce((total, header) => total + header.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true) // end of central directory
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  return new Blob([...parts, ...central.map((header) => header as Uint8Array<ArrayBuffer>), end.buffer], {
    type: 'application/zip',
  })
}

function uniqueName(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ''
  let candidate = name
  for (let count = 2; used.has(candidate); count += 1) candidate = `${base}-${count}${extension}`
  used.add(candidate)
  return candidate
}
