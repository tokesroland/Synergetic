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

        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('closed');
        });

        document.getElementById('main-content').addEventListener('click', () => {
            if (!sidebar.classList.contains('closed')) sidebar.classList.add('closed');
        });

        sidebar.addEventListener('click', (e) => e.stopPropagation());

        groupsToggle.addEventListener('click', () => {
            groupsDropdown.classList.toggle('open');
            groupsArrow.textContent = groupsDropdown.classList.contains('open') ? '▲' : '▼';
        });

        // Kereső javítva dinamikus listához
        searchInput.addEventListener('input', (e) => {
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

// Csoportok menü generálása
    renderGroups(groups) {
        const container = document.getElementById('group-list-container');
        container.innerHTML = '';
        
        // Ha üres az adatbázis
        if (!groups || groups.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; font-size: 0.85rem; padding: 10px;">Nincsenek csoportok. Hozz létre egyet!</div>';
            return;
        }

        groups.forEach(group => {
            const li = document.createElement('li');
            li.className = `group-item ${group.id == App.state.currentGroupId ? 'active' : ''}`;
            li.setAttribute('data-group', group.id);
            
            // A kártya felépítése a statisztikákkal
            li.innerHTML = `
                <div class="group-name">${group.name}</div>
                <div class="group-stats">
                    ${group.todo_count} Feladat | ${group.event_count} Esemény | ${group.note_count} Jegyzet
                </div>
            `;
            
            li.addEventListener('click', () => {
                document.querySelector('.group-item.active')?.classList.remove('active');
                li.classList.add('active');
                App.state.currentGroupId = group.id;
                App.loadCurrentGroup(); // Automatikusan betölti a gráfot és a listát!
            });
            container.appendChild(li);
        });
    },

    // ÚJ: Bejegyzések kilistázása a csoport alatt (Kártya Dizájn)
    renderSidebarEntries(entries) {
        const container = document.getElementById('sidebar-entries-container');
        container.innerHTML = '';

        if (!entries || entries.length === 0) {
            container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; font-size: 0.85rem; padding: 20px;">Ebben a csoportban még nincsenek elemek.</div>';
            return;
        }

        const typeNames = { 'todo': 'Feladat', 'event': 'Esemény', 'note': 'Jegyzet' };

        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = `sidebar-entry-item ${entry.id === App.state.selectedId ? 'active' : ''}`;

            // CSS változó beállítása a kártyának (ebből kapja a színes csíkot a szélén)
            const color = App.colors[entry.type] || '#fff';
            div.style.setProperty('--card-color', color);

            // A title="" attribútum miatt, ha ráviszi az egeret a levágott szövegre, kiírja a teljeset
            div.innerHTML = `
                <div class="sidebar-entry-title" title="${entry.title}">${entry.title}</div>
                <div class="sidebar-entry-type" style="color: ${color}; border: 1px solid ${color}40;">
                    ${typeNames[entry.type] || entry.type}
                </div>
            `;

            div.addEventListener('click', () => {
                App.state.selectedId = entry.id;
                Graph.draw();

                document.querySelectorAll('.sidebar-entry-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
            });

            container.appendChild(div);
        });
    },

    initFilters() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                App.state.filters[type] = !App.state.filters[type];
                btn.classList.toggle('active');
                Graph.draw(); // Vászon azonnali frissítése
            });
        });
    },

    initModeSelector() {
        const modeSelect = document.getElementById('mode-select');
        modeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'detail') {
                if (App.state.selectedId) {
                    window.location.href = `details.html?id=${App.state.selectedId}`;
                } else {
                    alert("Kérlek először válassz ki egy elemet (kattints egy golyóra) a gráfon!");
                    e.target.value = 'graph';
                }
            } else if (e.target.value === 'calendar') {
            window.location.href = 'calendar.html';
            }
        });
    },

    initModalAndForm() {
        const modal = document.getElementById('entry-modal');
        const openModalBtn = document.getElementById('open-modal-btn');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const newEntryForm = document.getElementById('new-entry-form');
        const entryTypeSelect = document.getElementById('entry-type');
        const datetimeContainer = document.getElementById('datetime-container');
        const allDayCheckbox = document.getElementById('entry-allday');
        const startInput = document.getElementById('entry-start');
        const endInput = document.getElementById('entry-end');

        openModalBtn.addEventListener('click', () => modal.classList.add('active'));
        closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        // Form mezők elrejtése/mutatása típus alapján
        entryTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'todo' || type === 'event') {
                datetimeContainer.style.display = 'block';
                startInput.required = (type === 'event');
            } else {
                datetimeContainer.style.display = 'none';
                startInput.required = false;
            }
        });

        allDayCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                startInput.type = 'date';
                endInput.type = 'date';
            } else {
                startInput.type = 'datetime-local';
                endInput.type = 'datetime-local';
            }
        });

        // FORM BEKÜLDÉSE (A Hálózati kérés összekötése a Mentéssel)
        newEntryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const entryData = {
                title: document.getElementById('entry-title').value,
                group_id: document.getElementById('entry-group').value || 1,
                category_id: document.getElementById('entry-category').value || null,
                type: entryTypeSelect.value,
            };

            if (entryData.type === 'todo' || entryData.type === 'event') {
                entryData.start_datetime = startInput.value || null;
                entryData.end_datetime = endInput.value || null;
                entryData.is_all_day = allDayCheckbox.checked ? 1 : 0;
            }

            const submitBtn = newEntryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mentés...';

            // Kérés indítása az API rétegen keresztül
            const data = await API.createEntry(entryData);

            submitBtn.disabled = false;
            submitBtn.textContent = 'Létrehozás';

            if (data && data.error) {
                alert('Hiba történt: ' + data.error);
            } else if (data && data.entry_id) {
                // Sikeres mentés esetén új elem generálása a JS memóriába
                const newNode = {
                    id: data.entry_id,
                    type: entryData.type,
                    title: entryData.title,
                    x: Math.random() * (Graph.canvas.width - 150) + 75,
                    y: Math.random() * (Graph.canvas.height - 150) + 75,
                    links: []
                };

                App.state.nodes.push(newNode);
                Graph.draw();
                UI.renderSidebarEntries(App.state.nodes);
                App.loadGroups();
                newEntryForm.reset();
                entryTypeSelect.dispatchEvent(new Event('change'));
                modal.classList.remove('active');
            }
        });
    }
};

