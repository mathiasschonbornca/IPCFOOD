const state = {
  foods: [],
  recipes: [],
  tips: [],
  myths: [],
  selectedFoods: new Set(["arroz", "lentejas", "cebolla"]),
  budget: 90000,
  people: 4,
  mealsPerDay: 2,
  days: 15,
  activeSection: "home",
  tipOffset: 0
};

const els = {
  tabs: document.querySelectorAll(".tab-button"),
  sections: document.querySelectorAll(".app-section"),
  budgetInput: document.querySelector("#budget-input"),
  peopleInput: document.querySelector("#people-input"),
  mealsInput: document.querySelector("#meals-input"),
  daysInput: document.querySelector("#days-input"),
  foodSelector: document.querySelector("#food-selector"),
  mealBudget: document.querySelector("#meal-budget"),
  personBudget: document.querySelector("#person-budget"),
  homeMealBudget: document.querySelector("#home-meal-budget"),
  homeBudgetTone: document.querySelector("#home-budget-tone"),
  homeRecipeCount: document.querySelector("#home-recipe-count"),
  homeShoppingTotal: document.querySelector("#home-shopping-total"),
  recipeList: document.querySelector("#recipe-list"),
  basketRanking: document.querySelector("#basket-ranking"),
  compareGrid: document.querySelector("#compare-grid"),
  mythsList: document.querySelector("#myths-list"),
  tipsGrid: document.querySelector("#tips-grid"),
  shuffleTip: document.querySelector("#shuffle-tip"),
  shoppingList: document.querySelector("#shopping-list"),
  shoppingTotal: document.querySelector("#shopping-total"),
  headerStatus: document.querySelector("#header-status")
};

// Architecture: JSON files hold all domain content; this file only calculates,
// ranks and renders sections for a static GitHub Pages/Vercel deployment.
async function init() {
  const [foodData, tips, myths] = await Promise.all([
    fetchJson("data/foods.json"),
    fetchJson("data/tips.json"),
    fetchJson("data/myths.json")
  ]);

  state.foods = foodData.foods;
  state.recipes = foodData.recipes;
  state.tips = shuffle(tips);
  state.myths = myths;
  bindEvents();
  renderAll();
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path}`);
  }
  return response.json();
}

function bindEvents() {
  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => setSection(tab.dataset.section));
  });

  document.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => setSection(button.dataset.jump));
  });

  [els.budgetInput, els.peopleInput, els.mealsInput, els.daysInput].forEach((input) => {
    input.addEventListener("input", () => {
      state.budget = Number(els.budgetInput.value) || 0;
      state.people = Number(els.peopleInput.value) || 1;
      state.mealsPerDay = Number(els.mealsInput.value) || 1;
      state.days = Number(els.daysInput.value) || 1;
      renderAll();
    });
  });

  els.shuffleTip.addEventListener("click", () => {
    state.tipOffset = (state.tipOffset + 3) % state.tips.length;
    renderTips();
  });

  setInterval(() => {
    if (state.activeSection === "tips" && state.tips.length > 0) {
      state.tipOffset = (state.tipOffset + 3) % state.tips.length;
      renderTips();
    }
  }, 9000);
}

function setSection(sectionId) {
  state.activeSection = sectionId;
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.section === sectionId));
  els.sections.forEach((section) => section.classList.toggle("active", section.id === sectionId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderBudgets();
  renderFoodSelector();
  renderRecipes();
  renderBasket();
  renderCompare();
  renderMyths();
  renderTips();
  renderShopping();
  renderHome();
}

function foodById(id) {
  return state.foods.find((food) => food.id === id);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(Math.round(value || 0));
}

function totalMeals() {
  return Math.max(1, state.days * state.mealsPerDay);
}

function mealBudget() {
  return state.budget / totalMeals();
}

function personBudget() {
  return mealBudget() / Math.max(1, state.people);
}

function costPerPortion(food) {
  return food.avgPrice / Math.max(1, food.portions);
}

function valueScore(food) {
  const priceScore = clamp(10 - costPerPortion(food) / 120, 1, 10);
  const proteinScore = clamp(food.protein / 3, 1, 10);
  const satietyScore = food.satiety * 2;
  const processingScore = (6 - food.processing) * 2;
  return Math.round((priceScore * 0.35 + proteinScore * 0.25 + satietyScore * 0.25 + processingScore * 0.15) * 10) / 10;
}

function toneFromScore(score) {
  if (score >= 7.5) return "good";
  if (score >= 5.5) return "mid";
  return "bad";
}

function toneLabel(score) {
  if (score >= 7.5) return "Bueno";
  if (score >= 5.5) return "Intermedio";
  return "Desfavorable";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function recipeCost(recipe) {
  return recipe.items.reduce((sum, item) => {
    const food = foodById(item.foodId);
    return sum + (food ? food.avgPrice * item.packages : 0);
  }, 0);
}

function recipeAnalysis(recipe) {
  const cost = recipeCost(recipe);
  const householdMultiplier = Math.max(1, state.people / recipe.servings);
  const householdCost = Math.round(cost * householdMultiplier);
  const perPerson = householdCost / Math.max(1, state.people);
  const missing = recipe.items.filter((item) => !state.selectedFoods.has(item.foodId));
  const available = recipe.items.length - missing.length;
  const fit = householdCost <= mealBudget();
  const score = Math.round((available / recipe.items.length) * 100);

  return {
    ...recipe,
    householdCost,
    perPerson,
    missing,
    fit,
    score
  };
}

function rankedRecipes() {
  return state.recipes
    .map(recipeAnalysis)
    .sort((a, b) => Number(b.fit) - Number(a.fit) || b.score - a.score || a.perPerson - b.perPerson);
}

function renderBudgets() {
  const meal = mealBudget();
  const person = personBudget();
  els.mealBudget.textContent = formatMoney(meal);
  els.personBudget.textContent = formatMoney(person);
  els.homeMealBudget.textContent = formatMoney(meal);

  const score = person >= 1000 ? 8 : person >= 650 ? 6 : 4;
  els.homeBudgetTone.textContent = toneLabel(score);
  els.homeBudgetTone.className = `tone-badge ${toneFromScore(score)}`;
  els.headerStatus.textContent = person >= 650 ? "Plan viable" : "Presupuesto mínimo";
}

function renderHome() {
  const recipes = rankedRecipes();
  const shopping = shoppingItems(recipes.slice(0, 3));
  els.homeRecipeCount.textContent = recipes.slice(0, 3).length;
  els.homeShoppingTotal.textContent = formatMoney(shopping.reduce((sum, item) => sum + item.price, 0));
}

function renderFoodSelector() {
  els.foodSelector.innerHTML = state.foods.map((food) => {
    const selected = state.selectedFoods.has(food.id) ? "selected" : "";
    return `<button class="food-chip ${selected}" type="button" data-food="${food.id}">${food.name}</button>`;
  }).join("");

  els.foodSelector.querySelectorAll("[data-food]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.food;
      if (state.selectedFoods.has(id)) {
        state.selectedFoods.delete(id);
      } else {
        state.selectedFoods.add(id);
      }
      renderAll();
    });
  });
}

function renderRecipes() {
  const recipes = rankedRecipes().slice(0, 4);
  els.recipeList.innerHTML = recipes.map((recipe) => {
    const tone = recipe.fit ? "good" : "mid";
    const missingNames = recipe.missing.map((item) => foodById(item.foodId)?.name).filter(Boolean);
    return `
      <article class="recipe-card">
        <div class="recipe-top">
          <div>
            <h4>${recipe.name}</h4>
            <p>${recipe.benefit}</p>
          </div>
          <span class="tone-badge ${tone}">${recipe.fit ? "Calza" : "Ajustar"}</span>
        </div>
        <div class="detail-grid">
          <span>Costo comida<strong>${formatMoney(recipe.householdCost)}</strong></span>
          <span>Por persona<strong>${formatMoney(recipe.perPerson)}</strong></span>
          <span>Tiempo<strong>${recipe.minutes} min</strong></span>
          <span>Faltantes<strong>${missingNames.length ? missingNames.join(", ") : "Ninguno"}</strong></span>
        </div>
      </article>
    `;
  }).join("");
}

function renderBasket() {
  const foods = [...state.foods].sort((a, b) => valueScore(b) - valueScore(a));
  els.basketRanking.innerHTML = foods.map((food, index) => foodCard(food, index + 1, true)).join("");
}

function renderCompare() {
  const foods = [...state.foods].sort((a, b) => valueScore(b) - valueScore(a));
  els.compareGrid.innerHTML = foods.map((food) => foodCard(food, null, false)).join("");
}

function foodCard(food, rank, showRank) {
  const score = valueScore(food);
  const tone = toneFromScore(score);
  const performance = costPerPortion(food) <= 180 ? "Alto" : costPerPortion(food) <= 320 ? "Medio" : "Bajo";
  return `
    <article class="food-card ${tone}">
      <div class="food-top">
        <div>
          <h3>${showRank ? `${rank}. ` : ""}${food.name}</h3>
          <p>${food.note}</p>
        </div>
        <span class="score-ring ${tone}">${score}</span>
      </div>
      <div class="detail-grid">
        <span>Precio prom.<strong>${formatMoney(food.avgPrice)}</strong></span>
        <span>Proteína<strong>${food.protein} g</strong></span>
        <span>Calorías<strong>${food.calories} kcal</strong></span>
        <span>Porciones<strong>${food.portions}</strong></span>
        <span>Costo por porción<strong>${formatMoney(costPerPortion(food))}</strong></span>
        <span>Rendimiento<strong>${performance}</strong></span>
        <span>Saciedad<strong>${food.satiety}/5</strong></span>
        <span>Procesamiento<strong>${food.processing}/5</strong></span>
        <span>Nota general<strong>${score}/10 · ${toneLabel(score)}</strong></span>
      </div>
    </article>
  `;
}

function renderMyths() {
  els.mythsList.innerHTML = state.myths.map((item) => `
    <article class="myth-card">
      <div>
        <div class="myth-label">Mito</div>
        <h3>${item.myth}</h3>
      </div>
      <div>
        <div class="reality-label">Realidad</div>
        <p>${item.reality}</p>
      </div>
    </article>
  `).join("");
}

function renderTips() {
  if (!state.tips.length) return;
  const visible = [...state.tips, ...state.tips].slice(state.tipOffset, state.tipOffset + 3);
  els.tipsGrid.innerHTML = visible.map((tip) => `
    <article class="tip-card">
      <span class="tip-category">${tip.category}</span>
      <p>${tip.text}</p>
    </article>
  `).join("");
}

function shoppingItems(recipes) {
  const items = new Map();
  recipes.forEach((recipe, recipeIndex) => {
    recipe.missing.forEach((item) => {
      const food = foodById(item.foodId);
      if (!food) return;
      const current = items.get(food.id) || {
        food,
        count: 0,
        price: food.avgPrice,
        score: 0
      };
      current.count += 1;
      current.score += valueScore(food) + (4 - recipeIndex);
      items.set(food.id, current);
    });
  });
  return [...items.values()].sort((a, b) => b.score - a.score || a.price - b.price);
}

function renderShopping() {
  const items = shoppingItems(rankedRecipes().slice(0, 3));
  els.shoppingList.innerHTML = items.length ? items.map((item, index) => {
    const bestStore = Object.entries(item.food.stores).sort((a, b) => a[1] - b[1])[0];
    return `
      <article class="shopping-card">
        <div class="shopping-top">
          <div>
            <h3>${index + 1}. ${item.food.name}</h3>
            <small>${item.food.category} · aparece en ${item.count} receta${item.count > 1 ? "s" : ""}</small>
          </div>
          <span class="tone-badge good">${formatMoney(item.price)}</span>
        </div>
        <div class="detail-grid">
          <span>Mejor demo<strong>${bestStore[0]}</strong></span>
          <span>Precio demo<strong>${formatMoney(bestStore[1])}</strong></span>
        </div>
      </article>
    `;
  }).join("") : '<article class="shopping-card"><h3>No faltan alimentos clave</h3><p>Las recetas sugeridas se pueden preparar con lo disponible.</p></article>';

  els.shoppingTotal.textContent = formatMoney(items.reduce((sum, item) => sum + item.price, 0));
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

init().catch((error) => {
  document.body.innerHTML = `<main class="app-shell"><section class="notice-card">No se pudo cargar la aplicación: ${error.message}</section></main>`;
});
