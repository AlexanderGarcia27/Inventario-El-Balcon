import { useState, useEffect, useMemo } from 'react';
import Layout, { Header } from '../components/Layout';
import './Dashboard.css';

// Chart.js
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
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const recentMovements = [
    {
      fecha: '2025-11-06',
      producto: 'cal de velle',
      tipo: 'Salida',
      cantidad: 12
    }
  ];

  const fetchTotals = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://backend-inventario-balcon.onrender.com/dashboard/totales', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }

      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Error cargando totales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotals();
  }, []);

  // --- Fetch ventas and productos to build charts ---
  const [ventas, setVentas] = useState([]);
  const [ventasLoading, setVentasLoading] = useState(true);
  const [ventasError, setVentasError] = useState(null);
  const [productos, setProductos] = useState([]);

  const fetchVentas = async () => {
    setVentasLoading(true);
    setVentasError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://backend-inventario-balcon.onrender.com/ventas', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }
      const data = await res.json();
      setVentas(Array.isArray(data) ? data : []);
    } catch (err) {
      setVentasError(err.message || 'Error cargando ventas');
    } finally {
      setVentasLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://backend-inventario-balcon.onrender.com/productos', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProductos(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      // ignore product errors for charts
    }
  };

  useEffect(() => {
    fetchVentas();
    fetchProductos();
  }, []);

  // Helper to parse date from venta
  const parseVentaDate = (venta) => {
    const f = venta?.fecha ?? venta?.venta?.fecha ?? null;
    if (!f) return null;
    // If Firestore-like timestamp
    if (f._seconds) return new Date(f._seconds * 1000);
    // If ISO string
    const d = new Date(f);
    return isNaN(d.getTime()) ? null : d;
  };

  // Aggregate monthly sales totals
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

  // Aggregate top products by quantity sold
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
            <p className="stat-value">{loading ? 'Cargando...' : (error ? '—' : (totalProducts ?? '—'))}</p>
          </div>

          <div className="stat-card">
            <h3 className="stat-label">Existencias bajas (Menos de 10 productos)</h3>
            <p className="stat-value">{loading ? 'Cargando...' : (error ? '—' : (lowStock !== null ? `${lowStock} productos` : '—'))}</p>
          </div>

          <div className="stat-card">
            <h3 className="stat-label">Ventas (últ. 7 días)</h3>
            <p className="stat-value">{loading ? 'Cargando...' : (error ? '—' : `$${(Number(ventas7) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`)}</p>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <h2 className="card-title">Ventas por mes</h2>
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

          <div className="chart-card">
            <h2 className="card-title">Productos más vendidos</h2>
            {ventasLoading ? (
              <p>Cargando ventas...</p>
            ) : ventasError ? (
              <p>Error cargando ventas: {ventasError}</p>
            ) : topProducts.labels.length === 0 ? (
              <p>No hay datos de productos vendidos</p>
            ) : (
              <Bar
                data={{
                  labels: topProducts.labels,
                  datasets: [
                    {
                      label: 'Unidades vendidas',
                      data: topProducts.counts,
                      backgroundColor: 'rgba(54,162,235,0.6)'
                    }
                  ]
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  plugins: { legend: { display: false } }
                }}
              />
            )}
          </div>
        </div>

        {error && <p className="error-text">Error: {error}</p>}
      </div>
    </Layout>
  );
};

export default Dashboard;


