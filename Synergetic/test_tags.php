<?php
/**
 * DEBUG: Entry-Tag reláció teljes vizsgálata  
 */
require_once 'config.php';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h2>📊 TELJES TAG-ENTRY RELÁCIÓ VIZSGÁLAT</h2>";
    
    // 1. Összes tag
    echo "<h3>1️⃣ Összes tag az adatbázisban:</h3>";
    $tags = $pdo->query("SELECT id, name FROM tags ORDER BY id")->fetchAll();
    echo "<p><strong>Összes tag: " . count($tags) . "</strong></p>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Név</th></tr>";
    foreach ($tags as $t) {
        echo "<tr><td>{$t['id']}</td><td>{$t['name']}</td></tr>";
    }
    echo "</table>";
    
    // 2. Entry-tag kapcsolatok - tagokenként
    echo "<h3>2️⃣ Entry-Tag kapcsolatok (tagonként):</h3>";
    foreach ($tags as $tag) {
        $connections = $pdo->query(
            "SELECT e.id, e.title FROM entry_tags et 
             JOIN entries e ON et.entry_id = e.id 
             WHERE et.tag_id = " . (int)$tag['id']
        )->fetchAll();
        
        echo "<strong>Tag: {$tag['name']} (ID: {$tag['id']}) → " . count($connections) . " entry</strong><br>";
        if (count($connections) > 0) {
            echo "<ul>";
            foreach ($connections as $conn) {
                echo "<li>Entry ID {$conn['id']}: {$conn['title']}</li>";
            }
            echo "</ul>";
        } else {
            echo "<em style='color:red;'>Nincs kapcsolat!</em><br>";
        }
    }
    
    // 3. Test SQL query - direkten futtatás
    echo "<h3>3️⃣ SQL Test - Budapest tag szűrésére:</h3>";
    $budapest_tag_id = $pdo->query("SELECT id FROM tags WHERE name = 'Budapest'")->fetch();
    if ($budapest_tag_id) {
        echo "<p>Budapest tag ID: " . $budapest_tag_id['id'] . "</p>";
        
        // Egyszerű JOIN teszt
        $result = $pdo->query("
            SELECT DISTINCT e.id, e.title 
            FROM entries e 
            INNER JOIN entry_tags et ON e.id = et.entry_id 
            WHERE et.tag_id = " . (int)$budapest_tag_id['id']
        )->fetchAll();
        
        echo "<p>Keresési eredmény count: " . count($result) . "</p>";
        if (count($result) > 0) {
            echo "<ul>";
            foreach ($result as $r) {
                echo "<li>Entry ID {$r['id']}: {$r['title']}</li>";
            }
            echo "</ul>";
        } else {
            echo "<em style='color:red;'>Nincs találat!</em>";
        }
    } else {
        echo "<p style='color:red;'>Budapest tag nem található!</p>";
    }
    
    echo "<hr>";
    echo "<p><strong>📝 Figyelmeztetés:</strong> Ha 0 encontrado az összes tag szűréséhez, akkor az entry_tags tábla nincsenek helyesen felépítve.</p>";
    
} catch (Exception $e) {
    echo "<p style='color:red;'><strong>HIBA:</strong> " . $e->getMessage() . "</p>";
}
?>
