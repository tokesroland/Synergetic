<?php
// config.php – Docker-kompatibilis konfiguráció

// Session indítása (jogosultságkezeléshez)
if (session_status() === PHP_SESSION_NONE) {
    // Cookie paraméterek beállítása mielőtt a session elindul
    session_set_cookie_params([
        'lifetime' => 0,            // Böngésző bezárásáig
        'path'     => '/',
        'domain'   => '',
        'secure'   => false,        // HTTPS esetén true-ra állítandó
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

function env(string $key, string $default): string {
    return $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key) ?: $default;
}

$host     = env('DB_HOST', 'localhost');
$username = env('DB_USER', 'root');
$password = env('DB_PASS', '');
$dbname   = env('DB_NAME', 'todo');

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password
    );
    $pdo->setAttribute(PDO::ATTR_ERRMODE,         PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die(json_encode(["error" => "Adatbázis kapcsolódási hiba: " . $e->getMessage()]));
}
?>
