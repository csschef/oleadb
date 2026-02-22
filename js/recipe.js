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

        el.className = 'recipe-detail';
        el.innerHTML = `
            ${r.image_url ? `<div class="hero-image" style="margin-bottom: 1.5rem;"><img src="${API}${r.image_url}" style="width:100%; height:300px; object-fit:cover; border-radius:12px; box-shadow:var(--shadow);"></div>` : ''}
            
            <div id="category-chips" class="chip-group" style="margin-bottom: 0.5rem; gap: 0.4rem;">
                ${(r.categories || []).map(c => `<span class="chip">${esc(c.name)}</span>`).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem;">
                <h1 style="margin: 0;">${esc(r.name)}</h1>
                <a href="edit.html?id=${r.id}" class="btn btn-ghost" style="padding: 0.4rem 0.8rem; font-size: 0.82rem; flex-shrink: 0;">✏️ Ändra</a>
            </div>

            <div class="meta" style="margin-bottom: 1.5rem;">
                ${r.servings ? `<span>🍽 ${r.servings} portioner</span>` : ''}
                ${r.prep_time_minutes ? `<span>⏱ ${r.prep_time_minutes} min</span>` : ''}
            </div>
            ${r.description ? `<p class="recipe-description" style="font-size: 1.05rem; margin-bottom: 2rem;">${esc(r.description)}</p>` : ''}

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

            ${r.steps && r.steps.length > 0 ? `
                <div class="detail-section" style="margin-top: 1.5rem;">
                    <h2>Gör så här</h2>
                    <div class="instruction-list-view" style="display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1rem;">
                        ${r.steps.map(s => `
                            <div style="display: flex; gap: 1rem;">
                                <div class="step-number" style="background: var(--accent); color: #fff; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; margin-top: 2px;">${s.step_number}</div>
                                <div style="font-size: 1rem; line-height: 1.6;">${esc(s.instruction)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

    } catch (err) {
        console.error(err);
        el.innerHTML = `<div class="empty-state"><p>Receptet hittades inte.</p></div>`;
    }
}

load();
