"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORY_META: Record<string, { emoji: string; gradient: string }> = {
  home_services: { emoji: "🏠", gradient: "from-blue-400 to-blue-600" },
  construction: { emoji: "🔧", gradient: "from-orange-400 to-orange-600" },
  automotive: { emoji: "🚗", gradient: "from-red-400 to-red-600" },
  personal_care: { emoji: "💇", gradient: "from-pink-400 to-pink-600" },
  care_services: { emoji: "👶", gradient: "from-rose-400 to-rose-600" },
  delivery_moving: { emoji: "📦", gradient: "from-amber-400 to-amber-600" },
  tech_it: { emoji: "💻", gradient: "from-cyan-400 to-cyan-600" },
  events_entertainment: { emoji: "🎉", gradient: "from-purple-400 to-purple-600" },
  education_tutoring: { emoji: "📚", gradient: "from-indigo-400 to-indigo-600" },
  professional_services: { emoji: "💼", gradient: "from-slate-400 to-slate-600" },
  fashion_tailoring: { emoji: "👔", gradient: "from-violet-400 to-violet-600" },
  food_cooking: { emoji: "🍳", gradient: "from-yellow-400 to-yellow-600" },
  security: { emoji: "🛡️", gradient: "from-emerald-400 to-emerald-600" },
  agriculture: { emoji: "🌾", gradient: "from-green-400 to-green-600" },
};

const JOB_EMOJIS: Record<string, string> = {
  // Home Services
  cleaner: "🧹", housekeeper: "🏡", maid: "👩‍🦰", gardener: "🌻", landscaper: "🌳",
  pool_cleaner: "🏊", window_cleaner: "🪟", carpet_cleaner: "🧽", pressure_washer: "💦", pest_control: "🐜",
  // Construction
  plumber: "🚿", electrician: "⚡", carpenter: "🪚", painter: "🎨", roofer: "🏗️",
  mason: "🧱", welder: "🔥", tiler: "🔲", plasterer: "🪣", glazier: "🪞",
  flooring_installer: "🪵", drywall_installer: "📐", insulation_worker: "🧤", hvac_technician: "❄️", locksmith: "🔐",
  // Automotive
  mechanic: "🔧", auto_electrician: "🔌", car_washer: "🚿", auto_detailer: "✨",
  tire_technician: "🛞", body_repair: "🚙", tow_truck_driver: "🚛",
  // Personal Care
  barber: "💈", hairdresser: "💇‍♀️", beautician: "💄", makeup_artist: "👄",
  nail_technician: "💅", massage_therapist: "💆", personal_trainer: "💪", tattoo_artist: "🎭",
  // Care Services
  babysitter: "👶", nanny: "🍼", elderly_caregiver: "👴", pet_sitter: "🐕",
  dog_walker: "🦮", pet_groomer: "🐩", nurse: "👩‍⚕️", home_health_aide: "🏥",
  // Delivery & Moving
  mover: "📦", delivery_driver: "🚚", courier: "📬", truck_driver: "🚛", furniture_assembler: "🪑",
  // Tech & IT
  computer_technician: "🖥️", phone_repair: "📱", network_technician: "🌐",
  security_installer: "📹", smart_home_installer: "🏠", appliance_repair: "🔌",
  // Events & Entertainment
  photographer: "📸", videographer: "🎬", dj: "🎧", musician: "🎵",
  event_planner: "🎊", caterer: "🍽️", bartender: "🍸", waiter: "🍷",
  // Education & Tutoring
  tutor: "📖", music_teacher: "🎼", language_teacher: "🗣️",
  driving_instructor: "🚗", sports_coach: "⚽", yoga_instructor: "🧘",
  // Professional Services
  accountant: "🧮", lawyer: "⚖️", translator: "🌍", notary: "📜",
  real_estate_agent: "🏘️", insurance_agent: "📋",
  // Fashion & Tailoring
  tailor: "🧵", seamstress: "🪡", shoe_repair: "👞", dry_cleaner: "👕", laundry_service: "🧺",
  // Food & Cooking
  chef: "👨‍🍳", cook: "🍳", baker: "🥖", butcher: "🥩", personal_chef: "🍴",
  // Security
  security_guard: "👮", bodyguard: "🕴️", private_investigator: "🔍",
  // Agriculture
  farmer: "👨‍🌾", farmhand: "🌾", veterinarian: "🐾", beekeeper: "🐝"
};

const JOB_CATEGORIES: Record<string, string[]> = {
  home_services: [
    "cleaner", "housekeeper", "maid", "gardener", "landscaper",
    "pool_cleaner", "window_cleaner", "carpet_cleaner", "pressure_washer", "pest_control"
  ],
  construction: [
    "plumber", "electrician", "carpenter", "painter", "roofer", "mason", "welder",
    "tiler", "plasterer", "glazier", "flooring_installer", "drywall_installer",
    "insulation_worker", "hvac_technician", "locksmith"
  ],
  automotive: [
    "mechanic", "auto_electrician", "car_washer", "auto_detailer",
    "tire_technician", "body_repair", "tow_truck_driver"
  ],
  personal_care: [
    "barber", "hairdresser", "beautician", "makeup_artist",
    "nail_technician", "massage_therapist", "personal_trainer", "tattoo_artist"
  ],
  care_services: [
    "babysitter", "nanny", "elderly_caregiver", "pet_sitter",
    "dog_walker", "pet_groomer", "nurse", "home_health_aide"
  ],
  delivery_moving: [
    "mover", "delivery_driver", "courier", "truck_driver", "furniture_assembler"
  ],
  tech_it: [
    "computer_technician", "phone_repair", "network_technician",
    "security_installer", "smart_home_installer", "appliance_repair"
  ],
  events_entertainment: [
    "photographer", "videographer", "dj", "musician",
    "event_planner", "caterer", "bartender", "waiter"
  ],
  education_tutoring: [
    "tutor", "music_teacher", "language_teacher",
    "driving_instructor", "sports_coach", "yoga_instructor"
  ],
  professional_services: [
    "accountant", "lawyer", "translator", "notary",
    "real_estate_agent", "insurance_agent"
  ],
  fashion_tailoring: [
    "tailor", "seamstress", "shoe_repair", "dry_cleaner", "laundry_service"
  ],
  food_cooking: [
    "chef", "cook", "baker", "butcher", "personal_chef"
  ],
  security: [
    "security_guard", "bodyguard", "private_investigator"
  ],
  agriculture: [
    "farmer", "farmhand", "veterinarian", "beekeeper"
  ]
};

export default function CategoryDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const category = params.category as string;

  const jobs = JOB_CATEGORIES[category] || [];
  const meta = CATEGORY_META[category];

  const handleJobClick = (jobId: string) => {
    router.push(`/search?job=${jobId}`);
  };

  const handleBack = () => {
    router.push("/categories");
  };

  const handleCreateYours = () => {
    router.push("/categories/suggest");
  };

  if (!meta) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{t("categories.notFound")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
        <div className="container mx-auto px-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>

          {/* Category header with icon */}
          <div className="flex flex-col items-center mb-12">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-4 shadow-xl`}>
              <span className="text-5xl drop-shadow-md">{meta.emoji}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {t(`categories.${category}`)}
            </h1>
            <p className="text-gray-600 text-center mt-2">
              {t("categories.selectProfession")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 max-w-5xl mx-auto">
            {jobs.map((job) => (
              <button
                key={job}
                onClick={() => handleJobClick(job)}
                className="group relative flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                {/* Glow effect on hover */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${meta.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                {/* Icon container */}
                <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  <div className="absolute inset-1 rounded-xl bg-white/20" />
                  <span className="text-4xl relative z-10 drop-shadow-md">{JOB_EMOJIS[job] || "👤"}</span>
                </div>

                {/* Job name */}
                <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-gray-900 transition-colors">
                  {t(`jobs.${job}`)}
                </span>

                {/* Bottom accent line */}
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r ${meta.gradient} rounded-full group-hover:w-16 transition-all duration-300`} />
              </button>
            ))}

            {/* Create Yours button */}
            <button
              onClick={handleCreateYours}
              className="group relative flex flex-col items-center p-6 bg-white rounded-2xl border border-dashed border-gray-300 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-600 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                <div className="absolute inset-1 rounded-xl bg-white/20" />
                <Plus className="w-10 h-10 text-white relative z-10 drop-shadow-md" />
              </div>
              <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-gray-900 transition-colors">
                {t("categories.suggest_new")}
              </span>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r from-gray-400 to-gray-600 rounded-full group-hover:w-16 transition-all duration-300" />
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
