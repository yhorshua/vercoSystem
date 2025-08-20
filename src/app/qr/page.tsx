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
            format: [100, 50],
        });

        articulos.forEach(({ descripcion, color, imagen, tallas }, idxArt) => {
            tallas.forEach(({ talla, cantidad }, idxTalla) => {
                for (let i = 0; i < cantidad; i++) {
                    const margenX = 3;
                    const margenY = 3;
                    const ancho = 94;
                    const alto = 44;

                    doc.setLineWidth(0.2);
                    doc.rect(margenX, margenY, ancho, alto);
                    doc.line(margenX + 45, margenY, margenX + 45, margenY + alto);

                    // ========== IZQUIERDA ========== 
                    const logo = new Image();
                    logo.src = '/img/logoverco2.png';
                    const logoWidth = 38;
                    const logoHeight = 12;
                    const logoX = margenX + (45 - logoWidth) / 2;
                    const logoY = margenY + 2;
                    doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);

                    if (imagen) {
                        const imgWidth = 40;   
                        const imgHeight = 22;  
                        const imgX = margenX + (45 - imgWidth) / 2;
                        const imgY = margenY + 15;
                        doc.addImage(imagen, 'PNG', imgX, imgY, imgWidth, imgHeight);
                    }

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.text(descripcion, margenX + 25, margenY + alto - 2, { align: 'center' });

                    // ========== DERECHA ========== 
                    doc.setFillColor(0, 0, 0);
                    doc.rect(margenX + 46, margenY + 1, 23, 22, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.text('TALLA', margenX + 57, margenY + 7, { align: 'center' });
                    doc.setFontSize(18);
                    doc.text(talla, margenX + 57, margenY + 17, { align: 'center' });

                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(10);
                    doc.text(color, margenX + 72, margenY + 8, { maxWidth: 25 });

                    doc.line(margenX + 46, margenY + 27, margenX + ancho, margenY + 27);

                    const canvas = document.createElement('canvas');
                    JsBarcode(canvas, `${descripcion}${talla}${tarjeta}`, {
                        format: 'CODE128',
                        displayValue: false,
                        height: 20,
                    });
                    const barcodeImg = canvas.toDataURL();
                    doc.addImage(barcodeImg, 'PNG', margenX + 47, margenY + 30, 46, 10);

                    doc.setFontSize(8);
                    doc.text(`${descripcion}${talla}${tarjeta}`, margenX + 70, margenY + alto - 1, { align: 'center' });

                    if (!(idxArt === articulos.length - 1 && idxTalla === tallas.length - 1 && i === cantidad - 1)) {
                        doc.addPage([100, 50]);
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
                            <div key={j} className={styles.tallaRow}>
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
