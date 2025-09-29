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
        { codigo: '', descripcion: '', color: '', imagen: '', tallas: [{ talla: '', cantidad: 1 }] },
    ]);

    const handleArticuloChange = (index: number, field: string, value: string | number) => {
        const nuevos = [...articulos];
        nuevos[index] = { ...nuevos[index], [field]: value };
        setArticulos(nuevos);
    };

    const handleTallaChange = (indexArticulo: number, indexTalla: number, field: string, value: string | number) => {
        const nuevos = [...articulos];
        nuevos[indexArticulo].tallas[indexTalla] = { ...nuevos[indexArticulo].tallas[indexTalla], [field]: value };
        setArticulos(nuevos);
    };

    const handleImagenChange = (index: number, file: File | null) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const nuevos = [...articulos];
            nuevos[index].imagen = reader.result as string;
            setArticulos(nuevos);
        };
        reader.readAsDataURL(file);
    };

    const agregarTalla = (indexArticulo: number) => {
        const nuevos = [...articulos];
        nuevos[indexArticulo].tallas.push({ talla: '', cantidad: 1 });
        setArticulos(nuevos);
    };

    const eliminarTalla = (indexArticulo: number, indexTalla: number) => {
        const nuevos = [...articulos];
        nuevos[indexArticulo].tallas = nuevos[indexArticulo].tallas.filter((_, i) => i !== indexTalla);
        setArticulos(nuevos);
    };

    const agregarArticulo = () => {
        setArticulos([...articulos, { codigo: '', descripcion: '', color: '', imagen: '', tallas: [{ talla: '', cantidad: 1 }] }]);
    };

    const eliminarArticulo = (index: number) => {
        const nuevos = articulos.filter((_, i) => i !== index);
        setArticulos(nuevos);
    };

    const generarPDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [100, 50],
        });

        articulos.forEach(({ codigo, descripcion, color, imagen, tallas }, idxArt) => {
            tallas.forEach(({ talla, cantidad }, idxTalla) => {
                for (let i = 0; i < cantidad; i++) {
                    const margenX = 3;
                    const margenY = 3;
                    const ancho = 94;
                    const alto = 44;

                    // Dibuja el borde rojo alrededor de la etiqueta
                    doc.setDrawColor(255, 0, 0); // Rojo
                    doc.setLineWidth(1);
                    doc.rect(margenX, margenY, ancho, alto);

                    // Sección izquierda con logo y detalles
                    const logo = new Image();
                    logo.src = '/img/logoverco2.png';
                    const logoWidth = 35;
                    const logoHeight = 10;
                    const logoX = margenX + (45 - logoWidth) / 2;
                    const logoY = margenY + 2;
                    doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);

                    if (imagen) {
                        const imgWidth = 50;
                        const imgHeight = 30;
                        const imgX = margenX + (45 - imgWidth) / 2;
                        const imgY = margenY + 10;
                        doc.addImage(imagen, 'PNG', imgX, imgY, imgWidth, imgHeight);
                    }

                    // Código de artículo
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.text(codigo, margenX + 23, margenY + alto - 2, { align: 'center' });

                    // Sección derecha: detalles de talla, color y fechas
                    doc.setFillColor(255, 0, 0);
                    doc.rect(margenX + 46, margenY + 0, 20, 27, 'F');
                    doc.setFont('Straider', 'bold');
                    doc.setFontSize(11);
                    doc.text(descripcion, margenX + 68, margenY + 8, { maxWidth: 25 });

                    doc.setFillColor(255, 0, 0); // Rojo
                    doc.setTextColor(255, 255, 255); // Blanco para el texto
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(14);
                    doc.text('TALLA', margenX + 56, margenY + 7, { align: 'center' }); // Texto "TALLA"

                    // Cambiar el texto de la talla a blanco sobre fondo rojo
                    doc.setFontSize(38);
                    doc.setFont('helvetica', 'bold');
                    doc.text(talla, margenX + 56, margenY + 22, { align: 'center' }); // Texto de la talla

                    doc.setTextColor(0, 0, 0);
                    doc.setFontSize(8);
                    doc.text('COLOR:', margenX + 68, margenY + 14, { maxWidth: 25 });
                    doc.text(color, margenX + 68, margenY + 18, { maxWidth: 25 });

                    doc.line(margenX + 46, margenY + 27, margenX + ancho, margenY + 27);

                    // Código de barras
                    const canvas = document.createElement('canvas');
                    JsBarcode(canvas, `${codigo}${talla}${tarjeta}`, {
                        format: 'CODE128',
                        displayValue: false,
                        height: 20,
                    });
                    const barcodeImg = canvas.toDataURL();
                    doc.addImage(barcodeImg, 'PNG', margenX + 47, margenY + 30, 46, 10);

                    // Fechas y tarjeta de producción
                    doc.setFontSize(6);
                    doc.text(`${codigo}${talla}${tarjeta}`, margenX + 70, margenY + alto - 3, { align: 'center' });
                    doc.text(`${fechaInicio.replaceAll('-', '')}`, margenX + 65, margenY + alto - 13, { align: 'right' });
                    doc.text(`${fechaFin.replaceAll('-', '')}`, margenX + 75, margenY + alto - 13, { align: 'left' });

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
                        {/* Input para el código */}
                        <input
                            placeholder="Código"
                            value={a.codigo}
                            onChange={(e) => handleArticuloChange(i, 'codigo', e.target.value)}
                            className={styles.inputSmall}
                        />
                        {/* Input para la descripción */}
                        <input
                            placeholder="Descripción"
                            value={a.descripcion}
                            onChange={(e) => handleArticuloChange(i, 'descripcion', e.target.value)}
                            className={styles.inputSmall}
                        />
                        {/* Input para el color */}
                        <input
                            placeholder="Color"
                            value={a.color}
                            onChange={(e) => handleArticuloChange(i, 'color', e.target.value)}
                            className={styles.inputSmall}
                        />
                        {/* Input para la imagen */}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImagenChange(i, e.target.files?.[0] || null)}
                            className={styles.inputSmall}
                        />

                        <h4>Tallas</h4>
                        {a.tallas.map((t, j) => (
                            <div key={j} className={styles.tallaInputs}>
                                {/* Input para la talla */}
                                <input
                                    placeholder="Talla"
                                    value={t.talla}
                                    onChange={(e) => handleTallaChange(i, j, 'talla', e.target.value)}
                                    className={styles.inputSmall}
                                />
                                {/* Input para la cantidad */}
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
