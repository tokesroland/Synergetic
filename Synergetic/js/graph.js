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

    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
        if (l2 === 0) return Math.sqrt((p.x - v.x) ** 2 + (p.y - v.y) ** 2);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
        return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
    },

    initMouseEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const visibleNodes = this.getVisibleNodes();

            if (this.isUnlinkingMode) {
                let clickedLink = null;
                visibleNodes.forEach(node => {
                    if(node.links) {
                        node.links.forEach(linkId => {
                            const target = visibleNodes.find(n => n.id === linkId);
                            if (target) {
                                const dist = this.distToSegment({x: mouseX, y: mouseY}, node, target);
                                if (dist < 8) clickedLink = { source: node.id, target: target.id };
                            }
                        });
                    }
                });

                if (clickedLink) {
                    document.body.classList.remove('mode-unlinking');
                    this.isUnlinkingMode = false;
                    
                    API.deleteLink(clickedLink.source, clickedLink.target).then(res => {
                        if(res && !res.error) {
                            const sourceNode = App.state.nodes.find(n => n.id === clickedLink.source);
                            const targetNode = App.state.nodes.find(n => n.id === clickedLink.target);
                            if(sourceNode) sourceNode.links = sourceNode.links.filter(id => id !== clickedLink.target);
                            if(targetNode) targetNode.links = targetNode.links.filter(id => id !== clickedLink.source);
                            this.draw();
                        } else {
                            alert("Hiba a kapcsolat törlésénél!");
                        }
                    });
                }
                return;
            }

            this.draggedNode = visibleNodes.find(node => {
                const dist = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
                return dist <= this.NODE_RADIUS + this.HOVER_TOLERANCE; 
            });

            if (this.draggedNode) {
                if (this.isLinkingMode) {
                    if (this.draggedNode.id !== this.activeNodeForMenu.id) {
                        const sId = this.activeNodeForMenu.id;
                        const tId = this.draggedNode.id;
                        
                        API.createLink(sId, tId).then(res => {
                            if(res && !res.error) {
                                // ÚJ: Ellenőrizzük, hogy már létezik-e!
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
                    this.draggedNode = null;
                } else {
                    this.isDragging = true;
                    App.state.selectedId = this.draggedNode.id;
                    this.canvas.style.cursor = 'grabbing';
                    this.hideQuickMenu();
                }
                this.draw();
            } else {
                App.state.selectedId = null; 
                this.hideQuickMenu();
                if(this.isLinkingMode || this.isUnlinkingMode) {
                    this.isLinkingMode = false; 
                    this.isUnlinkingMode = false;
                    document.body.classList.remove('mode-linking', 'mode-unlinking');
                }
                this.draw();
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePos.x = e.clientX - rect.left;
            this.mousePos.y = e.clientY - rect.top;

            if (this.isDragging && this.draggedNode) {
                this.draggedNode.x = this.mousePos.x;
                this.draggedNode.y = this.mousePos.y;
                this.draw(); 
            } else {
                const visibleNodes = this.getVisibleNodes();
                
                this.hoveredNode = visibleNodes.find(node => {
                    const dist = Math.sqrt((this.mousePos.x - node.x) ** 2 + (this.mousePos.y - node.y) ** 2);
                    return dist <= this.NODE_RADIUS + this.HOVER_TOLERANCE;
                });

                if (this.hoveredNode && !this.isLinkingMode && !this.isUnlinkingMode) {
                    this.canvas.style.cursor = 'pointer';
                    if (this.quickActionMenu && this.quickActionMenu.style.display !== 'block') {
                        this.quickActionOverlay.style.display = 'block';
                        this.quickActionOverlay.style.left = (this.hoveredNode.x + this.NODE_RADIUS + 5) + 'px';
                        this.quickActionOverlay.style.top = (this.hoveredNode.y - this.NODE_RADIUS - 10) + 'px';
                        this.activeNodeForMenu = this.hoveredNode;

                        // ÚJ: Kategória menüpont szövegének dinamikus cseréje
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
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                if (this.draggedNode) {
                    API.updatePosition(this.draggedNode.id, this.draggedNode.x, this.draggedNode.y);
                }
                this.isDragging = false;
                this.draggedNode = null;
                this.canvas.style.cursor = 'default';
            }
        });
    },

    initMenuEvents() {
        if(!this.quickActionPlus || !this.quickActionMenu) return;

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
                    this.isLinkingMode = true; document.body.classList.add('mode-linking');
                } else if (action === 'unlink') {
                    this.isUnlinkingMode = true; document.body.classList.add('mode-unlinking');
                } else if (action === 'edit') {
                    window.location.href = `details.html?id=${this.activeNodeForMenu.id}`;
                } else if (action === 'delete') {
                    if(confirm('Biztosan véglegesen törlöd ezt a bejegyzést? Később nem állítható vissza!')) {
                        const idToDelete = this.activeNodeForMenu.id;
                        API.deleteEntry(idToDelete).then(res => {
                            if(res && !res.error) {
                                App.state.nodes = App.state.nodes.filter(n => n.id !== idToDelete);
                                App.state.nodes.forEach(n => { if(n.links) n.links = n.links.filter(linkId => linkId !== idToDelete); });
                                App.state.selectedId = null; this.activeNodeForMenu = null; this.draw();
                                if(UI.renderSidebarEntries) UI.renderSidebarEntries(App.state.nodes);
                                if(App.loadGroups) App.loadGroups();
                            } else alert("Hiba törlés közben!");
                        });
                    }
                } 
                else if (action === 'category' || action === 'tag') {
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
                    this.activeNodeForMenu.category_id = res.id; // Lokális állapot frissítése!
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
                    this.activeNodeForMenu.category_id = item.id; // Lokális állapot frissítése!
                }
                if (mode === 'tag') await API.assignTag(this.activeNodeForMenu.id, item.id);
                this.hideQuickMenu();
            });

            listElement.appendChild(li);
        });
    },

    hideQuickMenu() {
        if(this.quickActionOverlay) this.quickActionOverlay.style.display = 'none';
        if(this.quickActionMenu) this.quickActionMenu.style.display = 'none';
        const subMenu = document.getElementById('sub-action-menu');
        if(subMenu) subMenu.style.display = 'none';
    },
    
    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const visibleNodes = this.getVisibleNodes();

        // 1. Kapcsolatok (Vonalak)
        this.ctx.lineWidth = 2; 
        this.ctx.strokeStyle = '#555';
        visibleNodes.forEach(node => {
            if (node.links) {
                node.links.forEach(linkId => {
                    const target = visibleNodes.find(n => n.id === linkId);
                    if (target) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(node.x, node.y);
                        this.ctx.lineTo(target.x, target.y);
                        this.ctx.stroke();
                    }
                });
            }
        });

        // 2. Gumi vonal
        if (this.isLinkingMode && this.activeNodeForMenu) {
            this.ctx.beginPath();
            this.ctx.setLineDash([5, 5]); 
            this.ctx.strokeStyle = '#5c6bc0';
            this.ctx.moveTo(this.activeNodeForMenu.x, this.activeNodeForMenu.y);
            this.ctx.lineTo(this.mousePos.x, this.mousePos.y);
            this.ctx.stroke();
            this.ctx.setLineDash([]); 
        }

        // 3. Csomópontok
        visibleNodes.forEach(node => {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, this.NODE_RADIUS, 0, Math.PI * 2);
            
            if (node === this.draggedNode || node === this.hoveredNode) {
                this.ctx.shadowBlur = 20;
            } else {
                this.ctx.shadowBlur = 5;
            }

            this.ctx.fillStyle = App.colors[node.type] || '#fff';
            this.ctx.shadowColor = App.colors[node.type] || '#fff';
            this.ctx.fill();
            
            if (node.id === App.state.selectedId) {
                this.ctx.lineWidth = 3;
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.stroke();
            }
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '600 14px Segoe UI';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 0;
            this.ctx.fillText(node.title, node.x, node.y + this.NODE_RADIUS + 20);
        });
    }
};