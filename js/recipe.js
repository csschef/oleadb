const API = `http://${window.location.hostname}:3000`;
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function load() {
    const el = document.getElementById('content');
    const id = new URLSearchParams(location.search).get('id');

    if (!id) {
        el.innerHTML = `<div class="empty-state"><p>Inget recept valt.</p></div>`;
        return;
    }

    try {
        const res = await fetch(`${API}/recipes/${id}`);
        if (!res.ok) throw new Error('not found');
        const r = await res.json();

        document.title = `${r.name} - Receptsamling`;

        el.className = '';
        el.innerHTML = `
            <h1>${esc(r.name)}</h1>
            <div class="meta">
                ${r.servings ? `<span>🍽 ${r.servings} portioner</span>` : ''}
                ${r.prep_time_minutes ? `<span>⏱ ${r.prep_time_minutes} min</span>` : ''}
            </div>
            ${r.description ? `<p class="recipe-description">${esc(r.description)}</p>` : ''}

            <div class="detail-section">
                <h2>Ingredienser</h2>
                <ul class="ingredient-list-detail">
                    ${r.ingredients.map(i => `
                        <li>
                            <span class="ing-amount">${i.amount} ${esc(i.unit)}</span>
                            <span>${esc(i.ingredient_name)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

    } catch {
        el.innerHTML = `<div class="empty-state"><p>Receptet hittades inte.</p></div>`;
    }
}

load();
