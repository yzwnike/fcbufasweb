# Player Of The Month (POTM) - Sistema de Votación Móvil

Sistema de votación táctil optimizado para móvil con Supabase como base de datos.

## 🎯 Características

- ✅ **Diseño 100% Móvil**: Sistema de selección táctil, sin drag & drop
- ✅ **Supabase Backend**: Base de datos PostgreSQL con RLS
- ✅ **Interfaz Simple**: Toca las cartas en orden para votar
- ✅ **Sistema de Puntos**: 1º=4pts, 2º=3pts, 3º=2pts, 4º=1pt
- ✅ **Prevención de Duplicados**: Control por IP del usuario
- ✅ **Animaciones GSAP**: Transiciones suaves y confetti
- ✅ **Resultados en Tiempo Real**: Auto-actualización cada 30 segundos

## 🚀 Instalación

### 1. Crear Tabla en Supabase

Ve a tu proyecto de Supabase y ejecuta el siguiente SQL:

```sql
-- Ejecutar el contenido de scripts/create-potm-table.sql
```

O desde el SQL Editor de Supabase Dashboard:
1. Ve a SQL Editor
2. Copia y pega el contenido de `scripts/create-potm-table.sql`
3. Ejecuta el script

### 2. Configurar Variables de Entorno

Asegúrate de tener en tu `.env`:

```env
PUBLIC_SUPABASE_URL=tu_url_de_supabase
PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 3. Acceder a la Aplicación

```
http://localhost:4321/potm
```

## 📱 Cómo Funciona

### Sistema de Votación

1. **Selección Táctil**: 
   - Toca un jugador para añadirlo al siguiente slot disponible
   - Los jugadores se añaden automáticamente del 1º al 4º lugar
   - Usa el botón × para quitar un jugador y rehacer tu selección

2. **Visual Feedback**:
   - Jugadores seleccionados se muestran con opacidad reducida
   - Rankings se llenan automáticamente en orden
   - Botón de enviar se habilita al completar los 4 rankings

3. **Envío de Voto**:
   - Se valida que los 4 rankings estén completos
   - Se verifica que no hayas votado este mes
   - Confetti al enviar exitosamente
   - Redirección automática a resultados

## 🗄️ Estructura de Datos

### Tabla `potm_votes`

```sql
CREATE TABLE potm_votes (
  id BIGSERIAL PRIMARY KEY,
  user_ip VARCHAR(100) NOT NULL,
  first_place VARCHAR(50) NOT NULL,
  second_place VARCHAR(50) NOT NULL,
  third_place VARCHAR(50) NOT NULL,
  fourth_place VARCHAR(50) NOT NULL,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Índices

- `idx_potm_user_ip`: Búsqueda por IP de usuario
- `idx_potm_voted_at`: Filtrado por fecha
- `idx_potm_month_year`: Consultas por mes/año

## 🔒 Seguridad (Row Level Security)

Políticas configuradas:
- **Lectura pública**: Cualquiera puede ver los resultados
- **Inserción controlada**: Solo el servidor puede insertar votos

## 📊 API Endpoints

### `GET /api/potm/check-vote`
Verifica si el usuario ya votó este mes.

**Respuesta**:
```json
{
  "hasVoted": false
}
```

### `POST /api/potm/vote`
Envía una votación.

**Body**:
```json
{
  "votes": [
    { "playerId": "marcos", "playerName": "Marcos", "position": 1 },
    { "playerId": "mario", "playerName": "Mario", "position": 2 },
    { "playerId": "mister", "playerName": "Míster", "position": 3 },
    { "playerId": "nicou", "playerName": "Nico Uriburu", "position": 4 }
  ]
}
```

**Respuesta**:
```json
{
  "success": true,
  "message": "¡Voto registrado exitosamente!"
}
```

### `GET /api/potm/results`
Obtiene los resultados del mes actual.

**Respuesta**:
```json
{
  "results": [
    {
      "playerId": "marcos",
      "playerName": "Marcos",
      "totalPoints": 45,
      "votes": { "first": 8, "second": 5, "third": 2, "fourth": 1 },
      "totalVotes": 16
    }
  ],
  "totalVotes": 20
}
```

## 🎨 Personalización

### Cambiar Jugadores

Edita el array en `/src/pages/potm.astro`:

```typescript
const players = [
  {
    id: 'marcos',
    name: 'Marcos',
    image: '/cards/NOMPOTM/marcosNOMPOTMoct.png'
  },
  // ... más jugadores
];
```

### Modificar Colores

Actualiza en `/src/pages/potm/resultados.astro`:

```typescript
const playerInfo = {
  marcos: { 
    color: 'from-blue-500 to-blue-700',
    image: '/cards/NOMPOTM/marcosNOMPOTMoct.png'
  },
  // ...
};
```

## 🐛 Solución de Problemas

### Error: "SUPABASE_URL no configurada"
- Verifica `.env` tenga las variables correctas
- Reinicia el servidor de desarrollo

### Los votos no se guardan
- Verifica que la tabla `potm_votes` existe en Supabase
- Revisa las políticas RLS estén configuradas
- Verifica los logs de Supabase Dashboard

### Las animaciones no funcionan
- Asegúrate de que GSAP está instalado: `npm install gsap`
- Revisa la consola del navegador

## 📱 Optimización Móvil

El sistema está optimizado para:
- ✅ Pantallas desde 320px de ancho
- ✅ Touch events nativos
- ✅ Feedback visual inmediato
- ✅ Botones grandes y accesibles
- ✅ Layout que respeta el header fijo

## 🎮 Consultas SQL Útiles

### Ver votos del mes actual
```sql
SELECT * FROM potm_votes 
WHERE voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP);
```

### Contar votos por jugador
```sql
SELECT 
  first_place as player,
  COUNT(*) as votes
FROM potm_votes
WHERE voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
GROUP BY first_place
ORDER BY votes DESC;
```

### Resetear votos del mes
```sql
DELETE FROM potm_votes 
WHERE voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP);
```

### Ver ranking actual
```sql
SELECT 
  'marcos' as player_id,
  (SELECT COUNT(*) * 4 FROM potm_votes WHERE first_place = 'marcos' AND voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)) +
  (SELECT COUNT(*) * 3 FROM potm_votes WHERE second_place = 'marcos' AND voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)) +
  (SELECT COUNT(*) * 2 FROM potm_votes WHERE third_place = 'marcos' AND voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)) +
  (SELECT COUNT(*) FROM potm_votes WHERE fourth_place = 'marcos' AND voted_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)) as total_points
ORDER BY total_points DESC;
```

## 👥 Jugadores Actuales

- **Marcos**
- **Mario**
- **Míster**
- **Nico Uriburu**

---

✨ Optimizado para móvil | 💾 Powered by Supabase | 🎨 Animaciones GSAP
