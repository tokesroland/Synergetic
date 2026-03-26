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
        const datetimeContainer = document.getElementById('datetime-container');
        const allDayCheckbox = document.getElementById('entry-allday');
        const startInput = document.getElementById('entry-start');
        const endInput = document.getElementById('entry-end');

        if (openModalBtn) openModalBtn.addEventListener('click', () => modal.classList.add('active'));
        if (closeModalBtn) closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
        if (modal) modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        if (creationTypeSelect) creationTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            fieldsEntry.style.display = type === 'entry' ? 'block' : 'none';
            fieldsCategory.style.display = type === 'category' ? 'block' : 'none';
            fieldsTag.style.display = type === 'tag' ? 'block' : 'none';
            fieldsLocation.style.display = type === 'location' ? 'block' : 'none';
        });

        if (entryTypeSelect) entryTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'todo' || type === 'event') {
                datetimeContainer.style.display = 'block';
                startInput.required = (type === 'event');
            } else {
                datetimeContainer.style.display = 'none';
                startInput.required = false;
            }
        });

        if (allDayCheckbox) allDayCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                startInput.type = 'date';
                endInput.type = 'date';
            } else {
                startInput.type = 'datetime-local';
                endInput.type = 'datetime-local';
            }
        });

        if (newEntryForm) newEntryForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = newEntryForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Mentés...';

            const creationType = creationTypeSelect.value;
            let payload = { action: `create_${creationType}` }; 

            if (creationType === 'entry') {
                payload.title = document.getElementById('entry-title').value;
                payload.group_id = document.getElementById('entry-group').value || 1;
                payload.category_id = document.getElementById('entry-category').value || null;
                payload.type = entryTypeSelect.value;

                if (payload.type === 'todo' || payload.type === 'event') {
                    payload.start_datetime = startInput.value || null;
                    payload.end_datetime = endInput.value || null;
                    payload.is_all_day = allDayCheckbox.checked ? 1 : 0;
                }
            } else if (creationType === 'category') {
                payload.name = document.getElementById('category-name').value;
                payload.color_hex = document.getElementById('category-color').value;
            } else if (creationType === 'tag') {
                payload.name = document.getElementById('tag-name').value;
                payload.color_hex = document.getElementById('tag-color').value;
            } else if (creationType === 'location') {
                payload.name = document.getElementById('location-name').value;
            }

            const data = await API.createEntry(payload);

            submitBtn.disabled = false;
            submitBtn.textContent = 'Létrehozás';

            if (data && data.error) {
                alert('Hiba történt: ' + data.error);
            } else if (data && data.id) {
                console.log('Sikeres mentés!', data);

                if (creationType === 'entry') {
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
                    alert(`Sikeresen létrehozva: ${payload.name}`);
                }

                newEntryForm.reset();
                creationTypeSelect.dispatchEvent(new Event('change')); 
                entryTypeSelect.dispatchEvent(new Event('change'));
                modal.classList.remove('active');
            }
        });
    }
};
