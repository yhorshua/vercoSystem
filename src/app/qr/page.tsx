'use client';

import { useState } from 'react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import styles from './EtiquetaGenerator.module.css';

export default function EtiquetaGenerator() {
    const [tarjeta, setTarjeta] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // Lista de artículos, cada artículo tiene una descripción, color, imagen y tallas con sus cantidades
    const [articulos, setArticulos] = useState([
        { descripcion: '', color: '', imagen: '', tallas: [{ talla: '', cantidad: 1 }] },
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

    // Función para manejar el cambio de la imagen
    const handleImagenChange = (index: number, file: File | null) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const nuevos = [...articulos];
            // Asignamos la imagen solo al artículo (primera talla) si no tiene imagen asignada
            nuevos[index].imagen = reader.result as string;
            setArticulos(nuevos);
        };
        reader.readAsDataURL(file);
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
        setArticulos([...articulos, { descripcion: '', color: '', imagen: '', tallas: [{ talla: '', cantidad: 1 }] }]);
    };

    // Función para eliminar un artículo    
    const eliminarArticulo = (index: number) => {
        const nuevos = articulos.filter((_, i) => i !== index);
        setArticulos(nuevos);
    };

    // Generar el PDF con los artículos y sus etiquetas
const generarPDF = () => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [100, 50],  // Tamaño de la página (100mm de ancho, 50mm de alto)
    });

    const margenX = 2;  // Margen izquierdo de 2mm
    const margenY = 2;  // Margen superior de 2mm
    const anchoEtiqueta = 50;   // 50mm de ancho para cada mitad de la etiqueta (para 2 columnas)
    const altoEtiqueta = 23.5;    // 25mm de alto para cada etiqueta (para 2 filas)
    const espacioEntreEtiquetas = 0.5;  // 2mm de separación entre etiquetas para ajustarlas mejor

    let xPos = margenX;  // Posición inicial X (columna 1)
    let yPos = margenY;  // Posición inicial Y (fila 1)
    let columnaActual = 0;  // Control de la columna actual (0 para izquierda, 1 para derecha)
    let filaActual = 0;  // Control de la fila actual (0 para arriba, 1 para abajo)

    articulos.forEach(({ descripcion, color, tallas }, idxArt) => {
        tallas.forEach(({ talla, cantidad }, idxTalla) => {
            for (let i = 0; i < cantidad; i++) {
                // Descripción - centrado
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);  // Tamaño de fuente pequeño para la descripción
                const descX = xPos + 1;  // Lado izquierdo ajustado
                doc.text(descripcion, descX, yPos + 10, { maxWidth: anchoEtiqueta - 1 });

                // Color - centrado
                doc.setFontSize(8);  // Para color más pequeño
                const colorText = `${color}`;
                doc.text(colorText, descX, yPos + 6);

                // Tarjeta de producción y fechas
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(4);  // Para las fechas
                const tarjetaText = `${tarjeta}`;
                doc.text(tarjetaText, xPos + anchoEtiqueta - 10 - doc.getTextWidth(tarjetaText), yPos + 2);

                const fechaTextInicio = `${fechaInicio}`;
                const fechaTextFin = `${fechaFin}`;
                doc.text(fechaTextInicio, xPos + anchoEtiqueta - 10 - doc.getTextWidth(fechaTextInicio), yPos + 4);
                doc.text(fechaTextFin, xPos + anchoEtiqueta - 10 - doc.getTextWidth(fechaTextFin), yPos + 6);

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);  // Tamaño de fuente para la talla
                doc.text(talla, xPos + anchoEtiqueta - 20 - doc.getTextWidth(talla), yPos + 10);

                // Generar código de barras
                const canvas = document.createElement('canvas');
                JsBarcode(canvas, `${descripcion}${talla}`, {
                    format: 'CODE128',
                    displayValue: false,
                    height: 10,  // Altura optimizada
                    width: 1,  // Mejor visibilidad
                });
                const barcodeImg = canvas.toDataURL();
                doc.addImage(barcodeImg, 'PNG', xPos + 1, yPos + 14, anchoEtiqueta - 10, 6);  // El código de barras ajustado

                // Mover la posición para la siguiente etiqueta
                if (columnaActual === 0) {
                    // Si estamos en la primera columna, mover a la segunda columna
                    xPos += anchoEtiqueta + espacioEntreEtiquetas;  // Deja un margen entre las etiquetas
                    columnaActual = 1;  // Cambiar a la segunda columna
                } else {
                    // Si ya hemos colocado dos etiquetas, mover a la siguiente fila
                    xPos = margenX;  // Reiniciar la posición X (primera columna)
                    yPos += altoEtiqueta + espacioEntreEtiquetas;  // Mover hacia abajo para la siguiente fila
                    columnaActual = 0;  // Cambiar a la primera columna
                }

                // Verificar si hemos alcanzado el final de la página
                if (yPos + altoEtiqueta > 50) {
                    // Si se alcanza el final de la página, agregar una nueva página y restablecer las posiciones
                    doc.addPage([100, 50]); // Agregar nueva página (misma altura de página)
                    yPos = margenY; // Reiniciar la posición Y (parte superior)
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
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImagenChange(i, e.target.files?.[0] || null)}
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