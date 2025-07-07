// --- 1. Importar Dependencias ---
// Se importan las librerías necesarias para el servidor, la base de datos y la subida de archivos.
const express = require('express');
const { Pool } = require('pg');      // Cliente de base de datos para PostgreSQL.
const multer = require('multer');  // Middleware para manejar la subida de archivos (fotos).
const path = require('path');      // Módulo de Node.js para trabajar con rutas de archivos.

// --- 2. Configuración Inicial de la Aplicación ---
const app = express();
const PORT = 3000;

// --- 3. Conexión a la Base de Datos PostgreSQL ---
// Se crea un "pool" de conexiones, que gestiona eficientemente las conexiones a la base de datos.
// Lee las credenciales desde las variables de entorno definidas en docker-compose.yml.
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
});

// Se realiza una consulta de prueba al iniciar para verificar que la conexión es exitosa.
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error de conexión a PostgreSQL:', err);
    return;
  }
  console.log('Conectado a PostgreSQL exitosamente.');
});

// --- 4. Middleware (Configuraciones para procesar peticiones) ---

// Middleware para que Express pueda entender los datos de un formulario (como el nuestro).
app.use(express.urlencoded({ extended: true }));

// Configuración de Multer para gestionar dónde y cómo se guardan las fotos subidas.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Los archivos se guardarán en la carpeta 'backend/uploads/'.
  },
  filename: (req, file, cb) => {
    // Se genera un nombre de archivo único usando la fecha actual para evitar sobreescribir archivos.
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- 5. Definición de Rutas (Endpoints de la API) ---

// Ruta raíz: muestra un mensaje de bienvenida.
app.get('/', (req, res) => {
  res.send('<h1>¡Bienvenido al Backend de la Plataforma de Mascotas!</h1>');
});

// Endpoint GET para obtener todos los reportes de la base de datos.
app.get('/reportes', (req, res) => {
  console.log('Solicitud para obtener todos los reportes...');

  const sql = 'SELECT * FROM reportes ORDER BY fecha_creacion DESC';

  pool.query(sql, (error, results) => {
    if (error) {
      console.error('Error al obtener los reportes:', error);
      return res.status(500).send('Hubo un error al consultar la base de datos.');
    }
    // Devuelve los resultados en formato JSON, que es el estándar para APIs.
    // La librería 'pg' guarda los resultados en la propiedad 'rows'.
    res.json(results.rows);
  });
});

// Endpoint POST para recibir los datos del formulario de reporte.
// El middleware 'upload.single('foto')' se ejecuta primero para procesar el archivo.
app.post('/reporte', upload.single('foto'), (req, res) => {
  console.log('Recibiendo nuevo reporte...');

  // Se extraen los datos del cuerpo de la petición (req.body).
  const {
    nombreInformante, correo, nombrePerro, raza, descripcion,
    tamano, collar, fechaExtravio, lugar
  } = req.body;
  
  // Se obtiene la ruta del archivo guardado. Si no se subió foto, será null.
  const fotoPath = req.file ? req.file.path : null;

  // Consulta SQL parametrizada para insertar los datos de forma segura.
  const sql = `
    INSERT INTO reportes (nombre_informante, correo, nombre_perro, raza, descripcion, tamano, collar, fecha_extravio, lugar, foto_path) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;
  const values = [
    nombreInformante, correo, nombrePerro, raza, descripcion,
    tamano, collar, fechaExtravio, lugar, fotoPath
  ];

  // Se ejecuta la consulta.
  pool.query(sql, values, (error, results) => {
    if (error) {
      console.error('Error al guardar el reporte:', error);
      return res.status(500).send('Hubo un error al procesar tu reporte.');
    }
    
    console.log('Reporte guardado exitosamente.');
    // Se envía una respuesta de éxito al navegador.
    res.send('<h1 style="font-family: sans-serif; text-align: center; margin-top: 50px;">¡Gracias! Tu reporte ha sido recibido.</h1>');
  });
});

// --- 6. Iniciar el Servidor ---
// La aplicación empieza a escuchar peticiones en el puerto definido.
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});