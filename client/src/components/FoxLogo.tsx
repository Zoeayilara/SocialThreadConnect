import foxLogoImage from "@assets/WhatsApp Image 2025-07-12 at 09.55.38_41f1eb3c_1753012399256.jpg";

interface FoxLogoProps {
  className?: string;
  /**
   * The outer square size in pixels
   */
  size?: number;
}

export function FoxLogo({ className = "", size = 64 }: FoxLogoProps) {
  const innerSize = Math.round(size * 0.65);

  return (
    <div
      className={`mx-auto inline-flex items-center justify-center rounded-2xl bg-white shadow-md ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={foxLogoImage}
        alt="App Logo"
        width={innerSize}
        height={innerSize}
        className="object-contain"
      />
    </div>
  );
}