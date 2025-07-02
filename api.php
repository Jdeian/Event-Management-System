<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  exit(0);
}

$host = 'localhost';
$db = 'events';
$user = 'root';
$pass = '';

try {
  $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(["error" => "DB connection failed", "details" => $e->getMessage()]);
  exit;
}

function saveUploadedFile($fileKey = 'image') {
  if (!isset($_FILES[$fileKey]) || $_FILES[$fileKey]['error'] !== UPLOAD_ERR_OK) {
    return null;
  }

  $uploadsDir = __DIR__ . '/event-image';
  if (!is_dir($uploadsDir)) {
    if (!mkdir($uploadsDir, 0755, true)) {
      return null;
    }
  }

  $tmpName = $_FILES[$fileKey]['tmp_name'];
  $originalName = basename($_FILES[$fileKey]['name']);
  $ext = pathinfo($originalName, PATHINFO_EXTENSION);
  $filename = uniqid('img_', true) . '.' . $ext;
  $targetPath = $uploadsDir . '/' . $filename;

  if (move_uploaded_file($tmpName, $targetPath)) {
    return "event-image/$filename";
  }

  return null;
}

$id = isset($_GET['id']) ? intval($_GET['id']) : null;

switch ($_SERVER['REQUEST_METHOD']) {
  case 'GET':
    if ($id) {
      $stmt = $pdo->prepare("SELECT * FROM events WHERE id = ?");
      $stmt->execute([$id]);
      $event = $stmt->fetch(PDO::FETCH_ASSOC);
      if ($event) {
        echo json_encode($event);
      } else {
        http_response_code(404);
        echo json_encode(["error" => "Event not found"]);
      }
    } else {
      $stmt = $pdo->query("SELECT * FROM events ORDER BY date");
      $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
      echo json_encode($events);
    }
    break;

  case 'POST':
    $id = isset($_POST['id']) ? intval($_POST['id']) : null;
    $title = $_POST['title'] ?? '';
    $date = $_POST['date'] ?? '';
    $description = $_POST['description'] ?? '';
    $removeImage = isset($_POST['remove_image']) ? true : false;

    if (empty($title) || empty($date)) {
      http_response_code(400);
      echo json_encode(["error" => "Title and date are required"]);
      break;
    }

    if ($id) {
      $stmt = $pdo->prepare("SELECT url FROM events WHERE id = ?");
      $stmt->execute([$id]);
      $existing = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$existing) {
        http_response_code(404);
        echo json_encode(["error" => "Event not found"]);
        break;
      }

      $imageUrl = $existing['url'];
      $newImage = saveUploadedFile('image');

      if ($newImage) {
        if ($imageUrl && file_exists(__DIR__ . '/' . $imageUrl)) {
          unlink(__DIR__ . '/' . $imageUrl);
        }
        $imageUrl = $newImage;
      } elseif ($removeImage) {
        if ($imageUrl && file_exists(__DIR__ . '/' . $imageUrl)) {
          unlink(__DIR__ . '/' . $imageUrl);
        }
        $imageUrl = null;
      }

      $stmt = $pdo->prepare("UPDATE events SET title = ?, description = ?, date = ?, url = ? WHERE id = ?");
      $stmt->execute([$title, $description, $date, $imageUrl, $id]);

      echo json_encode([
        "message" => "Event updated",
        "id" => $id,
        "title" => $title,
        "description" => $description,
        "date" => $date,
        "url" => $imageUrl
      ]);
    } else {
      $imageUrl = saveUploadedFile('image');

      $stmt = $pdo->prepare("INSERT INTO events (title, description, date, url) VALUES (?, ?, ?, ?)");
      $stmt->execute([$title, $description, $date, $imageUrl]);
      $newId = $pdo->lastInsertId();

      echo json_encode([
        "id" => $newId,
        "title" => $title,
        "description" => $description,
        "date" => $date,
        "url" => $imageUrl
      ]);
    }
    break;

  case 'PUT':
    http_response_code(405);
    echo json_encode(["error" => "Use POST with 'id' for updating"]);
    break;

  case 'DELETE':
    if (!$id) {
      http_response_code(400);
      echo json_encode(["error" => "ID is required for deletion"]);
      break;
    }

    $stmt = $pdo->prepare("SELECT url FROM events WHERE id = ?");
    $stmt->execute([$id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($event && !empty($event['url'])) {
      $filePath = __DIR__ . '/' . $event['url'];
      if (file_exists($filePath)) {
        unlink($filePath);
      }
    }

    $stmt = $pdo->prepare("DELETE FROM events WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() > 0) {
      echo json_encode(["message" => "Event deleted"]);
    } else {
      http_response_code(404);
      echo json_encode(["error" => "Event not found"]);
    }
    break;

  default:
    http_response_code(405);
    echo json_encode(["error" => "Unsupported request method"]);
}
