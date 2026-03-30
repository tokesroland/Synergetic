/**
 * GraphView v5 – Keresés highlight: node-ok + KAPCSOLATAIK is kitűnnek
 */
const GraphView = {
  template: "#tpl-graph-view",
  data() {
    return {
      NODE_RADIUS: 15, HOVER_TOLERANCE: 5,
      camera: { x: 0, y: 0, zoom: 1, minZoom: 0.15, maxZoom: 5, zoomStep: 0.1 },
      isDragging: false, draggedNode: null, hoveredNode: null, activeNodeForMenu: null,
      isPanning: false, panStart: { x: 0, y: 0 }, panCameraStart: { x: 0, y: 0 },
      isLinkingMode: false, isUnlinkingMode: false, mousePos: { x: 0, y: 0 },
      isDraggingToGroup: false, dragOriginalPos: { x: 0, y: 0 },
      showQuickMenu: false, quickMenuPos: { x: 0, y: 0 },
      showSubMenu: false, subMenuAction: "", subSearch: "", subItems: [],
      zoomBadgeVisible: false, zoomBadgeTimeout: null,
    };
  },
  computed: {
    store() { return Store; },
    visibleNodes() { return Store.nodes.filter(n => Store.filters[n.type]); },
    colors() { return Store.colors; },
    zoomPercent() { return Math.round(this.camera.zoom * 100) + "%"; },
    filteredSubItems() {
      if (!this.subSearch.trim()) return this.subItems;
      const q = this.subSearch.toLowerCase();
      return this.subItems.filter(i => i.name.toLowerCase().includes(q));
    },
  },
  mounted() {
    this.canvas = this.$refs.canvas;
    this.ctx = this.canvas.getContext("2d");
    this.resize(); this.draw();
    this._resizeHandler = () => this.resize();
    window.addEventListener("resize", this._resizeHandler);
    this._mouseUpHandler = e => this.onMouseUp(e);
    window.addEventListener("mouseup", this._mouseUpHandler);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this._resizeHandler);
    window.removeEventListener("mouseup", this._mouseUpHandler);
  },
  watch: {
    "store.nodes": { handler() { this.draw(); }, deep: true },
    "store.filters": { handler() { this.draw(); }, deep: true },
    "store.selectedId"() { this.draw(); },
    "store.highlightedNodeIds"() { this.draw(); },
    "store.searchActive"() { this.draw(); },
  },
  methods: {
    worldToScreen(wx, wy) { return { x: wx * this.camera.zoom + this.camera.x, y: wy * this.camera.zoom + this.camera.y }; },
    screenToWorld(sx, sy) { return { x: (sx - this.camera.x) / this.camera.zoom, y: (sy - this.camera.y) / this.camera.zoom }; },
    resize() { this.canvas.width = this.canvas.parentElement.offsetWidth; this.canvas.height = this.canvas.parentElement.offsetHeight; this.draw(); },
    getNodeAt(sx, sy) {
      const w = this.screenToWorld(sx, sy), r = this.NODE_RADIUS + this.HOVER_TOLERANCE;
      return this.visibleNodes.find(n => Math.hypot(n.x - w.x, n.y - w.y) <= r) || null;
    },
    getLinkAt(sx, sy) {
      const w = this.screenToWorld(sx, sy);
      for (const node of this.visibleNodes) {
        if (!node.links) continue;
        for (const linkId of node.links) {
          const target = this.visibleNodes.find(n => n.id === linkId);
          if (!target) continue;
          if (this.ptSegDist(w.x, w.y, node.x, node.y, target.x, target.y) < 8) return { source: node, target };
        }
      }
      return null;
    },
    ptSegDist(px, py, ax, ay, bx, by) {
      const dx = bx-ax, dy = by-ay;
      if (!dx && !dy) return Math.hypot(px-ax, py-ay);
      let t = Math.max(0, Math.min(1, ((px-ax)*dx + (py-ay)*dy) / (dx*dx + dy*dy)));
      return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
    },
    showZoomBadge() {
      this.zoomBadgeVisible = true; clearTimeout(this.zoomBadgeTimeout);
      this.zoomBadgeTimeout = setTimeout(() => { this.zoomBadgeVisible = false; }, 1200);
    },
    onWheel(e) {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect(), mx = e.clientX-rect.left, my = e.clientY-rect.top;
      const oldZoom = this.camera.zoom, delta = e.deltaY < 0 ? this.camera.zoomStep : -this.camera.zoomStep;
      const newZoom = Math.min(this.camera.maxZoom, Math.max(this.camera.minZoom, oldZoom + delta * oldZoom));
      this.camera.x = mx - (mx - this.camera.x) * (newZoom / oldZoom);
      this.camera.y = my - (my - this.camera.y) * (newZoom / oldZoom);
      this.camera.zoom = newZoom; this.showZoomBadge(); this.draw();
    },
    onMouseDown(e) {
      if (e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect(), sx = e.clientX-rect.left, sy = e.clientY-rect.top;
      if (this.isLinkingMode) { const t = this.getNodeAt(sx, sy); if (t && t !== this.activeNodeForMenu) this.finishLink(t); return; }
      if (this.isUnlinkingMode) { const l = this.getLinkAt(sx, sy); if (l) this.finishUnlink(l); return; }
      const node = this.getNodeAt(sx, sy);
      if (node) { this.isDragging = true; this.draggedNode = node; this.dragOriginalPos = { x: node.x, y: node.y }; Store.selectedId = node.id; }
      else { this.isPanning = true; this.panStart = { x: e.clientX, y: e.clientY }; this.panCameraStart = { x: this.camera.x, y: this.camera.y }; this.closeMenus(); }
    },
    onMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect(), sx = e.clientX-rect.left, sy = e.clientY-rect.top;
      this.mousePos = { x: sx, y: sy };
      if (this.isPanning) { this.camera.x = this.panCameraStart.x + (e.clientX - this.panStart.x); this.camera.y = this.panCameraStart.y + (e.clientY - this.panStart.y); this.draw(); return; }
      if (this.isDragging && this.draggedNode) {
        const world = this.screenToWorld(sx, sy); this.draggedNode.x = world.x; this.draggedNode.y = world.y;
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
          const sr = sidebar.getBoundingClientRect(); this.isDraggingToGroup = e.clientX < sr.right + 40;
          if (this.isDraggingToGroup && !Store.sidebarOpen) Store.sidebarOpen = true;
          document.querySelectorAll(".group-item").forEach(gi => {
            const gr = gi.getBoundingClientRect();
            gi.classList.toggle("drop-target", e.clientX >= gr.left && e.clientX <= gr.right && e.clientY >= gr.top && e.clientY <= gr.bottom);
          });
        }
        this.draw(); return;
      }
      const node = this.getNodeAt(sx, sy);
      if (node !== this.hoveredNode) { this.hoveredNode = node; this.canvas.style.cursor = node ? "pointer" : "default"; this.draw(); }
      if (this.isLinkingMode || this.isUnlinkingMode) { this.canvas.style.cursor = "crosshair"; this.draw(); }
    },
    onMouseUp(e) {
      document.querySelectorAll(".group-item.drop-target").forEach(gi => gi.classList.remove("drop-target"));
      if (this.isPanning) { this.isPanning = false; this.canvas.style.cursor = "default"; return; }
      if (this.isDragging && this.draggedNode) {
        if (this.isDraggingToGroup) {
          const targetGroupId = this.getGroupUnderCursor(e.clientX, e.clientY);
          if (targetGroupId !== null) {
            this.draggedNode.x = this.dragOriginalPos.x; this.draggedNode.y = this.dragOriginalPos.y;
            const entryId = this.draggedNode.id, currentGroupId = Store.currentGroupId;
            ApiService.moveEntryToGroup(entryId, targetGroupId).then(data => {
              if (data && !data.error) {
                if (targetGroupId != currentGroupId) { Store.nodes = Store.nodes.filter(n => n.id !== entryId); Store.nodes.forEach(n => { if (n.links) n.links = n.links.filter(lid => lid !== entryId); }); }
                Store.loadGroups(); this.draw();
              } else { alert("Hiba: " + (data?.error || "")); }
            });
          } else { this.draggedNode.x = this.dragOriginalPos.x; this.draggedNode.y = this.dragOriginalPos.y; }
        } else { ApiService.updatePosition(this.draggedNode.id, this.draggedNode.x, this.draggedNode.y); }
        this.isDragging = false; this.isDraggingToGroup = false; this.draggedNode = null; this.draw();
      }
    },
    onDblClick(e) { const rect = this.canvas.getBoundingClientRect(); const node = this.getNodeAt(e.clientX-rect.left, e.clientY-rect.top); if (node) this.$router.push({ name: "details", params: { id: node.id } }); },
    onRightClick(e) {
      e.preventDefault(); const rect = this.canvas.getBoundingClientRect();
      const node = this.getNodeAt(e.clientX-rect.left, e.clientY-rect.top);
      if (node) { this.activeNodeForMenu = node; Store.selectedId = node.id; this.quickMenuPos = { x: e.clientX, y: e.clientY }; this.showQuickMenu = true; this.showSubMenu = false; }
    },
    getGroupUnderCursor(cx, cy) { for (const item of document.querySelectorAll(".group-item")) { const r = item.getBoundingClientRect(); if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return parseInt(item.dataset.group); } return null; },
    closeMenus() { this.showQuickMenu = false; this.showSubMenu = false; this.isLinkingMode = false; this.isUnlinkingMode = false; this.canvas.style.cursor = "default"; },
    quickAction(action) {
      const node = this.activeNodeForMenu; if (!node) return;
      if (action === "link") { this.isLinkingMode = true; this.showQuickMenu = false; }
      else if (action === "unlink") { this.isUnlinkingMode = true; this.showQuickMenu = false; }
      else if (action === "edit") { this.$router.push({ name: "details", params: { id: node.id } }); this.closeMenus(); }
      else if (action === "category") { this.openSubMenu("category"); }
      else if (action === "tag") { this.openSubMenu("tag"); }
      else if (action === "delete") { if (confirm(`Biztosan törlöd: "${node.title}"?`)) { ApiService.deleteEntry(node.id).then(() => Store.loadCurrentGroup()); } this.closeMenus(); }
    },
    async openSubMenu(type) {
      this.subMenuAction = type; this.subSearch = "";
      if (type === "category") { await Store.loadCategories(); this.subItems = Store.categories; }
      else if (type === "tag") { await Store.loadTags(); this.subItems = Store.tags; }
      this.showSubMenu = true;
    },
    async selectSubItem(item) {
      const node = this.activeNodeForMenu; if (!node) return;
      if (this.subMenuAction === "category") await ApiService.assignCategory(node.id, item.id);
      else if (this.subMenuAction === "tag") await ApiService.assignTag(node.id, item.id);
      this.closeMenus(); Store.loadCurrentGroup();
    },
    async createSubItem() {
      const name = this.subSearch.trim(); if (!name) return;
      if (this.subMenuAction === "category") { await ApiService.createCategory({ name, color_hex: "#5c6bc0" }); await Store.loadCategories(); this.subItems = Store.categories; }
      else if (this.subMenuAction === "tag") { await ApiService.createTag({ name }); await Store.loadTags(); this.subItems = Store.tags; }
      this.subSearch = "";
    },
    async finishLink(target) { await ApiService.createLink(this.activeNodeForMenu.id, target.id); this.isLinkingMode = false; this.canvas.style.cursor = "default"; Store.loadCurrentGroup(); },
    async finishUnlink(link) { await ApiService.deleteLink(link.source.id, link.target.id); this.isUnlinkingMode = false; this.canvas.style.cursor = "default"; Store.loadCurrentGroup(); },

    // ═══ DRAW – Keresési kiemelés: node-ok ÉS kapcsolataik ═══
    draw() {
      if (!this.ctx) return;
      const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(this.camera.x, this.camera.y);
      ctx.scale(this.camera.zoom, this.camera.zoom);

      const nodes = this.visibleNodes;
      const searchOn = Store.searchActive;
      const hlIds = Store.highlightedNodeIds;

      // ── Kapcsolatok ──
      // Két pass: 1) dimmed, 2) highlighted
      nodes.forEach(node => {
        if (!node.links) return;
        node.links.forEach(linkId => {
          const target = nodes.find(n => n.id === linkId);
          if (!target) return;

          const srcHl = !searchOn || (hlIds && hlIds.has(node.id));
          const tgtHl = !searchOn || (hlIds && hlIds.has(target.id));
          // Kapcsolat akkor tűnik ki, ha LEGALÁBB az egyik végpont kiemelt
          const linkHl = srcHl || tgtHl;
          // Kapcsolat akkor a LEGFÉNYESEBB, ha mindkét végpont kiemelt
          const linkBright = srcHl && tgtHl;

          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);

          if (!searchOn) {
            ctx.strokeStyle = "#33333a";
            ctx.lineWidth = 1.5;
          } else if (linkBright) {
            ctx.strokeStyle = "rgba(99, 102, 241, 0.6)";
            ctx.lineWidth = 2.5;
          } else if (linkHl) {
            ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
            ctx.lineWidth = 1.8;
          } else {
            ctx.strokeStyle = "rgba(51, 51, 58, 0.1)";
            ctx.lineWidth = 1;
          }
          ctx.stroke();
        });
      });

      // ── Linking mode vonal ──
      if (this.isLinkingMode && this.activeNodeForMenu) {
        const wm = this.screenToWorld(this.mousePos.x, this.mousePos.y);
        ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 2;
        ctx.moveTo(this.activeNodeForMenu.x, this.activeNodeForMenu.y); ctx.lineTo(wm.x, wm.y);
        ctx.stroke(); ctx.setLineDash([]);
      }

      // ── Node-ok ──
      nodes.forEach(node => {
        const color = this.colors[node.type] || "#fff";
        const isActive = node === this.draggedNode || node === this.hoveredNode;
        const isSelected = node.id === Store.selectedId;
        const isHl = !searchOn || (hlIds && hlIds.has(node.id));
        const dimOpacity = searchOn && !isHl ? 0.1 : 1;

        ctx.globalAlpha = dimOpacity;

        // Glow körülötte keresés közben
        if (searchOn && isHl) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, this.NODE_RADIUS + 6, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.12;
          ctx.fill();
          ctx.globalAlpha = dimOpacity;
        }

        // Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, this.NODE_RADIUS, 0, Math.PI * 2);
        ctx.shadowBlur = isActive || isSelected ? 24 : (isHl && searchOn ? 18 : 8);
        ctx.shadowColor = isHl && searchOn ? '#fff' : color;
        ctx.fillStyle = color;
        ctx.fill();

        if (isSelected) { ctx.lineWidth = 2.5; ctx.strokeStyle = "#fff"; ctx.stroke(); }

        // Kiemelő ring
        if (searchOn && isHl) {
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
          ctx.beginPath();
          ctx.arc(node.x, node.y, this.NODE_RADIUS + 3, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;

        // Felirat
        ctx.fillStyle = isHl || !searchOn ? "rgba(228,228,234,0.9)" : "rgba(228,228,234,0.1)";
        ctx.font = '600 13px "DM Sans",sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(node.title, node.x, node.y + this.NODE_RADIUS + 20);

        ctx.globalAlpha = 1;
      });

      ctx.restore();
    },
  },
};
