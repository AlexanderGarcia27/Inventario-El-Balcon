import { useState, useEffect, useMemo } from 'react';
import Layout, { Header } from '../components/Layout';
import './Dashboard.css';

// Importar useData para usar el estado global cacheado
import { useData } from '../context/DataContext'; // <-- ¡NUEVA IMPORTACIÓN!

// Chart.js imports (se mantienen igual)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

const Dashboard = () => {
  // ❌ ELIMINAR: Estados locales de carga y datos (stats, ventas, productos)
  /*
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [ventasLoading, setVentasLoading] = useState(true);
  const [ventasError, setVentasError] = useState(null);
  const [productos, setProductos] = useState([]);
  */

  // ✅ USAR ESTADOS GLOBALES DEL CONTEXTO
  const {
    stats,
    sales: ventas, // ventas es el nombre que usamos aquí, pero viene de 'sales' en el Contexto
    dataLoading: loading, // Unificamos loading para todos los datos
    dataError: error      // Unificamos error para todos los datos
  } = useData();

  // Ya no necesitamos 'ventasLoading' y 'ventasError' por separado, 
  // usamos 'loading' y 'error' del contexto.
  const ventasLoading = loading;
  const ventasError = error;

  const recentMovements = [
    {
      fecha: '2025-11-06',
      producto: 'cal de velle',
      tipo: 'Salida',
      cantidad: 12
    }
  ];

  // ❌ ELIMINAR: Funciones fetch (fetchTotals, fetchVentas, fetchProductos)
  /*
  const fetchTotals = async () => { ... };
  const fetchVentas = async () => { ... };
  const fetchProductos = async () => { ... };
  */

  // ❌ ELIMINAR: useEffects para cargar datos
  /*
  useEffect(() => {
    fetchTotals();
  }, []);
  useEffect(() => {
    fetchVentas();
    fetchProductos();
  }, []);
  */
  // NOTA: La carga inicial ahora ocurre en DataContext al montar o en Login al iniciar sesión.

  // Helper to parse date from venta (se mantiene igual)
  const parseVentaDate = (venta) => {
    const f = venta?.fecha ?? venta?.venta?.fecha ?? null;
    if (!f) return null;
    // If Firestore-like timestamp
    if (f._seconds) return new Date(f._seconds * 1000);
    // If ISO string
    const d = new Date(f);
    return isNaN(d.getTime()) ? null : d;
  };

  // Aggregate monthly sales totals (se mantiene igual, usa 'ventas' del contexto)
  const monthlySales = useMemo(() => {
    if (!ventas || ventas.length === 0) return { labels: [], totals: [] };
    const map = new Map();
    ventas.forEach((v) => {
      const venta = v?.venta ?? v;
      const date = parseVentaDate(venta) || new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      const current = map.get(key) || 0;
      const total = Number(venta?.total ?? venta?.monto ?? 0) || 0;
      map.set(key, current + total);
    });
    // sort keys
    const entries = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return {
      labels: entries.map((e) => e[0]),
      totals: entries.map((e) => e[1])
    };
  }, [ventas]);

  // Aggregate top products by quantity sold (se mantiene igual, usa 'ventas' del contexto)
  const topProducts = useMemo(() => {
    if (!ventas || ventas.length === 0) return { labels: [], counts: [] };
    const map = new Map();
    ventas.forEach((v) => {
      const venta = v?.venta ?? v;
      const prodName = venta?.productoNombre ?? venta?.producto ?? null;
      const prodId = venta?.productoId ?? venta?.productoId ?? null;
      const key = prodName || prodId || 'Desconocido';
      const current = map.get(key) || 0;
      const cantidad = Number(venta?.cantidad ?? venta?.qty ?? 1) || 0;
      map.set(key, current + cantidad);
    });
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return { labels: entries.map((e) => e[0]), counts: entries.map((e) => e[1]) };
  }, [ventas]);

  const totalProducts = stats?.totalProductos ?? null;
  const lowStock = stats?.productosStockBajo ?? null;
  const ventas7 = stats?.ventasUltimos7Dias ?? null;

  return (
    <Layout>
      <Header title="Dashboard" showSearch={true} showUser={true} />

      <div className="dashboard-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h3 className="stat-label">Total productos</h3>
            {/* Usa 'loading' del contexto */}
            <p className="stat-value">{loading ? 'Cargando...' : (error ? '—' : (totalProducts ?? '—'))}</p>
          </div>

          <div className="stat-card">
            <h3 className="stat-label">Existencias bajas (Menos de 10 productos)</h3>
            {/* Usa 'loading' del contexto */}
            <p className="stat-value">{loading ? 'Cargando...' : (error ? '—' : (lowStock !== null ? `${lowStock} productos` : '—'))}</p>
          </div>

          <div className="stat-card">
            <h3 className="stat-label">Ventas (últ. 7 días)</h3>
            {/* Usa 'loading' del contexto */}
            <p className="stat-value">{loading ? 'Cargando...' : (error ? '—' : `$${(Number(ventas7) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`)}</p>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <h2 className="card-title">Ventas por mes</h2>
            {/* Usa 'ventasLoading' y 'ventasError' (que vienen de 'loading' y 'error' del contexto) */}
            {ventasLoading ? (
              <p>Cargando ventas...</p>
            ) : ventasError ? (
              <p>Error cargando ventas: {ventasError}</p>
            ) : monthlySales.labels.length === 0 ? (
              <p>No hay datos de ventas</p>
            ) : (
              <Line
                data={{
                  labels: monthlySales.labels,
                  datasets: [
                    {
                      label: 'Ventas (MXN)',
                      data: monthlySales.totals,
                      borderColor: 'rgba(75,192,192,1)',
                      backgroundColor: 'rgba(75,192,192,0.2)'
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: false }
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Usa 'error' del contexto */}
        {error && <p className="error-text">Error: {error}</p>}
      </div>
    </Layout>
  );
};

export default Dashboard;