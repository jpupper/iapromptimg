let equiposelect;
let isGenerating = false;
let progressInterval = null;
let currentStep = 0;
let totalSteps = 0;
let currentPromptId = null; // Variable para almacenar el ID del prompt actual
let uploadedImage = null; // Variable para almacenar la imagen cargada
let useSeed = false; // Variable para controlar si usar seed personalizada o aleatoria

// Variable para controlar si ya se mostró una imagen
let imageAlreadyDisplayed = false;

var host = '127.0.0.1:8080'; //ESTE ES EL QUE VA A TOUCHDESIGNER
socket = new WebSocket('ws://' + host);
socket.onerror = (error) => {
    console.error('TouchDesigner WebSocket error:', error);
};

document.addEventListener('DOMContentLoaded', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    equiposelect = urlParams.get("equipo");
    console.log("Equipo seleccionado:", equiposelect);
    
    // Inicializar el mejorador de prompts
    const promptImprover = new PromptImprover();
    
    // Evento para el botón de mejorar prompt
    document.getElementById('improveButton').addEventListener('click', async () => {
        const promptInput = document.getElementById('prompt');
        const originalPrompt = promptInput.value.trim();
        
        if (!originalPrompt) {
            console.error('Error: Prompt vacío. Por favor, ingrese un prompt antes de mejorarlo.');
            return;
        }
        
        try {
            // Mostrar indicador de carga
            const improveButton = document.getElementById('improveButton');
            const originalButtonText = improveButton.textContent;
            improveButton.textContent = 'Mejorando...';
            improveButton.disabled = true;
            
            // Llamar al servicio para mejorar el prompt
            const improvedPrompt = await promptImprover.improvePrompt(originalPrompt);
            
            // Actualizar el campo de texto con el prompt mejorado
            promptInput.value = improvedPrompt;
            
            // Restaurar el botón
            improveButton.textContent = originalButtonText;
            improveButton.disabled = false;
            
            // Enfocar el campo de texto
            promptInput.focus();
            
        } catch (error) {
            console.error('Error al mejorar el prompt:', error);
            
            // Restaurar el botón en caso de error
            const improveButton = document.getElementById('improveButton');
            improveButton.textContent = 'Mejorar';
            improveButton.disabled = false;
        }
    });
    
    // Fullscreen functionality
    const fullscreenButton = document.getElementById('fullscreenButton');
    
    fullscreenButton.addEventListener('click', () => {
        toggleFullScreen();
    });
    
    // Function to toggle fullscreen mode
    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen();
                document.body.classList.add('fullscreen');
            } else if (document.documentElement.mozRequestFullScreen) { // Firefox
                document.documentElement.mozRequestFullScreen();
                document.body.classList.add('fullscreen');
            } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari and Opera
                document.documentElement.webkitRequestFullscreen();
                document.body.classList.add('fullscreen');
            } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
                document.documentElement.msRequestFullscreen();
                document.body.classList.add('fullscreen');
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
                document.body.classList.remove('fullscreen');
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
                document.body.classList.remove('fullscreen');
            } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                document.webkitExitFullscreen();
                document.body.classList.remove('fullscreen');
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
                document.body.classList.remove('fullscreen');
            }
        }
    }
    
    // Listen for fullscreen change events to update the button visibility
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    function handleFullscreenChange() {
        if (!document.fullscreenElement && 
            !document.webkitFullscreenElement && 
            !document.mozFullScreenElement && 
            !document.msFullscreenElement) {
            // We've exited fullscreen, make sure the button is visible
            document.body.classList.remove('fullscreen');
        } else {
            // We've entered fullscreen, hide the button
            document.body.classList.add('fullscreen');
        }
    }
    
    // Keyboard event listener for 'k' key to toggle buttons visibility
    document.addEventListener('keydown', function(event) {
        // Tecla 'K' para mostrar/ocultar botones de navegación
        if (event.key === 'k' || event.key === 'K') {
            const galleryButton = document.getElementById('galleryButton');
            const fullscreenButton = document.getElementById('fullscreenButton');
            
            if (galleryButton) {
                galleryButton.classList.toggle('hidden');
            }
            
            if (fullscreenButton) {
                fullscreenButton.classList.toggle('hidden');
            }
        }
    });
    
    // Check if imageContainer exists
    if (!document.getElementById('imageContainer')) {
        console.error('imageContainer element not found in the DOM');
    }
    
    // Initialize slider value displays
    const stepsSlider = document.getElementById('steps');
    const stepsValue = document.getElementById('stepsValue');
    const cfgSlider = document.getElementById('cfg');
    const cfgValue = document.getElementById('cfgValue');
    const denoiseSlider = document.getElementById('denoise');
    const denoiseValue = document.getElementById('denoiseValue');
    const denoiseContainer = document.getElementById('denoiseContainer');
    const seedInput = document.getElementById('seed');
    const randomSeedBtn = document.getElementById('randomSeed');
    
    // Update the displayed values when sliders change
    stepsSlider.addEventListener('input', () => {
        stepsValue.textContent = stepsSlider.value;
    });
    
    cfgSlider.addEventListener('input', () => {
        cfgValue.textContent = parseFloat(cfgSlider.value).toFixed(1);
    });
    
    denoiseSlider.addEventListener('input', () => {
        denoiseValue.textContent = parseFloat(denoiseSlider.value).toFixed(2);
    });
    
    // Random seed button functionality
    randomSeedBtn.addEventListener('click', () => {
        // Generar un número aleatorio entre 1 y 18446744073709551615 (máximo para uint64)
        const randomSeed = Math.floor(Math.random() * 18446744073709551614) + 1;
        seedInput.value = randomSeed;
    });
    
    // Generate a random seed initially
    randomSeedBtn.click();
    
    // Image upload functionality
    const imageUpload = document.getElementById('imageUpload');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewImage = document.getElementById('previewImage');
    const removeImageBtn = document.getElementById('removeImage');
    
    imageUpload.addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const file = this.files[0];
            
            // Verificar que sea una imagen
            if (!file.type.match('image.*')) {
                console.error('Error: Por favor, seleccione una imagen válida.');
                return;
            }
            
            // Verificar tamaño (máximo 5MB)
            if (file.size > 5 * 1024 * 1024) {
                console.error('Error: La imagen es demasiado grande. El tamaño máximo es 5MB.');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                uploadPreview.style.display = 'block';
                uploadedImage = file; // Guardar la imagen para enviarla después
                console.log('Imagen cargada:', file.name);
                
                // Mostrar el control de denoise cuando hay una imagen cargada
                denoiseContainer.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        }
    });
    
    // Remover imagen
    removeImageBtn.addEventListener('click', function() {
        uploadPreview.style.display = 'none';
        imageUpload.value = ''; // Limpiar el input
        uploadedImage = null;
        console.log('Imagen removida');
        
        // Ocultar el control de denoise cuando se quita la imagen
        denoiseContainer.style.display = 'none';
    });
    
    // Advanced options toggle
    const advancedToggle = document.getElementById('advancedToggle');
    const advancedOptions = document.getElementById('advancedOptions');
    const arrowIcon = advancedToggle.querySelector('.arrow-icon');
    
    advancedToggle.addEventListener('click', () => {
        if (advancedOptions.style.display === 'none') {
            advancedOptions.style.display = 'block';
            arrowIcon.innerHTML = '&#9650;'; // Flecha hacia arriba
        } else {
            advancedOptions.style.display = 'none';
            arrowIcon.innerHTML = '&#9660;'; // Flecha hacia abajo
        }
    });
    
    // Back button functionality
    const backButton = document.getElementById('backButton');
    const generatorPanel = document.getElementById('generatorPanel');
    const resultPanel = document.getElementById('resultPanel');
    
    backButton.addEventListener('click', () => {
        resultPanel.style.display = 'none';
        generatorPanel.style.display = 'block';
    });
});

const imageContainer = document.getElementById('imageContainer');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressInfo = document.getElementById('progressInfo');
const ws = new WebSocket(`ws://${window.location.hostname}:${window.location.port}`);

ws.onopen = () => {
    console.log('WebSocket connection established with server');
};

ws.onerror = (error) => {
    console.error('Server WebSocket error:', error);
};

// Función para actualizar la barra de progreso
function updateProgressBar(step, total, status = null, message = null) {
    currentStep = step;
    const progress = Math.round((step / total) * 100);
    progressBar.style.width = `${progress}%`;
    
    // Si se proporciona un mensaje personalizado, usarlo
    if (message) {
        progressInfo.textContent = message;
    } else {
        // Mensaje predeterminado basado en el estado
        if (status === 'iniciando') {
            progressInfo.textContent = 'Iniciando generación...';
        } else if (status === 'procesando') {
            progressInfo.textContent = `Procesando imagen: ${step}/${total} (${progress}%)`;
        } else if (status === 'finalizando') {
            progressInfo.textContent = 'Finalizando generación...';
        } else if (status === 'cargando') {
            progressInfo.textContent = 'Cargando imagen generada...';
        } else {
            progressInfo.textContent = `Procesando imagen: ${step}/${total}`;
        }
    }
    
    console.log(`Actualizando progreso: ${step}/${total} (${progress}%) - Estado: ${status || 'desconocido'}`);
}

// Función para iniciar la simulación de progreso
function startProgressSimulation(steps) {
    currentStep = 0;
    totalSteps = steps;
    
    // Detener cualquier intervalo existente
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    // Iniciar con paso 0
    updateProgressBar(0, steps, 'iniciando');
    
    // Simular el progreso con un intervalo
    progressInterval = setInterval(() => {
        if (currentStep < totalSteps) {
            currentStep++;
            updateProgressBar(currentStep, totalSteps, 'procesando');
            
            // Si llegamos al último paso, detenemos la simulación pero mantenemos la barra
            if (currentStep >= totalSteps) {
                clearInterval(progressInterval);
            }
        }
    }, (30000 / totalSteps)); // Distribuir los pasos en aproximadamente 30 segundos
}

// Función para detener la simulación de progreso
function stopProgressSimulation() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

// Función para precargar una imagen y asegurarse de que esté completamente cargada
function preloadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        // Configurar propiedades de la imagen
        img.className = 'generated-image';
        img.alt = 'Imagen generada';
        
        // Esperar a que la imagen se cargue completamente
        img.onload = () => {
            console.log(`Imagen cargada correctamente: ${src}`);
            console.log(`Dimensiones: ${img.width}x${img.height}`);
            
            // Verificar que la imagen tenga dimensiones válidas
            if (img.width === 0 || img.height === 0) {
                console.warn('Imagen cargada con dimensiones inválidas, intentando nuevamente...');
                // Intentar cargar la imagen nuevamente con un nuevo timestamp
                const retryUrl = `${src.split('?')[0]}?t=${new Date().getTime()}`;
                const retryImg = new Image();
                retryImg.className = 'generated-image';
                retryImg.alt = 'Imagen generada';
                retryImg.onload = () => {
                    console.log(`Reintento exitoso: ${retryUrl}`);
                    console.log(`Nuevas dimensiones: ${retryImg.width}x${retryImg.height}`);
                    resolve(retryImg);
                };
                retryImg.onerror = () => reject(new Error(`Failed to load image on retry: ${retryUrl}`));
                retryImg.src = retryUrl;
                return;
            }
            
            // Si la imagen se cargó correctamente, resolver la promesa
            resolve(img);
        };
        
        img.onerror = (err) => {
            console.error('Error loading image:', src, err);
            // Try with absolute URL as fallback
            const absoluteUrl = `${window.location.origin}${src.split('?')[0]}?t=${new Date().getTime()}`;
            console.log('Trying with absolute URL:', absoluteUrl);
            
            const fallbackImg = new Image();
            fallbackImg.className = 'generated-image';
            fallbackImg.alt = 'Imagen generada';
            fallbackImg.onload = () => {
                console.log(`Imagen cargada con URL absoluta: ${absoluteUrl}`);
                console.log(`Dimensiones: ${fallbackImg.width}x${fallbackImg.height}`);
                resolve(fallbackImg);
            };
            fallbackImg.onerror = () => reject(new Error(`Failed to load image: ${src}`));
            fallbackImg.src = absoluteUrl;
        };
        
        // Iniciar la carga de la imagen
        img.src = src;
        
        // Asegurarse de que la imagen se cargue desde el servidor y no desde la caché
        img.setAttribute('crossOrigin', 'anonymous');
    });
}

ws.onmessage = (event) => {
    console.log('Mensaje WebSocket recibido:', event.data);
    try {
        const message = JSON.parse(event.data);
        console.log('Parsed message:', message);

        if (message.type === 'generation_progress') {
            console.log('Recibido mensaje de progreso real:', message);
            // Si recibimos un mensaje de progreso real, actualizamos con esos valores
            // y detenemos la simulación
            stopProgressSimulation();
            
            // Usar el mensaje personalizado si está disponible
            if (message.message) {
                updateProgressBar(message.step, message.total_steps, message.status, message.message);
            } else {
                updateProgressBar(message.step, message.total_steps, message.status);
            }
            
            // Guardar el ID del prompt para seguimiento
            if (message.prompt_id) {
                console.log(`Tracking prompt ID: ${message.prompt_id}`);
                currentPromptId = message.prompt_id;
            }
        }
        else if (message.type === 'generation_error') {
            console.error('Error en la generación:', message.message);
            
            // Detener la simulación de progreso
            stopProgressSimulation();
            
            // Mostrar mensaje de error en la barra de progreso
            updateProgressBar(0, 1, 'error', `Error: ${message.message}`);
            
            // Cambiar el estilo de la barra de progreso a rojo para indicar error
            progressBar.style.backgroundColor = '#e74c3c';
            
            // Después de 5 segundos, ocultar la barra de progreso y resetear el estado
            setTimeout(() => {
                progressContainer.style.display = 'none';
                progressBar.style.backgroundColor = '#3498db'; // Restaurar color original
                isGenerating = false;
            }, 5000);
        }
        else if (message.type === 'image_generated') {
            console.log('Image generated message received');
            console.log('Message equipo:', message.equipo);
            console.log('Selected equipo:', equiposelect);
            console.log('URL:', message.url);
            console.log('Prompt ID:', message.prompt_id);
            
            // Si ya mostramos una imagen, ignoramos este mensaje
            if (imageAlreadyDisplayed) {
                console.log('Ignorando mensaje adicional de imagen generada porque ya se mostró una imagen');
                return;
            }
            
            // Verificar que el prompt_id coincida con el que estamos esperando
            if (currentPromptId && message.prompt_id && currentPromptId !== message.prompt_id) {
                console.log(`Ignorando mensaje de imagen generada con prompt_id ${message.prompt_id} porque estamos esperando ${currentPromptId}`);
                return;
            }
            
            // Detener la simulación de progreso y mostrar 100%
            stopProgressSimulation();
            updateProgressBar(totalSteps, totalSteps, 'finalizando', 'Generación completada. Cargando imagen...');
            
            if (message.equipo === equiposelect) {
                // Sending message back to the server
                try {
                    socket.send(JSON.stringify({
                        type: 'terminoImagen',
                        prompt: message.prompt,
                        url: message.url,
                        remoteUrl: message.remoteUrl, // Add remote URL to the message
                        equipo: equiposelect,
                        prompt_id: message.prompt_id
                    }));
                    console.log('Sent terminoImagen message to TouchDesigner');
                } catch (socketError) {
                    console.error('Error sending message to TouchDesigner:', socketError);
                }
                
                console.log('Imagen generada:', message.url);
                console.log('Imagen en servidor remoto:', message.remoteUrl);
                console.log('Prompt:', message.prompt);

                // Crear un timestamp para evitar caché del navegador
                const timestamp = new Date().getTime();
                const imgSrc = `${message.url}?t=${timestamp}`;
                console.log('Image src with timestamp:', imgSrc);

                // Actualizar el estado de la barra de progreso
                updateProgressBar(totalSteps, totalSteps, 'cargando', 'Cargando imagen generada...');
                
                // Variable para controlar si ya se intentó cargar la imagen remota
                let triedRemoteImage = false;
                
                // Función para intentar cargar la imagen desde el servidor remoto
                const tryRemoteImage = () => {
                    if (message.remoteUrl && !triedRemoteImage) {
                        triedRemoteImage = true;
                        console.log('Intentando cargar imagen desde el servidor remoto:', message.remoteUrl);
                        
                        // Actualizar barra de progreso
                        updateProgressBar(totalSteps, totalSteps, 'cargando', 'Cargando imagen desde servidor remoto...');
                        
                        // Intentar cargar la imagen remota
                        const remoteImgSrc = `${message.remoteUrl}?t=${new Date().getTime()}`;
                        return preloadImage(remoteImgSrc)
                            .then(displayLoadedImage)
                            .catch(err => {
                                console.error('Error al cargar imagen remota:', err);
                                return Promise.reject(err);
                            });
                    }
                    return Promise.reject(new Error('No remote URL available or already tried'));
                };
                
                // Función para mostrar la imagen cargada
                const displayLoadedImage = (img) => {
                    console.log('Image fully loaded successfully');
                    
                    // Hide progress bar when generation is complete
                    isGenerating = false;
                    progressContainer.style.display = 'none';
                    
                    // Cambiar de panel cuando la imagen está lista
                    document.getElementById('generatorPanel').style.display = 'none';
                    document.getElementById('resultPanel').style.display = 'block';
                    
                    // Clear previous images and add the new one
                    imageContainer.innerHTML = '';
                    
                    // Asegurarse de que la imagen tenga dimensiones correctas
                    if (img.width > 0 && img.height > 0) {
                        img.style.maxWidth = '100%';
                        img.style.height = 'auto';
                        img.style.display = 'block';
                        img.style.margin = '0 auto';
                    }
                    
                    imageContainer.appendChild(img);
                    
                    // Mostrar el prompt utilizado
                    const promptDisplay = document.getElementById('promptDisplay');
                    promptDisplay.textContent = message.prompt;
                    
                    // Add remote URL link if available
                    if (message.remoteUrl) {
                        // Precargar el QR code antes de mostrarlo
                        preloadImage('img/qrcode.png')
                            .then(qrImg => {
                                qrImg.alt = 'QR Code';
                                qrImg.className = 'qr-image';
                                
                                // Add the QR code to the container
                                imageContainer.appendChild(qrImg);
                                
                                // Agregar un título para el QR
                                const qrTitle = document.createElement('p');
                                qrTitle.textContent = 'Escanea para ver tu imagen';
                                qrTitle.style.fontWeight = 'bold';
                                qrTitle.style.marginTop = '5px';
                                qrTitle.style.color = '#122b42';
                                imageContainer.appendChild(qrTitle);
                            })
                            .catch(err => {
                                console.error('Failed to load QR code:', err);
                            });
                    }
                    
                    // Marcar que ya se mostró una imagen
                    imageAlreadyDisplayed = true;
                    
                    return img;
                };
                
                // Precargar la imagen antes de mostrarla
                preloadImage(imgSrc)
                    .then(displayLoadedImage)
                    .catch(err => {
                        console.error('Failed to preload local image:', err);
                        
                        // Si falla la carga de la imagen local, intentar con la remota
                        return tryRemoteImage()
                            .catch(remoteErr => {
                                console.error('Failed to load both local and remote images:', remoteErr);
                                isGenerating = false;
                                progressContainer.style.display = 'none';
                                
                                // Mostrar un mensaje de error al usuario
                                console.error('No se pudo cargar la imagen. Por favor, intente nuevamente.');
                            });
                    });
            } else {
                console.log('Skipping image - not matching criteria');
            }
        }
    } catch (error) {
        console.error('Error processing WebSocket message:', error);
    }
};

// Función para enviar la solicitud de generación
function sendGenerationRequest(prompt, steps, cfg, imageFilename = null, seed = null, denoise = null) {
    console.log('Sending generarImagen request with prompt:', prompt, 'steps:', steps, 'cfg:', cfg, 'and equipo:', equiposelect);
    
    // Actualizar la barra de progreso para indicar que estamos iniciando
    updateProgressBar(0, steps, 'iniciando', 'Enviando solicitud de generación...');
    
    const requestData = { 
        type: 'generarImagen', 
        prompt, 
        steps,
        cfg,
        equipo: equiposelect,
        timestamp: Date.now() // Añadir timestamp para rastreo
    };
    
    // Si hay una imagen, agregar el nombre de archivo y el valor de denoise al request
    if (imageFilename) {
        requestData.imageFilename = imageFilename;
        
        // Solo enviar denoise si hay una imagen
        if (denoise) {
            requestData.denoise = denoise;
        }
    }
    
    // Si se proporciona una seed, agregarla al request
    if (seed) {
        requestData.seed = seed;
    }
    
    // Función para enviar el mensaje con reintentos
    const sendWithRetry = (retryCount = 0, maxRetries = 3) => {
        try {
            // Verificar si el WebSocket está abierto
            if (ws.readyState === WebSocket.OPEN) {
                // Enviar la solicitud
                ws.send(JSON.stringify(requestData));
                console.log('Solicitud enviada correctamente');
                
                // Actualizar el estado de la barra de progreso
                updateProgressBar(0, steps, 'iniciando', 'Solicitud enviada. Esperando respuesta...');
                
                // Iniciar la simulación de progreso mientras esperamos respuesta real
                startProgressSimulation(steps);
            } else {
                console.error('WebSocket no está abierto. Estado:', ws.readyState);
                if (retryCount < maxRetries) {
                    console.log(`Reintentando envío (${retryCount + 1}/${maxRetries})...`);
                    // Esperar un segundo antes de reintentar
                    setTimeout(() => sendWithRetry(retryCount + 1, maxRetries), 1000);
                } else {
                    console.error('Error de conexión. No se pudo enviar la solicitud después de varios intentos.');
                    isGenerating = false;
                    progressContainer.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error al enviar la solicitud:', error);
            if (retryCount < maxRetries) {
                console.log(`Reintentando envío (${retryCount + 1}/${maxRetries})...`);
                setTimeout(() => sendWithRetry(retryCount + 1, maxRetries), 1000);
            } else {
                console.error('Error al enviar la solicitud después de varios intentos.');
                isGenerating = false;
                progressContainer.style.display = 'none';
            }
        }
    };
    
    // Iniciar el envío con reintentos
    sendWithRetry();
}

document.getElementById('generateButton').addEventListener('click', () => {
    const prompt = document.getElementById('prompt').value;
    if (!prompt) {
        console.error('Error: Por favor, ingrese un prompt.');
        return;
    }
    
    if (isGenerating) {
        console.error('Error: Ya se está generando una imagen. Por favor espere.');
        return;
    }
    
    // Resetear la variable de control cuando se genera una nueva imagen
    imageAlreadyDisplayed = false;
    
    // Get slider values
    const steps = parseInt(document.getElementById('steps').value);
    const cfg = parseFloat(document.getElementById('cfg').value);
    
    // Get seed value
    const seedValue = parseInt(document.getElementById('seed').value);
    
    // Mostrar la barra de progreso
    isGenerating = true;
    progressContainer.style.display = 'block';
    
    // Verificar si hay una imagen cargada
    if (uploadedImage) {
        console.log('Generando imagen con referencia');
        
        // Obtener el valor de denoise
        const denoise = parseFloat(document.getElementById('denoise').value);
        
        // Crear un FormData para enviar la imagen
        const formData = new FormData();
        formData.append('image', uploadedImage);
        
        // Enviar la imagen al servidor
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Imagen subida:', data);
            
            // Enviar la solicitud de generación con la imagen de referencia
            sendGenerationRequest(prompt, steps, cfg, data.filename, seedValue, denoise);
        })
        .catch(error => {
            console.error('Error al subir la imagen:', error);
            console.error('Error al subir la imagen. Por favor, intente de nuevo.');
            isGenerating = false;
            progressContainer.style.display = 'none';
        });
    } else {
        console.log('Generando imagen sin referencia');
        
        // Si no hay imagen, generar directamente con txt2img
        sendGenerationRequest(prompt, steps, cfg, null, seedValue);
    }
});
