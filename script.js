const APP_ID = 'ed43992e';
const APP_KEY = 'aa5d826d4ba6ae8139a9b472f49ec652';

const BASE_URL = 'https://api.edamam.com/api/recipes/v2';

// DOM elements
const searchForm = document.getElementById('search-form');
const queryInput = document.getElementById('query-input');
const dietFilter = document.getElementById('diet-filter');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error-message');
const resultsEl = document.getElementById('results');

// Modal elements
const modalBackdrop = document.getElementById('modal-backdrop');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalTitle = document.getElementById('modal-title');
const modalMeta = document.getElementById('modal-meta');
const modalIngredients = document.getElementById('modal-ingredients');
const modalLink = document.getElementById('modal-link');

// State
let lastResults = [];


searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = queryInput.value.trim();

    if (!query) {
        showError('Please enter an ingredient, dish, or keyword.');
        return;
    }

    fetchRecipes(query, dietFilter.value);
});

modalCloseBtn.addEventListener('click', () => {
    hideModal();
});

modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
        hideModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideModal();
    }
});

// ==============================
// Fetch Recipes
// ==============================

async function fetchRecipes(query, diet) {
    try {
        clearResults();
        hideError();
        showLoading();

        const url = buildApiUrl(query, diet);
        console.log('Requesting:', url);

        const res = await fetch(url);
        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            console.error('Error response:', res.status, data);
            throw new Error(data.message || `Request failed with status ${res.status}`);
        }

        const data = await res.json();
        console.log('API data:', data);

        const hits = data.hits || [];
        lastResults = hits.map((h) => h.recipe);

        if (!lastResults.length) {
            showError('No recipes found for that search. Try another ingredient or keyword.');
            return;
        }

        renderRecipes(lastResults);
    } catch (err) {
        console.error('Fetch error:', err);
        showError(err.message || 'Something went wrong while fetching recipes.');
    } finally {
        hideLoading();
    }
}

function buildApiUrl(query, diet) {
    const params = new URLSearchParams({
        type: 'public',
        q: query,
        app_id: APP_ID,
        app_key: APP_KEY,
        imageSize: 'REGULAR'
    });

    if (diet) {
        params.append('diet', diet);
    }

    return `${BASE_URL}?${params.toString()}`;
}

// ==============================
// Rendering
// ==============================

function renderRecipes(recipes) {
    clearResults();

    recipes.forEach((recipe, index) => {
        const card = document.createElement('article');
        card.className = 'recipe-card';

        const imgUrl = recipe.image || '';
        const label = recipe.label || 'Recipe';
        const source = recipe.source || 'Unknown source';

        const calories = recipe.calories || 0;
        const servings = recipe.yield || 1;
        const caloriesPerServing = Math.round(calories / Math.max(servings, 1));

        const dietLabels = recipe.dietLabels || [];
        const healthLabels = recipe.healthLabels || [];
        const topTags = [...dietLabels.slice(0, 2), ...healthLabels.slice(0, 2)];

        // Build card HTML
        card.innerHTML = `
            <div class="recipe-image-wrapper">
                <img src="${imgUrl}" alt="${escapeHtml(label)}" loading="lazy">
                <div class="recipe-badge">${servings} serving${servings > 1 ? 's' : ''}</div>
            </div>
            <div class="recipe-body">
                <h2 class="recipe-title">${escapeHtml(label)}</h2>
                <p class="recipe-source">By ${escapeHtml(source)}</p>
                <p class="recipe-meta">${caloriesPerServing} kcal per serving</p>
                <div class="recipe-tags">
                    ${topTags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
                </div>
                <div class="card-footer">
                    <button class="primary-btn" data-index="${index}">
                        View Details
                    </button>
                    <span class="small-text">${recipe.cuisineType?.[0] ? capitalize(recipe.cuisineType[0]) : 'Unknown cuisine'}</span>
                </div>
            </div>
        `;

        resultsEl.appendChild(card);
    });

    // Attach click handlers for detail buttons
    const detailButtons = resultsEl.querySelectorAll('.primary-btn[data-index]');
    detailButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            const recipe = lastResults[idx];
            if (recipe) openModal(recipe);
        });
    });
}

function clearResults() {
    resultsEl.innerHTML = '';
}

// ==============================
// Modal
// ==============================

function openModal(recipe) {
    modalTitle.textContent = recipe.label || 'Recipe';

    const servings = recipe.yield || 1;
    const calories = recipe.calories || 0;
    const caloriesPerServing = Math.round(calories / Math.max(servings, 1));
    const cuisine = recipe.cuisineType?.[0] ? capitalize(recipe.cuisineType[0]) : 'Unknown cuisine';

    modalMeta.textContent = `${cuisine} • ${servings} serving${servings > 1 ? 's' : ''} • ${caloriesPerServing} kcal / serving`;

    // Ingredients
    modalIngredients.innerHTML = '';
    if (Array.isArray(recipe.ingredientLines)) {
        recipe.ingredientLines.forEach((line) => {
            const li = document.createElement('li');
            li.textContent = line;
            modalIngredients.appendChild(li);
        });
    }

    modalLink.href = recipe.url || '#';
    modalLink.style.display = recipe.url ? 'inline-block' : 'none';

    modalBackdrop.classList.remove('hidden');
}

function hideModal() {
    modalBackdrop.classList.add('hidden');
}

// ==============================
// UI Helpers
// ==============================

function showLoading() {
    loadingEl.classList.add('show');
}

function hideLoading() {
    loadingEl.classList.remove('show');
}

function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
}

function hideError() {
    errorEl.textContent = '';
    errorEl.classList.remove('show');
}

function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function capitalize(str = '') {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
