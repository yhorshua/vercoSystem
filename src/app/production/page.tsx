'use client';

import React, { useState } from 'react';
import Swal from 'sweetalert2';
import styles from './production.module.css'; // Asegúrate de tener el archivo de CSS

const IngresoProduccion = () => {
  const [tarjetaProduccion, setTarjetaProduccion] = useState('');
  const [articulo, setArticulo] = useState<any | null>(null);
  const [codigoBarra, setCodigoBarra] = useState('');
  const [cantidad, setCantidad] = useState(0);

  // Simulamos la base de datos de tarjetas de producción
  const productosDatabase = [
    {
      tarjeta: '12345', // Número de tarjeta de producción
      articulo: 'Camisa de Algodón',
      plano: 'Plano A',
      color: 'Rojo',
      serie: 'S',
      tallas: [
        { talla: 'S', cantidad: 100 },
        { talla: 'M', cantidad: 150 },
        { talla: 'L', cantidad: 200 },
      ],
    },
    {
      tarjeta: '67890',
      articulo: 'Pantalón de Mezclilla',
      plano: 'Plano B',
      color: 'Azul',
      serie: 'M',
      tallas: [
        { talla: 'M', cantidad: 120 },
        { talla: 'L', cantidad: 180 },
        { talla: 'XL', cantidad: 220 },
      ],
    },
  ];

  // Función para buscar la tarjeta de producción y mostrar los detalles
  const buscarArticulo = (tarjeta: string) => {
    const articuloEncontrado = productosDatabase.find((producto) => producto.tarjeta === tarjeta);
    if (articuloEncontrado) {
      setArticulo(articuloEncontrado);
    } else {
      setArticulo(null);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Tarjeta de producción no encontrada',
      });
    }
  };

  // Función para manejar el escaneo del código de barras
  const manejarEscaneo = () => {
    if (articulo) {
      // Buscar la talla correspondiente dentro del artículo
      const tallaEncontrada = articulo.tallas.find((t: any) => t.talla === codigoBarra);

      if (tallaEncontrada) {
        // Incrementamos la cantidad de la talla correspondiente
        if (cantidad < tallaEncontrada.cantidad) {
          tallaEncontrada.cantidad += 1;
          Swal.fire({
            icon: 'success',
            title: 'Cantidad registrada correctamente',
            text: `Se han registrado 1 unidad de talla ${codigoBarra} (${articulo.articulo})`,
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Cantidad excede el stock disponible',
          });
        }
      } else {
        // Si la talla no corresponde
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Código de barra no corresponde a una talla registrada',
        });
      }
    }
  };

  return (
    <div className={styles.ingresoProduccionContainer}>
      <h2>Ingreso de Producción</h2>

      {/* Campo para ingresar la tarjeta de producción */}
      <div className={styles.cardContainer}>
        <input
          type="text"
          value={tarjetaProduccion}
          onChange={(e) => setTarjetaProduccion(e.target.value)}
          placeholder="Ingrese la Tarjeta de Producción"
          className={styles.inputField}
        />
        <button onClick={() => buscarArticulo(tarjetaProduccion)} className={styles.button}>
          Buscar
        </button>
      </div>

      {/* Mostrar los detalles del artículo si se encuentra */}
      {articulo && (
        <div className={styles.articuloDetalles}>
          <h3>Artículo: {articulo.articulo}</h3>
          <p>Plano: {articulo.plano}</p>
          <p>Color: {articulo.color}</p>
          <p>Serie: {articulo.serie}</p>
          <ul>
            {articulo.tallas.map((talla: any, index: number) => (
              <li key={index}>
                Talla: {talla.talla} - Cantidad disponible: {talla.cantidad}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Campo para ingresar el código de barras */}
      <div className={styles.cardContainer}>
        <input
          type="text"
          value={codigoBarra}
          onChange={(e) => setCodigoBarra(e.target.value)}
          placeholder="Escanee el código de barra"
          className={styles.inputField}
        />
      </div>

      {/* Campo para ingresar la cantidad (en este caso es siempre 1 por escaneo) */}
      <div className={styles.cardContainer}>
        <input
          type="number"
          value={cantidad}
          onChange={(e) => setCantidad(Number(e.target.value))}
          placeholder="Cantidad a ingresar"
          className={styles.inputField}
          disabled
        />
      </div>

      {/* Botón para validar el escaneo y cantidad */}
      <div className={styles.cardContainer}>
        <button onClick={manejarEscaneo} className={styles.button}>
          Registrar
        </button>
      </div>
    </div>
  );
};

export default IngresoProduccion;
