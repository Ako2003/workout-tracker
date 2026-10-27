// 7-day meal plan baseline. Base day is ~2000 kcal with a decent protein
// profile. The plan page scales every portion by (userKcalTarget / 2000)
// so the plan fits the user's actual needs.

export const BASE_DAILY_KCAL = 2000;

export type MealKey = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export interface PlanItem {
  // Match on Food.nameEn exactly as it appears in the seed catalog.
  nameEn: string;
  grams: number;
}

export interface PlanDay {
  day: string;
  meals: Record<MealKey, PlanItem[]>;
}

export const WEEKLY_PLAN: PlanDay[] = [
  {
    day: "Monday",
    meals: {
      BREAKFAST: [
        { nameEn: "Oats (dry)", grams: 60 },
        { nameEn: "Milk (2%)", grams: 200 },
        { nameEn: "Banana", grams: 120 },
        { nameEn: "Peanut butter", grams: 15 },
      ],
      LUNCH: [
        { nameEn: "Chicken breast", grams: 150 },
        { nameEn: "White rice (dry)", grams: 70 },
        { nameEn: "Broccoli", grams: 150 },
        { nameEn: "Olive oil", grams: 10 },
      ],
      SNACK: [
        { nameEn: "Greek yogurt", grams: 200 },
        { nameEn: "Almonds", grams: 20 },
        { nameEn: "Honey", grams: 10 },
      ],
      DINNER: [
        { nameEn: "Salmon", grams: 150 },
        { nameEn: "Sweet potato", grams: 200 },
        { nameEn: "Spinach", grams: 100 },
      ],
    },
  },
  {
    day: "Tuesday",
    meals: {
      BREAKFAST: [
        { nameEn: "Egg", grams: 150 },
        { nameEn: "Bread (rye)", grams: 50 },
        { nameEn: "Avocado", grams: 50 },
        { nameEn: "Tomato", grams: 100 },
      ],
      LUNCH: [
        { nameEn: "Lean beef", grams: 150 },
        { nameEn: "Buckwheat (dry)", grams: 70 },
        { nameEn: "Carrot", grams: 100 },
        { nameEn: "Olive oil", grams: 10 },
      ],
      SNACK: [
        { nameEn: "Cottage cheese", grams: 200 },
        { nameEn: "Walnuts", grams: 15 },
      ],
      DINNER: [
        { nameEn: "Chicken thigh", grams: 150 },
        { nameEn: "Potato (boiled)", grams: 200 },
        { nameEn: "Cucumber", grams: 100 },
        { nameEn: "Spinach", grams: 50 },
      ],
    },
  },
  {
    day: "Wednesday",
    meals: {
      BREAKFAST: [
        { nameEn: "Whey protein", grams: 30 },
        { nameEn: "Milk (2%)", grams: 300 },
        { nameEn: "Oats (dry)", grams: 50 },
        { nameEn: "Strawberry", grams: 100 },
      ],
      LUNCH: [
        { nameEn: "Tuna (canned in water)", grams: 200 },
        { nameEn: "Pasta (dry)", grams: 70 },
        { nameEn: "Bell pepper", grams: 100 },
        { nameEn: "Olive oil", grams: 10 },
      ],
      SNACK: [
        { nameEn: "Apple", grams: 180 },
        { nameEn: "Peanut butter", grams: 20 },
        { nameEn: "Dark chocolate (85%)", grams: 15 },
      ],
      DINNER: [
        { nameEn: "Chicken breast", grams: 180 },
        { nameEn: "Sweet potato", grams: 180 },
        { nameEn: "Broccoli", grams: 150 },
      ],
    },
  },
  {
    day: "Thursday",
    meals: {
      BREAKFAST: [
        { nameEn: "Egg", grams: 100 },
        { nameEn: "Bread (white)", grams: 50 },
        { nameEn: "Cheese", grams: 30 },
        { nameEn: "Tomato", grams: 100 },
      ],
      LUNCH: [
        { nameEn: "Chicken breast", grams: 200 },
        { nameEn: "White rice (dry)", grams: 70 },
        { nameEn: "Spinach", grams: 100 },
        { nameEn: "Olive oil", grams: 10 },
      ],
      SNACK: [
        { nameEn: "Greek yogurt", grams: 200 },
        { nameEn: "Banana", grams: 120 },
        { nameEn: "Honey", grams: 10 },
      ],
      DINNER: [
        { nameEn: "Lean beef", grams: 150 },
        { nameEn: "Mashed potato", grams: 250 },
        { nameEn: "Carrot", grams: 100 },
      ],
    },
  },
  {
    day: "Friday",
    meals: {
      BREAKFAST: [
        { nameEn: "Oats (dry)", grams: 70 },
        { nameEn: "Milk (2%)", grams: 250 },
        { nameEn: "Walnuts", grams: 10 },
        { nameEn: "Apple", grams: 180 },
      ],
      LUNCH: [
        { nameEn: "Salmon", grams: 150 },
        { nameEn: "Buckwheat (dry)", grams: 70 },
        { nameEn: "Broccoli", grams: 100 },
        { nameEn: "Olive oil", grams: 10 },
      ],
      SNACK: [
        { nameEn: "Cottage cheese", grams: 150 },
        { nameEn: "Honey", grams: 15 },
        { nameEn: "Almonds", grams: 15 },
      ],
      DINNER: [
        { nameEn: "Chicken thigh", grams: 150 },
        { nameEn: "White rice (dry)", grams: 60 },
        { nameEn: "Bell pepper", grams: 150 },
      ],
    },
  },
  {
    day: "Saturday",
    meals: {
      BREAKFAST: [
        { nameEn: "Pelmeni", grams: 200 },
        { nameEn: "Sour cream (20%)", grams: 30 },
        { nameEn: "Cucumber", grams: 100 },
      ],
      LUNCH: [
        { nameEn: "Chicken breast", grams: 150 },
        { nameEn: "Pasta (dry)", grams: 70 },
        { nameEn: "Tomato", grams: 100 },
        { nameEn: "Olive oil", grams: 10 },
      ],
      SNACK: [
        { nameEn: "Banana", grams: 120 },
        { nameEn: "Peanut butter", grams: 20 },
      ],
      DINNER: [
        { nameEn: "Salmon", grams: 150 },
        { nameEn: "Sweet potato", grams: 200 },
        { nameEn: "Spinach", grams: 100 },
        { nameEn: "Avocado", grams: 50 },
      ],
    },
  },
  {
    day: "Sunday",
    meals: {
      BREAKFAST: [
        { nameEn: "Egg", grams: 150 },
        { nameEn: "Mashed potato", grams: 150 },
        { nameEn: "Cucumber", grams: 100 },
      ],
      LUNCH: [
        { nameEn: "Lean beef", grams: 150 },
        { nameEn: "Buckwheat (dry)", grams: 60 },
        { nameEn: "Carrot", grams: 100 },
        { nameEn: "Olive oil", grams: 10 },
      ],
      SNACK: [
        { nameEn: "Greek yogurt", grams: 200 },
        { nameEn: "Almonds", grams: 20 },
        { nameEn: "Dark chocolate (85%)", grams: 10 },
      ],
      DINNER: [
        { nameEn: "Chicken breast", grams: 180 },
        { nameEn: "Potato (boiled)", grams: 200 },
        { nameEn: "Broccoli", grams: 150 },
      ],
    },
  },
];

export const MEAL_ORDER: MealKey[] = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"];
export const MEAL_LABEL: Record<MealKey, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};
