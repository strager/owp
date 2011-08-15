<?php

// This script just stores whatever crash report is POSTed in a database.

require_once 'config.php';

function err() {
    header('HTTP/1.1 500 Internal Server Error');
    die();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    die();
}

$date = date('c');
$sourceIP = $_SERVER['REMOTE_ADDR'];
$reportText = file_get_contents('php://input');

// Put le data in le database
$db = new mysqli($dbHostname, $dbUsername, $dbPassword, $dbDatabase);
mysqli_connect_errno() and err();

$statement = $db->prepare('INSERT INTO reports (date, source_ip, report_text) VALUES (?, ?, ?)')
    or err();
$statement->bind_param('sss', $date, $sourceIP, $reportText);
$statement->execute() or err();
$statement->close();

$db->close();
