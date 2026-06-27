interface RiskAlertProps {
  message: string;
  score: number;
}

export default function RiskAlert({ message, score }: RiskAlertProps) {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-red-600 font-semibold text-sm">⚠ EPDS Score: {score}/30</span>
        <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded">
          Elevated
        </span>
      </div>
      <p className="text-red-700 text-sm">{message}</p>
      <p className="text-red-600 text-sm font-medium">
        National Maternal Mental Health Hotline:{" "}
        <a href="tel:18339435746" className="underline hover:no-underline font-bold">
          1-833-943-5746
        </a>{" "}
        — free, 24/7
      </p>
    </div>
  );
}
