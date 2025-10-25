# Configuración de Supabase Realtime

## Variables de entorno necesarias

Agrega estas variables a tu archivo `.env`:

```env
# Supabase Configuration (para Realtime)
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

## Cómo obtener las credenciales

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Settings** → **API**
3. Copia:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon public** key → `PUBLIC_SUPABASE_ANON_KEY`

## Habilitar Realtime en Supabase

### Paso 1: Habilitar Realtime en la tabla

Ejecuta este SQL en Supabase SQL Editor:

```sql
-- Habilitar realtime para la tabla user_cards
ALTER PUBLICATION supabase_realtime ADD TABLE user_cards;
```

### Paso 2: Configurar políticas de seguridad (RLS)

Si tienes RLS (Row Level Security) habilitado, necesitas políticas para lectura:

```sql
-- Permitir a todos leer inserts de user_cards (para notificaciones públicas)
CREATE POLICY "Enable realtime for all users" ON user_cards
  FOR SELECT
  USING (true);
```

## Verificar que funciona

1. Abre la consola del navegador en tu app
2. Deberías ver: `Estado de suscripción realtime: SUBSCRIBED`
3. Cuando alguien abra un pack/consiga una carta, aparecerá la notificación

## Características

- ✅ Notificaciones en tiempo real cuando cualquier usuario consigue una carta
- ✅ Animación suave desde la izquierda
- ✅ Colores según rareza (Bronze, Silver, Gold, Elite, Legend)
- ✅ Badges especiales (POTM, TOTW, OG, etc.)
- ✅ Cola de notificaciones (una a la vez)
- ✅ Auto-desaparece después de 5 segundos
- ✅ Responsive (mobile-friendly)

## Filtros opcionales

En `RealtimeNotifications.astro`, línea 150, puedes modificar para:

```typescript
// Mostrar SOLO cartas de otros usuarios (actual)
if (!token || data.cardInfo.user_id !== userId) {
  addToQueue({...});
}

// Mostrar TODAS las cartas (incluidas las tuyas)
addToQueue({...});
```
