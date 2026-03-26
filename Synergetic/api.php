<?php
// api.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'EntryController.php';
require_once 'RoutineController.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"), true);
$controller = new EntryController();
$routineController = new RoutineController();

try {
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? '';

            // === ROUTINE ENDPOINTS ===
            if ($action === 'get_routine_all') {
                echo json_encode($routineController->getAll());
            } elseif ($action === 'get_routine_day') {
                echo json_encode($routineController->getByDay($_GET['day'] ?? 1));
            } elseif ($action === 'get_routine_item') {
                $result = $routineController->getOne($_GET['id']);
                if (!$result) {
                    http_response_code(404);
                    echo json_encode(["error" => "Rutin elem nem található"]);
                } else {
                    echo json_encode($result);
                }
            } elseif ($action === 'get_routine_completions') {
                echo json_encode($routineController->getCompletions($_GET['date'] ?? date('Y-m-d')));
            } elseif ($action === 'get_routine_week_summary') {
                echo json_encode($routineController->getWeekSummary($_GET['week_start'] ?? date('Y-m-d', strtotime('monday this week'))));
            }
            // === EXISTING ENDPOINTS ===
            elseif ($action === 'get_groups') {
                echo json_encode($controller->getGroups());
            } elseif ($action === 'get_calendar') {
                echo json_encode($controller->getCalendarEntries());
            } elseif (isset($_GET['entry_id'])) {
                $result = $controller->getOne($_GET['entry_id']);
                if (!$result) {
                    http_response_code(404); echo json_encode(["error" => "Nem található"]);
                } else {
                    echo json_encode($result);
                }
            } elseif ($action === 'get_categories') {
                echo json_encode($controller->getCategories());
            } elseif ($action === 'get_tags') {
                echo json_encode($controller->getTags());
            } else {
                echo json_encode($controller->getAllByGroup($_GET['group_id'] ?? 1));
            }
            break;

        case 'POST':
            $action = $input['action'] ?? 'create_entry';

            // === ROUTINE ENDPOINTS ===
            if ($action === 'create_routine_item') {
                echo json_encode($routineController->create($input));
            } elseif ($action === 'update_routine_item') {
                echo json_encode($routineController->update($input));
            } elseif ($action === 'toggle_routine_completion') {
                echo json_encode($routineController->toggleCompletion($input['routine_item_id'], $input['date']));
            }
            // === EXISTING ENDPOINTS ===
            elseif ($action === 'create_category') {
                echo json_encode($controller->createCategory($input));
            } elseif ($action === 'create_tag') {
                echo json_encode($controller->createTag($input));
            } elseif ($action === 'create_location') {
                echo json_encode($controller->createLocation($input));
            } elseif ($action === 'create_link') {
                echo json_encode($controller->createLink($input['source_id'], $input['target_id']));
            } elseif ($action === 'update_position') {
                echo json_encode($controller->updatePosition($input['id'], $input['x'], $input['y']));
            } elseif ($action === 'assign_category') {
                echo json_encode($controller->assignCategory($input['entry_id'], $input['category_id']));
            } elseif ($action === 'assign_tag') {
                echo json_encode($controller->assignTag($input['entry_id'], $input['tag_id']));
            } else {
                echo json_encode($controller->create($input));
            }
            break;

        case 'PUT':
            echo json_encode($controller->update($input));
            break;

        case 'DELETE':
            $action = $_GET['action'] ?? '';

            // === ROUTINE ENDPOINT ===
            if ($action === 'delete_routine_item') {
                echo json_encode($routineController->delete($_GET['id']));
            }
            // === EXISTING ENDPOINTS ===
            elseif ($action === 'delete_link') {
                echo json_encode($controller->deleteLink($_GET['source_id'], $_GET['target_id']));
            } elseif ($action === 'delete_entry') {
                echo json_encode($controller->deleteEntry($_GET['id']));
            } else {
                http_response_code(400); echo json_encode(["error" => "Érvénytelen törlési művelet."]);
            }
            break;

        case 'OPTIONS':
            http_response_code(200);
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Módszer nem engedélyezett"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
