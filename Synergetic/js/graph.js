const Graph = {
    canvas: null,
    ctx: null,
    NODE_RADIUS: 15,
    HOVER_TOLERANCE: 5,
    isDragging: false,
    draggedNode: null,
    hoveredNode: null,
    activeNodeForMenu: null,

    isLinkingMode: false,
    isUnlinkingMode: false,
    mousePos: { x: 0, y: 0 },

    quickActionOverlay: null,
    quickActionPlus: null,
    quickActionMenu: null,

    // — Zoom & Pan állapot —
    camera: {
        x: 0,       // pan offset X (screen px)
        y: 0,       // pan offset Y (screen px)
        zoom: 1,
        minZoom: 0.15,
        maxZoom: 5,
        zoomStep: 0.1
    },
    isPanning: false,
    panStart: { x: 0, y: 0 },
    panCameraStart: { x: 0, y: 0 },

    // — Drag-to-group állapot —
    isDraggingToGroup: false,
    dragOriginalPos: { x: 0, y: 0 },    // originális gráf pozíció mentés
    dragScreenPos: { x: 0, y: 0 },       // aktuális screen pozíció a „ghost" rajzoláshoz
    _zoomBadgeTimeout: null,

    init() {
        this.canvas = document.getElementById('graph-canvas');
        this.ctx = this.canvas.getContext('2d');

        this.quickActionOverlay = document.getElementById('quick-action-overlay');
        this.quickActionPlus = document.getElementById('quick-action-plus');
        this.quickActionMenu = document.getElementById('quick-action-menu');

        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.initMouseEvents();
        this.initMenuEvents();
    },

    resize() {
        this.canvas.width = this.canvas.parentElement.offsetWidth;
        this.canvas.height = this.canvas.parentElement.offsetHeight;
        this.draw();
    },

    getVisibleNodes() {
        return App.state.nodes.filter(node => App.state.filters[node.type]);
    },

    // ——— Koordináta konverzió ———
    // Világ → képernyő
    worldToScreen(wx, wy) {
        return {
            x: wx * this.camera.zoom + this.camera.x,
            y: wy * this.camera.zoom + this.camera.y
        };
    },
    // Képernyő → világ
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.camera.x) / this.camera.zoom,
            y: (sy - this.camera.y) / this.camera.zoom
        };
    },

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
        return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
    },

    showZoomBadge() {
        const badge = document.getElementById('zoom-badge');
        if (!badge) return;
        badge.textContent = `${Math.round(this.camera.zoom * 100)}%`;
        badge.classList.add('visible');
        clearTimeout(this._zoomBadgeTimeout);
        this._zoomBadgeTimeout = setTimeout(() => badge.classList.remove('visible'), 1200);
    },

    // Megkeresi, melyik node van a képernyő (sx,sy) pont alatt
    findNodeAtScreen(sx, sy) {
        const visibleNodes = this.getVisibleNodes();
        const scaledRadius = this.NODE_RADIUS * this.camera.zoom;
        return visibleNodes.find(node => {
            const sp = this.worldToScreen(node.x, node.y);
            const dist = Math.sqrt((sx - sp.x) ** 2 + (sy - sp.y) ** 2);
            return dist <= scaledRadius + this.HOVER_TOLERANCE;
        });
    },

    initMouseEvents() {

        // ═══════════ WHEEL — ZOOM ═══════════
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            // Világ-pozíció az egér alatt (zoom előtt)
            const worldBefore = this.screenToWorld(mx, my);

            // Zoom lépés
            const delta = e.deltaY > 0 ? -this.camera.zoomStep : this.camera.zoomStep;
            let newZoom = this.camera.zoom + delta * this.camera.zoom * 0.3;
            newZoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, newZoom));
            this.camera.zoom = newZoom;

            // Kompenzáljuk a pan-t, hogy az egér alatti pont ne mozduljon el
            this.camera.x = mx - worldBefore.x * this.camera.zoom;
            this.camera.y = my - worldBefore.y * this.camera.zoom;

            this.showZoomBadge();
            this.draw();
        }, { passive: false });

        // ═══════════ MOUSEDOWN ═══════════
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;

            // — Unlink mode: Kattintás vonalra —
            if (this.isUnlinkingMode) {
                const worldMouse = this.screenToWorld(sx, sy);
                const visibleNodes = this.getVisibleNodes();
                let clickedLink = null;
                visibleNodes.forEach(node => {
                    if (node.links) {
                        node.links.forEach(linkId => {
                            const target = visibleNodes.find(n => n.id === linkId);
                            if (target) {
                                const dist = this.distToSegment(worldMouse, node, target);
                                if (dist < 8 / this.camera.zoom) clickedLink = { source: node.id, target: target.id };
                            }
                        });
                    }
                });

                if (clickedLink) {
                    document.body.classList.remove('mode-unlinking');
                    this.isUnlinkingMode = false;
                    API.deleteLink(clickedLink.source, clickedLink.target).then(res => {
                        if (res && !res.error) {
                            const sourceNode = App.state.nodes.find(n => n.id === clickedLink.source);
                            const targetNode = App.state.nodes.find(n => n.id === clickedLink.target);
                            if (sourceNode) sourceNode.links = sourceNode.links.filter(id => id !== clickedLink.target);
                            if (targetNode) targetNode.links = targetNode.links.filter(id => id !== clickedLink.source);
                            this.draw();
                        } else {
                            alert("Hiba a kapcsolat törlésénél!");
                        }
                    });
                }
                return;
            }

            // — Node keresése a kattintott pont alatt —
            const foundNode = this.findNodeAtScreen(sx, sy);

            if (foundNode) {
                // Linking mode
                if (this.isLinkingMode) {
                    if (foundNode.id !== this.activeNodeForMenu.id) {
                        const sId = this.activeNodeForMenu.id;
                        const tId = foundNode.id;
                        API.createLink(sId, tId).then(res => {
                            if (res && !res.error) {
                                if (res.message === "Ez a kapcsolat már létezik.") {
                                    alert("Ez a kapcsolat már létezik a két bejegyzés között!");
                                } else {
                                    this.activeNodeForMenu.links.push(tId);
                                    this.draw();
                                }
                            } else {
                                alert("Hiba a kapcsolat létrehozásánál!");
                            }
                        });
                    }
                    this.isLinkingMode = false;
                    document.body.classList.remove('mode-linking');
                    return;
                }

                // Normal drag start
                this.draggedNode = foundNode;
                this.isDragging = true;
                this.isDraggingToGroup = false;
                this.dragOriginalPos = { x: foundNode.x, y: foundNode.y };
                App.state.selectedId = foundNode.id;
                this.canvas.style.cursor = 'grabbing';
                this.hideQuickMenu();
                this.draw();
            } else {
                // Ha üres helyre kattintunk
                App.state.selectedId = null;
                this.hideQuickMenu();

                if (this.isLinkingMode || this.isUnlinkingMode) {
                    this.isLinkingMode = false;
                    this.isUnlinkingMode = false;
                    document.body.classList.remove('mode-linking', 'mode-unlinking');
                }

                // — PAN START —
                this.isPanning = true;
                this.panStart = { x: sx, y: sy };
                this.panCameraStart = { x: this.camera.x, y: this.camera.y };
                this.canvas.style.cursor = 'grab';

                this.draw();
            }
        });

        // ═══════════ MOUSEMOVE ═══════════
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const sx = e.clientX - rect.left;
            const sy = e.clientY - rect.top;
            this.mousePos.x = sx;
            this.mousePos.y = sy;

            // Abszolút screen pozíció (a sidebar proximity check-hez)
            const absX = e.clientX;

            // — PAN —
            if (this.isPanning) {
                const dx = sx - this.panStart.x;
                const dy = sy - this.panStart.y;
                this.camera.x = this.panCameraStart.x + dx;
                this.camera.y = this.panCameraStart.y + dy;
                this.canvas.style.cursor = 'grabbing';
                this.draw();
                return;
            }

            // — NODE DRAG —
            if (this.isDragging && this.draggedNode) {
                // Világ koordinátába konvertáljuk az egér pozíciót
                const world = this.screenToWorld(sx, sy);
                this.draggedNode.x = world.x;
                this.draggedNode.y = world.y;
                this.dragScreenPos = { x: e.clientX, y: e.clientY };

                // ——— SIDEBAR PROXIMITY CHECK ———
                const sidebar = document.getElementById('sidebar');
                const sidebarThreshold = 80; // pixelek, amennyire közel kell menni

                if (absX < sidebarThreshold) {
                    // Sidebar kinyitása
                    if (sidebar.classList.contains('closed')) {
                        sidebar.classList.remove('closed');
                    }
                    sidebar.classList.add('drag-highlight');
                    this.isDraggingToGroup = true;

                    // Groups menü kinyitása
                    const groupsDropdown = document.getElementById('groups-dropdown');
                    if (groupsDropdown && !groupsDropdown.classList.contains('open')) {
                        groupsDropdown.classList.add('open');
                        const groupsArrow = document.getElementById('groups-arrow');
                        if (groupsArrow) groupsArrow.textContent = '▲';
                    }

                    // Melyik group-item felett van az egér?
                    this._highlightGroupUnderCursor(e.clientX, e.clientY);
                } else {
                    sidebar.classList.remove('drag-highlight');
                    this._clearGroupHighlights();
                    this.isDraggingToGroup = false;
                }

                this.draw();
                return;
            }

            // — HOVER —
            const foundNode = this.findNodeAtScreen(sx, sy);
            this.hoveredNode = foundNode;

            if (this.hoveredNode && !this.isLinkingMode && !this.isUnlinkingMode) {
                this.canvas.style.cursor = 'pointer';
                if (this.quickActionMenu && this.quickActionMenu.style.display !== 'block') {
                    const sp = this.worldToScreen(this.hoveredNode.x, this.hoveredNode.y);
                    const scaledR = this.NODE_RADIUS * this.camera.zoom;
                    this.quickActionOverlay.style.display = 'block';
                    this.quickActionOverlay.style.left = (sp.x + scaledR + 5) + 'px';
                    this.quickActionOverlay.style.top = (sp.y - scaledR - 10) + 'px';
                    this.activeNodeForMenu = this.hoveredNode;

                    const categoryLi = this.quickActionMenu.querySelector('[data-action="category"]');
                    if (categoryLi) {
                        categoryLi.innerHTML = this.hoveredNode.category_id
                            ? '📁 Kategória szerkesztése'
                            : '📁 Kategória hozzáadása';
                    }
                }
            } else if (!this.isUnlinkingMode && !this.isLinkingMode) {
                this.canvas.style.cursor = 'default';
                if (this.quickActionMenu && this.quickActionMenu.style.display !== 'block' && this.quickActionOverlay) {
                    this.quickActionOverlay.style.display = 'none';
                }
            }

            if (this.isLinkingMode) this.draw();
        });

        // ═══════════ MOUSEUP ═══════════
        window.addEventListener('mouseup', (e) => {
            // — PAN END —
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = 'default';
                return;
            }

            // — NODE DRAG END —
            if (this.isDragging && this.draggedNode) {
                // Ha a sidebar-ba húztuk (group drop)
                if (this.isDraggingToGroup) {
                    const targetGroupId = this._getGroupUnderCursor(e.clientX, e.clientY);

                    if (targetGroupId !== null) {
                        // *** Visszaállítjuk az eredeti pozíciót ***
                        this.draggedNode.x = this.dragOriginalPos.x;
                        this.draggedNode.y = this.dragOriginalPos.y;

                        // Backend hívás: csoport módosítás
                        this._moveEntryToGroup(this.draggedNode.id, targetGroupId);
                    } else {
                        // Nem esett group-ra → visszaállítjuk
                        this.draggedNode.x = this.dragOriginalPos.x;
                        this.draggedNode.y = this.dragOriginalPos.y;
                    }

                    // Takarítás
                    const sidebar = document.getElementById('sidebar');
                    sidebar.classList.remove('drag-highlight');
                    this._clearGroupHighlights();
                    this.isDraggingToGroup = false;

                } else {
                    // Normál pozíció mentés
                    API.updatePosition(this.draggedNode.id, this.draggedNode.x, this.draggedNode.y);
                }

                this.isDragging = false;
                this.draggedNode = null;
                this.canvas.style.cursor = 'default';
                this.draw();
            }
        });
    },

    // ——— Segédfüggvények a drag-to-group-hoz ———

    _highlightGroupUnderCursor(cx, cy) {
        const items = document.querySelectorAll('.group-item');
        items.forEach(item => {
            const rect = item.getBoundingClientRect();
            if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
                item.classList.add('drop-target');
            } else {
                item.classList.remove('drop-target');
            }
        });
    },

    _clearGroupHighlights() {
        document.querySelectorAll('.group-item.drop-target').forEach(el => el.classList.remove('drop-target'));
    },

    _getGroupUnderCursor(cx, cy) {
        const items = document.querySelectorAll('.group-item');
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
                return parseInt(item.getAttribute('data-group'));
            }
        }
        return null;
    },

    async _moveEntryToGroup(entryId, groupId) {
        try {
            const res = await fetch('api.php', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'move_to_group',
                    id: entryId,
                    group_id: groupId
                })
            });
            const data = await res.json();
            if (data && !data.error) {
                // Ha a jelenlegi csoportból másikba költöztettük, eltávolítjuk a node-ot a jelenlegi listából
                const currentGroupId = App.state.currentGroupId;
                if (groupId !== currentGroupId) {
                    App.state.nodes = App.state.nodes.filter(n => n.id !== entryId);
                    // Linkek törlése a maradék node-oknál
                    App.state.nodes.forEach(n => {
                        if (n.links) n.links = n.links.filter(linkId => linkId !== entryId);
                    });
                    UI.renderSidebarEntries(App.state.nodes);
                }
                App.loadGroups();
                this.draw();
            } else {
                alert("Hiba a csoport módosításakor: " + (data?.error || ''));
            }
        } catch (err) {
            console.error("Hiba a csoport módosításakor:", err);
            alert("Hálózati hiba a csoport módosításakor!");
        }
    },

    initMenuEvents() {
        if (!this.quickActionPlus || !this.quickActionMenu) return;

        const subMenu = document.getElementById('sub-action-menu');
        const subSearch = document.getElementById('sub-action-search');
        const subList = document.getElementById('sub-action-list');
        const subCreateBtn = document.getElementById('sub-action-create-new');
        let currentSubMenuMode = null;
        let currentItems = [];

        this.quickActionPlus.addEventListener('click', () => {
            this.quickActionMenu.style.display = this.quickActionMenu.style.display === 'block' ? 'none' : 'block';
            subMenu.style.display = 'none';
        });

        this.quickActionMenu.addEventListener('click', async (e) => {
            if (e.target.tagName === 'LI') {
                const action = e.target.getAttribute('data-action');

                if (['link', 'unlink', 'edit', 'delete'].includes(action)) {
                    this.hideQuickMenu();
                }

                if (action === 'link') {
                    this.isLinkingMode = true;
                    document.body.classList.add('mode-linking');
                } else if (action === 'unlink') {
                    this.isUnlinkingMode = true;
                    document.body.classList.add('mode-unlinking');
                } else if (action === 'edit') {
                    window.location.href = `details.html?id=${this.activeNodeForMenu.id}`;
                } else if (action === 'delete') {
                    if (confirm('Biztosan véglegesen törlöd ezt a bejegyzést? Később nem állítható vissza!')) {
                        const idToDelete = this.activeNodeForMenu.id;
                        API.deleteEntry(idToDelete).then(res => {
                            if (res && !res.error) {
                                App.state.nodes = App.state.nodes.filter(n => n.id !== idToDelete);
                                App.state.nodes.forEach(n => { if (n.links) n.links = n.links.filter(linkId => linkId !== idToDelete); });
                                App.state.selectedId = null;
                                this.activeNodeForMenu = null;
                                this.draw();
                                if (UI.renderSidebarEntries) UI.renderSidebarEntries(App.state.nodes);
                                if (App.loadGroups) App.loadGroups();
                            } else alert("Hiba törlés közben!");
                        });
                    }
                } else if (action === 'category' || action === 'tag') {
                    currentSubMenuMode = action;
                    subSearch.value = '';
                    subMenu.style.display = 'block';
                    subList.innerHTML = '<li style="padding: 10px; color: var(--text-secondary);">Betöltés...</li>';

                    currentItems = action === 'category' ? await API.getCategories() : await API.getTags();
                    this.renderSubMenu(currentItems, subList, currentSubMenuMode);
                }
            }
        });

        subSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = currentItems.filter(item => item.name.toLowerCase().includes(term));
            this.renderSubMenu(filtered, subList, currentSubMenuMode);
        });

        subCreateBtn.addEventListener('click', async () => {
            let newName = subSearch.value.trim();
            if (!newName) {
                newName = prompt(`Add meg az új ${currentSubMenuMode === 'category' ? 'kategória' : 'címke'} nevét:`);
                if (!newName) return;
            }

            const payload = { action: `create_${currentSubMenuMode}`, name: newName };
            const res = await API.createEntry(payload);

            if (res && res.id) {
                if (currentSubMenuMode === 'category') {
                    await API.assignCategory(this.activeNodeForMenu.id, res.id);
                    this.activeNodeForMenu.category_id = res.id;
                }
                if (currentSubMenuMode === 'tag') await API.assignTag(this.activeNodeForMenu.id, res.id);

                alert('Sikeresen létrehozva és hozzárendelve!');
                this.hideQuickMenu();
            }
        });
    },

    renderSubMenu(items, listElement, mode) {
        listElement.innerHTML = '';
        if (items.length === 0) {
            listElement.innerHTML = '<li style="padding: 10px; color: var(--text-secondary); text-align: center;">Nincs találat.</li>';
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.style.cssText = 'padding: 8px 15px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-primary); transition: background 0.2s;';
            li.innerHTML = `<span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${item.color_hex || '#ccc'};"></span> ${item.name}`;

            li.onmouseover = () => li.style.backgroundColor = 'var(--bg-item-hover)';
            li.onmouseout = () => li.style.backgroundColor = 'transparent';

            li.addEventListener('click', async () => {
                if (mode === 'category') {
                    await API.assignCategory(this.activeNodeForMenu.id, item.id);
                    this.activeNodeForMenu.category_id = item.id;
                }
                if (mode === 'tag') await API.assignTag(this.activeNodeForMenu.id, item.id);
                this.hideQuickMenu();
            });

            listElement.appendChild(li);
        });
    },

    hideQuickMenu() {
        if (this.quickActionOverlay) this.quickActionOverlay.style.display = 'none';
        if (this.quickActionMenu) this.quickActionMenu.style.display = 'none';
        const subMenu = document.getElementById('sub-action-menu');
        if (subMenu) subMenu.style.display = 'none';
    },

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        const cam = this.camera;

        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // ——— Transform alkalmazása ———
        ctx.save();
        ctx.translate(cam.x, cam.y);
        ctx.scale(cam.zoom, cam.zoom);

        const visibleNodes = this.getVisibleNodes();

        // 1. Kapcsolatok (Vonalak)
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#33333a';
        visibleNodes.forEach(node => {
            if (node.links) {
                node.links.forEach(linkId => {
                    const target = visibleNodes.find(n => n.id === linkId);
                    if (target) {
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(target.x, target.y);
                        ctx.stroke();
                    }
                });
            }
        });

        // 2. Gumi vonal (linking mode) — screen-to-world konverzió
        if (this.isLinkingMode && this.activeNodeForMenu) {
            const worldMouse = this.screenToWorld(this.mousePos.x, this.mousePos.y);
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            ctx.moveTo(this.activeNodeForMenu.x, this.activeNodeForMenu.y);
            ctx.lineTo(worldMouse.x, worldMouse.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // 3. Csomópontok
        visibleNodes.forEach(node => {
            const color = App.colors[node.type] || '#fff';
            const isActive = node === this.draggedNode || node === this.hoveredNode;
            const isSelected = node.id === App.state.selectedId;

            // Glow
            ctx.beginPath();
            ctx.arc(node.x, node.y, this.NODE_RADIUS, 0, Math.PI * 2);

            if (isActive || isSelected) {
                ctx.shadowBlur = 24;
                ctx.shadowColor = color;
            } else {
                ctx.shadowBlur = 8;
                ctx.shadowColor = color;
            }

            ctx.fillStyle = color;
            ctx.fill();

            // Selected ring
            if (isSelected) {
                ctx.lineWidth = 2.5;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            }

            // Label
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(228, 228, 234, 0.9)';
            ctx.font = '600 13px "DM Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.title, node.x, node.y + this.NODE_RADIUS + 20);
        });

        ctx.restore();
    }
};
