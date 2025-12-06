import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Layout from '../components/Layout';
import './Ventas.css';

const Ventas = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(null);
  const [loadingSales, setLoadingSales] = useState(true);
  const [salesError, setSalesError] = useState(null);
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleInfoLoading, setSaleInfoLoading] = useState(false);
  const [saleInfoError, setSaleInfoError] = useState(null);
  const [savingSale, setSavingSale] = useState(false);

  const [form, setForm] = useState({
    codigoProducto: '',
    producto: '',
    productoId: '',
    precio: '',
    cantidad: '',
    total: '',
    monto: '',
    cambio: '',
    nota: ''
  });

  const handleAddSale = () => {
    setShowAddSaleModal(true);
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://backend-inventario-balcon.onrender.com/productos', {
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
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setProductsError(err.message || 'Error cargando productos');
    } finally {
      setProductsLoading(false);
    }
  };

  // load products when component mounts
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchSales = async () => {
    setLoadingSales(true);
    setSalesError(null);
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
      setSales(Array.isArray(data) ? data : []);
    } catch (err) {
      setSalesError(err.message || 'Error cargando ventas');
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductSelect = (e) => {
    const productId = e.target.value;
    const prod = products.find((p) => (p.id ?? p._id ?? p.codigo) === productId) || products.find((p) => p.id === productId);
    if (prod) {
      setForm((prev) => ({ ...prev, producto: prod.nombre || '', codigoProducto: prod.codigo || '', productoId: prod.id ?? prod._id ?? '', precio: prod.precio ?? prev.precio }));
    } else {
      setForm((prev) => ({ ...prev, producto: '', codigoProducto: '', productoId: '', precio: 0 }));
    }
  };

  const handleSaveSale = async () => {
    if (savingSale) return; // prevent duplicate submissions
    setSavingSale(true);
    // compute derived values
    const cantidad = Number(form.cantidad) || 0;
    const precio = Number(form.precio) || 0;
    const total = precio * cantidad;
    const monto = Number(form.monto) || 0;
    const cambio = monto - total;

    const payload = {
      productoId: form.productoId,
      cantidad,
      total,
      monto,
      cambio,
      nota: form.nota
    };

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://backend-inventario-balcon.onrender.com/ventas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let err = 'Error creando venta';
        try {
          const errJson = await res.json();
          if (errJson && errJson.message) err = errJson.message;
        } catch (e) {}
        Swal.fire('Error', err, 'error');
        return;
      }

      const data = await res.json();
      // backend returns { mensaje, id, venta }
      // refresh the sales list from server to avoid incomplete/blank rows
      await fetchSales();
      setShowAddSaleModal(false);
      setForm({ codigoProducto: '', producto: '', cantidad: '', total: '', monto: '', cambio: '', nota: '', productoId: '', precio: '' });
      Swal.fire('Creada', data?.mensaje ?? 'Venta creada', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    } finally {
      setSavingSale(false);
    }
  };

  const handleView = async (sale) => {
    // If the sale already contains detailed `venta` or product name, show it immediately
    const maybeVenta = sale?.venta ?? null;
    if (maybeVenta) {
      setSelectedSale(maybeVenta);
      setShowInfoModal(true);
      return;
    }

    // Otherwise fetch details from backend by id
    const id = sale?.id ?? sale?.codigoVenta ?? sale?._id ?? null;
    if (!id) {
      // If no id, just show what we have
      setSelectedSale(sale);
      setShowInfoModal(true);
      return;
    }

    setSaleInfoLoading(true);
    setSaleInfoError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://backend-inventario-balcon.onrender.com/ventas/${id}`, {
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
      // Backend may return { venta: { ... } } or the sale object itself
      const venta = data?.venta ?? data;
      // If venta has productoId but not productoNombre, try to fetch product name
      if (venta && venta.productoId && !venta.productoNombre) {
        try {
          const token = localStorage.getItem('token');
          const pRes = await fetch(`https://backend-inventario-balcon.onrender.com/${venta.productoId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            // pData may be the product object or { producto: { ... } }
            const producto = pData?.producto ?? pData;
            if (producto && producto.nombre) venta.productoNombre = producto.nombre;
          }
        } catch (e) {
          // ignore product name fetch errors
        }
      }
      setSelectedSale(venta);
      setShowInfoModal(true);
    } catch (err) {
      setSaleInfoError(err.message || 'Error cargando venta');
      // still show modal with fallback data
      setSelectedSale(sale);
      setShowInfoModal(true);
    } finally {
      setSaleInfoLoading(false);
    }
  };

  const handleCloseInfo = () => {
    setShowInfoModal(false);
    setSelectedSale(null);
  };

  return (
    <Layout>
      {/* Add Sale Modal */}
      {showAddSaleModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Añadir venta</h2>

            <label>Producto</label>
            {productsLoading ? (
              <p>Cargando productos...</p>
            ) : productsError ? (
              <p>Error cargando productos: {productsError}</p>
            ) : (
              <select name="productoId" value={form.productoId} onChange={handleProductSelect}>
                <option value="">Selecciona producto</option>
                {products.map((p) => {
                  const id = p.id ?? p._id ?? p.codigo ?? '';
                  return (
                    <option key={id} value={id}>{p.nombre} — ${p.precio}</option>
                  );
                })}
              </select>
            )}

            <div className="modal-row">
              <div>
                <label>Cantidad</label>
                <input name="cantidad" value={form.cantidad} onChange={handleChange} type="number" />
              </div>
              <div>
                <label>Total</label>
                <input name="total" value={form.total || ( (Number(form.precio)||0) * (Number(form.cantidad)||0) )} readOnly type="number" />
              </div>
            </div>

            <div className="modal-row">
              <div>
                <label>Monto</label>
                <input name="monto" value={form.monto} onChange={handleChange} type="number" />
              </div>
              <div>
                <label>Cambio</label>
                <input name="cambio" value={ (Number(form.monto)||0) - ((Number(form.precio)||0)*(Number(form.cantidad)||0)) } readOnly type="number" />
              </div>
            </div>

            <label>Nota</label>
            <input name="nota" value={form.nota} onChange={handleChange} />

            <div className="modal-actions">
              <button className="cancel-button" onClick={() => { setShowAddSaleModal(false); setForm({ codigoProducto: '', producto: '', cantidad: '', total: '', monto: '', cambio: '', nota: '', productoId: '', precio: '' }); }}>Cancelar</button>
              <button className="save-button" onClick={handleSaveSale} disabled={savingSale}>{savingSale ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && selectedSale && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Informacion de venta</h2>
            {saleInfoLoading ? (
              <p>Cargando...</p>
            ) : saleInfoError ? (
              <p>Error: {saleInfoError}</p>
            ) : (
              (() => {
                const info = selectedSale?.venta ?? selectedSale;
                const productoNombre = info?.productoNombre ??'';
                const cantidad = info?.cantidad ?? '';
                const total = info?.total ?? '';
                const monto = info?.monto ?? '';
                const cambio = info?.cambio ?? '';
                const nota = info?.nota ?? '';
                return (
                  <>
                    <p><strong>Cantidad:</strong> {cantidad}</p>
                    <p><strong>Total:</strong> ${total}</p>
                    <p><strong>Monto:</strong> ${monto}</p>
                    <p><strong>Cambio:</strong> ${cambio}</p>
                    <p><strong>Nota:</strong> {nota}</p>
                  </>
                );
              })()
            )}
            <div className="modal-actions" style={{justifyContent: 'center'}}>
              <button className="save-button" onClick={handleCloseInfo}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="ventas-header">
        <h1 className="page-title">Ventas</h1>
        <button className="add-sale-button" onClick={handleAddSale}>
          Agregar nueva venta
        </button>
      </div>

      <div className="sales-card">
        <h2 className="card-title">Ventas</h2>
        <table className="sales-table">
          <thead>
            <tr>
              <th>Codigo de venta</th>
              <th>Fecha</th>
              <th>Codigo de producto</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Total</th>
              <th>Info</th>
            </tr>
          </thead>
          <tbody>
            {loadingSales ? (
              <tr>
                <td colSpan="7">Cargando ventas...</td>
              </tr>
            ) : salesError ? (
              <tr>
                <td colSpan="7">Error: {salesError}</td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-message">No hay ventas registradas</td>
              </tr>
            ) : (
              sales.map((sale) => {
                // Prefer the explicit sale.codigo (backend 'venta.codigo') then codigoVenta (local), then id
                const codigoVenta = sale?.codigo ?? sale?.venta?.codigo ?? sale?.codigoVenta ?? sale?.id ?? sale?._id ?? '';
                const fecha = sale.fecha && sale.fecha._seconds ? new Date(sale.fecha._seconds * 1000).toLocaleString() : (sale.fecha || (sale.venta?.fecha || ''));
                const codigoProd = sale.productoCodigo ?? sale.codigoProducto ?? sale.productoCodigo ?? sale.codigoProducto ?? sale.codigoProducto ?? '';
                const nombreProd = sale.productoNombre ?? sale.producto ?? sale.producto ?? '';
                return (
                  <tr key={codigoVenta || sale.id || Math.random()}>
                    <td>{codigoVenta}</td>
                    <td>{fecha}</td>
                    <td>{codigoProd}</td>
                    <td>{nombreProd}</td>
                    <td>{sale.cantidad}</td>
                    <td>${sale.total}</td>
                    <td>
                      <button className="info-button" onClick={() => handleView(sale)}>Ver</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Ventas;

