import { useMemo } from 'react'

interface QRCodeProps {
  url: string
  size?: number
  caption?: string
}

const QRCode = ({ url, size = 256, caption }: QRCodeProps) => {
  const src = useMemo(() => {
    const encoded = encodeURIComponent(url)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
  }, [url, size])

  return (
    <div className="flex flex-col items-center">
      <img src={src} alt="QR" width={size} height={size} className="rounded-lg shadow-md bg-white" />
      {caption && (
        <p className="mt-2 text-sm text-gray-600 text-center">{caption}</p>
      )}
    </div>
  )
}

export default QRCode
