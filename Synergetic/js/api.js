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
    }
};