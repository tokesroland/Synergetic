<?php
// api.php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'EntryController.php';
require_once 'RoutineController.php';

$method      = $_SERVER['REQUEST_METHOD'];
$entryCtrl   = new EntryController();
$routineCtrl = new RoutineController();

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$isMultipart = strpos($contentType, 'multipart/form-data') !== false;

$input = [];
if (!$isMultipart && $method !== 'GET' && $method !== 'DELETE' && $method !== 'OPTIONS') {
    $raw   = file_get_contents("php://input");
    $input = json_decode($raw, true) ?? [];
}
try {
    switch ($method) {

        // ── GET ──────────────────────────────────────────────────────────────
        case 'GET':
            $action = $_GET['action'] ?? '';

            // Routine GET-ek
            if ($action === 'get_routine_all') {
                echo json_encode($routineCtrl->getAll());
            } elseif ($action === 'get_routine_by_day') {
                echo json_encode($routineCtrl->getByDay((int)($_GET['day'] ?? 1)));
            } elseif ($action === 'get_routine_completions') {
                $date = $_GET['date'] ?? date('Y-m-d');
                echo json_encode($routineCtrl->getCompletions($date));
            } elseif ($action === 'get_routine_week_summary') {
                $weekStart = $_GET['week_start'] ?? date('Y-m-d', strtotime('monday this week'));
                echo json_encode($routineCtrl->getWeekSummary($weekStart));

                // Entry GET-ek
            } elseif ($action === 'get_groups') {
                echo json_encode($entryCtrl->getGroups());
            } elseif ($action === 'get_calendar') {
                echo json_encode($entryCtrl->getCalendarEntries());
            } elseif ($action === 'get_categories') {
                echo json_encode($entryCtrl->getCategories());
            } elseif ($action === 'get_tags') {
                echo json_encode($entryCtrl->getTags());
            } elseif ($action === 'get_locations') {
                echo json_encode($entryCtrl->getLocations());
            } elseif (isset($_GET['entry_id'])) {
                $result = $entryCtrl->getOne((int)$_GET['entry_id']);
                if (!$result) {
                    http_response_code(404);
                    echo json_encode(["error" => "Nem talalhato"]);
                } else {
                    echo json_encode($result);
                }
            } else {
                echo json_encode($entryCtrl->getAllByGroup((int)($_GET['group_id'] ?? 1)));
            }
            break;

        // ── POST ─────────────────────────────────────────────────────────────
        case 'POST':
            if ($isMultipart) {
                $entryId = (int)($_POST['entry_id'] ?? 0);
                if (empty($_FILES['file'])) {
                    http_response_code(400);
                    echo json_encode(["error" => "Nincs feltöltött fájl."]);
                    break;
                }
                echo json_encode($entryCtrl->uploadAttachment($entryId, $_FILES['file']));
                break;
            }

            $action = $input['action'] ?? 'create_entry';

            switch ($action) {
                case 'create_routine_item':
                    echo json_encode($routineCtrl->create($input));
                    break;
                case 'update_routine_item':
                    echo json_encode($routineCtrl->update($input));
                    break;
                case 'toggle_routine_completion':
                    echo json_encode($routineCtrl->toggleCompletion(
                        (int)$input['routine_item_id'],
                        $input['date']
                    ));
                    break;
                case 'create_category':
                    echo json_encode($entryCtrl->createCategory($input));
                    break;
                case 'create_tag':
                    echo json_encode($entryCtrl->createTag($input));
                    break;
                case 'create_location':
                    echo json_encode($entryCtrl->createLocation($input));
                    break;
                case 'create_link':
                    echo json_encode($entryCtrl->createLink($input['source_id'], $input['target_id']));
                    break;
                case 'update_position':
                    echo json_encode($entryCtrl->updatePosition($input['id'], $input['x'], $input['y']));
                    break;
                case 'assign_category':
                    echo json_encode($entryCtrl->assignCategory($input['entry_id'], $input['category_id']));
                    break;
                case 'assign_tag':
                    echo json_encode($entryCtrl->assignTag($input['entry_id'], $input['tag_id']));
                    break;
                case 'unassign_tag':
                    echo json_encode($entryCtrl->unassignTag($input['entry_id'], $input['tag_id']));
                    break;
                default:
                    echo json_encode($entryCtrl->create($input));
            }
            break;
        // ── PUT ──────────────────────────────────────────────────────────────
        case 'PUT':
            $raw   = file_get_contents("php://input");
            $input = json_decode($raw, true) ?? [];
            echo json_encode($entryCtrl->update($input));
            break;

        // ── DELETE ───────────────────────────────────────────────────────────
        case 'DELETE':
            $action = $_GET['action'] ?? '';

            if ($action === 'delete_routine_item') {
                echo json_encode($routineCtrl->delete((int)$_GET['id']));
            } elseif ($action === 'delete_link') {
                echo json_encode($entryCtrl->deleteLink(
                    (int)$_GET['source_id'],
                    (int)$_GET['target_id']
                ));
            } elseif ($action === 'delete_entry') {
                echo json_encode($entryCtrl->deleteEntry((int)$_GET['id']));
            } elseif ($action === 'delete_attachment') {
                echo json_encode($entryCtrl->deleteAttachment((int)$_GET['id']));
            } else {
                http_response_code(400);
                echo json_encode(["error" => "Ervenytelen torlesi muvelet."]);
            }
            break;

        case 'OPTIONS':
            http_response_code(200);
            break;

        default:
            http_response_code(405);
            echo json_encode(["error" => "Modszer nem engedelyezett"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
