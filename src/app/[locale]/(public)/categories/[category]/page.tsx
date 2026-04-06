"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Header, Footer } from "@/components/layout";
import { ArrowLeft, Plus, Star, Loader2, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Built-in category metadata
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
  cleaner: "🧹", housekeeper: "🏡", maid: "👩‍🦰", gardener: "🌻", landscaper: "🌳",
  pool_cleaner: "🏊", window_cleaner: "🪟", carpet_cleaner: "🧽", pressure_washer: "💦", pest_control: "🐜",
  plumber: "🚿", electrician: "⚡", carpenter: "🪚", painter: "🎨", roofer: "🏗️",
  mason: "🧱", welder: "🔥", tiler: "🔲", plasterer: "🪣", glazier: "🪞",
  flooring_installer: "🪵", drywall_installer: "📐", insulation_worker: "🧤", hvac_technician: "❄️", locksmith: "🔐",
  mechanic: "🔧", auto_electrician: "🔌", car_washer: "🚿", auto_detailer: "✨",
  tire_technician: "🛞", body_repair: "🚙", tow_truck_driver: "🚛",
  barber: "💈", hairdresser: "💇‍♀️", beautician: "💄", makeup_artist: "👄",
  nail_technician: "💅", massage_therapist: "💆", personal_trainer: "💪", tattoo_artist: "🎭",
  babysitter: "👶", nanny: "🍼", elderly_caregiver: "👴", pet_sitter: "🐕",
  dog_walker: "🦮", pet_groomer: "🐩", nurse: "👩‍⚕️", home_health_aide: "🏥",
  mover: "📦", delivery_driver: "🚚", courier: "📬", truck_driver: "🚛", furniture_assembler: "🪑",
  computer_technician: "🖥️", phone_repair: "📱", network_technician: "🌐",
  security_installer: "📹", smart_home_installer: "🏠", appliance_repair: "🔌",
  photographer: "📸", videographer: "🎬", dj: "🎧", musician: "🎵",
  event_planner: "🎊", caterer: "🍽️", bartender: "🍸", waiter: "🍷",
  tutor: "📖", music_teacher: "🎼", language_teacher: "🗣️",
  driving_instructor: "🚗", sports_coach: "⚽", yoga_instructor: "🧘",
  accountant: "🧮", lawyer: "⚖️", translator: "🌍", notary: "📜",
  real_estate_agent: "🏘️", insurance_agent: "📋",
  tailor: "🧵", seamstress: "🪡", shoe_repair: "👞", dry_cleaner: "👕", laundry_service: "🧺",
  chef: "👨‍🍳", cook: "🍳", baker: "🥖", butcher: "🥩", personal_chef: "🍴",
  security_guard: "👮", bodyguard: "🕴️", private_investigator: "🔍",
  farmer: "👨‍🌾", farmhand: "🌾", veterinarian: "🐾", beekeeper: "🐝"
};

const JOB_CATEGORIES: Record<string, string[]> = {
  home_services: ["cleaner", "housekeeper", "maid", "gardener", "landscaper", "pool_cleaner", "window_cleaner", "carpet_cleaner", "pressure_washer", "pest_control"],
  construction: ["plumber", "electrician", "carpenter", "painter", "roofer", "mason", "welder", "tiler", "plasterer", "glazier", "flooring_installer", "drywall_installer", "insulation_worker", "hvac_technician", "locksmith"],
  automotive: ["mechanic", "auto_electrician", "car_washer", "auto_detailer", "tire_technician", "body_repair", "tow_truck_driver"],
  personal_care: ["barber", "hairdresser", "beautician", "makeup_artist", "nail_technician", "massage_therapist", "personal_trainer", "tattoo_artist"],
  care_services: ["babysitter", "nanny", "elderly_caregiver", "pet_sitter", "dog_walker", "pet_groomer", "nurse", "home_health_aide"],
  delivery_moving: ["mover", "delivery_driver", "courier", "truck_driver", "furniture_assembler"],
  tech_it: ["computer_technician", "phone_repair", "network_technician", "security_installer", "smart_home_installer", "appliance_repair"],
  events_entertainment: ["photographer", "videographer", "dj", "musician", "event_planner", "caterer", "bartender", "waiter"],
  education_tutoring: ["tutor", "music_teacher", "language_teacher", "driving_instructor", "sports_coach", "yoga_instructor"],
  professional_services: ["accountant", "lawyer", "translator", "notary", "real_estate_agent", "insurance_agent"],
  fashion_tailoring: ["tailor", "seamstress", "shoe_repair", "dry_cleaner", "laundry_service"],
  food_cooking: ["chef", "cook", "baker", "butcher", "personal_chef"],
  security: ["security_guard", "bodyguard", "private_investigator"],
  agriculture: ["farmer", "farmhand", "veterinarian", "beekeeper"]
};

interface DbCategory {
  id: string;
  name: string;
  nameDE?: string;
  emoji: string;
  gradient: string;
  professions: Array<{
    id: string;
    name: string;
    nameDE?: string;
    emoji: string;
    _count: { cleaners: number };
  }>;
}

interface Worker {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  workerProfile: {
    id: string;
    hourlyRate: number;
    currency: string;
    city?: string;
    averageRating: number;
    verified: boolean;
    professions: Array<{
      isPrimary: boolean;
      profession: {
        id: string;
        name: string;
        emoji: string;
      };
    }>;
  };
}

export default function CategoryDetailPage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const categorySlug = params.category as string;

  const [loading, setLoading] = useState(true);
  const [dbCategory, setDbCategory] = useState<DbCategory | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);

  // Check if it's a built-in category
  const isBuiltIn = CATEGORY_META[categorySlug] !== undefined;
  const builtInMeta = CATEGORY_META[categorySlug];
  const builtInJobs = JOB_CATEGORIES[categorySlug] || [];

  // Fetch dynamic category from DB
  useEffect(() => {
    const fetchCategory = async () => {
      if (isBuiltIn) {
        setLoading(false);
        return;
      }

      try {
        // Try to fetch by ID or name
        const response = await fetch(`/api/categories`);
        if (response.ok) {
          const categories = await response.json();
          // Find by slug/name (case-insensitive)
          const found = categories.find(
            (c: DbCategory) =>
              c.id === categorySlug ||
              c.name.toLowerCase().replace(/\s+/g, "_") === categorySlug.toLowerCase()
          );
          if (found) {
            setDbCategory(found);
            // Fetch workers for this category
            fetchWorkers(found.id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch category:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [categorySlug, isBuiltIn]);

  const fetchWorkers = async (categoryId: string) => {
    setLoadingWorkers(true);
    try {
      const response = await fetch(`/api/workers?categoryId=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.cleaners || []);
      }
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const handleJobClick = (jobId: string) => {
    router.push(`/search?job=${jobId}`);
  };

  const handleWorkerClick = (workerId: string) => {
    router.push(`/worker-profile/${workerId}`);
  };

  const handleBack = () => {
    router.push("/categories");
  };

  const handleCreateYours = () => {
    router.push("/categories/suggest");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </main>
        <Footer />
      </div>
    );
  }

  // Not found
  if (!isBuiltIn && !dbCategory) {
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

  // Dynamic category from DB - show workers
  if (dbCategory) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />

        <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
          <div className="container mx-auto px-4">
            <Button variant="ghost" onClick={handleBack} className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("common.back")}
            </Button>

            {/* Category header */}
            <div className="flex flex-col items-center mb-12">
              <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${dbCategory.gradient} flex items-center justify-center mb-4 shadow-xl`}>
                <span className="text-5xl drop-shadow-md">{dbCategory.emoji}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
                {dbCategory.name}
              </h1>
              <p className="text-gray-600 text-center mt-2">
                {workers.length > 0
                  ? `${workers.length} ${t("categories.workersAvailable")}`
                  : t("categories.findWorkers")}
              </p>
            </div>

            {/* Workers list */}
            {loadingWorkers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : workers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {t("categories.noWorkersYet")}
                </h3>
                <p className="text-gray-500 mb-6">
                  {t("categories.beFirstWorker")}
                </p>
                <Button onClick={() => router.push("/dashboard/settings")}>
                  {t("categories.becomeWorker")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
                {workers.map((worker) => (
                  <button
                    key={worker.id}
                    onClick={() => handleWorkerClick(worker.id)}
                    className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-left"
                  >
                    <div className="flex items-start gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={worker.avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-green-400 text-white text-lg">
                          {worker.firstName[0]}{worker.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {worker.firstName} {worker.lastName[0]}.
                          </h3>
                          {worker.workerProfile.verified && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              ✓
                            </Badge>
                          )}
                        </div>
                        {worker.workerProfile.city && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {worker.workerProfile.city}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium">
                            {worker.workerProfile.averageRating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {worker.workerProfile.professions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1">
                        {worker.workerProfile.professions.slice(0, 3).map((p) => (
                          <span
                            key={p.profession.id}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                          >
                            {p.profession.emoji} {p.profession.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-lg font-bold text-blue-600">
                        {worker.workerProfile.currency === "EUR" ? "€" : "$"}
                        {worker.workerProfile.hourlyRate}
                      </span>
                      <span className="text-gray-500 text-sm">/hr</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Built-in category - show job list (existing behavior)
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-blue-50 via-white to-green-50 py-12">
        <div className="container mx-auto px-4">
          <Button variant="ghost" onClick={handleBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t("common.back")}
          </Button>

          {/* Category header */}
          <div className="flex flex-col items-center mb-12">
            <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${builtInMeta.gradient} flex items-center justify-center mb-4 shadow-xl`}>
              <span className="text-5xl drop-shadow-md">{builtInMeta.emoji}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-logo)' }}>
              {t(`categories.${categorySlug}`)}
            </h1>
            <p className="text-gray-600 text-center mt-2">
              {t("categories.selectProfession")}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 max-w-5xl mx-auto">
            {builtInJobs.map((job) => (
              <button
                key={job}
                onClick={() => handleJobClick(job)}
                className="group relative flex flex-col items-center p-6 bg-white rounded-2xl border border-gray-100 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${builtInMeta.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${builtInMeta.gradient} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  <div className="absolute inset-1 rounded-xl bg-white/20" />
                  <span className="text-4xl relative z-10 drop-shadow-md">{JOB_EMOJIS[job] || "👤"}</span>
                </div>
                <span className="text-sm font-semibold text-gray-700 text-center group-hover:text-gray-900 transition-colors">
                  {t(`jobs.${job}`)}
                </span>
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-1 bg-gradient-to-r ${builtInMeta.gradient} rounded-full group-hover:w-16 transition-all duration-300`} />
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
