'use client';

import { useState } from 'react';
import JsBarcode from 'jsbarcode';
import { jsPDF } from 'jspdf';
import styles from './EtiquetaGenerator.module.css';

export default function EtiquetaGenerator() {
    const [tarjeta, setTarjeta] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    // Rango de tallas por categoría
    const rangosTallas: Record<string, number[]> = {
        adulto: Array.from({ length: 44 - 38 + 1 }, (_, i) => 38 + i),
        mediano: Array.from({ length: 37 - 33 + 1 }, (_, i) => 33 + i),
        junior: Array.from({ length: 32 - 27 + 1 }, (_, i) => 27 + i),
    };

    const [articulos, setArticulos] = useState([
        { codigo: '', descripcion: '', color: '', imagen: '', categoria: '', tallas: [] as { talla: string; cantidad: number }[] },
    ]);

    const handleArticuloChange = (index: number, field: string, value: string | number) => {
        const nuevos = [...articulos];
        nuevos[index] = { ...nuevos[index], [field]: value };
        setArticulos(nuevos);
    };

    const handleTallaChange = (indexArticulo: number, indexTalla: number, value: number) => {
        const nuevos = [...articulos];
        nuevos[indexArticulo].tallas[indexTalla].cantidad = value;
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

    // Cuando se selecciona categoría → setear las tallas
    const handleCategoriaChange = (index: number, categoria: string) => {
        const nuevos = [...articulos];
        nuevos[index].categoria = categoria;
        nuevos[index].tallas = rangosTallas[categoria].map((t) => ({ talla: String(t), cantidad: 0 }));
        setArticulos(nuevos);
    };

    const agregarArticulo = () => {
        setArticulos([...articulos, { codigo: '', descripcion: '', color: '', imagen: '', categoria: '', tallas: [] }]);
    };

    const eliminarArticulo = (index: number) => {
        setArticulos(articulos.filter((_, i) => i !== index));
    };

    const generarPDF = () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [100, 50],
        });

        articulos.forEach(({ codigo, descripcion, color, imagen, tallas }, idxArt) => {
            tallas
                .filter(({ cantidad }) => cantidad > 0) // solo tallas con cantidad
                .forEach(({ talla, cantidad }, idxTalla) => {
                    for (let i = 0; i < cantidad; i++) {
                        const margenX = 3;
                        const margenY = 3;
                        const ancho = 94;
                        const alto = 44;

                        doc.setDrawColor(255, 0, 0);
                        doc.setLineWidth(1);
                        doc.rect(margenX, margenY, ancho, alto);

                        // Logo
                        const logo = new Image();
                        logo.src = '/img/logoverco2.png';
                        doc.addImage(logo, 'PNG', margenX + 5, margenY + 2, 35, 10);

                        if (imagen) {
                            doc.addImage(imagen, 'PNG', margenX + 5, margenY + 12, 35, 25);
                        }

                        // Código
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(12);
                        doc.text(codigo, margenX + 23, margenY + alto - 2, { align: 'center' });

                        // Panel rojo con talla
                        doc.setFillColor(255, 0, 0);
                        doc.rect(margenX + 46, margenY, 20, 27, 'F');
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(255, 255, 255);
                        doc.setFontSize(14);
                        doc.text('TALLA', margenX + 56, margenY + 7, { align: 'center' });

                        doc.setFontSize(38);
                        doc.text(talla, margenX + 56, margenY + 22, { align: 'center' });

                        // Color y descripción
                        doc.setTextColor(0, 0, 0);
                        doc.setFontSize(8);
                        doc.text('COLOR:', margenX + 68, margenY + 14);
                        doc.text(color, margenX + 68, margenY + 18, { maxWidth: 25 });

                        doc.setFontSize(9);
                        doc.text(descripcion, margenX + 68, margenY + 8, { maxWidth: 25 });

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

                        // Fechas
                        doc.setFontSize(6);
                        doc.text(`${codigo}${talla}${tarjeta}`, margenX + 70, margenY + alto - 3, { align: 'center' });
                        doc.text(`${fechaInicio.replaceAll('-', '')}`, margenX + 65, margenY + alto - 13, { align: 'right' });
                        doc.text(`${fechaFin.replaceAll('-', '')}`, margenX + 75, margenY + alto - 13, { align: 'left' });

                        // Nueva página si no es la última
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
                            placeholder="Código"
                            value={a.codigo}
                            onChange={(e) => handleArticuloChange(i, 'codigo', e.target.value)}
                            className={styles.inputLarge}
                        />
                        <input
                            placeholder="Descripción"
                            value={a.descripcion}
                            onChange={(e) => handleArticuloChange(i, 'descripcion', e.target.value)}
                            className={styles.inputLarge}
                        />
                        <input
                            placeholder="Color"
                            value={a.color}
                            onChange={(e) => handleArticuloChange(i, 'color', e.target.value)}
                            className={styles.inputLarge}
                        />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImagenChange(i, e.target.files?.[0] || null)}
                            className={styles.inputLarge}
                        />
                        <div className={styles.categoriaSelect}>
                            {/* Selector de categoría */}
                            <select
                                value={a.categoria}
                                onChange={(e) => handleCategoriaChange(i, e.target.value)}
                                className={styles.inputLarge}
                            >
                                <option value="adulto">Adulto (38-44)</option>
                                <option value="mediano">Mediano (33-37)</option>
                                <option value="junior">Junior (27-32)</option>
                            </select>
                        </div>  {/* 🔥 cierro aquí */}

                        {/* 🔽 Bloque de tallas abajo */}
                        {a.tallas.length > 0 && (
                            <div className={styles.tallasWrapper}>
                                <h4>Tallas</h4>
                                <div className={styles.tallasGrid}>
                                    {a.tallas.map((t, j) => (
                                        <div key={j} className={styles.tallaInputs}>
                                            <input
                                                value={t.talla}
                                                readOnly
                                                className={styles.inputSmall}
                                            />
                                            <input
                                                type="number"
                                                min={0}
                                                value={t.cantidad}
                                                onChange={(e) => handleTallaChange(i, j, Number(e.target.value))}
                                                className={styles.inputSmall}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button onClick={() => eliminarArticulo(i)} className={styles.btnDelete}>Eliminar Artículo</button>
                    </div>
           
                ))}

            <button onClick={agregarArticulo} className={styles.btnAdd}>➕ Agregar Artículo</button>

            <div className={styles.actions}>
                <button onClick={generarPDF} className={styles.btnPrimary}>📄 Generar PDF</button>
            </div>
        </div>
        </div >
    );
}
