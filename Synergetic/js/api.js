/**
 * Synergetic – API Service v5
 */
const ApiService = {
  baseUrl: "api.php",
  async _fetch(url, options = {}) {
    try { const res = await fetch(url, options); if (!res.ok) throw new Error(`HTTP ${res.status}`); return await res.json(); }
    catch (err) { console.error("[API]", err); return null; }
  },
  loadGroups() { return this._fetch(`${this.baseUrl}?action=get_groups`); },
  loadGroupData(groupId) { return this._fetch(`${this.baseUrl}?group_id=${groupId}`); },
  getEntry(entryId) { return this._fetch(`${this.baseUrl}?entry_id=${entryId}`); },
  createEntry(data) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); },
  updateEntry(data) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_entry", ...data }) }); },
  deleteEntry(id) { return this._fetch(`${this.baseUrl}?id=${id}`, { method: "DELETE" }); },
  updatePosition(id, x, y) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_position", id, x, y }) }); },
  createLink(sourceId, targetId) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_link", source_id: sourceId, target_id: targetId }) }); },
  deleteLink(sourceId, targetId) { return this._fetch(`${this.baseUrl}?action=delete_link&source_id=${sourceId}&target_id=${targetId}`, { method: "DELETE" }); },
  getCategories() { return this._fetch(`${this.baseUrl}?action=get_categories`); },
  createCategory(data) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_category", ...data }) }); },
  assignCategory(entryId, categoryId) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign_category", entry_id: entryId, category_id: categoryId }) }); },
  getTags() { return this._fetch(`${this.baseUrl}?action=get_tags`); },
  createTag(data) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_tag", ...data }) }); },
  assignTag(entryId, tagId) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign_tag", entry_id: entryId, tag_id: tagId }) }); },
  unassignTag(entryId, tagId) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unassign_tag", entry_id: entryId, tag_id: tagId }) }); },
  getLocations() { return this._fetch(`${this.baseUrl}?action=get_locations`); },
  createLocation(data) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_location", ...data }) }); },
  moveEntryToGroup(entryId, groupId) { return this._fetch(this.baseUrl, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "move_to_group", id: entryId, group_id: groupId }) }); },
  getCalendarEntries() { return this._fetch(`${this.baseUrl}?action=get_calendar`); },
  uploadAttachment(entryId, file) { const fd = new FormData(); fd.append("entry_id", entryId); fd.append("file", file); return this._fetch(this.baseUrl, { method: "POST", body: fd }); },
  deleteAttachment(id) { return this._fetch(`${this.baseUrl}?action=delete_attachment&id=${id}`, { method: "DELETE" }); },
  getRoutineAll() { return this._fetch(`${this.baseUrl}?action=get_routine_all`); },
  getRoutineByDay(day) { return this._fetch(`${this.baseUrl}?action=get_routine_by_day&day=${day}`); },
  getRoutineCompletions(date) { return this._fetch(`${this.baseUrl}?action=get_routine_completions&date=${date}`); },
  getRoutineWeekSummary(weekStart) { return this._fetch(`${this.baseUrl}?action=get_routine_week_summary&week_start=${weekStart}`); },
  createRoutineItem(data) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_routine_item", ...data }) }); },
  updateRoutineItem(data) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_routine_item", ...data }) }); },
  deleteRoutineItem(id) { return this._fetch(`${this.baseUrl}?action=delete_routine_item&id=${id}`, { method: "DELETE" }); },
  toggleRoutineCompletion(routineItemId, date) { return this._fetch(this.baseUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle_routine_completion", routine_item_id: routineItemId, date }) }); },

  // ═══ Keresés ═══
  searchEntries(filters = {}) {
    const p = new URLSearchParams({ action: "search_entries" });
    if (filters.group_id)              p.set("group_id", filters.group_id);
    if (filters.title)                 p.set("title", filters.title);
    if (filters.content)               p.set("content", filters.content);
    if (filters.types?.length)         p.set("types", filters.types.join(","));
    if (filters.tag_ids?.length)       p.set("tag_ids", filters.tag_ids.join(","));
    if (filters.category_ids?.length)  p.set("category_ids", filters.category_ids.join(","));
    if (filters.date_type)             p.set("date_type", filters.date_type);
    if (filters.date_from)             p.set("date_from", filters.date_from);
    if (filters.date_to)               p.set("date_to", filters.date_to);
    if (filters.date_order)            p.set("date_order", filters.date_order);
    if (filters.location_ids?.length)  p.set("location_ids", filters.location_ids.join(","));
    if (filters.todo_statuses?.length) p.set("todo_statuses", filters.todo_statuses.join(","));
    if (filters.attachment_types?.length) p.set("attachment_types", filters.attachment_types.join(","));
    if (filters.group_ids?.length)     p.set("group_ids", filters.group_ids.join(","));
    return this._fetch(`${this.baseUrl}?${p.toString()}`);
  },
  getAttachmentTypes() { return this._fetch(`${this.baseUrl}?action=get_attachment_types`); },
};
