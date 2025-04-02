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
            const response = await fetch('/api/openai-key');
            const data = await response.json();
            
            if (!data.apiKey) {
                console.error('No se pudo obtener la API key');
                throw new Error('No se pudo obtener la API key');
            }

            const apiKey = data.apiKey;
            
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
                const errorData = await openaiResponse.json();
                console.error(`Error en la API de OpenAI: ${errorData.error?.message || 'Error desconocido'}`);
                throw new Error(`Error en la API de OpenAI: ${errorData.error?.message || 'Error desconocido'}`);
            }

            const result = await openaiResponse.json();
            const improvedPrompt = result.choices[0].message.content.trim();
            
            console.log('Prompt original:', originalPrompt);
            console.log('Prompt mejorado:', improvedPrompt);
            
            return improvedPrompt;
        } catch (error) {
            console.error('Error al mejorar el prompt:', error);
            throw error;
        }
    }
}

// Exportar la clase para su uso en otros archivos
window.PromptImprover = PromptImprover;
