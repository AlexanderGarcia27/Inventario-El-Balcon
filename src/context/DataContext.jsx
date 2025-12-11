import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [stats, setStats] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [dataError, setDataError] = useState(null);

    // URL base de tu API
    const BASE_URL = 'https://backend-inventario-balcon.onrender.com';

    // Función unificada para obtener el token (MANTENIDA, aunque el backend no la usa)
    const getToken = () => localStorage.getItem('token');

    // =======================================================
    // --- FUNCIONES DE FETCH (CARGA DE DATOS) ---
    // =======================================================

    // 1. Fetch de Totales de Dashboard
    const fetchTotals = async () => {
        try {
            const token = getToken();
            const res = await fetch(`${BASE_URL}/dashboard/totales`, {
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            } else {
                const errText = await res.text();
                throw new Error(errText || 'Error al cargar totales');
            }
        } catch (err) {
            console.error("Error cargando totales:", err);
            setDataError(err.message);
            throw err;
        }
    };

    // 2. Fetch de Productos
    const fetchProducts = async () => {
        try {
            const token = getToken();
            const res = await fetch(`${BASE_URL}/productos`, {
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
            });
            if (res.ok) {
                const data = await res.json();
                setProducts(Array.isArray(data) ? data : []);
                return data; // Retorna data para usarla si es necesario
            } else {
                const errText = await res.text();
                throw new Error(errText || 'Error al cargar productos');
            }
        } catch (err) {
            console.error("Error cargando productos:", err);
            setDataError(err.message);
            throw err;
        }
    };

    // 3. 🟢 FUNCIÓN DE VENTAS CORREGIDA: Acepta el parámetro 'date' (YYYY-MM-DD)
    const loadSales = async (date = '') => {
        // Marcamos la carga de datos solo si es la carga inicial o la carga forzada
        if (date === '') {
            setDataLoading(true);
        }
        setDataError(null);

        try {
            const token = getToken();

            // Construye la URL con o sin el parámetro 'date'
            const url = date
                ? `${BASE_URL}/ventas?date=${date}`
                : `${BASE_URL}/ventas`;

            const res = await fetch(url, {
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
            });

            if (res.ok) {
                const data = await res.json();
                setSales(Array.isArray(data) ? data : []);
                return data;
            } else {
                const errText = await res.text();
                throw new Error(errText || 'Error al cargar ventas');
            }
        } catch (err) {
            console.error(`Error cargando ventas ${date ? `para el día ${date}` : 'totales'}:`, err);
            // Solo establecer error si es una carga inicial. El componente Ventas debe manejar el error.
            if (date === '') {
                setDataError(err.message);
            }
            throw err;
        } finally {
            if (date === '') {
                setDataLoading(false);
            }
        }
    };

    // --- Función principal para cargar todos los datos ---
    // NOTA: Esta función no acepta argumentos y solo carga el estado inicial.
    const loadAllData = async () => {
        setDataLoading(true);
        setDataError(null);

        // Usamos allSettled para que si una falla, las otras sigan
        await Promise.allSettled([
            fetchTotals(),
            fetchProducts(),
            // ❌ YA NO LLAMAMOS loadSales AQUÍ 
            // fetchSales(), // Eliminado
        ]);

        setDataLoading(false);
    };

    // Carga inicial al montar el provider
    useEffect(() => {
        // Ejecutamos la carga inicial (productos y totales, NO ventas)
        loadAllData();
    }, []);

    // =======================================================
    // --- FUNCIONES DE MUTACIÓN (CRUD) ---
    // =======================================================

    // Función auxiliar para manejar la lógica de mutación (POST, PUT, DELETE)
    const handleMutation = async (url, method, payload, errorMessage) => {
        try {
            const token = getToken();
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: payload ? JSON.stringify(payload) : undefined
            });

            if (!res.ok) {
                let err = 'Error en la operación.';
                try {
                    const errJson = await res.json();
                    if (errJson && errJson.error) err = errJson.error;
                } catch (e) {
                    err = `Error ${res.status}: ${res.statusText}`;
                }
                throw new Error(err);
            }

            // Recargar la lista de productos y totales después de una mutación exitosa
            await fetchProducts();
            await fetchTotals();

            return await res.json();

        } catch (error) {
            console.error(errorMessage, error);
            throw error;
        }
    };

    // 4. Agregar Producto
    const addProduct = async (payload) => {
        return handleMutation(`${BASE_URL}/productos`, 'POST', payload, 'Error creando producto');
    };

    // 5. 🟢 Actualizar Producto (¡Corregido y ahora expuesto!)
    const updateProduct = async (id, payload) => {
        return handleMutation(`${BASE_URL}/productos/${id}`, 'PUT', payload, 'Error actualizando producto');
    };

    // 6. Eliminar Producto
    const deleteProduct = async (id) => {
        return handleMutation(`${BASE_URL}/productos/${id}`, 'DELETE', null, 'Error eliminando producto');
    };

    // 7. Añadir Venta
    const addSale = async (payload) => {
        try {
            // Usa handleMutation para POST a /ventas (que recarga productos/totales)
            const result = await handleMutation(`${BASE_URL}/ventas`, 'POST', payload, 'Error creando venta');

            // Recargamos la lista de ventas sin filtro después de una nueva venta
            await loadSales();

            return result;
        } catch (error) {
            throw error;
        }
    };


    // =======================================================
    // --- PROVEEDOR DEL CONTEXTO ---
    // =======================================================

    // Usamos useMemo para evitar recrear el objeto de acciones en cada render
    const refreshActions = useMemo(() => ({
        loadAllData,
        fetchProducts,
        // 🟢 loadSales expuesto para el filtro de fecha en Ventas.jsx
        loadSales,
        fetchTotals,
        // ✅ EXPOSICIÓN DE FUNCIONES DE MUTACIÓN
        addProduct,
        updateProduct, // ⬅️ Soluciona "updateProduct is not a function"
        deleteProduct,
        addSale,
    }), [
        loadAllData,
        fetchProducts,
        loadSales, // Debe estar aquí para el useMemo
        fetchTotals,
        addProduct,
        updateProduct,
        deleteProduct,
        addSale
    ]);

    return (
        <DataContext.Provider value={{
            products,
            sales,
            stats,
            dataLoading,
            dataError,
            refreshData: refreshActions,
        }}>
            {children}
        </DataContext.Provider>
    );
};