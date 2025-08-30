export const getStockData = async () => {
  return [
    // MODELO INFINITY FULB
    { codigo: '15025AJ', serie: 'FULB', descripcion: 'MODELO INFINITY AZULINO/ JADE 38-43', precio: 92,tallas: { '38': 53, '39': 98, '40': 100, '41': 51, '42': 34, '43': 0 }, saldo: 336 },
    { codigo: '15025BN', serie: 'FULB', descripcion: 'MODELO INFINITY BLANCO/ NARANJA 38-43', precio: 92,tallas: { '38': 31, '39': 52, '40': 55, '41': 23, '42': 15, '43': 0 }, saldo: 176 },
    { codigo: '15025GV', serie: 'FULB', descripcion: 'MODELO INFINITY GRAY/ VERDE 38-43', precio: 92,tallas: { '38': 5, '39': 12, '40': 10, '41': 4, '42': 1, '43': 0 }, saldo: 32 },
    { codigo: '15025JR', serie: 'FULB', descripcion: 'MODELO INFINITY JADE/ ROSADO 38-43', precio: 92,tallas: { '38': 66, '39': 100, '40': 106, '41': 64, '42': 42, '43': 0 }, saldo: 378 },
    { codigo: '15025NM', serie: 'FULB', descripcion: 'MODELO INFINITY NEGRO/ MORADO 38-43', precio: 92,tallas: { '38': 0, '39': 0, '40': 0, '41': 0, '42': 0, '43': 0 }, saldo: 0 },
    { codigo: '15025VT', serie: 'FULB', descripcion: 'MODELO INFINITY VERDE/ TURQUEZA 38-43', precio: 92,tallas: { '38': 56, '39': 91, '40': 93, '41': 54, '42': 32, '43': 0 }, saldo: 326 },

    // MODELO INFINITY CHIMP
    { codigo: 'CH025AJ', serie: 'CHIMP', descripcion: 'MODELO INFINITY AZULINO/ JADE 38-42', precio: 92,tallas: { '38': 0, '39': 1, '40': 0, '41': 0, '42': 0, '43': 0 }, saldo: 1 },
    { codigo: 'CH025BN', serie: 'CHIMP', descripcion: 'MODELO INFINITY BLANCO/ NARANJA 38-42', precio: 92,tallas: { '38': 0, '39': 0, '40': 1, '41': 0, '42': 0, '43': 0 }, saldo: 1 },
    { codigo: 'CH025GV', serie: 'CHIMP', descripcion: 'MODELO INFINITY GRAY/ VERDE 38-42', precio: 92,tallas: { '38': 0, '39': 0, '40': 0, '41': 0, '42': 0, '43': 0 }, saldo: 0 },
    { codigo: 'CH025JR', serie: 'CHIMP', descripcion: 'MODELO INFINITY JADE/ ROSADO 38-42', precio: 92,tallas: { '38': 0, '39': 3, '40': 1, '41': 0, '42': 0, '43': 0 }, saldo: 4 },
    { codigo: 'CH025NM', serie: 'CHIMP', descripcion: 'MODELO INFINITY NEGRO/ MORADO 38-42', precio: 92,tallas: { '38': 0, '39': 0, '40': 1, '41': 0, '42': 0, '43': 0 }, saldo: 1 },
    { codigo: 'CH025VT', serie: 'CHIMP', descripcion: 'MODELO INFINITY VERDE/ TURQUEZA 38-42', precio: 92,tallas: { '38': 0, '39': 7, '40': 1, '41': 0, '42': 0, '43': 0 }, saldo: 8 },

    // MODELO EVOLUTION FULB
    { codigo: 'A3024AJ', serie: 'FULB', descripcion: 'MODELO EVOLUTION AZULINO/ JADE 38-43', precio: 85,tallas: { '38': 4, '39': 13, '40': 11, '41': 4, '42': 0, '43': 0 }, saldo: 32 },
    { codigo: 'A3024BC', serie: 'FULB', descripcion: 'MODELO EVOLUTION BLANCO/ CORAL 38-43', precio: 85,tallas: { '38': 31, '39': 60, '40': 51, '41': 27, '42': 27, '43': 1 }, saldo: 197 },
    { codigo: 'A3024CM', serie: 'FULB', descripcion: 'MODELO EVOLUTION CORAL/ AMARILLO 38-43', precio: 85,tallas: { '38': 46, '39': 93, '40': 96, '41': 42, '42': 9, '43': 1 }, saldo: 287 },
    { codigo: 'A3024GV', serie: 'FULB', descripcion: 'MODELO EVOLUTION GRIS/ VERDE 38-43', precio: 85,tallas: { '38': 0, '39': 5, '40': 1, '41': 0, '42': 0, '43': 0 }, saldo: 6 },
    { codigo: 'A3024JF', serie: 'FULB', descripcion: 'MODELO EVOLUTION JADE/ FUCSIA 38-43', precio: 85,tallas: { '38': 154, '39': 232, '40': 249, '41': 136, '42': 111, '43': 8 }, saldo: 890 },
    { codigo: 'A3024MC', serie: 'FULB', descripcion: 'MODELO EVOLUTION AMARILLO/ CORAL 38-43', precio: 85,tallas: { '38': 134, '39': 213, '40': 225, '41': 121, '42': 100, '43': 4 }, saldo: 797 },
    { codigo: 'A3024NM', serie: 'FULB', descripcion: 'MODELO EVOLUTION BLACK/ BROWN 38-43', precio: 85,tallas: { '38': 0, '39': 0, '40': 0, '41': 0, '42': 0, '43': 0 }, saldo: 0 },
    { codigo: 'A3024NR', serie: 'FULB', descripcion: 'MODELO EVOLUTION NEGRO/ ROJO 38-43', precio: 85,tallas: { '38': 15, '39': 30, '40': 31, '41': 6, '42': 0, '43': 0 }, saldo: 82 },

    // MODELO EVOLUTION CHIMP
    { codigo: 'CH024AJ', serie: 'CHIMP', descripcion: 'MODELO EVOLUTION AZUL/ JADE 38-43', precio: 85,tallas: { '38': 0, '39': 5, '40': 7, '41': 0, '42': 0, '43': 0 }, saldo: 12 },
    { codigo: 'CH024BC', serie: 'CHIMP', descripcion: 'MODELO EVOLUTION BLANCO/ CORAL 38-43', precio: 85,tallas: { '38': 0, '39': 0, '40': 0, '41': 0, '42': 0, '43': 0 }, saldo: 0 },
    { codigo: 'CH024CM', serie: 'CHIMP', descripcion: 'MODELO EVOLUTION CORAL/ AMARILLO 38-43', precio: 85,tallas: { '38': 44, '39': 108, '40': 109, '41': 61, '42': 14, '43': 1 }, saldo: 337 },
    { codigo: 'CH024GV', serie: 'CHIMP', descripcion: 'MODELO EVOLUTION GRIS/ VERDE 38-43', precio: 85,tallas: { '38': 7, '39': 29, '40': 28, '41': 9, '42': 1, '43': 0 }, saldo: 74 },
    { codigo: 'CH024JF', serie: 'CHIMP', descripcion: 'MODELO EVOLUTION JADE/ FUCSIA 38-43', precio: 85,tallas: { '38': 3, '39': 13, '40': 10, '41': 4, '42': 0, '43': 0 }, saldo: 30 },
    { codigo: 'CH024MC', serie: 'CHIMP', descripcion: 'MODELO EVOLUTION AMARILLO/ CORAL 38-43', precio: 85,tallas: { '38': 8, '39': 19, '40': 23, '41': 8, '42': 0, '43': 0 }, saldo: 58 },
    { codigo: 'CH024NM', serie: 'CHIMP', descripcion: 'MODELO EVOLUTION BLACK/ BROWN 38-43', precio: 85,tallas: { '38': 0, '39': 0, '40': 0, '41': 0, '42': 0, '43': 0 }, saldo: 0 },
    { codigo: 'CH024NR', serie: 'CHIMP', descripcion: 'MODELO EVOLUTION NEGRO/ ROJO 38-43', precio: 85,tallas: { '38': 0, '39': 4, '40': 4, '41': 0, '42': 0, '43': 0 }, saldo: 8 },
  ];
};