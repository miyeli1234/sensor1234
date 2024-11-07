// app.js
const express = require('express');
const http = require('http');
const port = process.env.PORT || 4000;
const mqtt = require('mqtt');
const { Server } = require("socket.io");
const tf = require('@tensorflow/tfjs'); // Usando '@tensorflow/tfjs'

// Configuración MQTT
const MQTT_SERVER = "mqtts://a632c67843b6481cb94e93b8053f29dd.s1.eu.hivemq.cloud";
const MQTT_PORT = 8883;
const MQTT_USER = "miye";
const MQTT_PASSWORD = "Miye1234";
const MQTT_TOPIC = "sensores/temperatura_humedad";

// Configurar Express y Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos de la carpeta "public"
app.use(express.static('public'));

// Variables para almacenar datos
let gateStatus = 'CERRADA'; // Estado inicial de la compuerta

// Función de normalización y escalado
/**
 * Escala y normaliza un valor en un rango específico a un valor entre 0 y 1.
 * @param {number} value - El valor a escalar y normalizar.
 * @param {number} scale - El factor de escala (peso) para la característica.
 * @param {number} min - El valor mínimo del rango original.
 * @param {number} max - El valor máximo del rango original.
 * @returns {number} El valor escalado y normalizado entre 0 y 1.
 */
function scaleAndNormalize(value, scale, min, max) {
  const scaled = value * scale; // Escalar el valor según el peso
  return (scaled - min) / (max - min); // Normalizar el valor
}

// Datos de entrenamiento (temperatura y humedad escaladas y normalizadas)
const trainingData = [
  // Temperaturas <=24°C (Salida: 0)
  { input: [scaleAndNormalize(20.00, 0.7, 0, 40), scaleAndNormalize(30.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(18.00, 0.7, 0, 40), scaleAndNormalize(35.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.00, 0.7, 0, 40), scaleAndNormalize(40.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(24.00, 0.7, 0, 40), scaleAndNormalize(45.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(19.00, 0.7, 0, 40), scaleAndNormalize(50.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(16.90, 0.7, 0, 40), scaleAndNormalize(35.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(17.00, 0.7, 0, 40), scaleAndNormalize(35.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(17.10, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(17.20, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(17.30, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(17.40, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(17.50, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(15.00, 0.7, 0, 40), scaleAndNormalize(50.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(14.00, 0.7, 0, 40), scaleAndNormalize(55.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(18.00, 0.7, 0, 40), scaleAndNormalize(40.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(19.00, 0.7, 0, 40), scaleAndNormalize(45.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(20.00, 0.7, 0, 40), scaleAndNormalize(50.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(21.00, 0.7, 0, 40), scaleAndNormalize(55.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.00, 0.7, 0, 40), scaleAndNormalize(60.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(23.00, 0.7, 0, 40), scaleAndNormalize(65.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(24.00, 0.7, 0, 40), scaleAndNormalize(70.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.60, 0.7, 0, 40), scaleAndNormalize(35.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.70, 0.7, 0, 40), scaleAndNormalize(35.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.70, 0.7, 0, 40), scaleAndNormalize(35.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(35.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(35.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(34.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(22.80, 0.7, 0, 40), scaleAndNormalize(47.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(23.00, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(23.30, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(23.60, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(23.90, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(24.20, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(24.40, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(24.60, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [0] },
  { input: [scaleAndNormalize(24.80, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [0] },

  // Temperaturas >24°C (Salida: 1)
  { input: [scaleAndNormalize(25.00, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.10, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.30, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.40, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.50, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.50, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.50, 0.7, 0, 40), scaleAndNormalize(93.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.60, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.60, 0.7, 0, 40), scaleAndNormalize(95.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.70, 0.7, 0, 40), scaleAndNormalize(96.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.80, 0.7, 0, 40), scaleAndNormalize(97.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(25.90, 0.7, 0, 40), scaleAndNormalize(98.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.00, 0.7, 0, 40), scaleAndNormalize(99.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.10, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.20, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.30, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.40, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.50, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.60, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.70, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.80, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(26.90, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.00, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.10, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.20, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.30, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.40, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.50, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.60, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.70, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.80, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(27.90, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(28.00, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(28.10, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(28.20, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(28.30, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
  { input: [scaleAndNormalize(28.40, 0.7, 0, 40), scaleAndNormalize(100.00, 0.3, 0, 100)], output: [1] },
];

// Preparar los datos para TensorFlow.js
const xs = tf.tensor2d(trainingData.map(d => d.input)); // Entradas escaladas y normalizadas
const ys = tf.tensor2d(trainingData.map(d => d.output)); // Salidas binarias

// Crear el modelo
const model = tf.sequential();
model.add(tf.layers.dense({ units: 10, inputShape: [2], activation: 'relu' })); // Capa oculta con 10 unidades
model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' })); // Capa de salida

// Compilar el modelo
model.compile({
  optimizer: 'adam',
  loss: 'binaryCrossentropy',
  metrics: ['accuracy']
});

// Entrenar el modelo
(async () => {
  await model.fit(xs, ys, {
    epochs: 200, // Incrementar las épocas para mejor aprendizaje
    verbose: 1, // Mostrar progreso del entrenamiento
    validationSplit: 0.2, // Usar el 20% de los datos para validación
    shuffle: true, // Mezclar los datos antes de cada época
  });
  console.log('Modelo entrenado');
})();

// Conectar al broker MQTT
const mqttOptions = {
  port: MQTT_PORT,
  username: MQTT_USER,
  password: MQTT_PASSWORD,
  rejectUnauthorized: false, // No verificar certificado (Inseguro)
};
const mqttClient = mqtt.connect(MQTT_SERVER, mqttOptions);

// Manejar mensajes MQTT
mqttClient.on('connect', () => {
  console.log('Conectado al broker MQTT');
  mqttClient.subscribe(MQTT_TOPIC, (err) => {
    if (!err) {
      console.log(`Suscrito al tópico ${MQTT_TOPIC}`);
    } else {
      console.error(`Error al suscribirse al tópico ${MQTT_TOPIC}:`, err);
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  if (topic === MQTT_TOPIC) {
    const payload = JSON.parse(message.toString());
    const temperatura = parseFloat(payload.temperatura);
    const humedad = parseFloat(payload.humedad);

    // Normalizar y escalar los datos usando la función de normalización
    const temperaturaNorm = scaleAndNormalize(temperatura, 0.7, 0, 21.7); // 0°C a 31°C escalado por 0.7
    const humedadNorm = scaleAndNormalize(humedad, 0.3, 0, 30); // 0% a 100% escalado por 0.3

    // Obtener respuesta del modelo
    const inputTensor = tf.tensor2d([[temperaturaNorm, humedadNorm]]);
    const outputTensor = model.predict(inputTensor);
    const output = await outputTensor.data();
    const respuesta = Math.round(output[0]); // Redondear a 0 o 1

    // Actualizar estado de la compuerta basado en temperatura
    if (temperatura > 25) { // Umbral de temperatura para abrir la compuerta
      gateStatus = 'ABIERTA';
    } else {
      gateStatus = 'CERRADA';
    }

    // Emitir datos a los clientes conectados
    io.emit('datos', {
      temperatura,
      humedad,
      fecha: new Date().toLocaleString(),
      respuesta,
      gateStatus,
    });
  }
});

mqttClient.on('error', (error) => {
  console.error("Error de conexión MQTT:", error);
});

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
  console.log('Cliente conectado');

  // Enviar estado inicial de la compuerta
  socket.emit('gateStatus', gateStatus);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

// Iniciar el servidor en el puerto 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
