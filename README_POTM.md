# Player Of The Month (POTM) - Sistema de Votación

Sistema completo de votación para el Player Of The Month del FC Bufas con interfaz drag & drop, animaciones GSAP y resultados en tiempo real.

## 🎯 Características

- ✅ **Interfaz Drag & Drop**: Sistema intuitivo para ordenar jugadores usando GSAP Draggable
- ✅ **Diseño Mobile-First**: Optimizado para dispositivos móviles
- ✅ **Animaciones GSAP**: Transiciones suaves, confeti y efectos visuales
- ✅ **Stack de Imágenes 3D**: Efecto visual con múltiples cartas por jugador
- ✅ **Sistema de Puntos**: 1º=4pts, 2º=3pts, 3º=2pts, 4º=1pt
- ✅ **Resultados en Tiempo Real**: Actualización automática cada 30 segundos
- ✅ **Prevención de Votos Duplicados**: Control por IP del usuario
- ✅ **Podio Animado**: Visualización atractiva del top 3

## 📁 Estructura de Archivos

```
src/
├── pages/
│   ├── potm.astro                    # Página principal de votación
│   ├── potm/
│   │   └── resultados.astro          # Página de resultados
│   └── api/
│       └── potm/
│           ├── check-vote.ts         # Verificar si ya votó
│           ├── vote.ts               # Guardar voto
│           └── results.ts            # Obtener resultados

scripts/
└── init-potm-db.mjs                  # Inicializar base de datos

public/
└── cards/
    ├── BASE/
    │   ├── marcos.png
    │   ├── mario.png
    │   ├── mister.png
    │   └── nicou.png
    ├── TOTW/
    │   ├── marcosTOTW2.png
    │   ├── marioTOTW3.png
    │   ├── marioTOTW4.png
    │   ├── misterTOTW2.png
    │   ├── misterTOTW3.png
    │   ├── misterTOTW4.png
    │   └── nicouTOTW5.png
    └── NOMPOTM/
        ├── marcosNOMPOTMoct.png
        ├── marioNOMPOTMoct.png
        ├── misterNOMPOTMoct.png
        └── nicouNOMPOTMoct.png
```

## 🚀 Instalación y Configuración

### 1. Inicializar Base de Datos

Ejecuta el script de inicialización para crear la tabla necesaria:

```bash
node scripts/init-potm-db.mjs
```

Esto creará la tabla `potm_votes` con la siguiente estructura:

```sql
CREATE TABLE potm_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_ip VARCHAR(100) NOT NULL,
  first_place VARCHAR(50) NOT NULL,
  second_place VARCHAR(50) NOT NULL,
  third_place VARCHAR(50) NOT NULL,
  fourth_place VARCHAR(50) NOT NULL,
  voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_ip (user_ip),
  INDEX idx_voted_at (voted_at),
  INDEX idx_month_year (MONTH(voted_at), YEAR(voted_at))
);
```

### 2. Variables de Entorno

Asegúrate de tener configurada la variable `DATABASE_URL` en tu archivo `.env`:

```env
DATABASE_URL=mysql://usuario:contraseña@host:puerto/database
```

### 3. Dependencias

El sistema utiliza las siguientes dependencias (ya incluidas en el proyecto):

- `gsap` - Animaciones y Draggable
- `canvas-confetti` - Efectos de confeti
- `mysql2` - Conexión a base de datos
- `@astrojs/vercel` - Deployment

## 📖 Uso

### Acceder a la Página de Votación

```
https://tudominio.com/potm
```

**Funcionalidades:**
- Arrastra las cartas de los jugadores a los slots de ranking (1º a 4º)
- Ordena del mejor al peor según tu criterio
- Haz clic en "Enviar Votación" cuando hayas completado los 4 rankings
- Disfruta del confeti al enviar tu voto exitosamente

### Ver Resultados

```
https://tudominio.com/potm/resultados
```

**Características:**
- Podio animado con los 3 primeros lugares
- Estadísticas detalladas por jugador
- Distribución de votos por posición
- Actualización automática cada 30 segundos
- Botón de actualización manual

## 🎮 Sistema de Puntos

El sistema de votación utiliza un esquema de puntos ponderado:

- **1º Lugar**: 4 puntos
- **2º Lugar**: 3 puntos
- **3º Lugar**: 2 puntos
- **4º Lugar**: 1 punto

El ganador es el jugador con más puntos acumulados al final del mes.

## 🔒 Seguridad

- **Prevención de votos duplicados**: Un usuario solo puede votar una vez por mes
- **Identificación por IP**: Se usa la IP del usuario para control de votos
- **Validación de datos**: Todos los votos son validados antes de guardarse
- **Índices de base de datos**: Optimización para consultas rápidas

## 🎨 Personalización

### Cambiar Jugadores Nominados

Edita el array `players` en `/src/pages/potm.astro`:

```typescript
const players = [
  {
    id: 'marcos',
    name: 'Marcos',
    images: [
      '/cards/BASE/marcos.png',
      '/cards/TOTW/marcosTOTW2.png',
      '/cards/NOMPOTM/marcosNOMPOTMoct.png'
    ]
  },
  // ... más jugadores
];
```

### Modificar Colores

Actualiza los colores en `/src/pages/potm/resultados.astro`:

```typescript
const playerInfo: Record<string, { color: string; image: string }> = {
  marcos: { 
    color: 'from-blue-500 to-blue-700',
    image: '/cards/NOMPOTM/marcosNOMPOTMoct.png'
  },
  // ... más jugadores
};
```

### Ajustar Tiempo de Auto-refresh

En `resultados.astro`, línea 251:

```javascript
// Auto-refresh cada 30 segundos
setInterval(loadResults, 30000); // Cambiar 30000 a los ms deseados
```

## 🐛 Solución de Problemas

### Error: "DATABASE_URL no configurada"
- Verifica que existe el archivo `.env` con la variable `DATABASE_URL`

### Error: "No se puede conectar a la base de datos"
- Verifica las credenciales en `DATABASE_URL`
- Asegúrate de que el servidor MySQL está ejecutándose

### Las animaciones no funcionan
- Verifica que GSAP Draggable esté instalado: `npm install gsap`
- Revisa la consola del navegador para errores

### Los votos no se guardan
- Verifica que la tabla `potm_votes` existe
- Revisa los logs del servidor para errores de API

## 📊 Consultas Útiles

### Ver todos los votos del mes actual
```sql
SELECT * FROM potm_votes 
WHERE MONTH(voted_at) = MONTH(CURRENT_DATE()) 
AND YEAR(voted_at) = YEAR(CURRENT_DATE());
```

### Contar votos por jugador
```sql
SELECT 
  first_place as player,
  COUNT(*) as votes
FROM potm_votes
WHERE MONTH(voted_at) = MONTH(CURRENT_DATE())
GROUP BY first_place
ORDER BY votes DESC;
```

### Resetear votos del mes (usar con precaución)
```sql
DELETE FROM potm_votes 
WHERE MONTH(voted_at) = MONTH(CURRENT_DATE()) 
AND YEAR(voted_at) = YEAR(CURRENT_DATE());
```

## 🎉 Mejoras Futuras

- [ ] Sistema de autenticación de usuarios
- [ ] Histórico de ganadores por mes
- [ ] Dashboard de administración
- [ ] Exportar resultados a PDF
- [ ] Votación por categorías (gol del mes, asistencia, etc.)
- [ ] Sistema de notificaciones
- [ ] Integración con redes sociales

## 📝 Notas

- Los votos se resetean automáticamente cada mes
- Las imágenes PNG deben estar en la carpeta `public/cards/`
- El sistema está optimizado para mobile-first
- Compatible con todos los navegadores modernos

## 👥 Jugadores Actuales

- **Marcos**
- **Mario**
- **Míster**
- **Nico Uriburu**

---

Desarrollado con ❤️ para FC Bufas
