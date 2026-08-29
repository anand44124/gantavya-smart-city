/**
 * Pure TypeScript EXIF GPS parser for JPEG images.
 * Extracts latitude and longitude from photo metadata without external dependencies.
 */

export function extractExifGps(file: File): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = function (e) {
      const buffer = e.target?.result as ArrayBuffer
      if (!buffer) return resolve(null)
      try {
        const view = new DataView(buffer)
        if (view.getUint16(0, false) !== 0xffd8) {
          return resolve(null) // Not JPEG
        }

        let length = view.byteLength
        let offset = 2
        while (offset < length) {
          if (view.getUint8(offset) !== 0xff) return resolve(null)
          const marker = view.getUint8(offset + 1)
          if (marker === 0xe1) {
            // APP1 Marker (Exif)
            const exifOffset = offset + 4
            return resolve(parseExif(view, exifOffset))
          } else if (marker === 0xd9 || marker === 0xda) {
            break
          } else {
            offset += 2 + view.getUint16(offset + 2, false)
          }
        }
        resolve(null)
      } catch {
        resolve(null)
      }
    }
    reader.readAsArrayBuffer(file.slice(0, 131072)) // First 128KB is enough for EXIF
  })
}

function parseExif(view: DataView, start: number): { latitude: number; longitude: number } | null {
  if (
    view.getUint8(start) !== 0x45 ||
    view.getUint8(start + 1) !== 0x78 ||
    view.getUint8(start + 2) !== 0x69 ||
    view.getUint8(start + 3) !== 0x66
  ) {
    return null
  }

  const tiffStart = start + 6
  const littleEndian = view.getUint16(tiffStart, false) === 0x4949

  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian)
  let gpsOffset = 0

  const ifd0Start = tiffStart + ifd0Offset
  const numEntries = view.getUint16(ifd0Start, littleEndian)

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifd0Start + 2 + i * 12
    const tag = view.getUint16(entryOffset, littleEndian)
    if (tag === 0x8825) {
      gpsOffset = view.getUint32(entryOffset + 8, littleEndian)
      break
    }
  }

  if (!gpsOffset) return null

  const gpsStart = tiffStart + gpsOffset
  const numGpsEntries = view.getUint16(gpsStart, littleEndian)

  let latRef = 'N'
  let lonRef = 'E'
  let latDegrees: number[] = []
  let lonDegrees: number[] = []

  for (let i = 0; i < numGpsEntries; i++) {
    const entryOffset = gpsStart + 2 + i * 12
    const tag = view.getUint16(entryOffset, littleEndian)

    if (tag === 0x0001) {
      latRef = String.fromCharCode(view.getUint8(entryOffset + 8))
    } else if (tag === 0x0002) {
      const valOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian)
      latDegrees = [
        readRational(view, valOffset, littleEndian),
        readRational(view, valOffset + 8, littleEndian),
        readRational(view, valOffset + 16, littleEndian),
      ]
    } else if (tag === 0x0003) {
      lonRef = String.fromCharCode(view.getUint8(entryOffset + 8))
    } else if (tag === 0x0004) {
      const valOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian)
      lonDegrees = [
        readRational(view, valOffset, littleEndian),
        readRational(view, valOffset + 8, littleEndian),
        readRational(view, valOffset + 16, littleEndian),
      ]
    }
  }

  if (latDegrees.length === 3 && lonDegrees.length === 3) {
    let lat = latDegrees[0] + latDegrees[1] / 60 + latDegrees[2] / 3600
    let lon = lonDegrees[0] + lonDegrees[1] / 60 + lonDegrees[2] / 3600
    if (latRef === 'S') lat = -lat
    if (lonRef === 'W') lon = -lon

    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      return { latitude: Number(lat.toFixed(6)), longitude: Number(lon.toFixed(6)) }
    }
  }

  return null
}

function readRational(view: DataView, offset: number, littleEndian: boolean): number {
  const num = view.getUint32(offset, littleEndian)
  const den = view.getUint32(offset + 4, littleEndian)
  if (den === 0) return 0
  return num / den
}
