<?php
$servername = "localhost";
$username = "root"; // Tu usuario de MySQL en phpMyAdmin
$password = ""; // Déjalo vacío si usas XAMPP
$dbname = "monicakes"; // Nombre de tu base de datos

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("❌ Error de conexión: " . $conn->connect_error);
}

echo "✅ Conectado correctamente a la base de datos!";
$conn->close();
?>
