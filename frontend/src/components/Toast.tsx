interface ToastProps {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}

export default function Toast({ message, type = "success", onClose }: ToastProps) {
  const colors =
    type === "success"
      ? "bg-green-50 text-green-800 border-green-200"
      : "bg-red-50 text-red-800 border-red-200";

  return (
    <div
      className={`fixed bottom-6 right-6 border rounded-md px-4 py-3 shadow-md text-sm flex items-center gap-3 ${colors}`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
        ✕
      </button>
    </div>
  );
}
