// Script para verificar el estado de logros antes y después del claim
const testAchievementState = async () => {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MzUsImlhdCI6MTcyOTQzNDUzNH0.Dv2DtAjT0J8O-8wq2TmK1hcVDh8xS7lNWPwEi2fPdCM'; // Token ejemplo
  
  console.log('=== VERIFICANDO ESTADO INICIAL DE LOGROS ===');
  try {
    const achievementsResponse = await fetch('http://localhost:4322/api/bufas-cards/achievements', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const achievementsData = await achievementsResponse.json();
    
    if (achievementsData.success) {
      const cartasTotales = achievementsData.achievements.find(a => a.key === 'cartas_totales');
      console.log('Cartas totales:', {
        currentValue: cartasTotales.currentValue,
        claimable: cartasTotales.claimable,
        claimedThresholds: cartasTotales.claimedThresholds
      });
    }
  } catch (error) {
    console.error('Error obteniendo logros:', error);
  }
  
  console.log('\n=== INTENTANDO RECLAMAR RECOMPENSA ===');
  
  try {
    const claimResponse = await fetch('http://localhost:4322/api/bufas-cards/achievements/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        key: 'cartas_totales',
        threshold: 10,
        rewardType: 'PACK',
        packType: 'MEDIA_81_85',
        coins: null
      })
    });
    
    console.log('Claim Status:', claimResponse.status);
    const claimResult = await claimResponse.json();
    console.log('Claim Result:', claimResult);
    
    if (claimResult.success) {
      console.log('\n=== VERIFICANDO ESTADO DESPUÉS DEL CLAIM ===');
      
      // Esperar un poco y verificar estado actualizado
      setTimeout(async () => {
        try {
          const newAchievementsResponse = await fetch('http://localhost:4322/api/bufas-cards/achievements', {
            cache: 'no-store',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const newAchievementsData = await newAchievementsResponse.json();
          
          if (newAchievementsData.success) {
            const updatedCartasTotales = newAchievementsData.achievements.find(a => a.key === 'cartas_totales');
            console.log('Cartas totales (actualizado):', {
              currentValue: updatedCartasTotales.currentValue,
              claimable: updatedCartasTotales.claimable,
              claimedThresholds: updatedCartasTotales.claimedThresholds
            });
            
            if (updatedCartasTotales.claimedThresholds.includes(10)) {
              console.log('✅ ÉXITO: El umbral 10 aparece como reclamado!');
            } else {
              console.log('❌ FALLO: El umbral 10 no aparece como reclamado');
            }
          }
        } catch (error) {
          console.error('Error verificando estado actualizado:', error);
        }
      }, 1000);
    }
    
  } catch (error) {
    console.error('Error en claim:', error);
  }
};

testAchievementState();
