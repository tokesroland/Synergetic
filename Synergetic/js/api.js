/**
 * Synergetic – API Service v7 (routine kivételkezelés támogatással)
 * – credentials: 'include' minden fetch hívásban (session cookie miatt)
 * – új: routine exceptions CRUD + getRoutineAll/getRoutineByDay forDate paraméter
 */
const ApiService = {
  baseUrl: "api.php",
  async _fetch(url, options = {}) {
    try {
      // Minden kéréshez automatikusan hozzáadjuk a credentials-t,
      // hogy a PHP session cookie utazzon a kérésekkel.
      const finalOptions = { credentials: "include", ...options };
      const res = await fetch(url, finalOptions);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error("[API]", err);
      return null;
    }
  },

  // ═══ AUTH ═══
  getCurrentUser() {
    return this._fetch(`${this.baseUrl}?action=auth_me`);
  },
  register(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth_register", ...data }),
    });
  },
  login(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth_login", ...data }),
    });
  },
  logout() {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth_logout" }),
    });
  },

  // ═══ Eredeti metódusok (változatlan) ═══
  loadGroups() {
    return this._fetch(`${this.baseUrl}?action=get_groups`);
  },
  loadGroupData(groupId) {
    return this._fetch(`${this.baseUrl}?group_id=${groupId}`);
  },
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
    return this._fetch(`${this.baseUrl}?action=delete_entry&id=${id}`, { method: "DELETE" });
  },
  updatePosition(id, x, y) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_position", id, x, y }),
    });
  },
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
  // ═══ Csoport CRUD ═══
  createGroup(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_group", ...data }),
    });
  },
  updateGroup(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_group", ...data }),
    });
  },
  deleteGroup(id) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_group", id }),
    });
  },
  bulkMoveToGroup(entryIds, groupId) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk_move_to_group", entry_ids: entryIds, group_id: groupId }),
    });
  },
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
  getCalendarEntries() {
    return this._fetch(`${this.baseUrl}?action=get_calendar`);
  },
  // ÚJ: archivált todo-k lekérése (Archívum nézet)
  getArchived() {
    return this._fetch(`${this.baseUrl}?action=get_archived`);
  },
  uploadAttachment(entryId, file) {
    const fd = new FormData();
    fd.append("entry_id", entryId);
    fd.append("file", file);
    return this._fetch(this.baseUrl, { method: "POST", body: fd });
  },
  deleteAttachment(id) {
    return this._fetch(`${this.baseUrl}?action=delete_attachment&id=${id}`, {
      method: "DELETE",
    });
  },

  // ═══ Rutin ═══
  // forDate    – csak aznap rutinjai, kivételek feloldva (napi nézet / mai lista)
  // weekStart  – egész hét, minden nap saját dátumán feloldva (heti nézet)
  // egyik sem  – nyers heti ütemezés (szerkesztéshez)
  getRoutineAll(forDate, weekStart) {
    const params = [];
    if (forDate)   params.push(`for_date=${forDate}`);
    if (weekStart) params.push(`week_start=${weekStart}`);
    const q = params.length ? "&" + params.join("&") : "";
    return this._fetch(`${this.baseUrl}?action=get_routine_all${q}`);
  },
  getRoutineByDay(day, forDate) {
    const q = forDate ? `&for_date=${forDate}` : "";
    return this._fetch(`${this.baseUrl}?action=get_routine_by_day&day=${day}${q}`);
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

  // ═══ ÚJ: Rutin kivételek (routine_exceptions) ═══
  getRoutineExceptions(routineItemId) {
    return this._fetch(
      `${this.baseUrl}?action=get_routine_exceptions&routine_item_id=${routineItemId}`,
    );
  },
  createRoutineException(data) {
    // data: { routine_item_id, occurrences, is_skip, new_day_of_week,
    //         new_start_time, new_end_time, created_on?, valid_until? }
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_routine_exception", ...data }),
    });
  },
  updateRoutineException(data) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_routine_exception", ...data }),
    });
  },
  deactivateRoutineException(id) {
    return this._fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate_routine_exception", id }),
    });
  },
  deleteRoutineException(id) {
    return this._fetch(
      `${this.baseUrl}?action=delete_routine_exception&id=${id}`,
      { method: "DELETE" },
    );
  },
  deactivateExpiredRoutineExceptions() {
    return this._fetch(
      `${this.baseUrl}?action=deactivate_expired_routine_exceptions`,
    );
  },

  // ═══ Keresés ═══
  searchEntries(filters = {}) {
    const p = new URLSearchParams({ action: "search_entries" });
    if (filters.group_id) p.set("group_id", filters.group_id);
    if (filters.title) p.set("title", filters.title);
    if (filters.content) p.set("content", filters.content);
    if (filters.types?.length) p.set("types", filters.types.join(","));
    if (filters.tag_ids?.length) p.set("tag_ids", filters.tag_ids.join(","));
    if (filters.category_ids?.length)
      p.set("category_ids", filters.category_ids.join(","));
    if (filters.date_type) p.set("date_type", filters.date_type);
    if (filters.date_from) p.set("date_from", filters.date_from);
    if (filters.date_to) p.set("date_to", filters.date_to);
    if (filters.date_order) p.set("date_order", filters.date_order);
    if (filters.location_ids?.length)
      p.set("location_ids", filters.location_ids.join(","));
    if (filters.todo_statuses?.length)
      p.set("todo_statuses", filters.todo_statuses.join(","));
    if (filters.attachment_types?.length)
      p.set("attachment_types", filters.attachment_types.join(","));
    if (filters.group_ids?.length)
      p.set("group_ids", filters.group_ids.join(","));
    return this._fetch(`${this.baseUrl}?${p.toString()}`);
  },
  getAttachmentTypes() {
    return this._fetch(`${this.baseUrl}?action=get_attachment_types`);
  },
  
};
