const Graph = {
    canvas: null,
    ctx: null,
    NODE_RADIUS: 10,
    isDragging: false,
    draggedNode: null,

    init() {
        this.canvas = document.getElementById('graph-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        window.addEventListener('resize', () => this.resize());
        this.resize();
        this.initMouseEvents();
    },

    resize() {
        this.canvas.width = this.canvas.parentElement.offsetWidth;
        this.canvas.height = this.canvas.parentElement.offsetHeight;
        this.draw();
    },

    // Csak azokat a node-okat adja vissza, amik nincsenek kiszűrve
    getVisibleNodes() {
        return App.state.nodes.filter(node => App.state.filters[node.type]);
    },

    initMouseEvents() {
        // Egér lenyomása (Kattintás vagy Vonszolás kezdete)
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const visibleNodes = this.getVisibleNodes();

            this.draggedNode = visibleNodes.find(node => {
                const dist = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
                return dist <= this.NODE_RADIUS + 5; 
            });

            if (this.draggedNode) {
                this.isDragging = true;
                App.state.selectedId = this.draggedNode.id;
                this.canvas.style.cursor = 'grabbing';
            } else {
                App.state.selectedId = null; // Üres területre kattintás leveszi a fókuszt
            }
            this.draw();
        });

        // Egér mozgatása (Vonszolás közben vagy Hover)
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (this.isDragging && this.draggedNode) {
                this.draggedNode.x = mouseX;
                this.draggedNode.y = mouseY;
                this.draw(); 
            } else {
                const visibleNodes = this.getVisibleNodes();
                const isHovering = visibleNodes.some(node => {
                    const dist = Math.sqrt((mouseX - node.x) ** 2 + (mouseY - node.y) ** 2);
                    return dist <= this.NODE_RADIUS + 5;
                });
                this.canvas.style.cursor = isHovering ? 'grab' : 'default';
            }
        });

        // Egér felengedése
        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.draggedNode = null;
                this.canvas.style.cursor = 'default';
            }
        });
    },

    draw() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const visibleNodes = this.getVisibleNodes();

        // 1. Kapcsolatok (Vonalak)
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = '#444';
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

        // 2. Csomópontok (Körök)
        visibleNodes.forEach(node => {
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
            
            // Felnagyítás vonszolás közben
            if (node === this.draggedNode) {
                this.ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
                this.ctx.shadowBlur = 15;
            } else {
                this.ctx.shadowBlur = 10;
            }

            this.ctx.fillStyle = App.colors[node.type] || '#fff';
            this.ctx.shadowColor = App.colors[node.type] || '#fff';
            this.ctx.fill();
            
            // Kijelölés vizuális kerete (Fehér körvonal)
            if (node.id === App.state.selectedId) {
                this.ctx.lineWidth = 2;
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.stroke();
            }
            
            // Címke (Szöveg)
            this.ctx.fillStyle = '#e0e0e0';
            this.ctx.font = '13px Segoe UI';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 0;
            this.ctx.fillText(node.title, node.x, node.y + 25);
        });
    }
};