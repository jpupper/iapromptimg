document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const apiUrl = 'api/images.php'; // Path to the API endpoint
    const notificationsUrl = 'api/check_notifications.php'; // Path to check for notifications
    const checkInterval = 5000; // Check for notifications every 5 seconds
    // URL base para las imágenes (cambiar a la URL del servidor en producción)
    const remoteBaseUrl = 'https://jeyder.com.ar/iaprompt'; // URL base del servidor remoto
    const useRemoteImages = true; // Cambiar a false para usar imágenes locales
    // Tiempo de visualización de la carta legendaria (en milisegundos)
    const legendaryCardDisplayTime = 5000;
    // Tiempo de visualización de cada imagen en modo automático (en milisegundos)
    const autoSlideshowInterval = 5000;
    
    // Elements
    const gallery = document.getElementById('gallery');
    const galleryContainer = document.querySelector('.gallery-container');
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    const closeModal = document.querySelector('.close-modal');
    
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
    
    // State
    let allImages = [];
    let notificationCheckTimer = null;
    let currentGalleryMode = 'default'; // 'default' o 'auto'
    let autoSlideshowTimer = null;
    let currentSlideIndex = 0;
    let isAutoSlideshowPlaying = true;
    
    // Initialize
    fetchImages();
    startNotificationCheck();
    
    // Create legendary card container
    const legendaryCardContainer = document.createElement('div');
    legendaryCardContainer.id = 'legendaryCardContainer';
    legendaryCardContainer.className = 'legendary-card-container';
    legendaryCardContainer.style.display = 'none';
    document.body.appendChild(legendaryCardContainer);
    
    // Create auto slideshow container
    const autoSlideshowContainer = document.createElement('div');
    autoSlideshowContainer.id = 'autoSlideshowContainer';
    autoSlideshowContainer.className = 'auto-slideshow-container';
    autoSlideshowContainer.style.display = 'none';
    
    // Create auto slideshow controls
    const autoSlideshowControls = document.createElement('div');
    autoSlideshowControls.className = 'auto-slideshow-controls';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'slideshow-nav-button prev-button';
    prevButton.innerHTML = '&#10094;';
    prevButton.addEventListener('click', showPreviousSlide);
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'slideshow-nav-button next-button';
    nextButton.innerHTML = '&#10095;';
    nextButton.addEventListener('click', showNextSlide);
    
    // Auto play checkbox container
    const autoPlayContainer = document.createElement('div');
    autoPlayContainer.className = 'auto-play-container';
    
    // Auto play checkbox
    const autoPlayCheckbox = document.createElement('input');
    autoPlayCheckbox.type = 'checkbox';
    autoPlayCheckbox.id = 'autoPlayCheckbox';
    autoPlayCheckbox.checked = isAutoSlideshowPlaying;
    autoPlayCheckbox.addEventListener('change', toggleAutoSlideshow);
    
    // Auto play label
    const autoPlayLabel = document.createElement('label');
    autoPlayLabel.htmlFor = 'autoPlayCheckbox';
    autoPlayLabel.textContent = 'Reproducción automática';
    
    // Append controls
    autoPlayContainer.appendChild(autoPlayCheckbox);
    autoPlayContainer.appendChild(autoPlayLabel);
    autoSlideshowControls.appendChild(prevButton);
    autoSlideshowControls.appendChild(autoPlayContainer);
    autoSlideshowControls.appendChild(nextButton);
    
    // Create slides container
    const slidesContainer = document.createElement('div');
    slidesContainer.className = 'slides-container';
    
    // Append to main container
    autoSlideshowContainer.appendChild(slidesContainer);
    autoSlideshowContainer.appendChild(autoSlideshowControls);
    
    // Agregar el contenedor de slideshow al contenedor principal
    // Reemplazamos el contenido de la galería en lugar de agregar el slideshow como un elemento adicional
    gallery.parentNode.insertBefore(autoSlideshowContainer, gallery.nextSibling);
    
    // Close modal when clicking the X
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside the image
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Mejorar la visualización de imágenes en el modal
    modalImg.addEventListener('load', function() {
        // Asegurar que la imagen se ajuste correctamente dentro del modal
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        
        // Ajustar el tamaño máximo de la imagen según el tamaño de la ventana
        if (this.naturalHeight > this.naturalWidth) {
            // Imagen vertical
            this.style.maxHeight = (windowHeight * 0.6) + 'px';
            this.style.maxWidth = 'auto';
        } else {
            // Imagen horizontal
            this.style.maxWidth = (windowWidth * 0.7) + 'px';
            this.style.maxHeight = 'auto';
        }
    });
    
    // Agregar evento para abrir la imagen en el modal
    // card.addEventListener('click', function(e) {
    //     // Evitar que se active el botón de descarga al hacer clic en la tarjeta
    //     if (e.target !== downloadBtn) {
    //         modal.style.display = 'block';
    //         modalImg.src = image.url;
    //         modalCaption.textContent = image.prompt || 'Imagen generada por IA';
            
    //         // Asegurar que la cruz de cierre sea visible
    //         document.querySelector('.close-modal').style.display = 'flex';
            
    //         // Asegurar que el caption sea visible
    //         modalCaption.style.display = 'block';
    //     }
    // });
    
    // Keyboard event listeners
    document.addEventListener('keydown', async function(event) {
        // Tecla 'F' para activar/desactivar pantalla completa
        if (event.key === 'f' || event.key === 'F') {
            toggleFullScreen();
        }
        
        // Tecla 'o' para mostrar la carta legendaria con la última imagen
        if (event.key === 'o' || event.key === 'O') {
            if (allImages.length > 0) {
                await showLegendaryCard(allImages[0]);
            }
        }
        
        // Tecla '1' para activar el modo de galería por defecto
        if (event.key === '1') {
            await setGalleryMode('default');
        }
        
        // Tecla '2' para activar el modo de galería automático
        if (event.key === '2') {
            await setGalleryMode('auto');
        }
        
        // Tecla 'K' para mostrar/ocultar botones de navegación
        if (event.key === 'k' || event.key === 'K') {
            const generatorButton = document.getElementById('generatorButton');
            const fullscreenButton = document.getElementById('fullscreenButton');
            
            if (generatorButton) {
                generatorButton.classList.toggle('hidden');
            }
            
            if (fullscreenButton) {
                fullscreenButton.classList.toggle('hidden');
            }
        }
        
        // En modo automático, teclas de flecha para navegar
        if (currentGalleryMode === 'auto') {
            if (event.key === 'ArrowLeft') {
                showPreviousSlide();
            } else if (event.key === 'ArrowRight') {
                showNextSlide();
            }
        }
    });
    
    // Functions
    function startNotificationCheck() {
        // Clear any existing timer
        if (notificationCheckTimer) {
            clearInterval(notificationCheckTimer);
        }
        
        // Set up check interval
        notificationCheckTimer = setInterval(checkForNotifications, checkInterval);
        console.log('Started checking for notifications every', checkInterval/1000, 'seconds');
        
        // Verificar inmediatamente al cargar la página
        checkForNotifications();
    }
    
    function checkForNotifications() {
        // Make a request to check for new notifications
        fetch(notificationsUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al verificar notificaciones');
                }
                return response.json();
            })
            .then(async data => {
                if (!data.success) {
                    console.error('Error en la respuesta de notificaciones:', data.message);
                    return;
                }
                
                // Check if there are any unread notifications
                if (data.notifications && data.notifications.length > 0) {
                    console.log('Nuevas notificaciones encontradas:', data.notifications.length);
                    
                    // Process each notification
                    const notificationIds = [];
                    const newImages = [];
                    
                    // Procesar cada notificación de forma asíncrona
                    for (const notification of data.notifications) {
                        // Add to our list of IDs to mark as read
                        notificationIds.push(notification.id);
                        
                        // Asegurarse de que la URL sea válida
                        let imageUrl = notification.url;
                        
                        // Si la URL no comienza con http o https, asumimos que es una ruta relativa
                        if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                            // Si no comienza con /, agregarlo
                            if (!imageUrl.startsWith('/')) {
                                imageUrl = '/' + imageUrl;
                            }
                            
                            // Construir URL completa
                            const baseUrl = window.location.origin;
                            imageUrl = baseUrl + imageUrl;
                        }
                        
                        // Intentar cargar el prompt completo desde el archivo de texto
                        let promptText = notification.prompt_text || notification.prompt;
                        
                        try {
                            // Construir la URL del archivo de texto
                            const promptFileUrl = `${imageUrl.substring(0, imageUrl.lastIndexOf('.'))}.txt`;
                            console.log('Intentando cargar prompt desde:', promptFileUrl);
                            
                            const textResponse = await fetch(promptFileUrl);
                            if (textResponse.ok) {
                                promptText = await textResponse.text();
                                console.log('Prompt cargado desde archivo de texto:', promptText);
                            } else {
                                throw new Error('No se encontró el archivo de texto');
                            }
                        } catch (error) {
                            console.log('No se pudo cargar el archivo de texto, usando fallback:', error);
                            
                            // Si no se puede cargar el archivo de texto o no hay prompt, usar el nombre del archivo
                            if (!promptText) {
                                const urlParts = imageUrl.split('/');
                                const fileName = urlParts[urlParts.length - 1];
                                // Eliminar la extensión del archivo
                                const fileWithoutExtension = fileName.split('.')[0];
                                promptText = fileWithoutExtension.replace(/[-_]/g, ' ')
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');
                            }
                        }
                        
                        console.log('URL de imagen procesada:', imageUrl);
                        console.log('Prompt final:', promptText);
                        
                        // Create image object
                        const newImage = {
                            url: imageUrl,
                            prompt: promptText,
                            prompt_text: promptText, // Guardar el prompt completo
                            equipo: notification.equipo,
                            timestamp: notification.timestamp
                        };
                        
                        // Log para depuración
                        console.log('Nueva imagen recibida:', newImage);
                        
                        newImages.push(newImage);
                    }
                    
                    // Add new images to our collection
                    if (newImages.length > 0) {
                        allImages = [...newImages, ...allImages];
                        
                        // Mostrar la última imagen como carta legendaria
                        await showLegendaryCard(newImages[0]);
                        
                        // Marcar notificaciones como leídas inmediatamente
                        markNotificationsAsRead(notificationIds);
                        
                        // Si estamos en modo automático, actualizar el slideshow
                        if (currentGalleryMode === 'auto') {
                            await updateAutoSlideshowSlides();
                        }
                    }
                }
                
                // Verificar si hay nuevas imágenes en el servidor (fuera del sistema de notificaciones)
                checkForNewImages();
            })
            .catch(error => {
                console.error('Error checking for notifications:', error);
            });
    }
    
    function markNotificationsAsRead(ids) {
        if (!ids || ids.length === 0) return;
        
        // Send request to mark notifications as read
        fetch(notificationsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mark_read: ids
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Notificaciones marcadas como leídas:', data.marked_read);
        })
        .catch(error => {
            console.error('Error al marcar notificaciones como leídas:', error);
        });
    }
    
    async function fetchImages() {
        try {
            showLoading(true);
            
            // Fetch images from the API
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Error al obtener las imágenes del servidor');
            }
            
            const rawImages = await response.json();
            
            // Procesar cada imagen para asegurarse de que tengan URLs válidas y nombres extraídos
            const processedImages = [];
            
            for (const image of rawImages) {
                // Asegurarse de que la URL sea válida
                let imageUrl = image.url;
                
                // Si useRemoteImages está activado, usar la URL remota para las imágenes
                if (useRemoteImages) {
                    // Si la URL no comienza con http o https, asumimos que es una ruta relativa
                    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                        // Eliminar la barra inicial si existe
                        if (imageUrl.startsWith('/')) {
                            imageUrl = imageUrl.substring(1);
                        }
                        
                        // Construir URL completa con la base remota
                        imageUrl = `${remoteBaseUrl}/${imageUrl}`;
                    }
                } else {
                    // Comportamiento original para modo local
                    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                        // Si no comienza con /, agregarlo
                        if (!imageUrl.startsWith('/')) {
                            imageUrl = '/' + imageUrl;
                        }
                        
                        // Construir URL completa con origen local
                        const baseUrl = window.location.origin;
                        imageUrl = baseUrl + imageUrl;
                    }
                }
                
                // Intentar cargar el archivo de texto con el prompt completo
                let promptText = image.prompt;
                
                if (!promptText || promptText.trim() === '') {
                    // Intentar cargar el archivo de texto
                    try {
                        const promptFileUrl = `${imageUrl.substring(0, imageUrl.lastIndexOf('.'))}.txt`;
                        const textResponse = await fetch(promptFileUrl);
                        if (textResponse.ok) {
                            promptText = await textResponse.text();
                        } else {
                            throw new Error('Archivo de texto no encontrado');
                        }
                    } catch (error) {
                        console.log('No se encontró archivo de texto para:', imageUrl);
                        // Si no se puede cargar el archivo de texto, extraer del nombre de archivo
                        const urlParts = imageUrl.split('/');
                        const fileName = urlParts[urlParts.length - 1];
                        const fileWithoutExtension = fileName.split('.')[0];
                        promptText = fileWithoutExtension.replace(/[-_]/g, ' ')
                            .split(' ')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                    }
                }
                
                processedImages.push({
                    ...image,
                    url: imageUrl,
                    prompt: promptText
                });
            }
            
            allImages = processedImages;
            renderGallery();
            
        } catch (error) {
            console.error('Error fetching images:', error);
            gallery.innerHTML = '<div class="error">Error al cargar las imágenes. Por favor, intenta de nuevo más tarde.</div>';
        } finally {
            showLoading(false);
        }
    }
    
    function renderGallery() {
        // Clear gallery
        gallery.innerHTML = '';
        
        if (allImages.length === 0) {
            gallery.innerHTML = '<div class="no-results">No se encontraron imágenes.</div>';
            return;
        }
        
        // Sort images by newest first (assuming each image has a timestamp)
        allImages.sort((a, b) => {
            return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        });
        
        // Create a Set to track unique image URLs
        const uniqueUrls = new Set();
        
        // Create and append image cards (only for unique images)
        allImages.forEach(image => {
            // Skip if we've already added this URL
            if (uniqueUrls.has(image.url)) {
                return;
            }
            
            // Add URL to our tracking set
            uniqueUrls.add(image.url);
            
            const card = createImageCard(image);
            gallery.appendChild(card);
        });
    }
    
    function createImageCard(image) {
        const card = document.createElement('div');
        card.className = 'image-card';
        
        // Crear la imagen
        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.prompt || 'Imagen generada por IA';
        img.className = 'gallery-image';
        
        // Manejar errores de carga
        img.onerror = function() {
            console.error('Error al cargar la imagen:', image.url);
            img.src = 'img/placeholder.png';
        };
        
        // Crear el contenedor de información
        const infoContainer = document.createElement('div');
        infoContainer.className = 'image-info';
        
        // Crear el texto del prompt
        const promptText = document.createElement('p');
        promptText.className = 'prompt-text collapsed';
        
        // Obtener el texto completo del prompt
        const fullPrompt = image.prompt_text || image.prompt || 'Imagen sin descripción';
        
        // Crear versión truncada del prompt (primeros 50 caracteres)
        const truncatedPrompt = fullPrompt.length > 50 ? fullPrompt.substring(0, 50) + '...' : fullPrompt;
        
        // Establecer el texto truncado inicialmente
        promptText.textContent = truncatedPrompt;
        
        // Guardar el prompt completo como atributo de datos
        promptText.dataset.fullPrompt = fullPrompt;
        
        // Agregar evento para expandir/colapsar el prompt al hacer clic
        promptText.addEventListener('click', function(e) {
            e.stopPropagation(); // Evitar que se active el botón de descarga al hacer clic en la tarjeta
            
            if (this.classList.contains('collapsed')) {
                // Expandir
                this.textContent = this.dataset.fullPrompt;
                this.classList.remove('collapsed');
                this.classList.add('expanded');
            } else {
                // Colapsar
                this.textContent = truncatedPrompt;
                this.classList.remove('expanded');
                this.classList.add('collapsed');
            }
        });
        
        // Crear el contenedor de descarga
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'download-container';
        
        // Crear el botón de descarga
        const downloadBtn = document.createElement('a');
        downloadBtn.className = 'download-btn';
        downloadBtn.textContent = 'Descargar';
        downloadBtn.href = image.url;
        downloadBtn.download = (image.prompt || 'imagen_ia') + '.png';
        downloadBtn.target = '_blank';
        
        // Agregar evento para abrir la imagen en el modal
        card.addEventListener('click', function(e) {
            // Evitar que se active el botón de descarga al hacer clic en la tarjeta
            if (e.target !== downloadBtn && e.target !== promptText) {
                modal.style.display = 'block';
                modalImg.src = image.url;
                modalCaption.textContent = fullPrompt;
                
                // Asegurar que la cruz de cierre sea visible
                document.querySelector('.close-modal').style.display = 'flex';
                
                // Asegurar que el caption sea visible
                modalCaption.style.display = 'block';
            }
        });
        
        // Agregar elementos al contenedor de información
        infoContainer.appendChild(promptText);
        infoContainer.appendChild(downloadContainer);
        
        // Agregar elementos al contenedor de la tarjeta
        card.appendChild(img);
        card.appendChild(infoContainer);
        
        // Agregar el botón de descarga al contenedor de descarga
        downloadContainer.appendChild(downloadBtn);
        
        return card;
    }
    
    function showLoading(isLoading) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = isLoading ? 'flex' : 'none';
        }
    }
    
    function showNotification(message) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.className = 'notification';
            document.body.appendChild(notification);
        }
        
        // Set message and show notification
        notification.textContent = message;
        notification.classList.add('show');
        
        // Hide notification after a delay
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    async function showLegendaryCard(image) {
        // Detener el slideshow automático si está activo
        if (autoSlideshowTimer) {
            clearTimeout(autoSlideshowTimer);
        }
        
        // Limpiar el contenedor
        legendaryCardContainer.innerHTML = '';
        
        // Crear el fondo con efecto de resplandor
        const glowBackground = document.createElement('div');
        glowBackground.className = 'legendary-glow-background';
        
        // Crear el contenedor de la carta
        const cardFrame = document.createElement('div');
        cardFrame.className = 'legendary-card-frame';
        
        // Crear la imagen
        const cardImage = document.createElement('img');
        cardImage.src = image.url;
        cardImage.alt = image.prompt || 'Nueva imagen generada';
        cardImage.className = 'legendary-card-image';
        
        // Crear el título
        const cardTitle = document.createElement('div');
        cardTitle.className = 'legendary-card-title';
        cardTitle.innerHTML = '<h1>¡NUEVA IMAGEN GENERADA!</h1>';
        
        // Intentar obtener el prompt completo desde el archivo de texto si no está disponible
        let promptText = image.prompt_text || image.prompt;
        
        if (!promptText || promptText.trim() === '') {
            // Intentar cargar el archivo de texto con el prompt completo
            try {
                const promptFileUrl = `${image.url.substring(0, image.url.lastIndexOf('.'))}.txt`;
                const textResponse = await fetch(promptFileUrl);
                if (textResponse.ok) {
                    promptText = await textResponse.text();
                } else {
                    throw new Error('Archivo de texto no encontrado');
                }
            } catch (error) {
                console.log('No se pudo cargar el archivo de texto con el prompt');
                // Si no se puede cargar el archivo de texto, extraer del nombre de archivo
                const urlParts = image.url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const fileWithoutExtension = fileName.split('.')[0];
                promptText = fileWithoutExtension.replace(/[-_]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }
        }
        
        // Crear el prompt
        const cardPrompt = document.createElement('div');
        cardPrompt.className = 'legendary-card-prompt';
        cardPrompt.textContent = promptText || 'Imagen sin descripción';
        
        // Agregar elementos al frame
        cardFrame.appendChild(cardImage);
        
        // Agregar elementos al contenedor principal
        legendaryCardContainer.appendChild(glowBackground);
        legendaryCardContainer.appendChild(cardFrame);
        legendaryCardContainer.appendChild(cardTitle);
        legendaryCardContainer.appendChild(cardPrompt);
        
        // Mostrar el contenedor
        legendaryCardContainer.style.display = 'flex';
        
        // Agregar clase para la animación
        setTimeout(() => {
            legendaryCardContainer.classList.add('show');
        }, 100);
        
        // Ocultar después del tiempo especificado y mostrar la galería
        setTimeout(() => {
            legendaryCardContainer.classList.remove('show');
            setTimeout(() => {
                legendaryCardContainer.style.display = 'none';
                
                // Volver al modo de galería actual
                if (currentGalleryMode === 'default') {
                    renderGallery();
                } else if (currentGalleryMode === 'auto') {
                    // Reiniciar el slideshow automático
                    if (isAutoSlideshowPlaying) {
                        startAutoSlideshow();
                    }
                }
            }, 500); // Esperar a que termine la animación de desvanecimiento
        }, legendaryCardDisplayTime);
    }
    
    async function updateAutoSlideshowSlides() {
        // Limpiar el contenedor de slides
        const slidesContainer = autoSlideshowContainer.querySelector('.slides-container');
        slidesContainer.innerHTML = '';
        
        // Ordenar imágenes por más recientes primero
        allImages.sort((a, b) => {
            return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        });
        
        // Crear un conjunto para rastrear URLs únicas
        const uniqueUrls = new Set();
        const uniqueImages = [];
        
        // Filtrar imágenes únicas
        allImages.forEach(image => {
            if (!uniqueUrls.has(image.url)) {
                uniqueUrls.add(image.url);
                uniqueImages.push(image);
            }
        });
        
        // Crear slides para cada imagen única
        for (let index = 0; index < uniqueImages.length; index++) {
            const image = uniqueImages[index];
            const slide = document.createElement('div');
            slide.className = 'slide';
            
            // Agregar clase 'active' al slide actual
            if (index === currentSlideIndex) {
                slide.classList.add('active');
            }
            
            // Crear la imagen
            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.prompt || 'Imagen generada por IA';
            img.className = 'slide-image';
            
            // Manejar errores de carga
            img.onerror = function() {
                console.error('Error al cargar la imagen:', image.url);
                img.src = 'img/placeholder.png';
            };
            
            // Usar el prompt que ya está guardado en el objeto de imagen
            // Si no hay prompt, generar uno a partir del nombre del archivo
            let promptText = image.prompt_text || image.prompt;
            
            if (!promptText || promptText.trim() === '') {
                // Si no hay prompt, usar el nombre del archivo como fallback
                const urlParts = image.url.split('/');
                const fileName = urlParts[urlParts.length - 1];
                const fileWithoutExtension = fileName.split('.')[0];
                promptText = fileWithoutExtension.replace(/[-_]/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
            }
            
            // Crear el contenedor del prompt
            const promptContainer = document.createElement('div');
            promptContainer.className = 'slide-caption';
            promptContainer.textContent = promptText || 'Imagen sin descripción';
            
            // Agregar elementos al slide
            slide.appendChild(img);
            slide.appendChild(promptContainer);
            
            // Agregar slide al contenedor
            slidesContainer.appendChild(slide);
        }
        
        // Reiniciar el índice del slide actual
        currentSlideIndex = 0;
        
        // Mostrar el primer slide
        if (uniqueImages.length > 0) {
            showSlide(currentSlideIndex);
        }
    }
    
    async function setGalleryMode(mode) {
        // Detener cualquier slideshow automático en curso
        if (autoSlideshowTimer) {
            clearTimeout(autoSlideshowTimer);
            autoSlideshowTimer = null;
        }
        
        // Ocultar los contenedores de galería
        gallery.style.display = 'none';
        autoSlideshowContainer.style.display = 'none';
        
        currentGalleryMode = mode;
        
        // Asegurar que el documento tenga el estilo correcto
        document.body.style.backgroundColor = 'transparent';
        document.body.style.overflow = 'hidden'; // Evitar scroll en la página completa
        
        if (mode === 'default') {
            // Mostrar la galería normal
            gallery.style.display = 'grid';
            // Asegurar que el contenedor principal tenga el estilo correcto
            galleryContainer.style.backgroundColor = 'transparent';
            galleryContainer.style.padding = '';
            galleryContainer.style.overflowY = 'auto'; // Permitir scroll en el contenedor de galería
            showNotification('Modo de galería normal activado');
        } else if (mode === 'auto') {
            // Mostrar el slideshow automático
            await updateAutoSlideshowSlides();
            autoSlideshowContainer.style.display = 'flex';
            
            // Asegurar que el contenedor principal tenga el estilo correcto
            galleryContainer.style.backgroundColor = 'transparent';
            galleryContainer.style.padding = '0';
            galleryContainer.style.overflowY = 'hidden'; // Ocultar scroll en modo automático
            
            showNotification('Modo de galería automático activado');
            
            // Iniciar el slideshow automático si está habilitado
            if (isAutoSlideshowPlaying) {
                startAutoSlideshow();
            }
            
            // Asegurarse de que el primer slide se muestre correctamente
            setTimeout(() => {
                showSlide(currentSlideIndex);
            }, 100);
        }
    }
    
    function showSlide(index) {
        const slides = autoSlideshowContainer.querySelectorAll('.slide');
        
        // Si no hay slides, salir
        if (slides.length === 0) return;
        
        // Validar el índice
        if (index < 0) {
            index = slides.length - 1;
        } else if (index >= slides.length) {
            index = 0;
        }
        
        // Guardar el índice actual
        currentSlideIndex = index;
        
        // Actualizar clases para todos los slides
        slides.forEach((slide, i) => {
            // Eliminar todas las clases de estado
            slide.classList.remove('active', 'prev', 'next');
            
            if (i === index) {
                // Slide actual
                slide.classList.add('active');
            } else if (i === (index - 1 + slides.length) % slides.length) {
                // Slide anterior
                slide.classList.add('prev');
            } else if (i === (index + 1) % slides.length) {
                // Slide siguiente
                slide.classList.add('next');
            }
        });
    }
    
    function showNextSlide() {
        // Detener el slideshow automático
        if (autoSlideshowTimer) {
            clearTimeout(autoSlideshowTimer);
            autoSlideshowTimer = null;
        }
        
        // Obtener todos los slides
        const slides = autoSlideshowContainer.querySelectorAll('.slide');
        
        // Calcular el siguiente índice
        currentSlideIndex = (currentSlideIndex + 1) % slides.length;
        
        // Mostrar el siguiente slide
        showSlide(currentSlideIndex);
        
        // Reiniciar el slideshow automático si está habilitado
        if (isAutoSlideshowPlaying) {
            startAutoSlideshow();
        }
    }
    
    function showPreviousSlide() {
        // Detener el slideshow automático
        if (autoSlideshowTimer) {
            clearTimeout(autoSlideshowTimer);
            autoSlideshowTimer = null;
        }
        
        // Obtener todos los slides
        const slides = autoSlideshowContainer.querySelectorAll('.slide');
        
        // Calcular el índice anterior
        currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
        
        // Mostrar el slide anterior
        showSlide(currentSlideIndex);
        
        // Reiniciar el slideshow automático si está habilitado
        if (isAutoSlideshowPlaying) {
            startAutoSlideshow();
        }
    }
    
    function startAutoSlideshow() {
        // Detener cualquier timer existente
        if (autoSlideshowTimer) {
            clearTimeout(autoSlideshowTimer);
        }
        
        // Configurar el timer para mostrar el siguiente slide
        autoSlideshowTimer = setTimeout(() => {
            showNextSlide();
        }, autoSlideshowInterval);
    }
    
    function toggleAutoSlideshow() {
        isAutoSlideshowPlaying = autoPlayCheckbox.checked;
        
        if (isAutoSlideshowPlaying) {
            startAutoSlideshow();
        } else {
            // Detener el slideshow automático
            if (autoSlideshowTimer) {
                clearTimeout(autoSlideshowTimer);
                autoSlideshowTimer = null;
            }
        }
    }
    
    async function checkForNewImages() {
        try {
            // Obtener la lista actual de imágenes del servidor
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error('Error al obtener las imágenes del servidor');
            }
            
            const serverImages = await response.json();
            
            // Si no hay imágenes en el servidor o en la galería, no hay nada que hacer
            if (!serverImages.length || !allImages.length) {
                return;
            }
            
            // Verificar si hay imágenes nuevas que no estén en nuestra colección actual
            const newImages = [];
            
            for (const serverImage of serverImages) {
                // Normalizar URL para comparación
                let serverImageUrl = serverImage.url;
                
                // Si useRemoteImages está activado, usar la URL remota para las imágenes
                if (useRemoteImages) {
                    // Si la URL no comienza con http o https, asumimos que es una ruta relativa
                    if (serverImageUrl && !serverImageUrl.startsWith('http://') && !serverImageUrl.startsWith('https://')) {
                        // Eliminar la barra inicial si existe
                        if (serverImageUrl.startsWith('/')) {
                            serverImageUrl = serverImageUrl.substring(1);
                        }
                        
                        // Construir URL completa con la base remota
                        serverImageUrl = `${remoteBaseUrl}/${serverImageUrl}`;
                    }
                } else {
                    // Comportamiento original para modo local
                    if (serverImageUrl && !serverImageUrl.startsWith('http://') && !serverImageUrl.startsWith('https://')) {
                        // Si no comienza con /, agregarlo
                        if (!serverImageUrl.startsWith('/')) {
                            serverImageUrl = '/' + serverImageUrl;
                        }
                        
                        // Construir URL completa con origen local
                        const baseUrl = window.location.origin;
                        serverImageUrl = baseUrl + serverImageUrl;
                    }
                }
                
                // Verificar si esta imagen ya está en nuestra colección
                const imageExists = allImages.some(img => {
                    // Extraer el nombre del archivo para comparación
                    const imgUrlParts = img.url.split('/');
                    const imgFileName = imgUrlParts[imgUrlParts.length - 1];
                    
                    const serverUrlParts = serverImageUrl.split('/');
                    const serverFileName = serverUrlParts[serverUrlParts.length - 1];
                    
                    return imgFileName === serverFileName;
                });
                
                // Si la imagen no existe en nuestra colección, agregarla como nueva
                if (!imageExists) {
                    console.log('Nueva imagen detectada en el servidor:', serverImageUrl);
                    
                    // Intentar cargar el prompt completo desde el archivo de texto
                    let promptText = serverImage.prompt;
                    
                    try {
                        // Construir la URL del archivo de texto
                        const promptFileUrl = `${serverImageUrl.substring(0, serverImageUrl.lastIndexOf('.'))}.txt`;
                        console.log('Intentando cargar prompt desde:', promptFileUrl);
                        
                        const textResponse = await fetch(promptFileUrl);
                        if (textResponse.ok) {
                            promptText = await textResponse.text();
                            console.log('Prompt cargado desde archivo de texto:', promptText);
                        } else {
                            throw new Error('No se encontró el archivo de texto');
                        }
                    } catch (error) {
                        console.log('No se pudo cargar el archivo de texto, usando fallback:', error);
                        
                        // Si no se puede cargar el archivo de texto o no hay prompt, usar el nombre del archivo
                        if (!promptText || promptText.trim() === '') {
                            const urlParts = serverImageUrl.split('/');
                            const fileName = urlParts[urlParts.length - 1];
                            // Eliminar la extensión del archivo
                            const fileWithoutExtension = fileName.split('.')[0];
                            promptText = fileWithoutExtension.replace(/[-_]/g, ' ')
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');
                        }
                    }
                    
                    // Crear objeto de imagen
                    const newImage = {
                        url: serverImageUrl,
                        prompt: promptText,
                        prompt_text: promptText, // Guardar el prompt completo
                        timestamp: new Date().toISOString()
                    };
                    
                    newImages.push(newImage);
                }
            }
            
            // Si se encontraron nuevas imágenes, mostrarlas
            if (newImages.length > 0) {
                console.log(`Se encontraron ${newImages.length} nuevas imágenes en el servidor`);
                
                // Agregar las nuevas imágenes a nuestra colección
                allImages = [...newImages, ...allImages];
                
                // Mostrar la última imagen como carta legendaria
                await showLegendaryCard(newImages[0]);
                
                // Si estamos en modo automático, actualizar el slideshow
                if (currentGalleryMode === 'auto') {
                    await updateAutoSlideshowSlides();
                } else {
                    // Actualizar la galería en modo normal
                    renderGallery();
                }
                
                // Mostrar notificación
                showNotification(`Se ${newImages.length === 1 ? 'ha' : 'han'} detectado ${newImages.length} ${newImages.length === 1 ? 'nueva imagen' : 'nuevas imágenes'}`);
            }
        } catch (error) {
            console.error('Error al verificar nuevas imágenes:', error);
        }
    }
});
