const fs = require('fs');

// Leer el archivo CSV
function updateMarketValues() {
  try {
    // Leer el archivo CSV
    const csvContent = fs.readFileSync('data/valores-mercado.csv', 'utf8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Convertir CSV a datos estructurados
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index] ? values[index].trim() : '';
      });
      data.push(row);
    }
    
    // Convertir datos del CSV al formato necesario (formato tabla)
    const playerUpdates = {};
    
    // Obtener las fechas de las columnas (excluir la primera columna que son los jugadores)
    const fechas = headers.slice(1).filter(header => header.trim() && header.includes('-'));
    
    data.forEach(row => {
      // La primera columna contiene el jugador_id (puede estar vacía en el header)
      const firstColumnKey = headers[0] || Object.keys(row)[0];
      const playerId = row[firstColumnKey] || row[Object.keys(row)[0]];
      
      if (!playerId || playerId === 'jugador_id' || !playerId.trim()) return; // Saltar encabezados
      
      if (!playerUpdates[playerId]) {
        playerUpdates[playerId] = [];
      }
      
      // Para cada fecha (columna), obtener el valor
      fechas.forEach(fechaStr => {
        const cleanFecha = fechaStr.trim();
        const valor = parseInt(row[cleanFecha]);
        
        if (valor && !isNaN(valor)) {
          playerUpdates[playerId].push({
            fecha: new Date(cleanFecha),
            valor: valor
          });
        }
      });
      
      // Ordenar por fecha
      playerUpdates[playerId].sort((a, b) => a.fecha - b.fecha);
    });
    
    // Leer el archivo actual de fighters
    const fightersPath = 'src/consts/fighters.ts';
    let fightersContent = fs.readFileSync(fightersPath, 'utf8');
    
    // Actualizar cada jugador con sus nuevos valores históricos
    Object.keys(playerUpdates).forEach(playerId => {
      const historialValores = playerUpdates[playerId];
      const historialString = JSON.stringify(historialValores, null, 6)
        .replace(/"fecha":"([^"]+)"/g, 'fecha: new Date("$1")')
        .replace(/"valor":(\d+)/g, 'valor: $1');
      
      // Obtener el valor más reciente para actualizar valorTotal
      const ultimoValor = historialValores[historialValores.length - 1].valor;
      
      // Buscar y reemplazar el historialValores del jugador
      const regexHistorial = new RegExp(`(id: '${playerId}'[\\s\\S]*?historialValores: \\[)[\\s\\S]*?(\\])`);
      const replacementHistorial = `$1\n      ${historialString.slice(1, -1)}\n    $2`;
      
      // Buscar y reemplazar el valorTotal del jugador
      const regexValorTotal = new RegExp(`(id: '${playerId}'[\\s\\S]*?valorTotal: )\\d+`);
      const replacementValorTotal = `$1${ultimoValor}`;
      
      if (regexHistorial.test(fightersContent)) {
        fightersContent = fightersContent.replace(regexHistorial, replacementHistorial);
        fightersContent = fightersContent.replace(regexValorTotal, replacementValorTotal);
        console.log(`✅ Actualizado historial y valorTotal de ${playerId} a ${ultimoValor.toLocaleString()}€`);
      } else {
        console.log(`❌ No se encontró ${playerId} o no tiene historialValores`);
      }
    });
    
    // Guardar el archivo actualizado
    fs.writeFileSync(fightersPath, fightersContent);
    console.log('✅ Archivo fighters.ts actualizado correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateMarketValues();
}

module.exports = { updateMarketValues };
