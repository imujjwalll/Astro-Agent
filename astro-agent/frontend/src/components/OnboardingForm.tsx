import { useState, useCallback } from "react";
import { clsx } from "clsx";

interface FormStep {
  id: number;
  title: string;
  subtitle: string;
}

const STEPS: FormStep[] = [
  { id: 1, title: "What's your name?",       subtitle: "Let's personalize your cosmic journey" },
  { id: 2, title: "Your birth date & time",  subtitle: "Precise time unlocks your rising sign" },
  { id: 3, title: "Where were you born?",    subtitle: "Your birthplace shapes your astrological chart" },
];

export interface ProfileFormData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthCity: string;
}

interface OnboardingFormProps {
  onSubmit: (data: ProfileFormData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function OnboardingForm({ onSubmit, isLoading, error }: OnboardingFormProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ProfileFormData>({
    name: "",
    birthDate: "",
    birthTime: "",
    birthCity: "",
  });
  const [fieldError, setFieldError] = useState<string>("");

  const update = (field: keyof ProfileFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setFieldError("");
  };

  const validateStep = useCallback((): boolean => {
    switch (step) {
      case 1:
        if (!data.name.trim()) { setFieldError("Please enter your name"); return false; }
        if (data.name.trim().length < 2) { setFieldError("Name must be at least 2 characters"); return false; }
        break;
      case 2:
        if (!data.birthDate) { setFieldError("Please select your birth date"); return false; }
        if (!data.birthTime) { setFieldError("Please select your birth time"); return false; }
        // Validate date
        const date = new Date(data.birthDate);
        if (isNaN(date.getTime())) { setFieldError("Invalid date — please check again"); return false; }
        break;
      case 3:
        if (!data.birthCity.trim()) { setFieldError("Please enter your birth city"); return false; }
        break;
    }
    return true;
  }, [step, data]);

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 3) {
      setStep((s) => s + 1);
    } else {
      onSubmit(data);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={clsx(
                "flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all duration-300",
                step >= s.id
                  ? "bg-gradient-to-br from-cosmos-500 to-nebula-500 text-white shadow-lg shadow-cosmos-500/30"
                  : "bg-white/10 text-white/30 border border-white/15"
              )}
            >
              {step > s.id ? "✓" : s.id}
            </div>
          ))}
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cosmos-500 to-nebula-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="glass-card p-8" key={step}>
        <div className="mb-6 animate-[fadeIn_0.3s_ease-out]">
          <h2 className="text-xl font-semibold text-white mb-1">
            {STEPS[step - 1]?.title}
          </h2>
          <p className="text-sm text-white/50">{STEPS[step - 1]?.subtitle}</p>
        </div>

        {/* Fields */}
        <div className="space-y-4 animate-[slideUp_0.3s_ease-out]">
          {step === 1 && (
            <div>
              <label htmlFor="name" className="label-text">Full Name</label>
              <input
                id="name"
                type="text"
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Priya Sharma"
                className="input-field"
                autoFocus
                autoComplete="name"
              />
            </div>
          )}

          {step === 2 && (
            <>
              <div>
                <label htmlFor="birthDate" className="label-text">Date of Birth</label>
                <input
                  id="birthDate"
                  type="date"
                  value={data.birthDate}
                  onChange={(e) => update("birthDate", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="input-field"
                  max={new Date().toISOString().split("T")[0]}
                  autoFocus
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div>
                <label htmlFor="birthTime" className="label-text">
                  Time of Birth
                  <span className="ml-2 text-white/30 text-xs font-normal">(24-hour format)</span>
                </label>
                <input
                  id="birthTime"
                  type="time"
                  value={data.birthTime}
                  onChange={(e) => update("birthTime", e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="input-field"
                  style={{ colorScheme: "dark" }}
                />
                <p className="text-xs text-white/30 mt-1">
                  Don't know your exact birth time? Use 12:00 as an approximation.
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <div>
              <label htmlFor="birthCity" className="label-text">Birth City</label>
              <input
                id="birthCity"
                type="text"
                value={data.birthCity}
                onChange={(e) => update("birthCity", e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Mumbai, Kolkata, New York"
                className="input-field"
                autoFocus
                autoComplete="off"
              />
              <p className="text-xs text-white/30 mt-1">
                Include country if needed (e.g. "Springfield, Illinois, USA")
              </p>
            </div>
          )}
        </div>

        {/* Errors */}
        {(fieldError || error) && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm animate-[fadeIn_0.2s_ease-out]">
            ⚠️ {fieldError || error}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-6 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => { setStep((s) => s - 1); setFieldError(""); }}
              className="btn-secondary flex-1"
              disabled={isLoading}
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={isLoading}
            className="btn-primary flex-1"
            id={`step-${step}-next`}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : step === 3 ? (
              <>✨ Reveal My Chart</>
            ) : (
              <>Continue →</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
