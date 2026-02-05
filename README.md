# PAP — Portal de Acción de Personal

Aplicación web para gestionar solicitudes de personal: vacaciones, incapacidades, permisos y otras peticiones. Incluye tema claro/oscuro, formularios dinámicos y envío a sistemas externos.

**Demo:** [pap-livid.vercel.app](https://pap-livid.vercel.app)

---

## Stack

- **React 19** + **TypeScript**
- **Vite 6** — build y dev server
- **Framer Motion** — animaciones
- **Lucide React** — iconos
- **Vercel** — hosting y serverless API

---

## Requisitos

- [Node.js](https://nodejs.org/) (v18 o superior)
- [npm](https://www.npmjs.com/) (o `corepack enable` si usas Node 20+)

---

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/DXpz/PAP.git
cd PAP

# Instalar dependencias
npm install
```

---

## Scripts

| Comando           | Descripción                |
|-------------------|----------------------------|
| `npm run dev`     | Servidor de desarrollo     |
| `npm run build`   | Build de producción        |
| `npm run preview` | Vista previa del build     |

---

## Estructura del proyecto

```
PAP/
├── api/                 # Rutas serverless (Vercel)
│   ├── getActiveUsers.ts   # Listado de jefes activos
│   └── proxy/              # Proxy al backend (san.red.com.sv)
├── components/
│   ├── ActionPortal.tsx       # Formularios y flujo principal
│   ├── AnimatedBackground.tsx # Fondo animado
│   └── GeometricBackground.tsx
├── App.tsx
├── index.html
├── index.tsx
├── types.ts
├── vite.config.ts
└── vercel.json
```

---



