const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');
const socketIO = require('socket.io');
const axios = require('axios');
const multer = require('multer');

// Cargar configuración desde el archivo config.js
let config = {};
try {
    config = require('./config');
    console.log('Configuración cargada correctamente');
} catch (error) {
    console.error('Error al cargar el archivo config.js. Asegúrese de crear este archivo basado en config.example.js');
    console.error('Error:', error.message);
}

const ipglobal = "192.168.0.135"; //ESTA ES LA IP QUE VA AL COMFY
//const ipglobal = "127.0.0.1"; //ESTA ES LA IP QUE VA AL COMFY
const serverAddress = ipglobal + ":8188";
const clientId = uuidv4();

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

const port = 3000;
const server = http.createServer(app);
server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

const io = require('socket.io')(server);

const wss = new WebSocket.Server({ server });
const wsComfy = new WebSocket(`ws://${serverAddress}/ws?clientId=${clientId}`);

wsComfy.on('open', () => {
    console.log('WebSocket connection established');
});

const promptDetails = {};  // Modificado para almacenar detalles de prompt y equipo

wsComfy.on('message', async (data) => {
    const messageString = data.toString();
    console.log('WebSocket message received from ComfyUI:', messageString.substring(0, 200)); // Mostrar solo los primeros 200 caracteres para no saturar la consola

    try {
        const message = JSON.parse(messageString);
        
        // Manejar mensajes de progreso
        if (message.type === 'progress') {
            // Mensaje de progreso de la generación
            const promptId = message.data.prompt_id;
            console.log(`Progress update received: ${message.data.value}/${message.data.max} for Prompt ID: ${promptId}`);
            
            // Calcular el porcentaje de progreso
            const progress = Math.round((message.data.value / message.data.max) * 100);
            
            // Obtener los detalles del prompt para saber a qué equipo enviar la actualización
            const details = promptDetails[promptId];
            
            console.log(`Progress: ${progress}%, Prompt ID: ${promptId}, Details:`, details);
            
            if (details) {
                // Enviar actualización de progreso a los clientes del equipo correspondiente
                let clientsUpdated = 0;
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN && client.equipo === details.equipo) {
                        const progressMessage = {
                            type: 'generation_progress',
                            progress: progress,
                            step: message.data.value,
                            total_steps: message.data.max,
                            prompt_id: promptId,
                            equipo: details.equipo,
                            status: 'procesando',
                            message: `Generando imagen: ${message.data.value}/${message.data.max} (${progress}%)`
                        };
                        
                        console.log(`Sending progress update to client (equipo: ${client.equipo}):`, progressMessage);
                        client.send(JSON.stringify(progressMessage));
                        clientsUpdated++;
                    }
                });
                console.log(`Progress update sent to ${clientsUpdated} clients`);
            } else {
                console.log(`No details found for prompt ID: ${promptId}`);
            }
        }
        // Manejar mensajes de ejecución completada
        else if (message.type === 'executed') {
            const promptId = message.data.prompt_id;
            const details = promptDetails[promptId];
            
            if (!details) {
                console.log(`No details found for executed prompt ID: ${promptId}, skipping processing`);
                return;
            }
            
            console.log(`Execution completed for prompt ID: ${promptId} for team: ${details.equipo}`);

            // Notificar a los clientes que la generación ha finalizado
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN && client.equipo === details.equipo) {
                    const finishMessage = {
                        type: 'generation_progress',
                        progress: 100,
                        step: details.steps,
                        total_steps: details.steps,
                        prompt_id: promptId,
                        equipo: details.equipo,
                        status: 'finalizando',
                        message: 'Generación completada. Procesando imagen...'
                    };
                    
                    console.log(`Sending finish notification to client (equipo: ${client.equipo}):`, finishMessage);
                    client.send(JSON.stringify(finishMessage));
                }
            });

            const images = message.data.output.images;
            console.log('Images:', images);

            for (const image of images) {
                // Filtrar imágenes temporales (que contienen "temp_pfxfi" en el nombre)
                if (image.filename.includes('temp_pfxfi')) {
                    console.log(`Skipping temporary image: ${image.filename}`);
                    continue;
                }
                
                const subfolder = details.equipo ? `equipo${details.equipo}` : '';
                const imageUrl = `http://${serverAddress}/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${encodeURIComponent(image.type)}`;
                console.log('Downloading image from:', imageUrl);
                
                // Crear un nombre de archivo basado en el prompt
                const promptFileName = details.prompt
                    .trim()
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, '') // Eliminar caracteres especiales
                    .replace(/\s+/g, '_')     // Reemplazar espacios con guiones bajos
                    .substring(0, 50);        // Limitar a 50 caracteres para evitar rutas demasiado largas
                
                const fileExtension = path.extname(image.filename);
                const newFilename = `${promptFileName}${fileExtension}`;
                
                try {
                    const filename = path.join(__dirname, 'public', 'imagenes', subfolder, newFilename);
                    await downloadImage(imageUrl, filename, subfolder);
                    console.log(`Downloaded image: ${filename}`);
                    
                    // Guardar el prompt completo en un archivo de texto con el mismo nombre
                    const promptTextFilename = path.join(__dirname, 'public', 'imagenes', subfolder, `${promptFileName}.txt`);
                    fs.writeFileSync(promptTextFilename, details.prompt, 'utf8');
                    console.log(`Saved prompt to text file: ${promptTextFilename}`);
                    
                    // Upload the image to the remote server
                    const remoteUrl = await uploadToRemoteServer(filename, subfolder, details.equipo);
                    console.log(`Uploaded image to remote server: ${remoteUrl}`);

                    // También subir el archivo de texto con el prompt al servidor remoto
                    const remotePromptUrl = await uploadToRemoteServer(promptTextFilename, subfolder, details.equipo);
                    console.log(`Uploaded prompt text file to remote server: ${remotePromptUrl}`);

                    // Enviar notificación a los clientes
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN && client.equipo === details.equipo) {
                            client.send(JSON.stringify({
                                type: 'image_generated',
                                url: `/imagenes/${subfolder}/${newFilename}`,
                                remoteUrl: remoteUrl, // Add the remote URL to the message
                                equipo: details.equipo,
                                prompt: details.prompt,  // Envío del prompt original
                                prompt_id: promptId,
                                prompt_text: details.prompt // Envío del prompt completo
                            }));
                        }
                    });
                    
                    // Enviar email si se proporcionó una dirección de correo
                    if (details.userEmail && details.userEmail.trim() !== '') {
                        try {
                            console.log(`Enviando email a ${details.userEmail} con la imagen generada`);
                            
                            // Esperar a que la imagen esté disponible en el servidor remoto
                            // antes de enviar el correo electrónico
                            const emailData = {
                                email: details.userEmail,
                                name: details.userName || 'Usuario',
                                image_url: remoteUrl,
                                prompt: details.prompt
                            };
                            
                            // Llamar al script PHP para enviar el correo
                            const emailResponse = await axios.post('http://localhost:3000/send-email', emailData, {
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });
                            
                            console.log('Respuesta del servidor de correo:', emailResponse.data);
                            
                            if (emailResponse.data.success) {
                                console.log(`Email enviado correctamente a ${details.userEmail}`);
                            } else {
                                console.error(`Error al enviar email: ${emailResponse.data.message}`);
                            }
                        } catch (emailError) {
                            console.error('Error al enviar el correo electrónico:', emailError);
                        }
                    } else {
                        console.log('No se proporcionó dirección de correo electrónico, omitiendo envío de email');
                    }
                } catch (error) {
                    console.error('Error processing generated image:', error);
                    
                    // Notificar a los clientes sobre el error
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN && client.equipo === details.equipo) {
                            client.send(JSON.stringify({
                                type: 'generation_error',
                                message: 'Error al procesar la imagen generada',
                                equipo: details.equipo,
                                prompt_id: promptId
                            }));
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error parsing WebSocket message:', error);
    }
});

// Configuración de multer para almacenar archivos subidos
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const equipo = req.body.equipo || '';
        const uploadDir = path.join(__dirname, 'public', 'uploads', equipo);
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Solo se permiten imágenes'));
        }
        cb(null, true);
    }
});

// Ruta para subir imágenes
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se ha subido ninguna imagen' });
    }
    
    console.log('Imagen subida:', req.file);
    
    // Devolver la ruta del archivo
    res.json({
        success: true,
        filename: req.file.filename,
        path: req.file.path
    });
});

// Ruta para enviar correos electrónicos
app.post('/send-email', async (req, res) => {
    try {
        console.log('Solicitud de envío de correo recibida:', req.body);
        
        // Verificar que se recibieron los datos necesarios
        if (!req.body.image_url) {
            return res.status(400).json({
                success: false,
                message: 'Falta la URL de la imagen'
            });
        }
        
        // Llamar al script PHP para enviar el correo
        // Usar la ruta completa al script PHP
        const phpScriptPath = path.join(__dirname, 'send_mail.php');
        console.log('Ruta al script PHP:', phpScriptPath);
        
        // Verificar que el script PHP existe
        if (!fs.existsSync(phpScriptPath)) {
            console.error(`Error: El script PHP no existe en la ruta: ${phpScriptPath}`);
            return res.status(500).json({
                success: false,
                message: 'El script PHP no existe'
            });
        }
        
        // Ejecutar el script PHP usando child_process
        const { exec } = require('child_process');
        
        // Crear un archivo temporal con los datos JSON
        const tempDataFile = path.join(__dirname, `temp_mail_data_${Date.now()}.json`);
        fs.writeFileSync(tempDataFile, JSON.stringify(req.body), 'utf8');
        
        // Comando para ejecutar PHP con el archivo de datos como entrada
        const command = `php "${phpScriptPath}" "${tempDataFile}"`;
        
        exec(command, (error, stdout, stderr) => {
            // Eliminar el archivo temporal
            try {
                fs.unlinkSync(tempDataFile);
            } catch (unlinkError) {
                console.error('Error al eliminar archivo temporal:', unlinkError);
            }
            
            if (error) {
                console.error(`Error al ejecutar el script PHP: ${error.message}`);
                console.error(`stderr: ${stderr}`);
                return res.status(500).json({
                    success: false,
                    message: 'Error al ejecutar el script PHP',
                    error: error.message,
                    stderr: stderr
                });
            }
            
            console.log(`Salida del script PHP: ${stdout}`);
            
            try {
                // Intentar analizar la salida como JSON
                const phpResponse = JSON.parse(stdout);
                return res.json(phpResponse);
            } catch (parseError) {
                // Si no es JSON válido, devolver la salida como texto
                return res.json({
                    success: true,
                    message: 'Correo enviado (respuesta no es JSON)',
                    output: stdout
                });
            }
        });
    } catch (error) {
        console.error('Error al enviar el correo electrónico:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar el correo electrónico',
            error: error.message
        });
    }
});

wss.on('connection', async (ws, req) => {
    console.log('WebSocket client connected');
    ws.on('message', async (data) => {
        const message = JSON.parse(data);
        if (message.type === 'generarImagen') {
            console.log(`Prompt received: ${message.prompt}`);
            console.log(`Steps: ${message.steps}, CFG: ${message.cfg}`);
            ws.equipo = message.equipo;
            
            let promptId;
            if (message.imageFilename) {
                // Si se proporciona una imagen, usar img2img
                console.log(`Using img2img with image: ${message.imageFilename}`);
                const imagePath = path.join(__dirname, 'uploads', message.imageFilename);
                
                // Usar el valor de denoise si se proporciona, de lo contrario usar el valor predeterminado
                const denoise = message.denoise ? parseFloat(message.denoise) : 0.75;
                
                // Usar la seed proporcionada o generar una aleatoria
                const seed = message.seed ? parseInt(message.seed) : Math.floor(Math.random() * 18446744073709551614) + 1;
                
                promptId = await generarImagenConReferencia(
                    message.prompt, 
                    imagePath, 
                    message.equipo, 
                    message.steps, 
                    message.cfg, 
                    seed, 
                    denoise,
                    message.userName,
                    message.userEmail
                );
            } else {
                // Si no hay imagen, usar txt2img normal
                // Usar la seed proporcionada o generar una aleatoria
                const seed = message.seed ? parseInt(message.seed) : Math.floor(Math.random() * 18446744073709551614) + 1;
                
                promptId = await generarImagen(
                    message.prompt, 
                    message.equipo, 
                    message.steps, 
                    message.cfg, 
                    seed,
                    message.userName,
                    message.userEmail
                );
            }
            
            promptDetails[promptId] = { 
                equipo: message.equipo, 
                prompt: message.prompt, 
                userEmail: message.userEmail, 
                userName: message.userName 
            }; // Guarda equipo y prompt
        }
    });
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

io.on('connection', function(socket) {
    console.log('SOCKET IO');
    socket.on('slider change', function(data) {
        console.log('Slider value received: ', data);
        socket.broadcast.emit('slider update', data);
    });
    socket.on('disconnect', function() {
        console.log('User disconnected');
    });
});

async function readWorkflowAPI() {
    const data = await fs.promises.readFile(path.join(__dirname, 'workflow_api.json'), 'utf8');
    return JSON.parse(data);
}

async function uploadImage(filePath) {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(filePath));

    const options = {
        hostname: ipglobal,
        port: 8188,
        path: '/upload/image',
        method: 'POST',
        headers: formData.getHeaders()
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });
        req.on('error', (e) => reject(e));
        formData.pipe(req);
    });
}

async function queuePrompt(promptWorkflow) {
    const postData = JSON.stringify({ prompt: promptWorkflow, client_id: clientId });
    const options = {
        hostname: ipglobal,
        port: 8188,
        path: '/prompt',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve(JSON.parse(data).prompt_id);
            });
        });
        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

async function getHistory(promptId) {
    return new Promise((resolve, reject) => {
        http.get(`http://${serverAddress}/history/${promptId}`, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function downloadImage(url, filename, subfolder) {
    console.log(`Downloading image from ${url} to ${filename}`);
    
    // Crear directorio si no existe
    const dir = path.dirname(filename);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    try {
        // Usar axios para descargar la imagen
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream',
            timeout: 30000, // 30 segundos de timeout
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        // Verificar que la respuesta sea correcta
        if (response.status !== 200) {
            throw new Error(`Error downloading image: HTTP status ${response.status}`);
        }
        
        // Crear un stream de escritura
        const writer = fs.createWriteStream(filename);
        
        // Manejar eventos del stream
        return new Promise((resolve, reject) => {
            let fileSize = 0;
            
            // Manejar datos recibidos
            response.data.on('data', (chunk) => {
                fileSize += chunk.length;
            });
            
            // Manejar finalización de la descarga
            response.data.pipe(writer);
            
            // Manejar error en la escritura
            writer.on('error', (err) => {
                console.error(`Error writing file ${filename}:`, err);
                writer.close();
                reject(err);
            });
            
            // Manejar finalización de la escritura
            writer.on('finish', () => {
                console.log(`Image downloaded successfully to ${filename}, size: ${fileSize} bytes`);
                
                // Verificar que el archivo exista y tenga un tamaño válido
                fs.stat(filename, (err, stats) => {
                    if (err) {
                        console.error(`Error checking file stats for ${filename}:`, err);
                        reject(err);
                        return;
                    }
                    
                    if (stats.size === 0) {
                        const error = new Error(`Downloaded file ${filename} has zero size`);
                        console.error(error.message);
                        
                        // Eliminar el archivo vacío
                        fs.unlink(filename, (unlinkErr) => {
                            if (unlinkErr) {
                                console.error(`Error removing empty file ${filename}:`, unlinkErr);
                            }
                        });
                        
                        reject(error);
                        return;
                    }
                    
                    // Verificar que la imagen sea válida
                    try {
                        const fileBuffer = fs.readFileSync(filename);
                        const fileType = require('file-type');
                        
                        // Si el archivo no es una imagen válida, rechazar la promesa
                        if (!fileType.fromBuffer(fileBuffer)?.mime?.startsWith('image/')) {
                            const error = new Error(`Downloaded file ${filename} is not a valid image`);
                            console.error(error.message);
                            
                            // Eliminar el archivo inválido
                            fs.unlink(filename, (unlinkErr) => {
                                if (unlinkErr) {
                                    console.error(`Error removing invalid file ${filename}:`, unlinkErr);
                                }
                            });
                            
                            reject(error);
                            return;
                        }
                    } catch (validateErr) {
                        console.error(`Error validating image ${filename}:`, validateErr);
                        // Continuar a pesar del error de validación, ya que podría ser un problema con la biblioteca
                    }
                    
                    // Todo correcto, resolver la promesa
                    resolve(filename);
                });
            });
        });
    } catch (error) {
        console.error(`Error downloading image from ${url}:`, error);
        throw error;
    }
}

async function uploadToRemoteServer(localFilePath, subfolder, equipo) {
    try {
        const formData = new FormData();
        
        // Determinar si es un archivo de texto o una imagen basado en la extensión
        const fileExtension = path.extname(localFilePath).toLowerCase();
        const isTextFile = fileExtension === '.txt';
        
        // Agregar el archivo al FormData con el nombre de campo apropiado
        if (isTextFile) {
            formData.append('prompt_file', fs.createReadStream(localFilePath));
            // Agregar un campo adicional para indicar que es un archivo de prompt
            formData.append('is_prompt_file', 'true');
        } else {
            formData.append('image', fs.createReadStream(localFilePath));
        }
        
        // Add equipo parameter if available
        if (equipo) {
            formData.append('equipo', equipo);
        }
        
        const response = await axios.post('https://jeyder.com.ar/iaprompt/upload.php', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 30000 // 30 segundos de timeout
        });
        
        console.log('Upload response:', response.data);
        
        if (response.data && response.data.success) {
            // Notify the gallery about the new image - hacemos esto en un try/catch separado
            // para que no afecte al flujo principal si falla
            try {
                // Solo notificar a la galería si es una imagen, no un archivo de texto
                if (!isTextFile) {
                    await axios.post('https://jeyder.com.ar/iaprompt/api/notify.php', {
                        url: response.data.url,
                        prompt: promptDetails[response.data.prompt_id]?.prompt || '',
                        equipo: equipo || '',
                        timestamp: new Date().toISOString()
                    }, { timeout: 10000 }); // 10 segundos de timeout para la notificación
                    console.log('Gallery notification sent successfully');
                }
            } catch (notifyError) {
                console.error('Error notifying gallery:', notifyError.message);
                // No retornamos null aquí, continuamos con el flujo normal
            }
            
            return response.data.url;
        } else {
            console.error('Upload failed:', response.data ? response.data.message : 'Unknown error');
            return null;
        }
    } catch (error) {
        console.error('Error uploading to remote server:', error.message);
        // Si el error es un timeout pero el archivo existe localmente, podemos asumir que se subió correctamente
        // y construir la URL manualmente
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            const fileName = path.basename(localFilePath);
            const folderPath = subfolder ? `equipo${subfolder}/` : '';
            const estimatedUrl = `https://jeyder.com.ar/iaprompt/img/${folderPath}${fileName}`;
            console.log('Timeout occurred but returning estimated URL:', estimatedUrl);
            return estimatedUrl;
        }
        return null;
    }
}

async function generarImagen(promptText, equipo, steps = 25, cfg = 1.0, seed = null, userName = null, userEmail = null) {
    console.log(`Generating image for prompt: "${promptText}" with steps: ${steps}, cfg: ${cfg}, seed: ${seed || 'random'}`);
    console.log(`User info: Name: ${userName || 'Not provided'}, Email: ${userEmail || 'Not provided'}`);
    
    try {
        // Leer el workflow
        const workflow = await readWorkflowAPI();
        if (!workflow) {
            console.error('Error: No se pudo leer el workflow');
            return null;
        }
        
        // Modificar el workflow con los parámetros proporcionados
        // Nodo de prompt (6)
        if (workflow["6"] && workflow["6"]["inputs"]) {
            workflow["6"]["inputs"]["text"] = promptText;
        } else {
            console.error('Error: No se encontró el nodo de prompt (6) en el workflow');
            return null;
        }
        
        // Nodo KSampler (3)
        if (workflow["3"] && workflow["3"]["inputs"]) {
            // Establecer seed
            workflow["3"]["inputs"]["seed"] = seed || Math.floor(Math.random() * 18446744073709551614) + 1;
            
            // Establecer steps
            workflow["3"]["inputs"]["steps"] = parseInt(steps);
            
            // Establecer cfg
            workflow["3"]["inputs"]["cfg"] = parseFloat(cfg);
        } else {
            console.error('Error: No se encontró el nodo KSampler (3) en el workflow');
            return null;
        }
        
        // Configurar el prefijo del nombre de archivo si existe el nodo 9
        if (workflow["9"] && workflow["9"]["inputs"]) {
            workflow["9"]["inputs"]["filename_prefix"] = equipo ? `equipo${equipo}/ComfyUI` : "ComfyUI";
        }
        
        // Enviar el workflow modificado al servidor de ComfyUI
        const promptId = await queuePrompt(workflow);
        if (!promptId) {
            console.error('Error: No se pudo encolar el prompt');
            return null;
        }
        
        console.log(`Prompt ID: ${promptId}`);
        
        // Guardar los detalles del prompt para seguimiento
        promptDetails[promptId] = { 
            equipo, 
            prompt: promptText, 
            steps: parseInt(steps),
            userName: userName || '',
            userEmail: userEmail || ''
        };
        
        return promptId;
    } catch (error) {
        console.error('Error en generarImagen:', error);
        return null;
    }
}

// Nueva función para generar imagen con referencia (img2img)
async function generarImagenConReferencia(promptText, imagePath, equipo, steps = 25, cfg = 1.0, seed = null, denoise = 0.75, userName = null, userEmail = null) {
    console.log(`Generating image with reference for prompt: "${promptText}" with image: ${imagePath}`);
    console.log(`Parameters: steps: ${steps}, cfg: ${cfg}, seed: ${seed || 'random'}, denoise: ${denoise}`);
    console.log(`User info: Name: ${userName || 'Not provided'}, Email: ${userEmail || 'Not provided'}`);
    
    try {
        // Verificar que la imagen existe
        if (!fs.existsSync(imagePath)) {
            console.error(`Error: La imagen de referencia no existe en la ruta: ${imagePath}`);
            return null;
        }
        
        // Cargar la imagen y convertirla a base64
        const imageData = await uploadImage(imagePath);
        if (!imageData) {
            console.error('Error: No se pudo cargar la imagen de referencia');
            return null;
        }
        
        // Leer el workflow para img2img
        let img2imgWorkflow;
        try {
            const data = await fs.promises.readFile(path.join(__dirname, 'workflow_img2img.json'), 'utf8');
            img2imgWorkflow = JSON.parse(data);
        } catch (error) {
            console.error('Error al leer el workflow de img2img:', error);
            return null;
        }
        
        // Modificar el workflow con los parámetros proporcionados
        // Nodo de prompt (6)
        if (img2imgWorkflow["6"] && img2imgWorkflow["6"]["inputs"]) {
            img2imgWorkflow["6"]["inputs"]["text"] = promptText;
        } else {
            console.error('Error: No se encontró el nodo de prompt (6) en el workflow de img2img');
            return null;
        }
        
        // Nodo de carga de imagen (10)
        if (img2imgWorkflow["10"] && img2imgWorkflow["10"]["inputs"]) {
            img2imgWorkflow["10"]["inputs"]["image"] = imageData;
        } else {
            console.error('Error: No se encontró el nodo de carga de imagen (10) en el workflow de img2img');
            return null;
        }
        
        // Nodo KSampler (3)
        if (img2imgWorkflow["3"] && img2imgWorkflow["3"]["inputs"]) {
            // Establecer seed
            img2imgWorkflow["3"]["inputs"]["seed"] = seed || Math.floor(Math.random() * 18446744073709551614) + 1;
            
            // Establecer steps
            img2imgWorkflow["3"]["inputs"]["steps"] = parseInt(steps);
            
            // Establecer cfg
            img2imgWorkflow["3"]["inputs"]["cfg"] = parseFloat(cfg);
            
            // Establecer denoise
            img2imgWorkflow["3"]["inputs"]["denoise"] = parseFloat(denoise);
        } else {
            console.error('Error: No se encontró el nodo KSampler (3) en el workflow de img2img');
            return null;
        }
        
        // Configurar el prefijo del nombre de archivo si existe el nodo 9
        if (img2imgWorkflow["9"] && img2imgWorkflow["9"]["inputs"]) {
            img2imgWorkflow["9"]["inputs"]["filename_prefix"] = equipo ? `equipo${equipo}/ComfyUI` : "ComfyUI";
        }
        
        // Enviar el workflow modificado al servidor de ComfyUI
        const promptId = await queuePrompt(img2imgWorkflow);
        if (!promptId) {
            console.error('Error: No se pudo encolar el prompt de img2img');
            return null;
        }
        
        console.log(`Prompt ID for img2img: ${promptId}`);
        
        // Guardar los detalles del prompt para seguimiento
        promptDetails[promptId] = { 
            equipo, 
            prompt: promptText, 
            steps: parseInt(steps),
            userName: userName || '',
            userEmail: userEmail || ''
        };
        
        return promptId;
    } catch (error) {
        console.error('Error en generarImagenConReferencia:', error);
        return null;
    }
}
