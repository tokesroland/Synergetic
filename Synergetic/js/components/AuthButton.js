/**
 * AuthButton – Bejelentkezés / Kijelentkezés gomb
 *
 * Ha nincs bejelentkezve a user → "Bejelentkezés" felirat, kattintásra megnyitja az AuthModal-t login módban.
 * Ha be van jelentkezve → felhasználónév + "Kijelentkezés" felirat, kattintásra kijelentkezteti.
 *
 * A gomb a hamburger melletti üres területre kerül (a kép szerinti piros területre),
 * ezért fixed pozícióban van.
 */
const AuthButton = {
    template: "#tpl-auth-button",
    data() {
        return {
            loggingOut: false,
        };
    },
    computed: {
        store() { return Store; },
        isLoggedIn() { return Store.isLoggedIn; },
        username() { return Store.currentUser?.username || ''; },
    },
    methods: {
        openLogin() {
            Store.openAuthModal('login');
        },
        async logout() {
            if (this.loggingOut) return;
            this.loggingOut = true;
            try {
                await Store.logout();
            } finally {
                this.loggingOut = false;
            }
        },
    },
};
