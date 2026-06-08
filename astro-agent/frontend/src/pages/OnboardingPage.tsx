import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { StarBackground } from "../components/StarBackground";
import { OnboardingForm, type ProfileFormData } from "../components/OnboardingForm";

const API_BASE = import.meta.env.VITE_API_URL || "";

// ─── Zodiac features for the hero section ──────────────────────────────────────

const ZODIAC_SYMBOLS = [
  { symbol: "♈", name: "Aries" },    { symbol: "♉", name: "Taurus" },
  { symbol: "♊", name: "Gemini" },   { symbol: "♋", name: "Cancer" },
  { symbol: "♌", name: "Leo" },      { symbol: "♍", name: "Virgo" },
  { symbol: "♎", name: "Libra" },    { symbol: "♏", name: "Scorpio" },
  { symbol: "♐", name: "Sagittarius" }, { symbol: "♑", name: "Capricorn" },
  { symbol: "♒", name: "Aquarius" }, { symbol: "♓", name: "Pisces" },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (formData: ProfileFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // First geocode the city
      const geocodeRes = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Geocode this city for me: ${formData.birthCity}`,
          threadId: "geocode-temp",
        }),
      });

      // Actually, geocoding happens inside the agent.
      // We need to call geocoder directly via a temp approach or just save the raw city
      // and let the agent geocode on first chat. We'll use the geocode endpoint approach:
      // Call our profile endpoint after manually geocoding via the geocoder tool.

      // Simpler: call the geocoder tool via a dedicated minimal endpoint,
      // or rely on the agent to geocode when the user first chats.
      // For the profile save, we'll use the Nominatim API directly from the frontend:

      const nominatimRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.birthCity)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "AstroAgent/1.0" } }
      );

      if (!nominatimRes.ok) throw new Error("Could not reach geocoding service");
      const places = await nominatimRes.json();

      if (!places || places.length === 0) {
        throw new Error(`Could not find "${formData.birthCity}". Please check the spelling or try a nearby major city.`);
      }

      const place = places[0];
      const latitude = parseFloat(place.lat);
      const longitude = parseFloat(place.lon);

      // Standardize to UTC on the frontend; the backend geocoder tool uses exact `geo-tz` resolution.
      const timezone = "UTC";

      // Generate thread ID for this user
      const existingThreadId = localStorage.getItem("astro_thread_id");
      const threadId = existingThreadId || uuidv4();

      // Save profile to backend
      const saveRes = await fetch(`${API_BASE}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          name: formData.name,
          birthDate: formData.birthDate,
          birthTime: formData.birthTime,
          birthCity: formData.birthCity,
          latitude,
          longitude,
          timezone,
        }),
      });

      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save your profile");
      }

      // Persist threadId and basic profile info
      localStorage.setItem("astro_thread_id", threadId);
      localStorage.setItem("astro_user_name", formData.name);
      localStorage.setItem("astro_birth_city", formData.birthCity);

      navigate("/chat");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-12">
      <StarBackground />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Hero header */}
        <div className="text-center mb-10">
          {/* Zodiac orbit ring */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div
              className="absolute inset-0 rounded-full border border-cosmos-500/30 animate-spin-slow"
              style={{ animationDuration: "20s" }}
            />
            <div
              className="absolute inset-2 rounded-full border border-nebula-500/20 animate-spin-slow"
              style={{ animationDuration: "15s", animationDirection: "reverse" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl animate-[pulseGlow_3s_ease-in-out_infinite]" role="img" aria-label="star">⭐</span>
            </div>
            {/* Orbiting planet dots */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-cosmos-400"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${angle}deg) translateX(44px) translateY(-50%)`,
                  opacity: 0.6 + i * 0.06,
                }}
              />
            ))}
          </div>

          <h1 className="text-4xl font-bold mb-2">
            <span className="gradient-text">AstroAgent</span>
          </h1>
          <p className="text-white/50 text-base font-light">
            Your AI astrologer, powered by real planetary science
          </p>
          <p className="text-white/30 text-sm mt-1">
            Swiss Ephemeris · LangGraph · Llama 3.3
          </p>
        </div>

        {/* Form */}
        <OnboardingForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />

        {/* Zodiac symbols strip */}
        <div className="mt-10 flex justify-center gap-3 flex-wrap opacity-30">
          {ZODIAC_SYMBOLS.map((z) => (
            <span key={z.name} title={z.name} className="text-lg hover:opacity-100 transition-opacity cursor-default">
              {z.symbol}
            </span>
          ))}
        </div>

        {/* Features strip */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { icon: "🔭", text: "Real Swiss Ephemeris" },
            { icon: "🧠", text: "AI Interpretations" },
            { icon: "💾", text: "Persistent Memory" },
          ].map((f) => (
            <div key={f.text} className="glass-card px-3 py-3 text-center">
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-xs text-white/50">{f.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
