/**
 * promptImprover.js
 * 
 * Este archivo se encarga de mejorar los prompts utilizando la API de OpenAI.
 * Traduce el prompt al inglés y lo mejora para generar mejores resultados.
 */

class PromptImprover {
    constructor() {
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Mejora un prompt utilizando la API de OpenAI
     * @param {string} originalPrompt - El prompt original en español
     * @returns {Promise<string>} - El prompt mejorado
     */
    async improvePrompt(originalPrompt) {
        try {
            // Obtener la API key desde el servidor
            console.log('Solicitando API key al servidor...');
            const response = await fetch('/api/openai-key');
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Error al obtener la API key (${response.status}): ${errorText}`);
                throw new Error(`Error al obtener la API key: ${response.statusText}`);
            }
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Error al parsear la respuesta JSON:', jsonError);
                const responseText = await response.text();
                console.error('Contenido de la respuesta:', responseText);
                throw new Error('La respuesta del servidor no es un JSON válido');
            }
            
            if (!data.apiKey) {
                console.error('No se pudo obtener la API key:', data);
                throw new Error('No se pudo obtener la API key');
            }

            const apiKey = data.apiKey;
            console.log('API key obtenida correctamente');
            
            // Configurar la solicitud a la API de OpenAI
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: 'Eres un asistente especializado en mejorar prompts para generación de imágenes. Tu tarea es traducir el prompt del español al inglés y mejorarlo para que genere resultados más espectaculares. Añade detalles sobre iluminación, estilo, calidad y elementos visuales. Responde SOLO con el prompt mejorado, sin explicaciones ni comentarios adicionales.'
                        },
                        {
                            role: 'user',
                            content: originalPrompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 300
                })
            };

            // Realizar la solicitud a la API
            console.log('Enviando solicitud a OpenAI para mejorar el prompt...');
            const openaiResponse = await fetch(this.apiUrl, requestOptions);
            
            if (!openaiResponse.ok) {
                let errorMessage = `Error en la API de OpenAI (${openaiResponse.status})`;
                try {
                    const errorData = await openaiResponse.json();
                    errorMessage += `: ${errorData.error?.message || 'Error desconocido'}`;
                    console.error(errorMessage, errorData);
                } catch (e) {
                    const errorText = await openaiResponse.text();
                    errorMessage += `: ${errorText}`;
                    console.error(errorMessage);
                }
                throw new Error(errorMessage);
            }

            const result = await openaiResponse.json();
            const improvedPrompt = result.choices[0].message.content.trim();
            
            console.log('Prompt original:', originalPrompt);
            console.log('Prompt mejorado:', improvedPrompt);
            
            return improvedPrompt;
        } catch (error) {
            console.error('Error al mejorar el prompt:', error);
            alert(`Error al mejorar el prompt: ${error.message}`);
            return originalPrompt; // Devolver el prompt original en caso de error
        }
    }
}

// Exportar la clase para su uso en otros archivos
window.PromptImprover = PromptImprover;
