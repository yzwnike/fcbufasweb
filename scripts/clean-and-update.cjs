const fs = require('fs');

function cleanAndUpdate() {
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
    
    // Obtener datos del CSV
    const playerUpdates = {};
    const fechas = headers.slice(1).filter(header => header.trim() && header.includes('-'));
    
    data.forEach(row => {
      const firstColumnKey = headers[0] || Object.keys(row)[0];
      const playerId = row[firstColumnKey] || row[Object.keys(row)[0]];
      
      if (!playerId || playerId === 'jugador_id' || !playerId.trim()) return;
      
      if (!playerUpdates[playerId]) {
        playerUpdates[playerId] = [];
      }
      
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
      
      playerUpdates[playerId].sort((a, b) => a.fecha - b.fecha);
    });
    
    // Leer el archivo fighters.ts
    let fightersContent = fs.readFileSync('src/consts/fighters.ts', 'utf8');
    
    // Para cada jugador en el CSV
    Object.keys(playerUpdates).forEach(playerId => {
      const historialValores = playerUpdates[playerId];
      const ultimoValor = historialValores[historialValores.length - 1].valor;
      
      // Formato del historial para TypeScript
      const historialString = historialValores.map(h => 
        `      { fecha: new Date("${h.fecha.toISOString()}"), valor: ${h.valor} }`
      ).join(',\n');
      
      // Buscar el jugador y reemplazar todo su valorTotal e historialValores
      const playerRegex = new RegExp(
        `(id: '${playerId}'[\\s\\S]*?valorTotal: )\\d+([\\s\\S]*?historialValores: \\[)[\\s\\S]*?(\\][\\s\\S]*?dorsal:)`,
        'g'
      );
      
      fightersContent = fightersContent.replace(
        playerRegex,
        `$1${ultimoValor}$2\n${historialString}\n    $3`
      );
      
      console.log(`✅ Actualizado ${playerId}: valorTotal=${ultimoValor.toLocaleString()}€, historial=${historialValores.length} entradas`);
    });
    
    // Guardar el archivo
    fs.writeFileSync('src/consts/fighters.ts', fightersContent);
    console.log('✅ Archivo fighters.ts limpiado y actualizado correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanAndUpdate();
