<?php
// api.php v5
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'EntryController.php';
require_once 'RoutineController.php';
require_once 'SearchController.php';

$method      = $_SERVER['REQUEST_METHOD'];
$entryCtrl   = new EntryController();
$routineCtrl = new RoutineController();
$searchCtrl  = new SearchController();

$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$isMultipart = strpos($contentType, 'multipart/form-data') !== false;

$input = [];
if (!$isMultipart && $method !== 'GET' && $method !== 'DELETE' && $method !== 'OPTIONS') {
    $raw   = file_get_contents("php://input");
    $input = json_decode($raw, true) ?? [];
}
try {
    switch ($method) {
        case 'GET':
            $action = $_GET['action'] ?? '';

            switch ($action) {
                case 'search_entries':
                    $filters = [];
                    if (isset($_GET['group_id']))         $filters['group_id'] = (int)$_GET['group_id'];
                    if (isset($_GET['title']))            $filters['title'] = $_GET['title'];
                    if (isset($_GET['content']))          $filters['content'] = $_GET['content'];
                    if (isset($_GET['types']))            $filters['types'] = explode(',', $_GET['types']);
                    if (isset($_GET['tag_ids']))          $filters['tag_ids'] = array_map('intval', explode(',', $_GET['tag_ids']));
                    if (isset($_GET['category_ids']))     $filters['category_ids'] = array_map('intval', explode(',', $_GET['category_ids']));
                    if (isset($_GET['date_type']))        $filters['date_type'] = $_GET['date_type'];
                    if (isset($_GET['date_from']))        $filters['date_from'] = $_GET['date_from'];
                    if (isset($_GET['date_to']))          $filters['date_to'] = $_GET['date_to'];
                    if (isset($_GET['date_order']))       $filters['date_order'] = $_GET['date_order'];
                    if (isset($_GET['location_ids']))     $filters['location_ids'] = array_map('intval', explode(',', $_GET['location_ids']));
                    if (isset($_GET['todo_statuses']))    $filters['todo_statuses'] = explode(',', $_GET['todo_statuses']);
                    if (isset($_GET['attachment_types'])) $filters['attachment_types'] = explode(',', $_GET['attachment_types']);
                    if (isset($_GET['group_ids']))        $filters['group_ids'] = array_map('intval', explode(',', $_GET['group_ids']));
                    echo json_encode($searchCtrl->search($filters));
                    break;
                case 'get_attachment_types':
                    echo json_encode($searchCtrl->getAttachmentTypes());
                    break;
                case 'get_routine_all':
                    echo json_encode($routineCtrl->getAll());
                    break;
                case 'get_routine_by_day':
                    echo json_encode($routineCtrl->getByDay((int)($_GET['day'] ?? 1)));
                    break;
                case 'get_routine_completions':
                    echo json_encode($routineCtrl->getCompletions($_GET['date'] ?? date('Y-m-d')));
                    break;
                case 'get_routine_week_summary':
                    echo json_encode($routineCtrl->getWeekSummary($_GET['week_start'] ?? date('Y-m-d', strtotime('monday this week'))));
                    break;
                case 'get_groups':
                    echo json_encode($entryCtrl->getGroups());
                    break;
                case 'get_calendar':
                    echo json_encode($entryCtrl->getCalendarEntries());
                    break;
                case 'get_categories':
                    echo json_encode($entryCtrl->getCategories());
                    break;
                case 'get_tags':
                    echo json_encode($entryCtrl->getTags());
                    break;
                case 'get_locations':
                    echo json_encode($entryCtrl->getLocations());
                    break;
                default:
                    if (isset($_GET['entry_id'])) {
                        $result = $entryCtrl->getOne((int)$_GET['entry_id']);
                        if (!$result) { http_response_code(404); echo json_encode(["error" => "Nem talalhato"]); }
                        else echo json_encode($result);
                    } else {
                        echo json_encode($entryCtrl->getAllByGroup((int)($_GET['group_id'] ?? 1)));
                    }
                    break;
            }
            break;

        case 'POST':
            if ($isMultipart) {
                $entryId = (int)($_POST['entry_id'] ?? 0);
                if (empty($_FILES['file'])) { http_response_code(400); echo json_encode(["error" => "Nincs feltöltött fájl."]); break; }
                echo json_encode($entryCtrl->uploadAttachment($entryId, $_FILES['file']));
                break;
            }
            $action = $input['action'] ?? 'create_entry';
            switch ($action) {
                case 'update_entry': echo json_encode($entryCtrl->update($input)); break;
                case 'create_routine_item': echo json_encode($routineCtrl->create($input)); break;
                case 'update_routine_item': echo json_encode($routineCtrl->update($input)); break;
                case 'toggle_routine_completion': echo json_encode($routineCtrl->toggleCompletion((int)$input['routine_item_id'], $input['date'])); break;
                case 'create_category': echo json_encode($entryCtrl->createCategory($input)); break;
                case 'create_tag': echo json_encode($entryCtrl->createTag($input)); break;
                case 'create_location': echo json_encode($entryCtrl->createLocation($input)); break;
                case 'create_link': echo json_encode($entryCtrl->createLink($input['source_id'], $input['target_id'])); break;
                case 'update_position': echo json_encode($entryCtrl->updatePosition($input['id'], $input['x'], $input['y'])); break;
                case 'assign_category': echo json_encode($entryCtrl->assignCategory($input['entry_id'], $input['category_id'])); break;
                case 'assign_tag': echo json_encode($entryCtrl->assignTag($input['entry_id'], $input['tag_id'])); break;
                case 'unassign_tag': echo json_encode($entryCtrl->unassignTag($input['entry_id'], $input['tag_id'])); break;
                default: echo json_encode($entryCtrl->create($input));
            }
            break;

        case 'PUT':
            $raw = file_get_contents("php://input");
            $input = json_decode($raw, true) ?? [];
            $action = $input['action'] ?? 'update_entry';
            if ($action === 'move_to_group') {
                echo json_encode($entryCtrl->moveToGroup((int)$input['id'], (int)$input['group_id']));
            } else {
                echo json_encode($entryCtrl->update($input));
            }
            break;

        case 'DELETE':
            $action = $_GET['action'] ?? '';
            if ($action === 'delete_routine_item') echo json_encode($routineCtrl->delete((int)$_GET['id']));
            elseif ($action === 'delete_link') echo json_encode($entryCtrl->deleteLink((int)$_GET['source_id'], (int)$_GET['target_id']));
            elseif ($action === 'delete_entry') echo json_encode($entryCtrl->deleteEntry((int)$_GET['id']));
            elseif ($action === 'delete_attachment') echo json_encode($entryCtrl->deleteAttachment((int)$_GET['id']));
            else { http_response_code(400); echo json_encode(["error" => "Ervenytelen torlesi muvelet."]); }
            break;

        case 'OPTIONS': http_response_code(200); break;
        default: http_response_code(405); echo json_encode(["error" => "Modszer nem engedelyezett"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}
