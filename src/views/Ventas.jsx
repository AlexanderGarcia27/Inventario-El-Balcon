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
  // ===============================
  // PUNTO 8 – SEPARAR VENTAS
  // ===============================
  const ventasContado = useMemo(
    () => sales.filter(v => v.tipoVenta !== 'credito'),
    [sales]
  );

  const ventasCredito = useMemo(
    () => sales.filter(v => v.tipoVenta === 'credito'),
    [sales]
  );

  // 🟢 Desestructurar funciones esenciales
  const { addSale, loadSales, updateSale } = refreshData;

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
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [selectedSaleForEdit, setSelectedSaleForEdit] = useState(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleInfoLoading, setSaleInfoLoading] = useState(false);
  const [saleInfoError, setSaleInfoError] = useState(null);
  const [savingSale, setSavingSale] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCredito, setIsCredito] = useState(false);
  const [pagoParcialCredito, setPagoParcialCredito] = useState(false);

  const [clienteCredito, setClienteCredito] = useState({
    nombre: '',
    direccion: ''
  });
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
    nota: '',
    efectivoRecibido: '' // Para crédito con pago parcial: el monto con que paga
  });

  const productsLoading = loadingContext;
  const productsError = errorContext;

  // --- CÁLCULOS DERIVADOS (MANTENIDOS) ---

  const totalVenta = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (Number(item.precio) * Number(item.cantidad)), 0);
  }, [cartItems]);
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;

    return products.filter(p =>
      p.nombre?.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [productSearch, products]);


  const cambioCalculado = useMemo(() => {
    const monto = Number(paymentDetails.monto) || 0;
    return monto - totalVenta;
  }, [paymentDetails.monto, totalVenta]);

  // Cambio calculado para crédito (cuando hay pago parcial)
  // El cambio es: efectivoRecibido - montoPagado
  const cambioCredito = useMemo(() => {
    if (!isCredito || !pagoParcialCredito) return 0;
    const montoPagado = Number(paymentDetails.monto) || 0;
    const efectivoRecibido = Number(paymentDetails.efectivoRecibido) || 0;
    return efectivoRecibido - montoPagado;
  }, [paymentDetails.monto, paymentDetails.efectivoRecibido, isCredito, pagoParcialCredito]);


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
    setPaymentDetails({ monto: '', cambio: '', nota: '', efectivoRecibido: '' });
    setShowAddSaleModal(true);
    setIsCredito(false);
    setPagoParcialCredito(false);
    setClienteCredito({ nombre: '', direccion: '' });

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
      setProductSearch('');
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
      Swal.fire(
        'Atención',
        'Datos de producto inválidos. Asegúrate de seleccionar un producto, precio y cantidad válidos.',
        'warning'
      );
      return;
    }

    // 🔎 OBTENER PRODUCTO REAL Y STOCK
    const productFromDB = products.find(
      p => (p.id ?? p._id ?? p.codigo) === productoId
    );

    if (!productFromDB) {
      Swal.fire('Error', 'Producto no encontrado.', 'error');
      return;
    }

    const stockDisponible = Number(productFromDB.stock) || 0;

    // 🧮 CANTIDAD TOTAL SI YA EXISTE EN CARRITO
    const existingItemIndex = cartItems.findIndex(
      item => item.productoId === productoId
    );

    let cantidadTotalSolicitada = qty;

    if (!isEditing && existingItemIndex !== -1) {
      cantidadTotalSolicitada += cartItems[existingItemIndex].cantidad;
    }

    if (isEditing && editIndex !== -1) {
      cantidadTotalSolicitada = qty;
    }

    // 🛑 VALIDACIÓN DE STOCK
    if (cantidadTotalSolicitada > stockDisponible) {
      Swal.fire(
        'Stock insuficiente',
        `Solo hay ${stockDisponible} unidades disponibles de "${producto}".`,
        'error'
      );
      return;
    }

    const newItem = {
      productoId,
      producto,
      precio: unitPrice,
      cantidad: qty,
      total: unitPrice * qty
    };

    // 🛑 BLOQUEO DE DUPLICADOS (NO edición)
    if (!isEditing && existingItemIndex !== -1) {
      Swal.fire({
        title: 'Producto duplicado',
        html: `Ya agregaste <b>${producto}</b> al carrito.<br/>Usa <b>Editar</b> para modificarlo.`,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // ✅ AGREGAR / EDITAR
    setCartItems(prev => {
      if (isEditing && editIndex !== -1) {
        const newCart = [...prev];
        newCart[editIndex] = newItem;
        Swal.fire('Actualizado', `Artículo "${producto}" modificado.`, 'success');
        return newCart;
      } else {
        Swal.fire('Agregado', `Artículo "${producto}" agregado al carrito.`, 'success');
        return [...prev, newItem];
      }
    });

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
    if (isCredito) {
      if (!clienteCredito.nombre || !clienteCredito.direccion) {
        setSavingSale(false);
        Swal.fire(
          'Atención',
          'Para ventas a crédito debes ingresar nombre y dirección del cliente.',
          'warning'
        );
        return;
      }
    }
    if (savingSale) return;
    setSavingSale(true);

    if (cartItems.length === 0) {
      setSavingSale(false);
      Swal.fire('Atención', 'El carrito de ventas está vacío.', 'warning');
      return;
    }

    const monto = Number(paymentDetails.monto) || 0;

    // Validación para ventas de contado
    if (!isCredito) {
      if (monto < totalVenta) {
        setSavingSale(false);
        Swal.fire('Atención', `El monto pagado es insuficiente. Faltan $${(totalVenta - monto).toFixed(2)}`, 'warning');
        return;
      }
    }

    // Validación para ventas de crédito con pago parcial
    if (isCredito && pagoParcialCredito) {
      const efectivoRecibido = Number(paymentDetails.efectivoRecibido) || 0;
      
      if (monto > totalVenta) {
        setSavingSale(false);
        Swal.fire('Atención', `El monto a pagar no puede ser mayor que el total de la venta ($${totalVenta.toFixed(2)})`, 'warning');
        return;
      }
      if (monto <= 0) {
        setSavingSale(false);
        Swal.fire('Atención', 'Debe ingresar un monto a pagar mayor a cero', 'warning');
        return;
      }
      if (efectivoRecibido <= 0) {
        setSavingSale(false);
        Swal.fire('Atención', 'Debe ingresar el efectivo recibido', 'warning');
        return;
      }
      if (efectivoRecibido < monto) {
        setSavingSale(false);
        Swal.fire('Atención', `El efectivo recibido ($${efectivoRecibido.toFixed(2)}) es menor al monto a pagar ($${monto.toFixed(2)})`, 'warning');
        return;
      }
    }

    const articulos = cartItems.map(item => ({
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioVenta: item.precio,
    }));

    const montoPagado = isCredito && pagoParcialCredito ? monto : (isCredito ? 0 : monto);

    const payload = {
      articulos,
      total: totalVenta,
      monto: isCredito ? 0 : monto,
      cambio: isCredito ? 0 : cambioCalculado,
      nota: paymentDetails.nota || "",
      tipoVenta: isCredito ? 'credito' : 'contado',
      cliente: isCredito ? clienteCredito : null,
      montoPagado: montoPagado
    };


    try {
      const data = await addSale(payload);

      setShowAddSaleModal(false);
      setCartItems([]);
      setPaymentDetails({ monto: '', cambio: '', nota: '', efectivoRecibido: '' });
      setIsCredito(false);
      setPagoParcialCredito(false);
      setClienteCredito({ nombre: '', direccion: '' });
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

  // --- LÓGICA DE EDICIÓN DE PAGO DE CRÉDITO ---
  const handleEditPayment = (sale) => {
    setSelectedSaleForEdit(sale);
    setEditPaymentAmount(''); // Iniciar vacío para que el usuario ingrese el monto adicional
    setShowEditPaymentModal(true);
  };

  const handleCloseEditPayment = () => {
    setShowEditPaymentModal(false);
    setSelectedSaleForEdit(null);
    setEditPaymentAmount('');
  };

  const handleUpdatePayment = async () => {
    if (!selectedSaleForEdit) return;

    const montoAdicional = Number(editPaymentAmount) || 0;
    const totalVenta = selectedSaleForEdit.total || 0;
    const montoPagadoActual = selectedSaleForEdit.montoPagado || 0;

    if (montoAdicional < 0) {
      Swal.fire('Atención', 'El monto adicional no puede ser negativo', 'warning');
      return;
    }

    if (montoAdicional === 0) {
      Swal.fire('Atención', 'Debe ingresar un monto mayor a cero', 'warning');
      return;
    }

    // Calcular el nuevo monto total pagado sumando el actual + el adicional
    const nuevoMontoPagado = montoPagadoActual + montoAdicional;

    if (nuevoMontoPagado > totalVenta) {
      const maxPermitido = totalVenta - montoPagadoActual;
      Swal.fire(
        'Atención', 
        `El monto adicional excede el saldo pendiente. Solo puede pagar hasta $${maxPermitido.toFixed(2)}`, 
        'warning'
      );
      return;
    }

    setUpdatingPayment(true);

    try {
      const saleId = selectedSaleForEdit.id || selectedSaleForEdit._id;
      if (!saleId) {
        throw new Error('No se encontró el ID de la venta');
      }

      // Calcular el saldo pendiente redondeado a 2 decimales
      const saldoPendienteCalculado = totalVenta - nuevoMontoPagado;
      const saldoPendiente = Math.max(0, Math.round(saldoPendienteCalculado * 100) / 100);
      
      let estatus = 'pendiente';
      // Considerar pagado si el saldo es 0 o menor a 1 centavo (por posibles errores de precisión decimal)
      if (saldoPendiente <= 0.01) {
        estatus = 'pagado';
      } else if (nuevoMontoPagado > 0) {
        estatus = 'parcial';
      }

      const payload = {
        montoPagado: Math.round(nuevoMontoPagado * 100) / 100,
        saldoPendiente: saldoPendiente,
        estatus: estatus
      };

      await updateSale(saleId, payload);
      
      Swal.fire('Actualizado', 'El pago se ha actualizado correctamente', 'success');
      handleCloseEditPayment();
      
      // Recargar las ventas
      await fetchSales();

    } catch (error) {
      Swal.fire('Error', error.message || 'Error al actualizar el pago', 'error');
    } finally {
      setUpdatingPayment(false);
    }
  };

  // FIN LÓGICA DE EDICIÓN DE PAGO DE CRÉDITO

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
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{
                    padding: '8px',
                    marginBottom: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
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
                        {filteredProducts.length === 0 ? (
                          <li style={{ padding: '8px', color: '#999' }}>
                            No se encontraron productos
                          </li>
                        ) : (
                          filteredProducts.map((p) => {
                            const id = p.id ?? p._id ?? p.codigo ?? '';
                            return (
                              <li
                                key={id}
                                onClick={() => handleProductSelect(id)}
                                className={currentItem.productoId === id ? 'selected' : ''}
                              >
                                {`${p.nombre} (Stock: ${p.stock ?? 0})`}
                              </li>
                            );
                          })
                        )}
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
                  <hr style={{ margin: '15px 0' }} />

                  <div className="credito-checkbox">
                    <input
                      id="venta-credito"
                      type="checkbox"
                      checked={isCredito}
                      onChange={(e) => setIsCredito(e.target.checked)}
                    />
                    <label htmlFor="venta-credito">Venta a crédito</label>
                  </div>

                  {isCredito && (
                    <>
                      <label>Nombre del cliente</label>
                      <input
                        type="text"
                        value={clienteCredito.nombre}
                        onChange={(e) =>
                          setClienteCredito(prev => ({ ...prev, nombre: e.target.value }))
                        }
                        placeholder="Nombre del cliente"
                      />

                      <label>Dirección</label>
                      <input
                        type="text"
                        value={clienteCredito.direccion}
                        onChange={(e) =>
                          setClienteCredito(prev => ({ ...prev, direccion: e.target.value }))
                        }
                        placeholder="Dirección"
                      />

                      <div className="credito-checkbox" style={{ marginTop: '15px' }}>
                        <input
                          id="pago-parcial-credito"
                          type="checkbox"
                          checked={pagoParcialCredito}
                          onChange={(e) => {
                            setPagoParcialCredito(e.target.checked);
                            if (!e.target.checked) {
                              setPaymentDetails(prev => ({ ...prev, monto: '', efectivoRecibido: '' }));
                            }
                          }}
                        />
                        <label htmlFor="pago-parcial-credito">Va a dejar cubierto algo del pago</label>
                      </div>
                    </>
                  )}

                  {!isCredito && (
                    <>
                      <label>Monto Pagado</label>
                      <input name="monto" value={paymentDetails.monto} onChange={handlePaymentChange} type="number" min={totalVenta.toFixed(2)} />

                      <label>Cambio</label>
                      <input name="cambio" value={cambioCalculado.toFixed(2)} readOnly type="number" style={{ fontWeight: 'bold' }} />
                    </>
                  )}

                  {isCredito && pagoParcialCredito && (
                    <>
                      <label>Monto a Pagar (de lo que debe)</label>
                      <input 
                        name="monto" 
                        value={paymentDetails.monto} 
                        onChange={handlePaymentChange} 
                        type="number" 
                        min="0.01" 
                        max={totalVenta.toFixed(2)}
                        step="0.01"
                        placeholder="Monto que está pagando ahora"
                      />

                      <label>Efectivo Recibido (con cuánto paga)</label>
                      <input 
                        name="efectivoRecibido" 
                        value={paymentDetails.efectivoRecibido} 
                        onChange={handlePaymentChange} 
                        type="number" 
                        min="0.01"
                        step="0.01"
                        placeholder="Monto con que paga (billete, etc.)"
                      />

                      <label>Cambio</label>
                      <input 
                        name="cambio" 
                        value={cambioCredito >= 0 ? cambioCredito.toFixed(2) : '0.00'} 
                        readOnly 
                        type="number" 
                        style={{ 
                          fontWeight: 'bold',
                          backgroundColor: cambioCredito >= 0 ? '#e8f5e9' : '#ffebee',
                          color: cambioCredito >= 0 ? '#2e7d32' : '#c62828'
                        }} 
                      />
                      {cambioCredito < 0 && (
                        <p style={{ color: '#c62828', fontSize: '0.85em', marginTop: '-10px', marginBottom: '10px' }}>
                          El efectivo recibido es menor al monto a pagar
                        </p>
                      )}
                    </>
                  )}

                  <label>Nota de Venta</label>
                  <input name="nota" value={paymentDetails.nota} onChange={handlePaymentChange} />
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="cancel-button" onClick={() => setShowAddSaleModal(false)}>Cancelar</button>
              <button 
                className="save-button" 
                onClick={handleSaveSale} 
                disabled={
                  savingSale || 
                  cartItems.length === 0 || 
                  (!isCredito && cambioCalculado < 0) || 
                  currentItem.isEditing
                }
              >
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

      {/* Modal de Editar Pago de Crédito */}
      {showEditPaymentModal && selectedSaleForEdit && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Editar Pago - Venta {selectedSaleForEdit.codigo}</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <p><strong>Cliente:</strong> {selectedSaleForEdit.cliente?.nombre ?? 'N/A'}</p>
              <p><strong>Total de la Venta:</strong> ${(selectedSaleForEdit.total || 0).toFixed(2)}</p>
              <p><strong>Monto Pagado Actual:</strong> ${((selectedSaleForEdit.montoPagado || 0).toFixed(2))}</p>
              <p><strong>Saldo Pendiente Actual:</strong> ${((selectedSaleForEdit.saldoPendiente !== undefined ? selectedSaleForEdit.saldoPendiente : (selectedSaleForEdit.total - (selectedSaleForEdit.montoPagado || 0)))).toFixed(2)}</p>
            </div>

            <hr style={{ margin: '20px 0' }} />

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Monto Adicional a Pagar
            </label>
            <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
              Ingrese el <strong>monto adicional</strong> que el cliente está pagando ahora.
              Saldo pendiente máximo: ${((selectedSaleForEdit.saldoPendiente !== undefined ? selectedSaleForEdit.saldoPendiente : (selectedSaleForEdit.total - (selectedSaleForEdit.montoPagado || 0)))).toFixed(2)}
            </p>
            <input
              type="number"
              value={editPaymentAmount}
              onChange={(e) => setEditPaymentAmount(e.target.value)}
              min="0.01"
              max={(selectedSaleForEdit.saldoPendiente !== undefined ? selectedSaleForEdit.saldoPendiente : (selectedSaleForEdit.total - (selectedSaleForEdit.montoPagado || 0)))}
              step="0.01"
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '15px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
              placeholder="Ingrese el monto adicional a pagar"
            />

            {editPaymentAmount && !isNaN(Number(editPaymentAmount)) && Number(editPaymentAmount) > 0 && (
              <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <p><strong>Monto Adicional:</strong> ${(Number(editPaymentAmount) || 0).toFixed(2)}</p>
                <p><strong>Nuevo Monto Total Pagado:</strong> ${((selectedSaleForEdit.montoPagado || 0) + (Number(editPaymentAmount) || 0)).toFixed(2)}</p>
                <p><strong>Nuevo Saldo Pendiente:</strong> ${((selectedSaleForEdit.total || 0) - ((selectedSaleForEdit.montoPagado || 0) + (Number(editPaymentAmount) || 0))).toFixed(2)}</p>
              </div>
            )}

            <div className="modal-actions" style={{ justifyContent: 'center', gap: '10px' }}>
              <button 
                className="cancel-button" 
                onClick={handleCloseEditPayment}
                disabled={updatingPayment}
              >
                Cancelar
              </button>
              <button 
                className="save-button" 
                onClick={handleUpdatePayment}
                disabled={updatingPayment || !editPaymentAmount || isNaN(Number(editPaymentAmount))}
              >
                {updatingPayment ? 'Actualizando...' : 'Actualizar Pago'}
              </button>
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
        <h2 className="card-title">Ventas de Contado</h2>

        <table className="sales-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Artículos</th>
              <th>Total</th>
              <th>Info</th>
            </tr>
          </thead>

          <tbody>
            {ventasContado.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>
                  No hay ventas de contado
                </td>
              </tr>
            ) : (
              ventasContado.map((sale) => (
                <tr key={sale._id}>
                  <td>{sale.codigo}</td>
                  <td>{getFormattedDate(sale)}</td>
                  <td>{sale.articulos?.length ?? 1}</td>
                  <td>${sale.total.toFixed(2)}</td>
                  <td>
                    <button className="btn-ver" onClick={() => handleView(sale)}>Ver</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="sales-card" style={{ marginTop: '30px' }}>
        <h2 className="card-title">Ventas a Crédito</h2>

        <table className="sales-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Monto Pagado</th>
              <th>Saldo Pendiente</th>
              <th>Estatus</th>
              <th>Info</th>
            </tr>
          </thead>

          <tbody>
            {ventasCredito.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center' }}>
                  No hay ventas a crédito
                </td>
              </tr>
            ) : (
              ventasCredito.map((sale) => {
                const montoPagado = sale.montoPagado || 0;
                const saldoPendiente = sale.saldoPendiente !== undefined ? sale.saldoPendiente : (sale.total - montoPagado);
                const estatus = sale.estatus || (saldoPendiente <= 0 ? 'pagado' : (montoPagado > 0 ? 'parcial' : 'pendiente'));
                
                const getEstatusLabel = (est) => {
                  switch(est) {
                    case 'pagado': return 'Pagado';
                    case 'parcial': return 'Parcial';
                    case 'pendiente': return 'Pendiente';
                    default: return est;
                  }
                };

                const getEstatusColor = (est) => {
                  switch(est) {
                    case 'pagado': return '#28a745';
                    case 'parcial': return '#ffc107';
                    case 'pendiente': return '#dc3545';
                    default: return '#6c757d';
                  }
                };

                return (
                  <tr key={sale._id || sale.id}>
                    <td>{sale.codigo}</td>
                    <td>{getFormattedDate(sale)}</td>
                    <td>{sale.cliente?.nombre ?? 'N/A'}</td>
                    <td>${sale.total.toFixed(2)}</td>
                    <td>${montoPagado.toFixed(2)}</td>
                    <td>${saldoPendiente.toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                        <span style={{ 
                          color: getEstatusColor(estatus), 
                          fontWeight: 'bold',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: getEstatusColor(estatus) + '20'
                        }}>
                          {getEstatusLabel(estatus)}
                        </span>
                        <button 
                          className="btn-ver" 
                          onClick={() => handleEditPayment(sale)}
                          style={{ fontSize: '0.85em', padding: '4px 8px' }}
                        >
                          Editar Pago
                        </button>
                      </div>
                    </td>
                    <td>
                      <button className="btn-ver" onClick={() => handleView(sale)}>Ver</button>
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