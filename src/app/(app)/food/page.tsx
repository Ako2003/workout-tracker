"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Apple,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { MacroRings } from "@/components/food/MacroRings";
import { WaterTracker } from "@/components/food/WaterTracker";
import { cn } from "@/lib/utils";

interface ProfileGoals {
  kcalGoal: number | null;
  proteinGoal: number | null;
  carbsGoal: number | null;
  fatGoal: number | null;
  waterGoalMl: number | null;
}

type Meal = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

interface Food {
  id: string;
  nameEn: string;
  nameRu: string | null;
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  servingSizeG: number | null;
  servingLabel: string | null;
  isRecipe: boolean;
  recipeTotalGrams: number | null;
  isCustom: boolean;
}

interface FoodEntry {
  id: string;
  foodId: string;
  grams: number;
  date: string;
  meal: Meal | null;
  food: Food;
}

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
}

const MEAL_ORDER: Meal[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
const MEAL_LABEL: Record<Meal, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

function toDateInputValue(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function foodLabel(food: Food) {
  return food.nameRu ? `${food.nameEn} (${food.nameRu})` : food.nameEn;
}

function kcalFor(food: Food, grams: number) {
  return (food.caloriesPer100g * grams) / 100;
}

export default function FoodPage() {
  const { showToast } = useToast();
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    grams: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addMeal, setAddMeal] = useState<Meal>("BREAKFAST");
  const [goals, setGoals] = useState<ProfileGoals>({
    kcalGoal: null,
    proteinGoal: null,
    carbsGoal: null,
    fatGoal: null,
    waterGoalMl: null,
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setGoals({
          kcalGoal: d.kcalGoal,
          proteinGoal: d.proteinGoal,
          carbsGoal: d.carbsGoal,
          fatGoal: d.fatGoal,
          waterGoalMl: d.waterGoalMl,
        });
      })
      .catch(() => {});
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/food-entries?date=${date}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotals(
        data.totals ?? { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 }
      );
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(toDateInputValue(d));
  };

  const byMeal = useMemo(() => {
    const map: Record<Meal | "UNSET", FoodEntry[]> = {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
      SNACK: [],
      UNSET: [],
    };
    for (const e of entries) {
      if (e.meal) map[e.meal].push(e);
      else map.UNSET.push(e);
    }
    return map;
  }, [entries]);

  const handleDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/food-entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      // Recompute totals from state so UI stays correct without a round-trip.
      setTotals((prev) => {
        const removed = entries.find((e) => e.id === id);
        if (!removed) return prev;
        const f = removed.food;
        const factor = removed.grams / 100;
        return {
          calories: prev.calories - f.caloriesPer100g * factor,
          protein: prev.protein - (f.proteinPer100g ?? 0) * factor,
          carbs: prev.carbs - (f.carbsPer100g ?? 0) * factor,
          fat: prev.fat - (f.fatPer100g ?? 0) * factor,
          grams: prev.grams - removed.grams,
        };
      });
    } catch {
      showToast("Failed to delete", "error");
      fetchEntries();
    }
  };

  const handleUpdateGrams = async (id: string, grams: number) => {
    const existing = entries.find((e) => e.id === id);
    if (!existing) return;
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, grams } : e))
    );
    try {
      const res = await fetch(`/api/food-entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grams }),
      });
      if (!res.ok) throw new Error();
      // Just refetch totals; cheaper than recomputing manually everywhere.
      fetchEntries();
    } catch {
      showToast("Failed to save", "error");
      fetchEntries();
    }
  };

  const handleAdded = (entry: FoodEntry) => {
    setEntries((prev) => [...prev, entry]);
    const f = entry.food;
    const factor = entry.grams / 100;
    setTotals((prev) => ({
      calories: prev.calories + f.caloriesPer100g * factor,
      protein: prev.protein + (f.proteinPer100g ?? 0) * factor,
      carbs: prev.carbs + (f.carbsPer100g ?? 0) * factor,
      fat: prev.fat + (f.fatPer100g ?? 0) * factor,
      grams: prev.grams + entry.grams,
    }));
  };

  const isToday = date === toDateInputValue(new Date());

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-display">Food</h1>
        <p className="text-sm text-foreground-muted">
          Track meals and calories
        </p>
      </div>

      {/* Date switcher */}
      <div className="flex items-center justify-between gap-2 bg-background-secondary rounded-xl p-2">
        <button
          type="button"
          onClick={() => shiftDate(-1)}
          className="p-2 rounded-lg hover:bg-background-tertiary transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          type="date"
          value={date}
          max={toDateInputValue(new Date())}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 bg-transparent text-center font-medium focus:outline-none"
        />
        <button
          type="button"
          onClick={() => shiftDate(1)}
          disabled={isToday}
          className="p-2 rounded-lg hover:bg-background-tertiary transition-colors disabled:opacity-30"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Macro rings vs daily goals */}
      <Card>
        <CardContent>
          <MacroRings totals={totals} goals={goals} />
        </CardContent>
      </Card>

      {/* Water intake */}
      <WaterTracker date={date} goalMl={goals.waterGoalMl} />

      {/* Meals */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-background-secondary rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {MEAL_ORDER.map((meal) => (
            <MealSection
              key={meal}
              meal={meal}
              entries={byMeal[meal]}
              onAdd={() => {
                setAddMeal(meal);
                setIsAddOpen(true);
              }}
              onDelete={handleDelete}
              onUpdateGrams={handleUpdateGrams}
            />
          ))}
          {byMeal.UNSET.length > 0 && (
            <MealSection
              meal={null}
              entries={byMeal.UNSET}
              onAdd={() => setIsAddOpen(true)}
              onDelete={handleDelete}
              onUpdateGrams={handleUpdateGrams}
            />
          )}
        </div>
      )}

      <AddFoodModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        date={date}
        meal={addMeal}
        onAdded={handleAdded}
      />
    </div>
  );
}

function MealSection({
  meal,
  entries,
  onAdd,
  onDelete,
  onUpdateGrams,
}: {
  meal: Meal | null;
  entries: FoodEntry[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onUpdateGrams: (id: string, grams: number) => void;
}) {
  const kcal = entries.reduce((sum, e) => sum + kcalFor(e.food, e.grams), 0);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider">
            {meal ? MEAL_LABEL[meal] : "Other"}
          </h2>
          {entries.length > 0 && (
            <span className="text-xs text-foreground-muted">
              · {Math.round(kcal)} kcal
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-4 text-center text-sm text-foreground-muted">
            Nothing logged yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              onDelete={() => onDelete(e.id)}
              onUpdateGrams={(g) => onUpdateGrams(e.id, g)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EntryRow({
  entry,
  onDelete,
  onUpdateGrams,
}: {
  entry: FoodEntry;
  onDelete: () => void;
  onUpdateGrams: (grams: number) => void;
}) {
  const serving = entry.food.servingSizeG;
  const canCountPieces = serving != null && serving > 0;
  // Toggle between grams view and pieces view. Default to pieces when the
  // entry divides cleanly into whole pieces (e.g., exactly 3 eggs @ 50g).
  const initialPiecesView =
    canCountPieces && Math.abs((entry.grams / serving!) - Math.round(entry.grams / serving!)) < 0.01;
  const [piecesView, setPiecesView] = useState(initialPiecesView);
  const [value, setValue] = useState(
    piecesView
      ? (entry.grams / (serving ?? 1)).toString()
      : entry.grams.toString()
  );
  const lastSent = useRef(entry.grams);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setValue(
        piecesView
          ? (entry.grams / (serving ?? 1)).toString()
          : entry.grams.toString()
      );
      lastSent.current = entry.grams;
    }
  }, [entry.grams, piecesView, serving]);

  const commit = () => {
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) {
      setValue(
        piecesView
          ? (lastSent.current / (serving ?? 1)).toString()
          : lastSent.current.toString()
      );
      return;
    }
    const grams = piecesView ? n * (serving ?? 1) : n;
    if (grams !== lastSent.current) {
      lastSent.current = grams;
      onUpdateGrams(grams);
    }
  };

  const switchUnit = (toPieces: boolean) => {
    if (!canCountPieces || toPieces === piecesView) return;
    setPiecesView(toPieces);
    setValue(
      toPieces
        ? (lastSent.current / (serving ?? 1)).toString()
        : lastSent.current.toString()
    );
  };

  const kcal = kcalFor(entry.food, lastSent.current);

  return (
    <Card padding="sm">
      <CardContent className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
          {entry.food.isRecipe ? (
            <ChefHat className="w-5 h-5 text-accent" />
          ) : (
            <Apple className="w-5 h-5 text-accent" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{foodLabel(entry.food)}</p>
          <p className="text-xs text-foreground-muted">
            {Math.round(kcal)} kcal · {entry.food.caloriesPer100g} kcal/100g
            {canCountPieces && (
              <> · 1 {entry.food.servingLabel} = {serving}g</>
            )}
          </p>
        </div>
        {canCountPieces && (
          <div className="flex rounded-md overflow-hidden border border-border h-9 mr-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => switchUnit(true)}
              className={cn(
                "px-2 text-xs font-medium transition-colors",
                piecesView
                  ? "bg-accent text-background"
                  : "bg-background-secondary text-foreground-muted"
              )}
            >
              pcs
            </button>
            <button
              type="button"
              onClick={() => switchUnit(false)}
              className={cn(
                "px-2 text-xs font-medium transition-colors",
                !piecesView
                  ? "bg-accent text-background"
                  : "bg-background-secondary text-foreground-muted"
              )}
            >
              g
            </button>
          </div>
        )}
        <div className="w-20 flex-shrink-0">
          <Input
            type="number"
            inputMode="decimal"
            value={value}
            onFocus={(e) => {
              focused.current = true;
              e.currentTarget.select();
            }}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              focused.current = false;
              commit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            suffix={piecesView ? "" : "g"}
            className="h-9 text-center font-mono text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
          aria-label="Delete entry"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </CardContent>
    </Card>
  );
}

function AddFoodModal({
  isOpen,
  onClose,
  date,
  meal,
  onAdded,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  meal: Meal;
  onAdded: (entry: FoodEntry) => void;
}) {
  const { showToast } = useToast();
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [piecesView, setPiecesView] = useState(false);
  const [grams, setGrams] = useState("100");
  const [pieces, setPieces] = useState("1");
  const [saving, setSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/foods")
      .then((r) => r.json())
      .then((d) => setFoods(Array.isArray(d) ? d : []))
      .catch(() => setFoods([]));
    setSelectedFood(null);
    setSearch("");
    setGrams("100");
    setPieces("1");
    setPiecesView(false);
  }, [isOpen]);

  // When the user picks a food, default to piece-count mode for countable
  // foods (eggs/sausages/apples) and grams mode for everything else.
  useEffect(() => {
    if (!selectedFood) return;
    const countable =
      selectedFood.servingSizeG != null && selectedFood.servingSizeG > 0;
    setPiecesView(countable);
    setPieces("1");
    setGrams(
      selectedFood.isRecipe && selectedFood.recipeTotalGrams
        ? Math.round(selectedFood.recipeTotalGrams / 2).toString()
        : "100"
    );
  }, [selectedFood]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return foods.slice(0, 50);
    return foods
      .filter(
        (f) =>
          f.nameEn.toLowerCase().includes(q) ||
          (f.nameRu && f.nameRu.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [foods, search]);

  const handleSave = async () => {
    if (!selectedFood) return;
    const g = piecesView
      ? parseFloat(pieces) * (selectedFood.servingSizeG ?? 0)
      : parseFloat(grams);
    if (!Number.isFinite(g) || g <= 0) {
      showToast(
        piecesView ? "Enter a valid piece count" : "Enter a valid grams value",
        "error"
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/food-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ foodId: selectedFood.id, grams: g, date, meal }),
      });
      if (!res.ok) throw new Error();
      const entry = await res.json();
      onAdded(entry);
      onClose();
    } catch {
      showToast("Failed to add", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCreated = (food: Food) => {
    setFoods((prev) => [food, ...prev]);
    setSelectedFood(food);
    setIsCreateOpen(false);
    setIsRecipeOpen(false);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Add food · ${MEAL_LABEL[meal]}`}>
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              type="text"
              placeholder="Search foods... / Поиск продуктов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm text-foreground-muted hover:text-foreground hover:border-border-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              New food
            </button>
            <button
              type="button"
              onClick={() => setIsRecipeOpen(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-sm text-foreground-muted hover:text-foreground hover:border-border-hover transition-colors"
            >
              <ChefHat className="w-4 h-4" />
              New recipe
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 -mx-1 px-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-foreground-muted text-center py-6">
                No foods matched
              </p>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelectedFood(f)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                    selectedFood?.id === f.id
                      ? "bg-accent/20 border border-accent/40"
                      : "hover:bg-background-tertiary border border-transparent"
                  )}
                >
                  {f.isRecipe && (
                    <ChefHat className="w-4 h-4 text-accent flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{foodLabel(f)}</p>
                    <p className="text-xs text-foreground-muted">
                      {f.caloriesPer100g} kcal/100g
                      {f.servingSizeG && f.servingLabel && (
                        <> · 1 {f.servingLabel} = {f.servingSizeG}g</>
                      )}
                      {f.isCustom && !f.isRecipe && " · custom"}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {selectedFood && (
            <div className="pt-3 border-t border-border space-y-3">
              {selectedFood.servingSizeG != null && selectedFood.servingSizeG > 0 && (
                <div className="flex rounded-lg overflow-hidden border border-border">
                  <button
                    type="button"
                    onClick={() => setPiecesView(true)}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium transition-colors",
                      piecesView
                        ? "bg-accent text-background"
                        : "bg-background-secondary text-foreground-muted"
                    )}
                  >
                    By pieces
                  </button>
                  <button
                    type="button"
                    onClick={() => setPiecesView(false)}
                    className={cn(
                      "flex-1 py-2 text-sm font-medium transition-colors",
                      !piecesView
                        ? "bg-accent text-background"
                        : "bg-background-secondary text-foreground-muted"
                    )}
                  >
                    By grams
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  {piecesView ? (
                    <Input
                      label={
                        selectedFood.servingLabel
                          ? `${selectedFood.servingLabel.charAt(0).toUpperCase() +
                              selectedFood.servingLabel.slice(1)}s`
                          : "Pieces"
                      }
                      type="number"
                      inputMode="decimal"
                      value={pieces}
                      onChange={(e) => setPieces(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      step="1"
                    />
                  ) : (
                    <Input
                      label={
                        selectedFood.isRecipe && selectedFood.recipeTotalGrams
                          ? `Grams (yield: ${Math.round(
                              selectedFood.recipeTotalGrams
                            )}g)`
                          : "Grams"
                      }
                      type="number"
                      inputMode="decimal"
                      value={grams}
                      onChange={(e) => setGrams(e.target.value)}
                      onFocus={(e) => e.currentTarget.select()}
                      suffix="g"
                    />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-2xl font-bold font-mono text-accent">
                    {Math.round(
                      kcalFor(
                        selectedFood,
                        piecesView
                          ? (parseFloat(pieces) || 0) *
                              (selectedFood.servingSizeG ?? 0)
                          : parseFloat(grams) || 0
                      )
                    )}
                    <span className="text-sm font-medium text-foreground-muted ml-1">
                      kcal
                    </span>
                  </p>
                  {piecesView && selectedFood.servingSizeG && (
                    <p className="text-xs text-foreground-muted font-mono">
                      ≈ {Math.round(
                        (parseFloat(pieces) || 0) * selectedFood.servingSizeG
                      )}
                      g
                    </p>
                  )}
                </div>
              </div>
              <Button
                fullWidth
                onClick={handleSave}
                isLoading={saving}
                disabled={
                  piecesView
                    ? !pieces || parseFloat(pieces) <= 0
                    : !grams || parseFloat(grams) <= 0
                }
              >
                Add to {MEAL_LABEL[meal].toLowerCase()}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <CreateFoodModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />

      <CreateRecipeModal
        isOpen={isRecipeOpen}
        onClose={() => setIsRecipeOpen(false)}
        onCreated={handleCreated}
        allFoods={foods}
      />
    </>
  );
}

function CreateFoodModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (food: Food) => void;
}) {
  const { showToast } = useToast();
  const [nameEn, setNameEn] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [servingLabel, setServingLabel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNameEn("");
    setNameRu("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setServingSize("");
    setServingLabel("");
  }, [isOpen]);

  const handleSave = async () => {
    if (!nameEn.trim() || !kcal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameEn,
          nameRu: nameRu.trim() || null,
          caloriesPer100g: Number(kcal),
          proteinPer100g: protein || null,
          carbsPer100g: carbs || null,
          fatPer100g: fat || null,
          servingSizeG: servingSize || null,
          servingLabel: servingLabel.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      const food = await res.json();
      onCreated(food);
    } catch {
      showToast("Failed to create food", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create food">
      <div className="p-4 space-y-3">
        <Input
          label="Name (English)"
          placeholder="e.g., Grilled chicken"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
        />
        <Input
          label="Название (по-русски, опционально)"
          placeholder="например, Куриная грудка"
          value={nameRu}
          onChange={(e) => setNameRu(e.target.value)}
        />
        <Input
          label="Calories per 100g"
          type="number"
          inputMode="decimal"
          value={kcal}
          onChange={(e) => setKcal(e.target.value)}
          suffix="kcal"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            label="Protein"
            type="number"
            inputMode="decimal"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            suffix="g"
          />
          <Input
            label="Carbs"
            type="number"
            inputMode="decimal"
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            suffix="g"
          />
          <Input
            label="Fat"
            type="number"
            inputMode="decimal"
            value={fat}
            onChange={(e) => setFat(e.target.value)}
            suffix="g"
          />
        </div>
        <div className="pt-1 border-t border-border">
          <p className="text-xs text-foreground-muted mb-2">
            Optional: makes this food countable by piece (e.g., eggs, slices)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="One piece weighs"
              type="number"
              inputMode="decimal"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              placeholder="e.g., 50"
              suffix="g"
            />
            <Input
              label="Piece name"
              placeholder="egg / slice / piece"
              value={servingLabel}
              onChange={(e) => setServingLabel(e.target.value)}
            />
          </div>
        </div>
        <Button
          fullWidth
          onClick={handleSave}
          isLoading={saving}
          disabled={!nameEn.trim() || !kcal}
        >
          Create
        </Button>
      </div>
    </Modal>
  );
}

interface IngredientRow {
  key: string;
  foodId: string;
  food: Food | null;
  mode: "g" | "pcs";
  amount: string;
}

function CreateRecipeModal({
  isOpen,
  onClose,
  onCreated,
  allFoods,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (food: Food) => void;
  allFoods: Food[];
}) {
  const { showToast } = useToast();
  const [nameEn, setNameEn] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [totalGrams, setTotalGrams] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [picking, setPicking] = useState(false);
  const [pickSearch, setPickSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setNameEn("");
    setNameRu("");
    setTotalGrams("");
    setIngredients([]);
    setPicking(false);
    setPickSearch("");
  }, [isOpen]);

  // Exclude recipes themselves from the picker to avoid nested recipes.
  const pickable = useMemo(() => {
    const q = pickSearch.toLowerCase().trim();
    const base = allFoods.filter((f) => !f.isRecipe);
    if (!q) return base.slice(0, 50);
    return base
      .filter(
        (f) =>
          f.nameEn.toLowerCase().includes(q) ||
          (f.nameRu && f.nameRu.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [allFoods, pickSearch]);

  const addIngredient = (food: Food) => {
    setIngredients((prev) => [
      ...prev,
      {
        key: `${food.id}-${Date.now()}`,
        foodId: food.id,
        food,
        mode: food.servingSizeG ? "pcs" : "g",
        amount: food.servingSizeG ? "1" : "100",
      },
    ]);
    setPicking(false);
    setPickSearch("");
  };

  const updateRow = (key: string, patch: Partial<IngredientRow>) => {
    setIngredients((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );
  };

  const removeRow = (key: string) => {
    setIngredients((prev) => prev.filter((r) => r.key !== key));
  };

  const previewTotals = useMemo(() => {
    let kcal = 0;
    let gramsTotal = 0;
    for (const r of ingredients) {
      if (!r.food) continue;
      const amt = parseFloat(r.amount) || 0;
      const grams = r.mode === "pcs" ? amt * (r.food.servingSizeG ?? 0) : amt;
      kcal += (r.food.caloriesPer100g * grams) / 100;
      gramsTotal += grams;
    }
    return { kcal, gramsTotal };
  }, [ingredients]);

  const effectiveTotal = (() => {
    const n = parseFloat(totalGrams);
    return Number.isFinite(n) && n > 0 ? n : previewTotals.gramsTotal;
  })();

  const kcalPer100g =
    effectiveTotal > 0
      ? Math.round(((previewTotals.kcal / effectiveTotal) * 100) * 10) / 10
      : 0;

  const canSave =
    nameEn.trim().length > 0 &&
    ingredients.length > 0 &&
    ingredients.every(
      (r) => r.food && parseFloat(r.amount) > 0
    ) &&
    effectiveTotal > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        nameEn: nameEn.trim(),
        nameRu: nameRu.trim() || null,
        isRecipe: true,
        recipeTotalGrams: effectiveTotal,
        ingredients: ingredients.map((r) => ({
          foodId: r.foodId,
          grams:
            r.mode === "pcs"
              ? (parseFloat(r.amount) || 0) * (r.food!.servingSizeG ?? 0)
              : parseFloat(r.amount) || 0,
        })),
      };
      const res = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const food = await res.json();
      onCreated(food);
    } catch {
      showToast("Failed to create recipe", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create recipe">
      <div className="p-4 space-y-3">
        <Input
          label="Dish name (English)"
          placeholder="e.g., Mashed potato with beef"
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
        />
        <Input
          label="Название (по-русски, опционально)"
          placeholder="например, Пюре с мясом и луком"
          value={nameRu}
          onChange={(e) => setNameRu(e.target.value)}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground-muted">
              Ingredients
            </label>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPicking(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add ingredient
            </Button>
          </div>
          {ingredients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-foreground-muted">
              Add at least one ingredient
            </div>
          ) : (
            <div className="space-y-2">
              {ingredients.map((row) => (
                <IngredientRowView
                  key={row.key}
                  row={row}
                  onChange={(patch) => updateRow(row.key, patch)}
                  onDelete={() => removeRow(row.key)}
                />
              ))}
            </div>
          )}
        </div>

        <Input
          label={`Total yield (cooked weight) — raw sum: ${Math.round(previewTotals.gramsTotal)}g`}
          type="number"
          inputMode="decimal"
          value={totalGrams}
          onChange={(e) => setTotalGrams(e.target.value)}
          placeholder={Math.round(previewTotals.gramsTotal).toString() || "e.g., 800"}
          suffix="g"
        />

        {ingredients.length > 0 && effectiveTotal > 0 && (
          <div className="rounded-lg bg-background-tertiary/40 border border-border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-foreground-muted">Per 100g</span>
              <span className="font-mono font-semibold">
                {kcalPer100g} kcal
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-foreground-muted">
              <span>Full recipe</span>
              <span className="font-mono">
                {Math.round(previewTotals.kcal)} kcal · {Math.round(effectiveTotal)}g
              </span>
            </div>
          </div>
        )}

        <Button
          fullWidth
          onClick={handleSave}
          isLoading={saving}
          disabled={!canSave}
        >
          Save recipe
        </Button>
      </div>

      <Modal isOpen={picking} onClose={() => setPicking(false)} title="Pick ingredient">
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              type="text"
              placeholder="Search foods..."
              value={pickSearch}
              onChange={(e) => setPickSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
            {pickable.length === 0 ? (
              <p className="text-sm text-foreground-muted text-center py-6">
                No foods matched
              </p>
            ) : (
              pickable.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => addIngredient(f)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-background-tertiary transition-colors"
                >
                  <p className="font-medium text-sm">{foodLabel(f)}</p>
                  <p className="text-xs text-foreground-muted">
                    {f.caloriesPer100g} kcal/100g
                    {f.servingSizeG && f.servingLabel && (
                      <> · 1 {f.servingLabel} = {f.servingSizeG}g</>
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

function IngredientRowView({
  row,
  onChange,
  onDelete,
}: {
  row: IngredientRow;
  onChange: (patch: Partial<IngredientRow>) => void;
  onDelete: () => void;
}) {
  if (!row.food) return null;
  const canCountPieces =
    row.food.servingSizeG != null && row.food.servingSizeG > 0;
  const grams =
    row.mode === "pcs"
      ? (parseFloat(row.amount) || 0) * (row.food.servingSizeG ?? 0)
      : parseFloat(row.amount) || 0;
  const kcal = Math.round((row.food.caloriesPer100g * grams) / 100);

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background-tertiary/40">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{foodLabel(row.food)}</p>
        <p className="text-[11px] text-foreground-muted">
          {kcal} kcal · {Math.round(grams)}g
        </p>
      </div>
      {canCountPieces && (
        <div className="flex rounded-md overflow-hidden border border-border h-8 flex-shrink-0">
          <button
            type="button"
            onClick={() =>
              onChange({
                mode: "pcs",
                amount: ((grams / (row.food!.servingSizeG ?? 1)) || 1).toString(),
              })
            }
            className={cn(
              "px-2 text-xs font-medium transition-colors",
              row.mode === "pcs"
                ? "bg-accent text-background"
                : "bg-background-secondary text-foreground-muted"
            )}
          >
            pcs
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                mode: "g",
                amount: Math.round(grams).toString(),
              })
            }
            className={cn(
              "px-2 text-xs font-medium transition-colors",
              row.mode === "g"
                ? "bg-accent text-background"
                : "bg-background-secondary text-foreground-muted"
            )}
          >
            g
          </button>
        </div>
      )}
      <div className="w-20 flex-shrink-0">
        <Input
          type="number"
          inputMode="decimal"
          value={row.amount}
          onChange={(e) => onChange({ amount: e.target.value })}
          onFocus={(e) => e.currentTarget.select()}
          suffix={row.mode === "g" ? "g" : ""}
          className="h-8 text-center font-mono text-sm"
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="p-1.5 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
        aria-label="Remove ingredient"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
