import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [stats, setStats] = useState(null);

    // 🔹 LOADINGS SEPARADOS (ÚNICO CAMBIO REAL)
    const [productsLoading, setProductsLoading] = useState(false);
    const [salesLoading, setSalesLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);

    const [dataError, setDataError] = useState(null);

    const BASE_URL = 'https://backend-inventario-balcon.onrender.com';
    const getToken = () => localStorage.getItem('token');

    // =======================================================
    // FETCH TOTALES DASHBOARD
    // =======================================================
    const fetchTotals = async () => {
        setStatsLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${BASE_URL}/dashboard/totales`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            if (!res.ok) throw new Error(await res.text());
            setStats(await res.json());
        } catch (err) {
            console.error("Error cargando totales:", err);
            setDataError(err.message);
            throw err;
        } finally {
            setStatsLoading(false);
        }
    };

    // =======================================================
    // FETCH PRODUCTOS
    // =======================================================
    const fetchProducts = async () => {
        setProductsLoading(true);
        try {
            const token = getToken();
            const res = await fetch(`${BASE_URL}/productos`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
            return data;
        } catch (err) {
            console.error("Error cargando productos:", err);
            setDataError(err.message);
            throw err;
        } finally {
            setProductsLoading(false);
        }
    };

    // =======================================================
    // FETCH VENTAS (SE RESPETA TU FILTRO POR FECHA)
    // =======================================================
    const loadSales = async (date = '') => {
        setSalesLoading(true);
        setDataError(null);

        try {
            const token = getToken();
            const url = date
                ? `${BASE_URL}/ventas?date=${date}`
                : `${BASE_URL}/ventas`;

            const res = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });

            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setSales(Array.isArray(data) ? data : []);
            return data;
        } catch (err) {
            console.error("Error cargando ventas:", err);
            setDataError(err.message);
            throw err;
        } finally {
            setSalesLoading(false);
        }
    };

    // =======================================================
    // CARGA INICIAL (NO TOCAMOS TU IDEA)
    // =======================================================
    const loadAllData = async () => {
        setDataError(null);
        await Promise.allSettled([
            fetchTotals(),
            fetchProducts()
        ]);
    };

    useEffect(() => {
        loadAllData();
    }, []);

    // =======================================================
    // MUTACIONES (SIN CAMBIOS)
    // =======================================================
    const handleMutation = async (url, method, payload, errorMessage) => {
        try {
            const token = getToken();
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: payload ? JSON.stringify(payload) : undefined
            });

            if (!res.ok) {
                let err = 'Error en la operación.';
                try {
                    const errJson = await res.json();
                    if (errJson?.error) err = errJson.error;
                } catch {
                    err = `Error ${res.status}: ${res.statusText}`;
                }
                throw new Error(err);
            }

            await fetchProducts();
            await fetchTotals();
            return await res.json();

        } catch (error) {
            console.error(errorMessage, error);
            throw error;
        }
    };

    const addProduct = (payload) =>
        handleMutation(`${BASE_URL}/productos`, 'POST', payload, 'Error creando producto');

    const updateProduct = (id, payload) =>
        handleMutation(`${BASE_URL}/productos/${id}`, 'PUT', payload, 'Error actualizando producto');

    const deleteProduct = (id) =>
        handleMutation(`${BASE_URL}/productos/${id}`, 'DELETE', null, 'Error eliminando producto');

    const addSale = async (payload) => {
        const result = await handleMutation(
            `${BASE_URL}/ventas`,
            'POST',
            payload,
            'Error creando venta'
        );
        await loadSales(); // recarga ventas
        return result;
    };

    const updateSale = async (id, payload) => {
        const result = await handleMutation(
            `${BASE_URL}/ventas/${id}`,
            'PUT',
            payload,
            'Error actualizando venta'
        );
        await loadSales(); // recarga ventas
        return result;
    };

    // =======================================================
    // CONTEXTO
    // =======================================================
    const refreshActions = useMemo(() => ({
        loadAllData,
        fetchProducts,
        loadSales,
        fetchTotals,
        addProduct,
        updateProduct,
        deleteProduct,
        addSale,
        updateSale
    }), []);

    return (
        <DataContext.Provider value={{
            products,
            sales,
            stats,

            // 🔹 LOADINGS SEPARADOS
            productsLoading,
            salesLoading,
            statsLoading,

            dataError,
            refreshData: refreshActions
        }}>
            {children}
        </DataContext.Provider>
    );
};
