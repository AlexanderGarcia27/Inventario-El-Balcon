import { useState, useMemo, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import Layout from '../components/Layout';
import './Ventas.css'; // Asumiendo que esta hoja de estilos contiene los estilos necesarios
import { useData } from '../context/DataContext';

// -----------------------------------------------------------------
// 1. LÓGICA AUXILIAR PARA FECHAS (MANEJO DE TIMESTAMP Y STRING/DATE)
// -----------------------------------------------------------------
const getFormattedDate = (sale) => {
  let dateValue = sale.fecha || (sale.venta?.fecha);

  if (!dateValue) return 'N/A';

  // 1. Manejo de Timestamp (objeto con _seconds)
  if (dateValue._seconds) {
    return new Date(dateValue._seconds * 1000).toLocaleString();
  }

  // 2. Manejo de String de Fecha o Date object (Para compatibilidad con datos antiguos)
  try {
    const dateObj = new Date(dateValue);
    // Verificar si la fecha es válida
    if (!isNaN(dateObj) && dateValue.length > 5) {
      // Formatear solo la fecha local (sin hora, a menos que quieras ser muy específico)
      // Usamos toLocaleString() por consistencia con el Timestamp
      return dateObj.toLocaleString();
    }
  } catch (e) {
    // Ignorar error de parsing
  }

  // 3. Devolver el valor tal cual si es un string desconocido
  return String(dateValue);
};
// -----------------------------------------------------------------


const Ventas = () => {
  // Desestructurar datos y funciones del Contexto
  const {
    sales,
    products,
    dataLoading: loadingContext,
    dataError: errorContext,
    refreshData
  } = useData();

  // 🟢 Desestructurar funciones esenciales
  const { addSale, loadSales } = refreshData;

  // --- ESTADO DEL FILTRO DE FECHA ---
  const today = new Date().toISOString().split('T')[0];
  const [filterDate, setFilterDate] = useState(''); // El valor del input (YYYY-MM-DD)
  const [isFiltering, setIsFiltering] = useState(false); // Bandera para saber si se está filtrando

  // Estado de carga/error (ahora reflejará las cargas del filtro también)
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesError, setSalesError] = useState(null);


  // --- FUNCIÓN PRINCIPAL DE CARGA DE VENTAS ---
  const fetchSales = useCallback(async (date = '') => {
    setLoadingSales(true);
    setSalesError(null);
    // Actualizar la bandera de filtrado
    setIsFiltering(date !== '');

    try {
      // Llama a loadSales del Contexto (puede ser sin argumento para total, o con 'date' para filtro)
      await loadSales(date);
    } catch (err) {
      setSalesError(err.message || 'Error al cargar ventas.');
    } finally {
      setLoadingSales(false);
    }
  }, [loadSales]);


  // --- LÓGICA DE CARGA INICIAL y EFECTOS ---
  useEffect(() => {
    // Carga inicial: Si el contexto no cargó las ventas (sales está vacío), las cargamos aquí.
    // Vamos a forzar la carga inicial de "todas las ventas" al montar el componente.
    if (sales.length === 0 && !loadingContext && !errorContext) {
      fetchSales();
    }
    // Si el contexto ya cargó datos, reflejamos su estado.
    if (loadingContext) setLoadingSales(true);
    if (errorContext) setSalesError(errorContext);
  }, [loadingContext, errorContext, sales.length, fetchSales]);


  // --- HANDLERS DEL FILTRO ---

  const handleFilterDateChange = (e) => {
    setFilterDate(e.target.value);
  };

  const handleFilter = () => {
    if (filterDate) {
      // Llama a la función de carga con la fecha seleccionada (YYYY-MM-DD)
      fetchSales(filterDate);
    } else {
      Swal.fire('Atención', 'Selecciona una fecha para filtrar.', 'warning');
    }
  };

  const handleClearFilter = () => {
    setFilterDate('');
    // Llama a la función de carga sin argumento para mostrar todas las ventas
    fetchSales('');
  };


  // --- Manejadores de estado para Modales y Carrito (MANTENIDOS) ---
  const [showAddSaleModal, setShowAddSaleModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleInfoLoading, setSaleInfoLoading] = useState(false);
  const [saleInfoError, setSaleInfoError] = useState(null);
  const [savingSale, setSavingSale] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Estado de `currentItem` para manejar el producto a agregar
  const [currentItem, setCurrentItem] = useState({
    productoId: '',
    producto: '',
    precio: '',
    cantidad: 1,
    isEditing: false, // 👈 Nuevo: Indica si se está editando un ítem existente
    editIndex: -1,   // 👈 Nuevo: Índice del ítem que se está editando
  });

  const [cartItems, setCartItems] = useState([]);

  const [paymentDetails, setPaymentDetails] = useState({
    monto: '',
    cambio: '',
    nota: ''
  });

  const productsLoading = loadingContext;
  const productsError = errorContext;

  // --- CÁLCULOS DERIVADOS (MANTENIDOS) ---

  const totalVenta = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.precio) * Number(item.cantidad)), 0);
  }, [cartItems]);

  const cambioCalculado = useMemo(() => {
    const monto = Number(paymentDetails.monto) || 0;
    return monto - totalVenta;
  }, [paymentDetails.monto, totalVenta]);


  // --- HANDLERS DE MODAL/CARRITO ---

  const resetCurrentItem = () => {
    setCurrentItem({
      productoId: '',
      producto: '',
      precio: '',
      cantidad: 1,
      isEditing: false,
      editIndex: -1,
    });
    setIsDropdownOpen(false);
  };

  const handleAddSale = () => {
    // Limpiar estados del carrito al abrir
    resetCurrentItem();
    setCartItems([]);
    setPaymentDetails({ monto: '', cambio: '', nota: '' });
    setShowAddSaleModal(true);
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleCurrentItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductSelect = (id) => {
    const prod = products.find((p) => (p.id ?? p._id ?? p.codigo) === id);

    if (prod) {
      const precioBase = prod.precio ?? 0;
      // Si ya está editando, solo actualiza el producto si el ID es diferente
      if (currentItem.isEditing && currentItem.productoId === id) return;

      setCurrentItem({
        productoId: id,
        producto: prod.nombre || '',
        precio: precioBase,
        cantidad: 1,
        isEditing: false,  // Reseteamos el modo edición al seleccionar un producto nuevo
        editIndex: -1,
      });
      setIsDropdownOpen(false);
    } else {
      setCurrentItem({
        productoId: '',
        producto: '',
        precio: '',
        cantidad: 1,
        isEditing: false,
        editIndex: -1,
      });
    }
  };

  // 🛑 NUEVA FUNCIÓN PARA CARGAR UN ITEM DEL CARRITO AL FORMULARIO PARA EDITAR
  const handleEditItem = (index) => {
    const itemToEdit = cartItems[index];

    setCurrentItem({
      productoId: itemToEdit.productoId,
      producto: itemToEdit.producto,
      precio: itemToEdit.precio,
      cantidad: itemToEdit.cantidad,
      isEditing: true, // Activamos el modo edición
      editIndex: index, // Guardamos el índice para saber qué actualizar
    });

    // Abrir el dropdown para mostrar la selección (opcional, pero útil)
    setIsDropdownOpen(false);
  };

  // ✅ FUNCIÓN CORREGIDA Y MEJORADA
  const handleAddItemToCart = () => {
    const { productoId, producto, precio, cantidad, isEditing, editIndex } = currentItem;
    const qty = Number(cantidad);
    const unitPrice = Number(precio);

    if (!productoId || unitPrice <= 0 || isNaN(unitPrice) || qty <= 0 || isNaN(qty)) {
      Swal.fire('Atención', 'Datos de producto inválidos. Asegúrate de seleccionar un producto, precio y cantidad válidos.', 'warning');
      return;
    }

    const newItem = {
      productoId,
      producto,
      precio: unitPrice,
      cantidad: qty,
      total: unitPrice * qty
    };

    // 1. Verificar si ya existe en el carrito (SOLO si NO estamos en modo edición)
    const existingItemIndex = cartItems.findIndex(item => item.productoId === productoId);

    if (!isEditing && existingItemIndex !== -1) {
      // Producto duplicado: Muestra el alert de "ya existe"
      Swal.fire({
        title: 'Producto Duplicado',
        html: `Ya agregaste **${producto}** al carrito. Si deseas modificar la cantidad o el precio, haz clic en **Editar** en el listado de abajo.`,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // 2. Lógica de AGREGAR o EDITAR
    setCartItems(prev => {
      if (isEditing && editIndex !== -1) {
        // MODO EDICIÓN: Crear una copia del carrito y actualizar el elemento
        const newCart = [...prev];
        newCart[editIndex] = newItem;
        Swal.fire('Actualizado', `Artículo **${producto}** modificado.`, 'success');
        return newCart;

      } else {
        // MODO AGREGAR: Añadir el nuevo elemento
        Swal.fire('Agregado', `Artículo **${producto}** agregado al carrito.`, 'success');
        return [...prev, newItem];
      }
    });

    // 3. Limpiar el formulario después de la operación
    resetCurrentItem();
  };


  const handleRemoveItem = (index) => {
    // Si estamos editando el item que se va a eliminar, salimos del modo edición
    if (currentItem.isEditing && currentItem.editIndex === index) {
      resetCurrentItem();
    }
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };


  // --- LÓGICA DE GUARDAR VENTA MULTIPLE (MANTENIDA) ---

  const handleSaveSale = async () => {
    if (savingSale) return;
    setSavingSale(true);

    if (cartItems.length === 0) {
      setSavingSale(false);
      Swal.fire('Atención', 'El carrito de ventas está vacío.', 'warning');
      return;
    }
    const monto = Number(paymentDetails.monto) || 0;
    if (monto < totalVenta) {
      setSavingSale(false);
      Swal.fire('Atención', `El monto pagado es insuficiente. Faltan $${(totalVenta - monto).toFixed(2)}`, 'warning');
      return;
    }

    const articulos = cartItems.map(item => ({
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioVenta: item.precio,
    }));

    const payload = {
      articulos: articulos,
      total: totalVenta,
      monto: monto,
      cambio: cambioCalculado,
      nota: paymentDetails.nota || "",
    };

    try {
      const data = await addSale(payload);

      setShowAddSaleModal(false);
      setCartItems([]);
      setPaymentDetails({ monto: '', cambio: '', nota: '' });
      resetCurrentItem(); // Usamos la función de reseteo
      Swal.fire('Creada', data?.mensaje ?? 'Venta creada', 'success');

      // Recargar las ventas después de agregar una nueva (manteniendo el filtro si aplica)
      setFilterDate(''); // Limpiar filtro después de guardar
      await fetchSales();

    } catch (err) {
      Swal.fire('Error', err.message || 'Error al guardar la venta.', 'error');
    } finally {
      setSavingSale(false);
    }
  };


  // --- LÓGICA DE VISUALIZACIÓN DE VENTA (MANTENIDA) ---
  // ... (La lógica de handleView, handleCloseInfo, y el Modal de Info se mantiene igual)

  const handleView = async (sale) => {
    const maybeVenta = sale?.venta ?? null;
    let info = maybeVenta ?? sale;

    const id = info?.id ?? info?.codigoVenta ?? info?._id ?? null;

    // Intenta enriquecer los datos de los artículos con el nombre del producto de la caché
    if (info.articulos && info.articulos.length > 0) {
      info.articulos = info.articulos.map(item => {
        const cachedProd = products.find(p => (p.id ?? p._id ?? p.codigo) === item.productoId);
        return {
          ...item,
          productoNombre: cachedProd?.nombre || `ID: ${item.productoId}`,
          costoUnitario: item.costoUnitario || cachedProd?.precioCompra || 0
        };
      });

      setSelectedSale(info);
      setShowInfoModal(true);
      return;
    }

    if (!id) {
      setSelectedSale(info);
      setShowInfoModal(true);
      return;
    }

    setSaleInfoLoading(true);
    setSaleInfoError(null);
    try {
      // Carga el detalle desde la API (URL HARDCODEADA - Debería ir en el Contexto, pero se mantiene para la carga de detalle)
      const res = await fetch(`https://backend-inventario-balcon.onrender.com/ventas/${id}`);

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Error ${res.status}`);
      }

      const data = await res.json();
      const ventaDetalle = data?.venta ?? data;

      // Enriquecer con nombres de producto de la caché
      if (ventaDetalle.articulos && ventaDetalle.articulos.length > 0) {
        ventaDetalle.articulos = ventaDetalle.articulos.map(item => {
          const cachedProd = products.find(p => (p.id ?? p._id ?? p.codigo) === item.productoId);
          return {
            ...item,
            productoNombre: cachedProd?.nombre || `ID: ${item.productoId}`,
            costoUnitario: item.costoUnitario || cachedProd?.precioCompra || 0
          };
        });
      } else if (ventaDetalle.productoId && !ventaDetalle.articulos) {
        // Caso de venta de un solo producto antiguo sin estructura de "articulos"
        const prod = products.find(p => (p.id ?? p._id ?? p.codigo) === ventaDetalle.productoId);
        if (prod) {
          ventaDetalle.productoNombre = prod.nombre;
        }
      }


      setSelectedSale(ventaDetalle);
      setShowInfoModal(true);
    } catch (err) {
      setSaleInfoError(err.message || 'Error cargando venta.');
      setSelectedSale(info); // Mostrar la info parcial si falla la carga completa
      setShowInfoModal(true);
    } finally {
      setSaleInfoLoading(false);
    }
  };

  const handleCloseInfo = () => {
    setShowInfoModal(false);
    setSelectedSale(null);
  };

  // FIN LÓGICA DE VISUALIZACIÓN DE VENTA (MANTENIDA)


  return (
    <Layout>
      {/* Modal de Añadir Venta (Carrito) */}
      {showAddSaleModal && (
        <div className="modal-backdrop">
          <div className="modal sale-modal-multi">
            <h2>{currentItem.isEditing ? 'Editar Artículo en Carrito' : 'Añadir Venta (Carrito)'}</h2>

            <div className="cart-grid">
              {/* SECCIÓN DE AGREGAR/EDITAR ARTÍCULO */}
              <div className="add-item-section">
                <h3>{currentItem.isEditing ? 'Modificar Artículo' : 'Agregar Artículo'}</h3>
                <label>Producto</label>
                {productsLoading ? (
                  <p>Cargando productos...</p>
                ) : productsError ? (
                  <p>Error: {productsError}</p>
                ) : (
                  <div className="custom-select-container">
                    <div className="select-display" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                      {currentItem.producto ? `${currentItem.producto} ($${Number(currentItem.precio).toFixed(2)})` : 'Selecciona producto'}
                    </div>
                    {isDropdownOpen && (
                      <ul className="select-dropdown">
                        {products.map((p) => {
                          const id = p.id ?? p._id ?? p.codigo ?? '';
                          return (
                            <li key={id} onClick={() => handleProductSelect(id)} className={currentItem.productoId === id ? 'selected' : ''}>
                              {`${p.nombre} (Base: $${(p.precio || 0).toFixed(2)})`}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {currentItem.productoId && (
                  <>
                    <label style={{ marginTop: '10px' }}>Precio de Venta</label>
                    <input name="precio" value={currentItem.precio} onChange={handleCurrentItemChange} type="number" min="0.01" placeholder="Precio de venta..." />
                    <label>Cantidad</label>
                    <input name="cantidad" value={currentItem.cantidad} onChange={handleCurrentItemChange} type="number" min="1" />

                    <button className="add-to-cart-button" onClick={handleAddItemToCart} style={{ marginTop: '15px' }}>
                      {currentItem.isEditing ? 'Guardar Cambios' : 'Añadir al Carrito'}
                    </button>

                    {currentItem.isEditing && (
                      <button className="cancel-button" onClick={resetCurrentItem} style={{ marginTop: '10px', backgroundColor: '#808080' }}>
                        Cancelar Edición
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* SECCIÓN DE RESUMEN DEL CARRITO Y PAGO */}
              <div className="cart-summary-section">
                <h3>Carrito ({cartItems.length} artículos)</h3>

                <div className="cart-list">
                  {cartItems.length === 0 ? (
                    <p className="empty-message">No hay artículos en el carrito.</p>
                  ) : (
                    cartItems.map((item, index) => (
                      <div key={item.productoId} className={`cart-item ${currentItem.isEditing && currentItem.editIndex === index ? 'editing' : ''}`}>
                        <span>{item.producto} (x{item.cantidad}) @ ${item.precio.toFixed(2)}</span>
                        <span>${item.total.toFixed(2)}</span>

                        <button
                          onClick={() => handleEditItem(index)}
                          className="edit-item-button"
                          disabled={currentItem.isEditing}
                        >
                          ✏️
                        </button>

                        <button onClick={() => handleRemoveItem(index)} className="remove-item-button">X</button>
                      </div>
                    ))
                  )}
                </div>

                <div className="payment-details">
                  <h3 className="total-label">Total Venta: ${totalVenta.toFixed(2)}</h3>

                  <label>Monto Pagado</label>
                  <input name="monto" value={paymentDetails.monto} onChange={handlePaymentChange} type="number" min={totalVenta.toFixed(2)} />

                  <label>Cambio</label>
                  <input name="cambio" value={cambioCalculado.toFixed(2)} readOnly type="number" style={{ fontWeight: 'bold' }} />

                  <label>Nota de Venta</label>
                  <input name="nota" value={paymentDetails.nota} onChange={handlePaymentChange} />
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="cancel-button" onClick={() => setShowAddSaleModal(false)}>Cancelar</button>
              <button className="save-button" onClick={handleSaveSale} disabled={savingSale || cartItems.length === 0 || cambioCalculado < 0 || currentItem.isEditing}>
                {savingSale ? 'Guardando Venta...' : `Finalizar Venta ($${totalVenta.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Información de Venta (MANTENIDO) */}
      {showInfoModal && selectedSale && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Información de Venta {selectedSale.codigo}</h2>
            {saleInfoLoading ? (
              <p>Cargando...</p>
            ) : saleInfoError ? (
              <p>Error: {saleInfoError}</p>
            ) : (
              (() => {
                const info = selectedSale?.venta ?? selectedSale;
                const articulos = info?.articulos || [];
                const total = (info?.total ?? 0).toFixed(2);
                const monto = (info?.monto ?? 0).toFixed(2);
                const cambio = (info?.cambio ?? 0).toFixed(2);
                const ganancia = (info?.ganancia ?? 0).toFixed(2);
                const nota = info?.nota ?? 'N/A';

                return (
                  <>
                    <h3>Artículos Vendidos ({articulos.length})</h3>
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                      {articulos.map((item, idx) => {
                        const nombre = item.productoNombre || `ID: ${item.productoId}`;
                        const costoUnitario = item.costoUnitario || 0;
                        const subtotal = item.subtotal || (item.precioVenta * item.cantidad);
                        const costoTotalArticulo = costoUnitario * item.cantidad;
                        const gananciaArticulo = (subtotal - costoTotalArticulo).toFixed(2);

                        return (
                          <li key={idx} style={{ borderBottom: '1px solid #eee', padding: '5px 0' }}>
                            <strong>{nombre}</strong> (x{item.cantidad}) @ ${item.precioVenta.toFixed(2)} = <strong>${subtotal.toFixed(2)}</strong>
                            <span style={{ fontSize: '0.8em', marginLeft: '10px', color: gananciaArticulo >= 0 ? 'green' : 'red' }}>
                              (G: ${gananciaArticulo})
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <hr />
                    <p><strong>Total de la Venta:</strong> ${total}</p>
                    <p style={{ fontWeight: 'bold', color: ganancia >= 0 ? 'green' : 'red' }}>
                      <strong>Ganancia Total:</strong> ${ganancia}
                    </p>
                    <p><strong>Monto Pagado:</strong> ${monto}</p>
                    <p><strong>Cambio:</strong> ${cambio}</p>
                    <p><strong>Nota:</strong> {nota}</p>
                  </>
                );
              })()
            )}
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="save-button" onClick={handleCloseInfo}>Cerrar</button>
            </div>
          </div>
        </div>
      )}


      <div className="ventas-header">
        <h1 className="page-title">Ventas Operativas</h1>
        <button className="add-sale-button" onClick={handleAddSale}>
          Agregar nueva venta (Carrito)
        </button>
      </div>

      {/* 🛑 SECCIÓN DE FILTRO DE FECHA 🛑 */}
      <div className="filter-section" style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Filtrar por Fecha</h3>
        <input
          type="date"
          value={filterDate}
          onChange={handleFilterDateChange}
          max={today}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button
          onClick={handleFilter}
          disabled={!filterDate || loadingSales}
          style={{ padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loadingSales && isFiltering ? 'Filtrando...' : 'Filtrar'}
        </button>
        {isFiltering && (
          <button
            onClick={handleClearFilter}
            disabled={loadingSales}
            style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Limpiar Filtro
          </button>
        )}
      </div>


      <div className="sales-card">
        <h2 className="card-title">
          Historial de Ventas {isFiltering ? `(Filtrado por: ${filterDate})` : 'Total'}
        </h2>
        <table className="sales-table">
          <thead>
            <tr>
              <th>Codigo de venta</th>
              <th>Fecha</th>
              <th>Codigo Prod.</th>
              <th>Resumen Producto</th>
              <th>Artículos</th>
              <th>Total</th>
              <th>Ganancia</th>
              <th>Info</th>
            </tr>
          </thead>
          <tbody>
            {loadingSales ? (
              <tr>
                <td colSpan="9">Cargando ventas...</td>
              </tr>
            ) : salesError ? (
              <tr>
                <td colSpan="9">Error: {salesError}</td>
              </tr>
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-message" style={{ padding: '15px', textAlign: 'center', backgroundColor: '#fffbe6' }}>
                  {/* LÓGICA MANTENIDA */}
                  {isFiltering
                    ? `🚫 No se encontraron ventas para la fecha: ${filterDate}`
                    : 'No hay ventas registradas en el sistema.'
                  }
                </td>
              </tr>
            ) : (
              sales.map((sale) => {
                const codigoVenta = sale?.codigo ?? sale?.venta?.codigo ?? sale?.codigoVenta ?? sale?.id ?? sale?._id ?? '';
                const fecha = getFormattedDate(sale);

                const nombreResumen = sale.productoNombre || (sale.articulos ? `${sale.articulos.length} artículos` : 'Venta sin detalles');
                const cantidadArticulos = sale.cantidad || (sale.articulos ? sale.articulos.reduce((sum, item) => sum + item.cantidad, 0) : 1);
                const codigoProd = sale.productoCodigo ?? (sale.articulos && sale.articulos.length === 1 ? sale.articulos[0].productoId : '-');

                const total = (sale.total || 0).toFixed(2);
                const ganancia = sale.ganancia !== undefined ? sale.ganancia.toFixed(2) : 'N/A';

                return (
                  <tr key={codigoVenta || sale.id || Math.random()}>
                    <td>{codigoVenta}</td>
                    <td>{fecha}</td>
                    <td>{codigoProd}</td>
                    <td>{nombreResumen}</td>
                    <td>{cantidadArticulos}</td>
                    <td>${total}</td>
                    <td style={{ color: sale.ganancia >= 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                      ${ganancia}
                    </td>
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