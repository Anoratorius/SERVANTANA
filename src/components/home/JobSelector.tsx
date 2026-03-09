"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Search, Briefcase, FolderOpen } from "lucide-react";

const JOB_CATEGORIES = {
  "home_services": [
    "cleaner", "housekeeper", "maid", "gardener", "landscaper",
    "pool_cleaner", "window_cleaner", "carpet_cleaner", "pressure_washer", "pest_control"
  ],
  "construction": [
    "plumber", "electrician", "carpenter", "painter", "roofer", "mason", "welder",
    "tiler", "plasterer", "glazier", "flooring_installer", "drywall_installer",
    "insulation_worker", "hvac_technician", "locksmith"
  ],
  "automotive": [
    "mechanic", "auto_electrician", "car_washer", "auto_detailer",
    "tire_technician", "body_repair", "tow_truck_driver"
  ],
  "personal_care": [
    "barber", "hairdresser", "beautician", "makeup_artist",
    "nail_technician", "massage_therapist", "personal_trainer", "tattoo_artist"
  ],
  "care_services": [
    "babysitter", "nanny", "elderly_caregiver", "pet_sitter",
    "dog_walker", "pet_groomer", "nurse", "home_health_aide"
  ],
  "delivery_moving": [
    "mover", "delivery_driver", "courier", "truck_driver", "furniture_assembler"
  ],
  "tech_it": [
    "computer_technician", "phone_repair", "network_technician",
    "security_installer", "smart_home_installer", "appliance_repair"
  ],
  "events_entertainment": [
    "photographer", "videographer", "dj", "musician",
    "event_planner", "caterer", "bartender", "waiter"
  ],
  "education_tutoring": [
    "tutor", "music_teacher", "language_teacher",
    "driving_instructor", "sports_coach", "yoga_instructor"
  ],
  "professional_services": [
    "accountant", "lawyer", "translator", "notary",
    "real_estate_agent", "insurance_agent"
  ],
  "fashion_tailoring": [
    "tailor", "seamstress", "shoe_repair", "dry_cleaner", "laundry_service"
  ],
  "food_cooking": [
    "chef", "cook", "baker", "butcher", "personal_chef"
  ],
  "security": [
    "security_guard", "bodyguard", "private_investigator"
  ],
  "agriculture": [
    "farmer", "farmhand", "veterinarian", "beekeeper"
  ]
};

const CATEGORY_LIST = Object.keys(JOB_CATEGORIES);

interface JobSelectorProps {
  value: string;
  onChange: (jobId: string) => void;
}

export function JobSelector({ value, onChange }: JobSelectorProps) {
  const t = useTranslations();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isJobOpen, setIsJobOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const categoryRef = useRef<HTMLDivElement>(null);
  const jobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (jobRef.current && !jobRef.current.contains(event.target as Node)) {
        setIsJobOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCategories = CATEGORY_LIST.filter((cat) =>
    t(`categories.${cat}`).toLowerCase().includes(categorySearch.toLowerCase())
  );

  const jobsInCategory = selectedCategory ? JOB_CATEGORIES[selectedCategory as keyof typeof JOB_CATEGORIES] : [];
  const filteredJobs = jobsInCategory.filter((job) =>
    t(`jobs.${job}`).toLowerCase().includes(jobSearch.toLowerCase())
  );

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setIsCategoryOpen(false);
    setCategorySearch("");
    onChange(""); // Reset job when category changes
  };

  const handleJobSelect = (job: string) => {
    onChange(job);
    setIsJobOpen(false);
    setJobSearch("");
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Category Dropdown */}
      <div ref={categoryRef} className="relative flex-1">
        <button
          type="button"
          onClick={() => setIsCategoryOpen(!isCategoryOpen)}
          className="flex items-center justify-between w-full h-12 px-4 bg-white border rounded-md hover:border-blue-400 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-blue-500" />
            <span className={selectedCategory ? "text-gray-900" : "text-gray-500"}>
              {selectedCategory ? t(`categories.${selectedCategory}`) : t("home.hero.selectCategory")}
            </span>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
        </button>

        {isCategoryOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-72 overflow-hidden">
            <div className="p-2 border-b sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder={t("home.hero.searchCategories")}
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-56">
              {filteredCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleCategorySelect(category)}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                    selectedCategory === category ? "bg-blue-100 text-blue-700" : "text-gray-700"
                  }`}
                >
                  <span className="text-lg">{getCategoryIcon(category)}</span>
                  <span>{t(`categories.${category}`)}</span>
                  <span className="ml-auto text-xs text-gray-400">
                    {JOB_CATEGORIES[category as keyof typeof JOB_CATEGORIES].length}
                  </span>
                </button>
              ))}
              {filteredCategories.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  {t("home.hero.noCategoriesFound")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Job Dropdown */}
      <div ref={jobRef} className="relative flex-1">
        <button
          type="button"
          onClick={() => selectedCategory && setIsJobOpen(!isJobOpen)}
          disabled={!selectedCategory}
          className={`flex items-center justify-between w-full h-12 px-4 bg-white border rounded-md transition-colors ${
            selectedCategory ? "hover:border-blue-400" : "opacity-60 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-500" />
            <span className={value ? "text-gray-900" : "text-gray-500"}>
              {value ? t(`jobs.${value}`) : t("home.hero.selectJob")}
            </span>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isJobOpen ? "rotate-180" : ""}`} />
        </button>

        {isJobOpen && selectedCategory && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-xl max-h-72 overflow-hidden">
            <div className="p-2 border-b sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  placeholder={t("home.hero.searchJobs")}
                  className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-56">
              {filteredJobs.map((job) => (
                <button
                  key={job}
                  type="button"
                  onClick={() => handleJobSelect(job)}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors ${
                    value === job ? "bg-blue-100 text-blue-700" : "text-gray-700"
                  }`}
                >
                  {t(`jobs.${job}`)}
                </button>
              ))}
              {filteredJobs.length === 0 && (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  {t("home.hero.noJobsFound")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    home_services: "🏠",
    construction: "🔧",
    automotive: "🚗",
    personal_care: "💇",
    care_services: "👶",
    delivery_moving: "📦",
    tech_it: "💻",
    events_entertainment: "🎉",
    education_tutoring: "📚",
    professional_services: "💼",
    fashion_tailoring: "👔",
    food_cooking: "🍳",
    security: "🛡️",
    agriculture: "🌾"
  };
  return icons[category] || "📁";
}
