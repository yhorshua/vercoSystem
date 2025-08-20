'use client';

import { useState } from 'react';
import styles from './InventoryPage.module.css'; // Asegúrate de tener estilos configurados correctamente

interface Item {
    codigo: string;
    descripcion: string;
    serie: string;
    precio: number;
    cantidades: Record<number, number>; // Cantidad por talla
    total: number;
}

const stockMock: Record<string, { descripcion: string; serie: string; precio: number; stock: Record<number, number> }> = {
    CH025VT: { descripcion: "Zapatilla Importada Evolution Verde/Turqueza", serie: "A", precio: 89, stock: { 38: 12, 39: 5, 40: 9, 41: 6, 42: 10, 43: 7 } },
    A3024JF: { descripcion: "Zapatilla Evolution Jade/Fucsia", serie: "A", precio: 75, stock: { 38: 8, 39: 4, 40: 6, 41: 7, 42: 3, 43: 8 } },
};

export default function InventoryPage() {
    const [items, setItems] = useState<Item[]>([]); // Estado para artículos de inventario
    const [codigoBarras, setCodigoBarras] = useState<string>(''); // Código de barras escaneado
    const [tallasDisponibles, setTallasDisponibles] = useState<number[]>([]); // Tallas disponibles
    const [stockPorTalla, setStockPorTalla] = useState<Record<number, number>>({}); // Stock por talla

    // Lógica para escanear y agregar artículos al inventario
    const handleEscanearCodigo = () => {
        const codigoMayus = codigoBarras.toUpperCase().trim();

        if (codigoMayus.length < 9) {
            alert('Código de barras inválido');
            return;
        }

        const codigoArticulo = codigoMayus.substring(0, 7); // Código de artículo (primeros 7 caracteres)
        const talla = Number(codigoMayus.substring(7, 9)); // Talla (últimos 2 caracteres)

        if (!stockMock[codigoArticulo]) {
            alert('Artículo no encontrado');
            return;
        }

        const producto = stockMock[codigoArticulo];
        if (!tallasDisponibles.includes(talla)) {
            setTallasDisponibles(Object.keys(producto.stock).map(Number)); // Actualizar las tallas disponibles
        }

        // Verificar si el artículo ya está en la tabla
        const itemExistente = items.find(item => item.codigo === codigoArticulo);

        if (itemExistente) {
            // Si ya existe, actualizar la cantidad de la talla correspondiente
            const nuevasCantidades = { ...itemExistente.cantidades, [talla]: (itemExistente.cantidades[talla] || 0) + 1 };
            const updatedItem = { ...itemExistente, cantidades: nuevasCantidades, total: Object.values(nuevasCantidades).reduce((a, b) => a + b, 0) };

            setItems(items.map(item => (item.codigo === codigoArticulo ? updatedItem : item)));
        } else {
            // Si no existe, agregar un nuevo artículo
            const nuevoItem: Item = {
                codigo: codigoArticulo,
                descripcion: producto.descripcion,
                serie: producto.serie,
                precio: producto.precio,
                cantidades: { [talla]: 1 },
                total: 1,
            };

            setItems([...items, nuevoItem]);
        }

        setCodigoBarras(''); // Limpiar el campo de código de barras
    };

    return (
        <div className={styles.container}>
            <h1>Formulario de Inventario</h1>

            {/* Input para escanear código de barras */}
            <input
                type="text"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                onBlur={handleEscanearCodigo}
                placeholder="Escanea el código de barras"
                className={styles.input}
            />
            <button onClick={handleEscanearCodigo}>Escanear</button>

            {/* Aquí puedes agregar cualquier funcionalidad extra que quieras, como mostrar el listado de los artículos escaneados o alguna acción adicional */}
        </div>
    );
}
