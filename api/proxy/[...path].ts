import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_KEY = 'BZKM84Q3ZLKZwxajaSSPVzlL37Afz1MOVJhbkesQjLAhh4OkFT2ocs7lbhECxFge';
const TARGET_URL = 'http://san.red.com.sv';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Obtener el path de la URL
  const path = Array.isArray(req.query.path) 
    ? req.query.path.join('/') 
    : req.query.path || '';

  // Construir la URL completa
  // Si el path es "getActiveUsers", lo convertimos a "API/getActiveUsers"
  const targetPath = path.startsWith('API/') ? path : `API/${path}`;
  const targetUrl = `${TARGET_URL}/${targetPath}`;

  try {
    // Hacer la petición al servidor objetivo
    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(req.headers['content-type'] && { 'Content-Type': req.headers['content-type'] }),
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Si es una petición OPTIONS, responder inmediatamente
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Responder con los datos
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Error al conectar con el servidor' });
  }
}

