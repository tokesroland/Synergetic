const API = {

    async loadGroups() {
        try {
            const response = await fetch('api.php?action=get_groups');
            return await response.json();
        } catch (err) {
            console.error("Hiba a csoportok betöltésekor:", err);
            return null;
        }
    },

    async loadGroupData(groupId) {
        try {
            const response = await fetch(`api.php?group_id=${groupId}`);
            return await response.json();
        } catch (err) {
            console.error("Hiba a betöltéskor:", err);
            return null;
        }
    },

    async createEntry(entryData) {
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entryData)
            });
            return await response.json();
        } catch (err) {
            console.error('Fetch hiba:', err);
            return { error: 'Hálózati hiba! Nem sikerült elérni a szervert.' };
        }
    },
    async createLink(sourceId, targetId) {
        try {
            const res = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create_link', source_id: sourceId, target_id: targetId })
            });
            return await res.json();
        } catch (err) { console.error(err); return { error: 'Hálózati hiba' }; }
    },

    async deleteLink(sourceId, targetId) {
        try {
            const res = await fetch(`api.php?action=delete_link&source_id=${sourceId}&target_id=${targetId}`, {
                method: 'DELETE'
            });
            return await res.json();
        } catch (err) { console.error(err); return { error: 'Hálózati hiba' }; }
    },

    async deleteEntry(id) {
        try {
            const res = await fetch(`api.php?action=delete_entry&id=${id}`, {
                method: 'DELETE'
            });
            return await res.json();
        } catch (err) { console.error(err); return { error: 'Hálózati hiba' }; }
    },
    async updatePosition(id, x, y) {
        try {
            await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_position', id: id, x: x, y: y })
            });
        } catch (err) { console.error("Hiba a pozíció mentésekor:", err); }
    },

    async getCategories() {
        try {
            const res = await fetch('api.php?action=get_categories');
            return await res.json();
        } catch (err) { console.error(err); return []; }
    },

    async getTags() {
        try {
            const res = await fetch('api.php?action=get_tags');
            return await res.json();
        } catch (err) { console.error(err); return []; }
    },

    async assignCategory(entryId, categoryId) {
        try {
            await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'assign_category', entry_id: entryId, category_id: categoryId })
            });
        } catch (err) { console.error(err); }
    },

    async assignTag(entryId, tagId) {
        try {
            await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'assign_tag', entry_id: entryId, tag_id: tagId })
            });
        } catch (err) { console.error(err); }
    }
};