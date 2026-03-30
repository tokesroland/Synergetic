/**
 * Synergetic – API Service (v3 fixed)
 */
const ApiService = {
  baseUrl: "api.php",
  async _fetch(url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[API]", err);
      return null;
    }
  },
  // Csoportok
  loadGroups() {
    return this._fetch(`${this.baseUrl}?action=get_groups`);
  },
  loadGroupData(groupId) {
    return this._fetch(`${this.baseUrl}?group_id=${groupId}`);
  },
  // Entry CRUD
  getEntry(entryId) {
    return this._fetch(`${this.baseUrl}?entry_id=${entryId}`);
  },
  createEntry(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  updateEntry(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_entry", ...data }),
    });
  },
  deleteEntry(id) {
    return this._fetch(`${this.baseUrl}?id=${id}`, { method: "DELETE" });
  },
  // Pozíció
  updatePosition(id, x, y) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_position", id, x, y }),
    });
  },
  // Kapcsolatok
  createLink(sourceId, targetId) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_link",
        source_id: sourceId,
        target_id: targetId,
      }),
    });
  },
  deleteLink(sourceId, targetId) {
    return this._fetch(
      `${this.baseUrl}?action=delete_link&source_id=${sourceId}&target_id=${targetId}`,
      { method: "DELETE" },
    );
  },
  // Kategóriák, Tagek, Helyek
  getCategories() {
    return this._fetch(`${this.baseUrl}?action=get_categories`);
  },
  createCategory(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_category", ...data }),
    });
  },
  getTags() {
    return this._fetch(`${this.baseUrl}?action=get_tags`);
  },
  createTag(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_tag", ...data }),
    });
  },
  assignCategory(entryId, categoryId) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign_category",
        entry_id: entryId,
        category_id: categoryId,
      }),
    });
  },
  assignTag(entryId, tagId) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign_tag",
        entry_id: entryId,
        tag_id: tagId,
      }),
    });
  },
  unassignTag(entryId, tagId) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "unassign_tag",
        entry_id: entryId,
        tag_id: tagId,
      }),
    });
  },
  getLocations() {
    return this._fetch(`${this.baseUrl}?action=get_locations`);
  },
  createLocation(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_location", ...data }),
    });
  },
  // Csoport módosítás — PUT (a régi graph.js mintájára)
  moveEntryToGroup(entryId, groupId) {
    return this._fetch(this.baseUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "move_to_group",
        id: entryId,
        group_id: groupId,
      }),
    });
  },
  // Naptár
  getCalendarEntries() {
    return this._fetch(`${this.baseUrl}?action=get_calendar`);
  },
  // Csatolmányok
  uploadAttachment(entryId, file) {
    const fd = new FormData();
    fd.append("entry_id", entryId);
    fd.append("file", file);
    return this._fetch(this.baseUrl, { method: "POST", body: fd });
  },
  deleteAttachment(attId) {
    return this._fetch(`${this.baseUrl}?action=delete_attachment&id=${attId}`, {
      method: "DELETE",
    });
  },
  // Rutin
  getRoutineAll() {
    return this._fetch(`${this.baseUrl}?action=get_routine_all`);
  },
  getRoutineByDay(day) {
    return this._fetch(`${this.baseUrl}?action=get_routine_by_day&day=${day}`);
  },
  getRoutineCompletions(date) {
    return this._fetch(
      `${this.baseUrl}?action=get_routine_completions&date=${date}`,
    );
  },
  getRoutineWeekSummary(weekStart) {
    return this._fetch(
      `${this.baseUrl}?action=get_routine_week_summary&week_start=${weekStart}`,
    );
  },
  createRoutineItem(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_routine_item", ...data }),
    });
  },
  updateRoutineItem(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_routine_item", ...data }),
    });
  },
  deleteRoutineItem(id) {
    return this._fetch(`${this.baseUrl}?action=delete_routine_item&id=${id}`, {
      method: "DELETE",
    });
  },
  toggleRoutineCompletion(routineItemId, date) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle_routine_completion",
        routine_item_id: routineItemId,
        date,
      }),
    });
  },
};
