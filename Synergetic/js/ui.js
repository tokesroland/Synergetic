const UI = {
    init() {
        this.initSidebar();
        this.initFilters();
        this.initModeSelector();
        this.initModalAndForm();
    },

    initSidebar() {
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const sidebar = document.getElementById('sidebar');
        const groupsToggle = document.getElementById('groups-toggle');
        const groupsDropdown = document.getElementById('groups-dropdown');
        const groupsArrow = document.getElementById('groups-arrow');
        const searchInput = document.getElementById('group-search');

        if (hamburgerBtn) hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('closed');
        });

        document.getElementById('main-content').addEventListener('click', () => {
            if (sidebar && !sidebar.classList.contains('closed')) sidebar.classList.add('closed');
        });

        if (sidebar) sidebar.addEventListener('click', (e) => e.stopPropagation());

        if (groupsToggle) groupsToggle.addEventListener('click', () => {
            groupsDropdown.classList.toggle('open');
            groupsArrow.textContent = groupsDropdown.classList.contains('open') ? '▲' : '▼';
        });

        if (searchInput) searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const groupItems = document.querySelectorAll('.group-item');
            groupItems.forEach(item => {
                const groupName = item.querySelector('.group-name').textContent.toLowerCase();
                item.style.display = groupName.includes(searchTerm) ? 'block' : 'none';
            });
        });

        const manageGroupsBtn = document.querySelector('.manage-groups-btn');
        if (manageGroupsBtn) {
            manageGroupsBtn.addEventListener('click', () => {
                window.location.href = 'groups.html';
            });
        }
    },

    initFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                App.state.filters[type] = !App.state.filters[type];
                btn.classList.toggle('active');
                if (typeof Graph !== 'undefined') Graph.draw();
            });
        });
    },

    initModeSelector() {
        const modeSelect = document.getElementById('mode-select');
        if (modeSelect) modeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'detail') {
                if (App.state.selectedId) {
                    window.location.href = `details.html?id=${App.state.selectedId}`;
                } else {
                    alert("Kérlek először válassz ki egy elemet (kattints egy golyóra) a gráfon!");
                    e.target.value = 'graph';
                }
            } else if (e.target.value === 'calendar') {
                window.location.href = 'calendar.html';
            } else if (e.target.value === 'routine') {
                window.location.href = 'routine.html';
            }
        });
    },

    renderGroups(groups) {
        const container = document.getElementById('group-list-container');
        if (!container) return;
        container.innerHTML = '';

        if (!groups || groups.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; font-size: 0.85rem; padding: 10px;">Nincsenek csoportok. Hozz létre egyet!</div>';
            return;
        }

        groups.forEach(group => {
            const li = document.createElement('li');
            li.className = `group-item ${group.id == App.state.currentGroupId ? 'active' : ''}`;
            li.setAttribute('data-group', group.id);

            li.innerHTML = `
                <div class="group-name">${group.name}</div>
                <div class="group-stats">
                    ${group.todo_count || 0} Feladat | ${group.event_count || 0} Esemény | ${group.note_count || 0} Jegyzet
                </div>
            `;

            li.addEventListener('click', () => {
                // Ne váltson csoportot, ha éppen drag-to-group módban van
                if (Graph.isDragging && Graph.isDraggingToGroup) return;

                document.querySelector('.group-item.active')?.classList.remove('active');
                li.classList.add('active');
                App.state.currentGroupId = group.id;
                App.loadCurrentGroup();
            });
            container.appendChild(li);
        });
    },

    renderSidebarEntries(entries) {
        const container = document.getElementById('sidebar-entries-container');
        if (!container) return;
        container.innerHTML = '';

        if (!entries || entries.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; font-size: 0.85rem; padding: 20px;">Ebben a csoportban még nincsenek elemek.</div>';
            return;
        }

        const typeNames = { 'todo': 'Feladat', 'event': 'Esemény', 'note': 'Jegyzet' };

        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = `sidebar-entry-item ${entry.id === App.state.selectedId ? 'active' : ''}`;

            const color = App.colors[entry.type] || '#fff';
            div.style.setProperty('--card-color', color);

            div.innerHTML = `
                <div class="sidebar-entry-title" title="${entry.title}">${entry.title}</div>
                <div class="sidebar-entry-type" style="color: ${color}; border: 1px solid ${color}40;">
                    ${typeNames[entry.type] || entry.type}
                </div>
            `;

            div.addEventListener('click', () => {
                App.state.selectedId = entry.id;
                if (typeof Graph !== 'undefined') Graph.draw();

                document.querySelectorAll('.sidebar-entry-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
            });

            container.appendChild(div);
        });
    },

    initModalAndForm() {
        const modal = document.getElementById('entry-modal');
        const openModalBtn = document.getElementById('open-modal-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const newEntryForm = document.getElementById('new-entry-form');

        const creationTypeSelect = document.getElementById('creation-type');
        const fieldsEntry = document.getElementById('fields-entry');
        const fieldsCategory = document.getElementById('fields-category');
        const fieldsTag = document.getElementById('fields-tag');
        const fieldsLocation = document.getElementById('fields-location');

        const entryTypeSelect = document.getElementById('entry-type');
        const todoFields = document.getElementById('todo-fields');
        const eventFields = document.getElementById('event-fields');
        const allDayCheckbox = document.getElementById('entry-allday');
        const startInput = document.getElementById('entry-start');
        const endInput = document.getElementById('entry-end');

        // Helyszínek betöltése az event select-be
        async function loadLocations() {
            try {
                const res = await fetch('api.php?action=get_locations');
                const locations = await res.json();
                const sel = document.getElementById('event-location');
                if (!sel) return;
                // Csak az üres opciót tartjuk meg
                sel.innerHTML = '<option value="">— Nincs helyszín —</option>';
                (locations || []).forEach(loc => {
                    const opt = document.createElement('option');
                    opt.value = loc.id;
                    opt.textContent = loc.name;
                    sel.appendChild(opt);
                });
            } catch (e) {
                console.warn('Helyszínek betöltése sikertelen:', e);
            }
        }

        // Csoportok betöltése
        async function loadGroups() {
            try {
                const res = await fetch('api.php?action=get_groups');
                const groups = await res.json();
                const sel = document.getElementById('entry-group');
                if (!sel) return;
                sel.innerHTML = '';
                (groups || []).forEach(g => {
                    const opt = document.createElement('option');
                    opt.value = g.id;
                    opt.textContent = g.name;
                    sel.appendChild(opt);
                });
            } catch (e) { console.warn('Csoportok betöltése sikertelen:', e); }
        }

        async function loadCategories() {
            try {
                const res = await fetch('api.php?action=get_categories');
                const cats = await res.json();
                const sel = document.getElementById('entry-category');
                if (!sel) return;
                sel.innerHTML = '<option value="">— Nincs kategória —</option>';
                (cats || []).forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    sel.appendChild(opt);
                });
            } catch (e) { console.warn('Kategóriák betöltése sikertelen:', e); }
        }

        if (openModalBtn) openModalBtn.addEventListener('click', () => {
            loadGroups();
            loadCategories();
            loadLocations();
            modal.classList.add('active');
        });

        if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
        if (modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        // Létrehozás típusa váltás
        if (creationTypeSelect) creationTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            fieldsEntry.style.display = type === 'entry' ? 'block' : 'none';
            fieldsCategory.style.display = type === 'category' ? 'block' : 'none';
            fieldsTag.style.display = type === 'tag' ? 'block' : 'none';
            fieldsLocation.style.display = type === 'location' ? 'block' : 'none';
        });

        // Bejegyzés típus (note/todo/event) váltás
        if (entryTypeSelect) entryTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            todoFields.style.display = type === 'todo' ? 'block' : 'none';
            eventFields.style.display = type === 'event' ? 'block' : 'none';
        });

        // Egész napos checkbox
        if (allDayCheckbox) allDayCheckbox.addEventListener('change', (e) => {
            const t = e.target.checked ? 'date' : 'datetime-local';
            if (startInput) startInput.type = t;
            if (endInput) endInput.type = t;
        });

        // Form submit
        if (newEntryForm) newEntryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = newEntryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mentés...';

            const creationType = creationTypeSelect.value;
            let payload = {};

            if (creationType === 'entry') {
                const entryType = entryTypeSelect.value;
                payload = {
                    action: 'create_entry',
                    title: document.getElementById('entry-title').value.trim(),
                    group_id: parseInt(document.getElementById('entry-group').value) || 1,
                    category_id: document.getElementById('entry-category').value || null,
                    type: entryType,
                };

                if (!payload.title) {
                    alert('A cím kötelező!');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Létrehozás';
                    return;
                }

                if (entryType === 'todo') {
                    payload.planned_start = document.getElementById('todo-start').value || null;
                    payload.deadline = document.getElementById('todo-deadline').value || null;
                } else if (entryType === 'event') {
                    payload.start_datetime = startInput.value || null;
                    payload.end_datetime = endInput.value || null;
                    payload.is_all_day = allDayCheckbox.checked ? 1 : 0;
                    payload.location_id = document.getElementById('event-location').value || null;
                }
                
            } else if (creationType === 'category') {
                payload = {
                    action: 'create_category',
                    name: document.getElementById('category-name').value.trim(),
                    color_hex: document.getElementById('category-color').value,
                };
            } else if (creationType === 'tag') {
                payload = {
                    action: 'create_tag',
                    name: document.getElementById('tag-name').value.trim(),
                    color_hex: document.getElementById('tag-color').value,
                };
            } else if (creationType === 'location') {
                payload = {
                    action: 'create_location',
                    name: document.getElementById('location-name').value.trim(),
                };
            }

            try {
                const data = await API.createEntry(payload);

                if (data && data.error) {
                    alert('Hiba: ' + data.error);
                } else if (data && data.id) {
                    if (creationType === 'entry') {
                        const color = App.colors[payload.type] || '#fff';
                        const newNode = {
                            id: data.id,
                            type: payload.type,
                            title: payload.title,
                            x: Math.random() * (Graph.canvas.width - 150) + 75,
                            y: Math.random() * (Graph.canvas.height - 150) + 75,
                            links: []
                        };
                        App.state.nodes.push(newNode);
                        if (typeof Graph !== 'undefined') Graph.draw();
                        UI.renderSidebarEntries(App.state.nodes);
                        App.loadGroups();
                    } else {
                        alert(`Sikeresen létrehozva!`);
                    }

                    newEntryForm.reset();
                    // Típusmezők visszaállítása
                    if (todoFields) todoFields.style.display = 'none';
                    if (eventFields) eventFields.style.display = 'none';
                    creationTypeSelect.dispatchEvent(new Event('change'));
                    modal.classList.remove('active');
                } else {
                    alert('Ismeretlen hiba történt.');
                }
            } catch (err) {
                console.error(err);
                alert('Hálózati hiba: ' + err.message);
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Létrehozás';
        });
    },
};