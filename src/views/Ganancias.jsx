// src/views/Ganancias.jsx

import { useMemo } from 'react';
import Layout from '../components/Layout';
import DailyGainChart from './DailyGainChart'; // Asegúrate que la ruta sea correcta
import { useData } from '../context/DataContext';
import './Ventas.css'; // Usaremos los mismos estilos de tabla

const Ganancias = () => {
    const {
        sales,
        dataLoading: loadingContext,
        dataError: errorContext,
    } = useData();

    const loadingSales = loadingContext;
    const salesError = errorContext;

    // --- CÁLCULO 1: Ganancia Total Histórica ---
    const calculateTotalGain = useMemo(() => {
        if (loadingSales || sales.length === 0) return 0;
        return sales.reduce((total, sale) => total + (sale.ganancia || 0), 0);
    }, [sales, loadingSales]);

    // --- CÁLCULO 2: Ganancia Diaria (SÓLO HOY) ---
    const calculateDailyGain = useMemo(() => {
        if (loadingSales || sales.length === 0) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let totalGanancia = 0;

        sales.forEach(sale => {
            let saleDate;
            if (sale.fecha && sale.fecha._seconds) {
                saleDate = new Date(sale.fecha._seconds * 1000);
            } else if (sale.fecha instanceof Date) {
                saleDate = sale.fecha;
            } else {
                return;
            }

            if (saleDate >= today) {
                const ganancia = sale.ganancia || 0;
                totalGanancia += ganancia;
            }
        });

        return totalGanancia;
    }, [sales, loadingSales]);

    // --- CÁLCULO 3: Ganancia Diaria Agrupada (Incluye Ganancia Neta y Ganancia Bruta) ---
    const dailyGainData = useMemo(() => {
        if (loadingSales || sales.length === 0) return [];

        const dailyTotals = {};

        sales.forEach(sale => {
            let saleDate;
            if (sale.fecha && sale.fecha._seconds) {
                saleDate = new Date(sale.fecha._seconds * 1000);
            } else if (sale.fecha instanceof Date) {
                saleDate = sale.fecha;
            } else {
                return;
            }

            const yyyy = saleDate.getFullYear();
            const mm = String(saleDate.getMonth() + 1).padStart(2, '0');
            const dd = String(saleDate.getDate()).padStart(2, '0');
            const dateKey = `${yyyy}-${mm}-${dd}`;

            const ganancia = sale.ganancia || 0;
            const total = sale.total || 0; // Ganancia Bruta (Total de la Venta)

            if (!dailyTotals[dateKey]) {
                dailyTotals[dateKey] = { gain: 0, totalSales: 0 };
            }

            dailyTotals[dateKey].gain += ganancia;
            dailyTotals[dateKey].totalSales += total;
        });

        const sortedKeys = Object.keys(dailyTotals).sort();

        const dataForChart = sortedKeys.map(key => ({
            date: key,
            gain: dailyTotals[key].gain,
            totalSales: dailyTotals[key].totalSales
        }));

        return dataForChart;
    }, [sales, loadingSales]);
    // --- Fin de Lógica de Ganancia Diaria Agrupada ---


    return (
        <Layout>
            <div className="ventas-header">
                <h1 className="page-title">💰 Reportes y Ganancias</h1>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {/* CARD 1: GANANCIA TOTAL HISTÓRICA */}
                    <div className="daily-gain-card" style={{ flex: 1, minWidth: '200px', backgroundColor: '#e9f7ef', border: '1px solid #c8e6c9' }}>
                        <h3 style={{ marginBottom: '5px', color: '#388e3c' }}>Ganancia Total Histórica (Neta)</h3>
                        {loadingSales ? (
                            <p>Cargando...</p>
                        ) : salesError ? (
                            <p>Error</p>
                        ) : (
                            <h2 style={{ color: calculateTotalGain >= 0 ? '#388e3c' : '#d32f2f' }}>
                                ${calculateTotalGain.toFixed(2)}
                            </h2>
                        )}
                    </div>

                    {/* CARD 2: GANANCIA DEL DÍA (Hoy) */}
                    <div className="daily-gain-card" style={{ flex: 1, minWidth: '200px' }}>
                        <h3 style={{ marginBottom: '5px' }}>Ganancia Neta del Día (Hoy)</h3>
                        {loadingSales ? (
                            <p>Cargando...</p>
                        ) : salesError ? (
                            <p>Error</p>
                        ) : (
                            <h2 style={{ color: calculateDailyGain >= 0 ? 'green' : 'red' }}>
                                ${calculateDailyGain.toFixed(2)}
                            </h2>
                        )}
                    </div>
                </div>
            </div>

            {/* SECCIÓN DE GRÁFICA DE GANANCIAS */}
            {dailyGainData.length > 0 && (
                <div className="sales-card chart-container" style={{ marginTop: '20px' }}>
                    <h2 className="card-title">Tendencia de Ganancias Diarias (Neta)</h2>
                    {/* Usamos el componente DailyGainChart que debe estar disponible */}
                    <DailyGainChart data={dailyGainData.map(d => ({ date: d.date, gain: d.gain }))} />
                </div>
            )}

            {/* INICIO: CORTE DE CAJA DIARIO (Resumen de Ganancias Bruta y Neta) */}
            <div className="sales-card" style={{ marginTop: '20px' }}>
                <h2 className="card-title">Corte de Caja / Resumen Diario por Día</h2>

                {loadingSales ? (
                    <p>Cargando resumen diario...</p>
                ) : dailyGainData.length === 0 ? (
                    <p className="empty-message">No hay datos de ventas para generar el corte diario.</p>
                ) : (
                    <table className="daily-gain-table">
                        <thead>
                            <tr>
                                <th>Día</th>
                                <th>Ganancia Bruta (Venta Total)</th>
                                <th>Ganancia Neta (Utilidad)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Mostramos el día más reciente primero (reverse) */}
                            {dailyGainData.slice().reverse().map((dayData) => (
                                <tr key={dayData.date}>
                                    <td>{dayData.date}</td>
                                    <td style={{ fontWeight: 'bold' }}>
                                        ${dayData.totalSales.toFixed(2)}
                                    </td>
                                    <td style={{ fontWeight: 'bold', color: dayData.gain >= 0 ? 'green' : 'red' }}>
                                        ${dayData.gain.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            {/* FIN: CORTE DE CAJA DIARIO */}
        </Layout>
    );
};

export default Ganancias;