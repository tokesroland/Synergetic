<?php
// AuthController.php – Session alapú jogosultságkezelés
require_once 'config.php';

class AuthController {
    private $pdo;

    public function __construct() {
        global $host, $dbname, $username, $password;
        try {
            $this->pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(["error" => "Adatbázis hiba: " . $e->getMessage()]));
        }
    }

    // ─── Regisztráció ───────────────────────────────────────────────────────
    public function register($data) {
        $email    = trim($data['email']    ?? '');
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';

        // Validációk
        if (empty($email) || empty($username) || empty($password)) {
            throw new Exception("Minden mező kitöltése kötelező!");
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Érvénytelen email cím!");
        }
        if (strlen($username) < 3) {
            throw new Exception("A felhasználónév legalább 3 karakter legyen!");
        }
        if (strlen($password) < 6) {
            throw new Exception("A jelszó legalább 6 karakter legyen!");
        }

        // Egyediség ellenőrzés
        $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
        $stmt->execute([$email, $username]);
        if ($stmt->fetch()) {
            throw new Exception("Az email cím vagy felhasználónév már foglalt!");
        }

        // Beszúrás
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->pdo->prepare(
            "INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)"
        );
        $stmt->execute([$email, $username, $hash]);
        $userId = $this->pdo->lastInsertId();

        // Automatikus bejelentkezés
        $_SESSION['user_id']  = (int)$userId;
        $_SESSION['username'] = $username;
        $_SESSION['email']    = $email;

        return [
            "message"  => "Sikeres regisztráció!",
            "user"     => [
                "id"       => (int)$userId,
                "username" => $username,
                "email"    => $email
            ]
        ];
    }

    // ─── Bejelentkezés ──────────────────────────────────────────────────────
    public function login($data) {
        $identifier = trim($data['identifier'] ?? $data['email'] ?? $data['username'] ?? '');
        $password   = $data['password'] ?? '';

        if (empty($identifier) || empty($password)) {
            throw new Exception("Add meg a felhasználónevet/emailt és a jelszót!");
        }

        $stmt = $this->pdo->prepare(
            "SELECT id, email, username, password_hash FROM users WHERE email = ? OR username = ? LIMIT 1"
        );
        $stmt->execute([$identifier, $identifier]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new Exception("Hibás felhasználónév/email vagy jelszó!");
        }

        $_SESSION['user_id']  = (int)$user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email']    = $user['email'];

        return [
            "message" => "Sikeres bejelentkezés!",
            "user"    => [
                "id"       => (int)$user['id'],
                "username" => $user['username'],
                "email"    => $user['email']
            ]
        ];
    }

    // ─── Kijelentkezés ──────────────────────────────────────────────────────
    public function logout() {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        return ["message" => "Sikeres kijelentkezés!"];
    }

    // ─── Aktuális felhasználó ───────────────────────────────────────────────
    public function me() {
        if (empty($_SESSION['user_id'])) {
            return ["user" => null];
        }
        return [
            "user" => [
                "id"       => (int)$_SESSION['user_id'],
                "username" => $_SESSION['username'] ?? '',
                "email"    => $_SESSION['email']    ?? ''
            ]
        ];
    }

    // ─── Statikus segédfüggvény: be van-e jelentkezve? ──────────────────────
    public static function isLoggedIn() {
        return !empty($_SESSION['user_id']);
    }
}
