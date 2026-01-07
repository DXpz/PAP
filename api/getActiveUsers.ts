import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = 'BZKM84Q3ZLKZwxajaSSPVzlL37Afz1MOVJhbkesQjLAhh4OkFT2ocs7lbhECxFge';
const TARGET_URL = 'http://san.red.com.sv';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Configurar CORS primero (antes de cualquier respuesta)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Si es una petición OPTIONS, responder inmediatamente
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Construir la URL directamente para getActiveUsers
    const targetUrl = `${TARGET_URL}/API/getActiveUsers`;

    // 🔍 CHIVATO 1: Imprimir la URL exacta a la que vamos a conectar
    console.log('═══════════════════════════════════════════════════');
    console.log('🔗 TARGET URL:', targetUrl);
    console.log('📋 METHOD:', req.method || 'GET');
    console.log('📦 TARGET_URL env:', TARGET_URL);
    console.log('═══════════════════════════════════════════════════');

    try {
        // Hacer la petición al servidor objetivo
        const response = await fetch(targetUrl, {
            method: req.method || 'GET',
            headers: {
                'x-api-key': API_KEY,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        // 🔍 CHIVATO 2: Verificar el status y content-type de la respuesta
        const contentType = response.headers.get('content-type') || '';
        console.log('📊 RESPONSE STATUS:', response.status, response.statusText);
        console.log('📄 CONTENT-TYPE:', contentType);
        console.log('✅ RESPONSE OK:', response.ok);

        // 🔍 CHIVATO 3: Validar que la respuesta sea OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ ERROR RESPONSE (not OK):');
            console.error('Status:', response.status);
            console.error('Body:', errorText);
            return res.status(response.status).json({
                error: 'Error del servidor backend',
                status: response.status,
                message: errorText.substring(0, 500) // Limitar para no saturar logs
            });
        }

        // 🔍 CHIVATO 4: Intentar parsear como JSON (sin importar el content-type)
        // Nota: El backend devuelve JSON válido pero con content-type text/html
        let data;
        try {
            data = await response.json();
            console.log('✅ JSON parseado correctamente');
            console.log('📦 DATA keys:', Object.keys(data).join(', '));
            if (contentType && !contentType.includes('application/json')) {
                console.warn('⚠️ WARNING: Content-Type es', contentType, 'pero se parseó como JSON correctamente');
            }
        } catch (jsonError) {
            // Si falla el parseo de JSON, intentar obtener el texto para debugging
            const rawText = await response.text();
            console.error('❌ ERROR al parsear JSON:');
            console.error('Content-Type:', contentType);
            console.error('Error:', jsonError);
            console.error('Raw response (primeros 1000 caracteres):', rawText.substring(0, 1000));
            return res.status(500).json({
                error: 'Error al parsear respuesta del servidor',
                contentType: contentType,
                message: jsonError instanceof Error ? jsonError.message : 'Unknown error',
                preview: rawText.substring(0, 200)
            });
        }

        // Responder con los datos
        console.log('✅ PROXY SUCCESS - Enviando respuesta al cliente');
        res.status(response.status).json(data);

    } catch (error) {
        console.error('═══════════════════════════════════════════════════');
        console.error('❌ PROXY ERROR FATAL:');
        console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('Error message:', error instanceof Error ? error.message : error);
        console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('═══════════════════════════════════════════════════');

        res.status(500).json({
            error: 'Error al conectar con el servidor',
            message: error instanceof Error ? error.message : 'Unknown error',
            url: targetUrl // Incluir la URL en el error para debugging
        });
    }
}
