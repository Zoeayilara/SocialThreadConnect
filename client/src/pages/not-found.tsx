import { LoadingOverlay } from "@/components/LoadingOverlay";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-200 via-indigo-100 to-pink-200">
      <LoadingOverlay text="Loading" overlay={false} size={128} />
    </div>
  );
}
