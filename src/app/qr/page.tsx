'use client';

import { useState } from 'react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import styles from './EtiquetaGenerator.module.css';

export default function EtiquetaGenerator() {
    const [tarjeta, setTarjeta] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // Lista de artículos, cada artículo tiene una descripción, color y tallas con sus cantidades
    const [articulos, setArticulos] = useState([
        { articulo: '', descripcion: '', color: '', tallas: [{ talla: '', cantidad: 1 }] },
    ]);

    // Función para manejar los cambios en los campos de artículo
    const handleArticuloChange = (index: number, field: string, value: string | number) => {
        const nuevos = [...articulos];
        nuevos[index] = { ...nuevos[index], [field]: value };
        setArticulos(nuevos);
    };

    // Función para manejar los cambios en las tallas de cada artículo
    const handleTallaChange = (indexArticulo: number, indexTalla: number, field: string, value: string | number) => {
        const nuevos = [...articulos];
        nuevos[indexArticulo].tallas[indexTalla] = { ...nuevos[indexArticulo].tallas[indexTalla], [field]: value };
        setArticulos(nuevos);
    };

    // Función para agregar una nueva talla dentro de un artículo
    const agregarTalla = (indexArticulo: number) => {
        const nuevos = [...articulos];
        nuevos[indexArticulo].tallas.push({ talla: '', cantidad: 1 });
        setArticulos(nuevos);
    };

    // Función para eliminar una talla dentro de un artículo
    const eliminarTalla = (indexArticulo: number, indexTalla: number) => {
        const nuevos = [...articulos];
        nuevos[indexArticulo].tallas = nuevos[indexArticulo].tallas.filter((_, i) => i !== indexTalla);
        setArticulos(nuevos);
    };

    // Función para agregar un nuevo artículo
    const agregarArticulo = () => {
        setArticulos([...articulos, { articulo: '', descripcion: '', color: '', tallas: [{ talla: '', cantidad: 1 }] }]);
    };

    // Función para eliminar un artículo
    const eliminarArticulo = (index: number) => {
        const nuevos = articulos.filter((_, i) => i !== index);
        setArticulos(nuevos);
    };

    // Generar el PDF con los artículos y sus etiquetas
const generarPDF = () => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',  // Tamaño A4 (210mm x 297mm)
    });

    const margenX = 5;  // Margen izquierdo de 5mm
    const margenY = 5;  // Margen superior de 5mm
    const anchoEtiqueta = 50;   // 5 cm de ancho (50mm)
    const altoEtiqueta = 25;    // 2.5 cm de largo (25mm)
    const espacioEntreEtiquetas = 3;  // 3mm de separación entre etiquetas

    let xPos = margenX;
    let yPos = margenY;

    let columnaActual = 0;  // Controlar la columna actual (0 para izquierda, 1 para derecha)

    articulos.forEach(({ articulo, descripcion, color, tallas }, idxArt) => {
        tallas.forEach(({ talla, cantidad }, idxTalla) => {
            for (let i = 0; i < cantidad; i++) {
                // Ajustamos el tamaño de la fuente para que encaje dentro de la etiqueta
                doc.setFont('helvetica', 'bold');

                // Descripción - centrado
                doc.setFontSize(10);  // Tamaño de fuente pequeño para el código de artículo
                const descripcionWidth = doc.getTextWidth(descripcion);
                const descX = xPos + 1;  // Lado izquierdo
                doc.text(descripcion, descX, yPos + 2, { maxWidth: anchoEtiqueta - 2 });

                // Color - centrado
                doc.setFontSize(10);  // Para color más pequeño
                const colorText = `${color}`;
                doc.text(colorText, descX, yPos + 7);

                // Lado izquierdo de la etiqueta: Código de artículo, talla, descripción, color
                doc.setFontSize(12);  // Tamaño de fuente pequeño para el código de artículo
                const articuloText = `${articulo}`;
                doc.text(articuloText, descX, yPos + 14);

                // Lado derecho de la etiqueta: Tarjeta de producción, fechas
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(4);  // Tamaño más pequeño para las fechas
                const tarjetaText = `${tarjeta}`;
                doc.text(tarjetaText, xPos + anchoEtiqueta - 8 - doc.getTextWidth(tarjetaText), yPos + 0);

                const fechaTextInicio = `${fechaInicio}`;
                const fechaTextFin = `${fechaFin}`;
                doc.text(fechaTextInicio, xPos + anchoEtiqueta - 8 - doc.getTextWidth(fechaTextInicio), yPos + 2);
                doc.text(fechaTextFin, xPos + anchoEtiqueta - 8 - doc.getTextWidth(fechaTextFin), yPos + 4);

                doc.setFontSize(13); // Tamaño de fuente para la talla
                doc.text(talla, xPos + anchoEtiqueta - 12 - doc.getTextWidth(talla), yPos + 12);

                // Código de barras
                const canvas = document.createElement('canvas');
                JsBarcode(canvas, `${articulo}${talla}`, {
                    format: 'CODE128',
                    displayValue: false,
                    height: 14,  // Altura optimizada
                    width: 1,  // Ajustado para mejor visibilidad
                });
                const barcodeImg = canvas.toDataURL();
                doc.addImage(barcodeImg, 'PNG', xPos + 2, yPos + 17, anchoEtiqueta - 10, 6);  // El código de barras ocupa toda la parte inferior

                // Mover la posición para la siguiente etiqueta
                if (columnaActual === 0) {
                    // Si estamos en la primera columna, mover a la segunda columna
                    xPos += anchoEtiqueta + 5;  // Deja un margen entre las etiquetas
                    columnaActual = 1;  // Cambiar a la segunda columna
                } else {
                    // Si ya hemos colocado dos etiquetas, mover a la siguiente fila
                    xPos = margenX;  // Reiniciar la posición X (primera columna)
                    yPos += altoEtiqueta + espacioEntreEtiquetas;  // Mover hacia abajo para la siguiente fila
                    columnaActual = 0;  // Cambiar a la primera columna
                }

                // Verificar si hemos alcanzado el final de la página
                if (yPos + altoEtiqueta > 297 - margenY) {
                    doc.addPage(); // Agregar una nueva página
                    yPos = margenY; // Reiniciar la posición Y
                    columnaActual = 0; // Reiniciar a la primera columna
                }
            }
        });
    });

    doc.save(`etiquetas_tarjeta_${tarjeta}.pdf`);
};

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>🎫 Generador de Etiquetas</h2>

                <div className={styles.formRow}>
                    <input
                        className={styles.input}
                        placeholder="Tarjeta de Producción"
                        value={tarjeta}
                        onChange={(e) => setTarjeta(e.target.value)}
                    />
                    <input
                        type="date"
                        className={styles.input}
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                    />
                    <input
                        type="date"
                        className={styles.input}
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                    />
                </div>

                <h3 className={styles.subtitle}>📦 Artículos</h3>
                {articulos.map((a, i) => (
                    <div key={i} className={styles.tallaRow}>
                        <input
                            placeholder="Código Artículo"
                            value={a.articulo}
                            onChange={(e) => handleArticuloChange(i, 'articulo', e.target.value)}
                            className={styles.inputSmall}
                        />
                        <input
                            placeholder="Descripción"
                            value={a.descripcion}
                            onChange={(e) => handleArticuloChange(i, 'descripcion', e.target.value)}
                            className={styles.inputSmall}
                        />
                        <input
                            placeholder="Color"
                            value={a.color}
                            onChange={(e) => handleArticuloChange(i, 'color', e.target.value)}
                            className={styles.inputSmall}
                        />

                        <h4>Tallas</h4>
                        {a.tallas.map((t, j) => (
                            <div key={j} className={styles.tallaInputs}>
                                <input
                                    placeholder="Talla"
                                    value={t.talla}
                                    onChange={(e) => handleTallaChange(i, j, 'talla', e.target.value)}
                                    className={styles.inputSmall}
                                />
                                <input
                                    type="number"
                                    placeholder="Cantidad"
                                    value={t.cantidad}
                                    onChange={(e) => handleTallaChange(i, j, 'cantidad', Number(e.target.value))}
                                    className={styles.inputSmall}
                                />
                                <button onClick={() => eliminarTalla(i, j)} className={styles.btnDelete}>✕</button>
                            </div>
                        ))}
                        <button onClick={() => agregarTalla(i)} className={styles.btnSize}>Agregar Talla</button>
                        <button onClick={() => eliminarArticulo(i)} className={styles.btnDelete}>Eliminar Artículo</button>
                    </div>
                ))}
                <button onClick={agregarArticulo} className={styles.btnAdd}>➕ Agregar Artículo</button>

                <div className={styles.actions}>
                    <button onClick={generarPDF} className={styles.btnPrimary}>📄 Generar PDF</button>
                </div>
            </div>
        </div>
    );
}
