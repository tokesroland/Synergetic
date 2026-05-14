/**
 * AuthModal – Bejelentkezés / Regisztráció modal
 *
 * Két módban működik a Store.authModalMode érték alapján:
 *  - 'login'    → bejelentkezési form (azonosító + jelszó), alatta "Nincs fiókod? Regisztrálj."
 *  - 'register' → regisztrációs form (email + username + jelszó), alatta "Van fiókod? Jelentkezz be."
 *
 * A modal-overlay és modal-content osztályok már léteznek a style.css-ben.
 */
const AuthModal = {
    template: "#tpl-auth-modal",
    data() {
        return {
            // login
            loginIdentifier: "",
            loginPassword: "",
            // register
            regEmail: "",
            regUsername: "",
            regPassword: "",
            regPasswordConfirm: "",
            // állapotok
            submitting: false,
            errorMsg: "",
            successMsg: "",
        };
    },
    computed: {
        store() { return Store; },
        isOpen() { return Store.authModalOpen; },
        mode()   { return Store.authModalMode; },     // 'login' | 'register'
        isLogin()    { return Store.authModalMode === 'login'; },
        isRegister() { return Store.authModalMode === 'register'; },
        title() { return this.isLogin ? "Bejelentkezés" : "Regisztráció"; },
        submitLabel() {
            if (this.submitting) return this.isLogin ? "Bejelentkezés..." : "Regisztráció...";
            return this.isLogin ? "Bejelentkezés" : "Regisztráció";
        },
    },
    watch: {
        isOpen(val) {
            if (val) this.resetForm();
        },
        mode() {
            // mód váltáskor töröljük az üzeneteket
            this.errorMsg = "";
            this.successMsg = "";
        },
    },
    methods: {
        resetForm() {
            this.loginIdentifier = "";
            this.loginPassword = "";
            this.regEmail = "";
            this.regUsername = "";
            this.regPassword = "";
            this.regPasswordConfirm = "";
            this.errorMsg = "";
            this.successMsg = "";
            this.submitting = false;
        },
        close() {
            Store.closeAuthModal();
            this.resetForm();
        },
        switchToRegister() {
            this.errorMsg = "";
            this.successMsg = "";
            Store.authModalMode = 'register';
        },
        switchToLogin() {
            this.errorMsg = "";
            this.successMsg = "";
            Store.authModalMode = 'login';
        },
        async submit() {
            this.errorMsg = "";
            this.successMsg = "";
            this.submitting = true;
            try {
                if (this.isLogin) {
                    await this.doLogin();
                } else {
                    await this.doRegister();
                }
            } catch (e) {
                this.errorMsg = e.message || "Ismeretlen hiba történt.";
            } finally {
                this.submitting = false;
            }
        },
        async doLogin() {
            if (typeof ApiService.login !== 'function') {
                throw new Error("Az api.js elavult – frissítsd a fájlt és töröld a böngésző cache-t (Ctrl+F5)!");
            }
            if (!this.loginIdentifier.trim() || !this.loginPassword) {
                throw new Error("Add meg a felhasználónevet/emailt és a jelszót!");
            }
            const data = await ApiService.login({
                identifier: this.loginIdentifier.trim(),
                password: this.loginPassword,
            });
            if (!data) throw new Error("Hálózati hiba történt.");
            if (data.error) throw new Error(data.error);
            if (data.user) {
                Store.currentUser = data.user;
                this.successMsg = "Sikeres bejelentkezés!";
                setTimeout(() => this.close(), 600);
            }
        },
        async doRegister() {
            if (typeof ApiService.register !== 'function') {
                throw new Error("Az api.js elavult – frissítsd a fájlt és töröld a böngésző cache-t (Ctrl+F5)!");
            }
            if (!this.regEmail.trim() || !this.regUsername.trim() || !this.regPassword) {
                throw new Error("Minden mező kitöltése kötelező!");
            }
            if (this.regPassword.length < 6) {
                throw new Error("A jelszó legalább 6 karakter legyen!");
            }
            if (this.regPassword !== this.regPasswordConfirm) {
                throw new Error("A két jelszó nem egyezik!");
            }
            const data = await ApiService.register({
                email: this.regEmail.trim(),
                username: this.regUsername.trim(),
                password: this.regPassword,
            });
            if (!data) throw new Error("Hálózati hiba történt.");
            if (data.error) throw new Error(data.error);
            if (data.user) {
                Store.currentUser = data.user;
                this.successMsg = "Sikeres regisztráció!";
                setTimeout(() => this.close(), 600);
            }
        },
    },
};
