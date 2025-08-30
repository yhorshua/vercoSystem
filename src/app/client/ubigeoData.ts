export const getUbigeoPeru = (): Promise<Record<string, Record<string, string[]>>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const ubigeoPeru: Record<string, Record<string, string[]>> = {
        Lima: {
          Lima: [
            'Miraflores', 'San Isidro', 'Surco', 'Jesús María', 'Magdalena', 
            'La Victoria', 'San Borja', 'San Luis', 'Rímac', 'Cercado de Lima',
            'Lince', 'Barranco', 'Chorrillos', 'San Juan de Lurigancho',
            'San Martín de Porres', 'Villa El Salvador', 'Villa María del Triunfo',
            'Comas', 'Puente Piedra', 'Carabayllo', 'Pueblo Libre', 'San Juan de Miraflores',
            'La Molina', 'Ate', 'El Agustino', 'Breña',
            'Surquillo', 'San Bartolo', 'Cieneguilla', 'Pachacámac'
          ],
          Barranca: ['Paramonga', 'Pativilca', 'Barranca'],
          Callao: ['Bellavista', 'La Perla', 'La Punta', 'Ventanilla', 'Carmen de La Legua Reynoso', 'La Perla', 'Mi Perú'],
          Huaral: ['Huaral', 'Aucallama', 'Chancay', 'Barranca', 'Vegueta'],
          Canta: ['Canta', 'Huayllay', 'Cerro de Pasco', 'Pucará'],
          Oyón: ['Oyón', 'Cochamarca'],
          Huaura: ['Huaura', 'Sayán', 'Churín', 'Leoncio Prado'],
          Yauyos: ['Yauyos', 'Catahuasi', 'Cañete'],
          Cajatambo: ['Cajatambo', 'Churin', 'Cerro de Pasco'],
          LimaMetropolitana: ['Ancon', 'Santa Rosa'],
        },
        Cusco: {
          Cusco: ['Santiago', 'Wanchaq', 'San Sebastián', 'Cusco', 'Poroy', 'San Jerónimo'],
          Urubamba: ['Yucay', 'Ollantaytambo', 'Urubamba'],
          Acomayo: ['Acomayo', 'Pomacanchi'],
          Canchis: ['Sicuani', 'Checacupe', 'Pitumarca'],
        },
        Arequipa: {
          Arequipa: ['Cercado', 'José Luis Bustamante', 'Yanahuara'],
          Caylloma: ['Chivay', 'Coporaque', 'Callalli'],
          Islay: ['Mollendo', 'Mejía', 'Camaná'],
        },
        Piura: {
          Piura: ['Castilla', 'Catacaos', 'Veintiséis de Octubre'],
          Sullana: ['Sullana', 'Bellavista', 'Marcavelica'],
          Talara: ['Talara', 'El Alto'],
        },
        Junín: {
          Huancayo: ['Huancayo', 'El Tambo', 'Chupaca'],
          Junín: ['Tarma', 'La Oroya'],
          Jauja: ['Jauja', 'Yauyos'],
        },
        Puno: {
          Puno: ['Puno', 'Chucuito', 'Yunguyo'],
          Melgar: ['Ayaviri', 'Lampa'],
          SanRoman: ['Juliaca', 'San Miguel'],
        },
        Ancash: {
          Huaraz: ['Huaraz', 'Carhuaz', 'Yungay'],
          Áncash: ['Aija', 'Huarmey'],
          Huaylas: ['Caraz', 'Yungay'],
        },
        Cajamarca: {
          Cajamarca: ['Cajamarca', 'Jaén', 'San Ignacio'],
          Celendín: ['Celendín', 'Bambamarca'],
          Chota: ['Chota', 'Llama'],
        },
        LaLibertad: {
          Trujillo: ['Trujillo', 'La Esperanza', 'El Porvenir'],
          Pacasmayo: ['Pacasmayo', 'Jequetepeque'],
          Ascope: ['Ascope', 'Chicama'],
        },
        Lambayeque: {
          Chiclayo: ['Chiclayo', 'Pimentel', 'Lambayeque'],
          Ferreñafe: ['Ferreñafe', 'Túcume'],
          Lambayeque: ['Chongoyape', 'Eten'],
        },
      };
      resolve(ubigeoPeru);
    }, 1000); // Simulamos un retardo de 1 segundo
  });
};
