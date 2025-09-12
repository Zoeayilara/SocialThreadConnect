import { FoxLogo } from "@/components/FoxLogo";

interface LoadingOverlayProps {
  text?: string;
  /**
   * If true, show a semi-transparent blurred backdrop over current page.
   * If false, render on plain container background.
   */
  overlay?: boolean;
  /**
   * Overall diameter of the spinner in pixels
   */
  size?: number;
}

export function LoadingOverlay({ text = "Loading", overlay = true, size = 112 }: LoadingOverlayProps) {
  const ringThickness = Math.max(8, Math.round(size * 0.07));
  const innerInset = ringThickness;
  const logoSize = Math.round(size * 0.48);
  return (
    <div className={`${overlay ? "fixed inset-0 bg-black/25 backdrop-blur-md" : "w-full h-full"} z-50 flex items-center justify-center`}>
      <div className="flex flex-col items-center">
        <div className="relative select-none" style={{ width: size, height: size }}>
          {/* Gradient ring */}
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background: "conic-gradient(from 0deg, #7c3aed, #60a5fa, #ec4899, #7c3aed)",
              WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ringThickness}px), #000 0)`,
              mask: `radial-gradient(farthest-side, transparent calc(100% - ${ringThickness}px), #000 0)`,
            }}
          />
          {/* Inner circle */}
          <div className="absolute rounded-full bg-white shadow-2xl flex items-center justify-center" style={{ inset: innerInset }}>
            <FoxLogo size={logoSize} />
          </div>
        </div>
        <div className="mt-4 text-white drop-shadow-md text-lg font-semibold">
          {text}<span className="dotting ml-1"></span>
        </div>
      </div>

      <style>{`
        @keyframes dots { 0% { content: ''; } 25% { content: ' •'; } 50% { content: ' • •'; } 75% { content: ' • • •'; } 100% { content: ''; } }
        .dotting::after { content: ''; animation: dots 1.6s steps(4, end) infinite; }
      `}</style>
    </div>
  );
}


