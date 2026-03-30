/**
 * GraphView – Gráf nézet Canvas-szal (v3 fixed)
 * Fix: drag-to-group node eltávolítása a jelenlegi csoportból
 */
const GraphView = {
    template: '#tpl-graph-view',
    data() {
        return {
            NODE_RADIUS: 15, HOVER_TOLERANCE: 5,
            camera: { x:0, y:0, zoom:1, minZoom:0.15, maxZoom:5, zoomStep:0.1 },
            isDragging:false, draggedNode:null, hoveredNode:null, activeNodeForMenu:null,
            isPanning:false, panStart:{x:0,y:0}, panCameraStart:{x:0,y:0},
            isLinkingMode:false, isUnlinkingMode:false, mousePos:{x:0,y:0},
            isDraggingToGroup:false, dragOriginalPos:{x:0,y:0},
            showQuickMenu:false, quickMenuPos:{x:0,y:0},
            showSubMenu:false, subMenuAction:'', subSearch:'', subItems:[],
            zoomBadgeVisible:false, zoomBadgeTimeout:null
        };
    },
    computed: {
        store() { return Store; },
        visibleNodes() { return Store.nodes.filter(n => Store.filters[n.type]); },
        colors() { return Store.colors; },
        zoomPercent() { return Math.round(this.camera.zoom * 100) + '%'; },
        filteredSubItems() {
            if (!this.subSearch.trim()) return this.subItems;
            const q = this.subSearch.toLowerCase();
            return this.subItems.filter(i => i.name.toLowerCase().includes(q));
        }
    },
    mounted() {
        this.canvas = this.$refs.canvas; this.ctx = this.canvas.getContext('2d');
        this.resize(); this.draw();
        this._resizeHandler = () => this.resize();
        window.addEventListener('resize', this._resizeHandler);
        this._mouseUpHandler = (e) => this.onMouseUp(e);
        window.addEventListener('mouseup', this._mouseUpHandler);
    },
    beforeUnmount() {
        window.removeEventListener('resize', this._resizeHandler);
        window.removeEventListener('mouseup', this._mouseUpHandler);
    },
    watch: {
        'store.nodes': { handler() { this.draw(); }, deep: true },
        'store.filters': { handler() { this.draw(); }, deep: true },
        'store.selectedId'() { this.draw(); }
    },
    methods: {
        worldToScreen(wx,wy) { return { x:wx*this.camera.zoom+this.camera.x, y:wy*this.camera.zoom+this.camera.y }; },
        screenToWorld(sx,sy) { return { x:(sx-this.camera.x)/this.camera.zoom, y:(sy-this.camera.y)/this.camera.zoom }; },
        resize() { this.canvas.width=this.canvas.parentElement.offsetWidth; this.canvas.height=this.canvas.parentElement.offsetHeight; this.draw(); },
        getNodeAt(sx,sy) {
            const w=this.screenToWorld(sx,sy), r=this.NODE_RADIUS+this.HOVER_TOLERANCE;
            return this.visibleNodes.find(n=>(n.x-w.x)**2+(n.y-w.y)**2<=r*r)||null;
        },
        getLinkAt(sx,sy) {
            const w=this.screenToWorld(sx,sy);
            for(const node of this.visibleNodes){ if(!node.links)continue; for(const linkId of node.links){ const target=this.visibleNodes.find(n=>n.id===linkId); if(!target)continue; if(this.distToSegment(w,node,target)<8) return {source:node,target}; } }
            return null;
        },
        distToSegment(p,v,w) {
            const l2=(v.x-w.x)**2+(v.y-w.y)**2; if(l2===0)return Math.sqrt((p.x-v.x)**2+(p.y-v.y)**2);
            let t=((p.x-v.x)*(w.x-v.x)+(p.y-v.y)*(w.y-v.y))/l2; t=Math.max(0,Math.min(1,t));
            const proj={x:v.x+t*(w.x-v.x),y:v.y+t*(w.y-v.y)}; return Math.sqrt((p.x-proj.x)**2+(p.y-proj.y)**2);
        },
        showZoomBadge() { this.zoomBadgeVisible=true; clearTimeout(this.zoomBadgeTimeout); this.zoomBadgeTimeout=setTimeout(()=>{this.zoomBadgeVisible=false;},1200); },
        onWheel(e) {
            e.preventDefault(); const rect=this.canvas.getBoundingClientRect(); const mx=e.clientX-rect.left,my=e.clientY-rect.top;
            const oldZoom=this.camera.zoom, delta=e.deltaY<0?this.camera.zoomStep:-this.camera.zoomStep;
            const newZoom=Math.min(this.camera.maxZoom,Math.max(this.camera.minZoom,oldZoom+delta*oldZoom));
            this.camera.x=mx-(mx-this.camera.x)*(newZoom/oldZoom); this.camera.y=my-(my-this.camera.y)*(newZoom/oldZoom); this.camera.zoom=newZoom;
            this.showZoomBadge(); this.draw();
        },
        onMouseDown(e) {
            if(e.button!==0)return; const rect=this.canvas.getBoundingClientRect(); const sx=e.clientX-rect.left,sy=e.clientY-rect.top;
            if(this.isLinkingMode){const t=this.getNodeAt(sx,sy);if(t&&t!==this.activeNodeForMenu)this.finishLink(t);return;}
            if(this.isUnlinkingMode){const l=this.getLinkAt(sx,sy);if(l)this.finishUnlink(l);return;}
            const node=this.getNodeAt(sx,sy);
            if(node){this.isDragging=true;this.draggedNode=node;this.dragOriginalPos={x:node.x,y:node.y};Store.selectedId=node.id;}
            else{this.isPanning=true;this.panStart={x:e.clientX,y:e.clientY};this.panCameraStart={x:this.camera.x,y:this.camera.y};this.closeMenus();}
        },
        onMouseMove(e) {
            const rect=this.canvas.getBoundingClientRect(); const sx=e.clientX-rect.left,sy=e.clientY-rect.top; this.mousePos={x:sx,y:sy};
            if(this.isPanning){this.camera.x=this.panCameraStart.x+(e.clientX-this.panStart.x);this.camera.y=this.panCameraStart.y+(e.clientY-this.panStart.y);this.draw();return;}
            if(this.isDragging&&this.draggedNode){
                const world=this.screenToWorld(sx,sy); this.draggedNode.x=world.x; this.draggedNode.y=world.y;
                const sidebar=document.getElementById('sidebar');
                if(sidebar){const sr=sidebar.getBoundingClientRect();this.isDraggingToGroup=e.clientX<sr.right+40;if(this.isDraggingToGroup&&!Store.sidebarOpen)Store.sidebarOpen=true;
                    // Highlight group items
                    document.querySelectorAll('.group-item').forEach(gi=>{const gr=gi.getBoundingClientRect();gi.classList.toggle('drop-target',e.clientX>=gr.left&&e.clientX<=gr.right&&e.clientY>=gr.top&&e.clientY<=gr.bottom);});
                }
                this.draw();return;
            }
            const node=this.getNodeAt(sx,sy);
            if(node!==this.hoveredNode){this.hoveredNode=node;this.canvas.style.cursor=node?'pointer':'default';this.draw();}
            if(this.isLinkingMode||this.isUnlinkingMode){this.canvas.style.cursor='crosshair';this.draw();}
        },
        onMouseUp(e) {
            // Clear drop targets
            document.querySelectorAll('.group-item.drop-target').forEach(gi=>gi.classList.remove('drop-target'));
            if(this.isPanning){this.isPanning=false;this.canvas.style.cursor='default';return;}
            if(this.isDragging&&this.draggedNode){
                if(this.isDraggingToGroup){
                    const targetGroupId=this.getGroupUnderCursor(e.clientX,e.clientY);
                    if(targetGroupId!==null){
                        this.draggedNode.x=this.dragOriginalPos.x; this.draggedNode.y=this.dragOriginalPos.y;
                        const entryId=this.draggedNode.id;
                        const currentGroupId=Store.currentGroupId;
                        ApiService.moveEntryToGroup(entryId,targetGroupId).then((data)=>{
                            if(data&&!data.error){
                                // Ha másik csoportba került, eltávolítjuk
                                if(targetGroupId!=currentGroupId){
                                    Store.nodes=Store.nodes.filter(n=>n.id!==entryId);
                                    Store.nodes.forEach(n=>{if(n.links)n.links=n.links.filter(lid=>lid!==entryId);});
                                }
                                Store.loadGroups();
                                this.draw();
                            } else { alert('Hiba a csoport módosításakor: '+(data?.error||'')); }
                        });
                    } else { this.draggedNode.x=this.dragOriginalPos.x; this.draggedNode.y=this.dragOriginalPos.y; }
                } else { ApiService.updatePosition(this.draggedNode.id,this.draggedNode.x,this.draggedNode.y); }
                this.isDragging=false; this.isDraggingToGroup=false; this.draggedNode=null; this.draw();
            }
        },
        onDblClick(e) { const rect=this.canvas.getBoundingClientRect(); const node=this.getNodeAt(e.clientX-rect.left,e.clientY-rect.top); if(node) this.$router.push({name:'details',params:{id:node.id}}); },
        onRightClick(e) {
            e.preventDefault(); const rect=this.canvas.getBoundingClientRect(); const node=this.getNodeAt(e.clientX-rect.left,e.clientY-rect.top);
            if(node){this.activeNodeForMenu=node;Store.selectedId=node.id;this.quickMenuPos={x:e.clientX,y:e.clientY};this.showQuickMenu=true;this.showSubMenu=false;}
        },
        getGroupUnderCursor(cx,cy) {
            const items=document.querySelectorAll('.group-item');
            for(const item of items){const r=item.getBoundingClientRect();if(cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom)return parseInt(item.dataset.group);}
            return null;
        },
        closeMenus(){this.showQuickMenu=false;this.showSubMenu=false;this.isLinkingMode=false;this.isUnlinkingMode=false;this.canvas.style.cursor='default';},
        quickAction(action){
            const node=this.activeNodeForMenu; if(!node)return;
            if(action==='link'){this.isLinkingMode=true;this.showQuickMenu=false;}
            else if(action==='unlink'){this.isUnlinkingMode=true;this.showQuickMenu=false;}
            else if(action==='edit'){this.$router.push({name:'details',params:{id:node.id}});this.closeMenus();}
            else if(action==='category'){this.openSubMenu('category');}
            else if(action==='tag'){this.openSubMenu('tag');}
            else if(action==='delete'){if(confirm(`Biztosan törlöd: "${node.title}"?`)){ApiService.deleteEntry(node.id).then(()=>Store.loadCurrentGroup());}this.closeMenus();}
        },
        async openSubMenu(type){
            this.subMenuAction=type;this.subSearch='';
            if(type==='category'){await Store.loadCategories();this.subItems=Store.categories;}
            else if(type==='tag'){await Store.loadTags();this.subItems=Store.tags;}
            this.showSubMenu=true;
        },
        async selectSubItem(item){
            const node=this.activeNodeForMenu;if(!node)return;
            if(this.subMenuAction==='category')await ApiService.assignCategory(node.id,item.id);
            else if(this.subMenuAction==='tag')await ApiService.assignTag(node.id,item.id);
            this.closeMenus();Store.loadCurrentGroup();
        },
        async createSubItem(){
            const name=this.subSearch.trim();if(!name)return;
            if(this.subMenuAction==='category'){await ApiService.createCategory({name,color_hex:'#5c6bc0'});await Store.loadCategories();this.subItems=Store.categories;}
            else if(this.subMenuAction==='tag'){await ApiService.createTag({name});await Store.loadTags();this.subItems=Store.tags;}
            this.subSearch='';
        },
        async finishLink(target){await ApiService.createLink(this.activeNodeForMenu.id,target.id);this.isLinkingMode=false;this.canvas.style.cursor='default';Store.loadCurrentGroup();},
        async finishUnlink(link){await ApiService.deleteLink(link.source.id,link.target.id);this.isUnlinkingMode=false;this.canvas.style.cursor='default';Store.loadCurrentGroup();},
        draw(){
            if(!this.ctx)return; const ctx=this.ctx,W=this.canvas.width,H=this.canvas.height;
            ctx.clearRect(0,0,W,H); ctx.save(); ctx.translate(this.camera.x,this.camera.y); ctx.scale(this.camera.zoom,this.camera.zoom);
            const nodes=this.visibleNodes;
            ctx.lineWidth=1.5;ctx.strokeStyle='#33333a';
            nodes.forEach(node=>{if(node.links){node.links.forEach(linkId=>{const target=nodes.find(n=>n.id===linkId);if(target){ctx.beginPath();ctx.moveTo(node.x,node.y);ctx.lineTo(target.x,target.y);ctx.stroke();}});}});
            if(this.isLinkingMode&&this.activeNodeForMenu){const wm=this.screenToWorld(this.mousePos.x,this.mousePos.y);ctx.beginPath();ctx.setLineDash([5,5]);ctx.strokeStyle='#6366f1';ctx.lineWidth=2;ctx.moveTo(this.activeNodeForMenu.x,this.activeNodeForMenu.y);ctx.lineTo(wm.x,wm.y);ctx.stroke();ctx.setLineDash([]);}
            nodes.forEach(node=>{
                const color=this.colors[node.type]||'#fff',isActive=node===this.draggedNode||node===this.hoveredNode,isSelected=node.id===Store.selectedId;
                ctx.beginPath();ctx.arc(node.x,node.y,this.NODE_RADIUS,0,Math.PI*2);
                ctx.shadowBlur=(isActive||isSelected)?24:8;ctx.shadowColor=color;ctx.fillStyle=color;ctx.fill();
                if(isSelected){ctx.lineWidth=2.5;ctx.strokeStyle='#ffffff';ctx.stroke();}
                ctx.shadowBlur=0;ctx.fillStyle='rgba(228,228,234,0.9)';ctx.font='600 13px "DM Sans",sans-serif';ctx.textAlign='center';
                ctx.fillText(node.title,node.x,node.y+this.NODE_RADIUS+20);
            });
            ctx.restore();
        }
    }
};
