import { useState } from 'react';
import Swal from 'sweetalert2';
import Layout from '../components/Layout';
import './Inventario.css';

// 1. Importar useData
import { useData } from '../context/DataContext';

const Inventario = () => {
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Consumir del contexto:
  // - products: lista de productos cacheada.
  // - dataLoading: estado de carga (para mostrar 'Cargando...').
  // - dataError: estado de error.
  // - refreshData: objeto que contiene las funciones para mutar/recargar.
  const {
    products,
    dataLoading: loading,
    dataError: loadError,
    refreshData: { addProduct, updateProduct, deleteProduct, loadProducts }
  } = useData();

  // ❌ ELIMINAR: Estados locales de productos y carga
  /*
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  */

  // ❌ ELIMINAR: useEffect para la carga inicial (se hace en DataContext)
  /*
  useEffect(() => {
    fetchProducts();
  }, []);
  */

  // ❌ ELIMINAR: Función fetchProducts completa. Si necesitas forzar una recarga, 
  // usarías loadProducts() del contexto, pero no es necesario aquí al inicio.
  /*
  const fetchProducts = async () => { ... };
  */


  const filteredProducts = products.filter((product) => {
    // Aseguramos que 'products' es un array antes de usar filter
    if (!Array.isArray(products)) return false;

    const nombre = (product.nombre || '').toString().toLowerCase();
    const codigo = (product.codigo || '').toString().toLowerCase();
    const categoria = (product.categoria || '').toString().toLowerCase();
    const q = searchQuery.toLowerCase();
    return nombre.includes(q) || codigo.includes(q) || categoria.includes(q);
  });

  // ... handleAddProduct (se mantiene igual, solo llama al modal) ...
  const handleAddProduct = () => {
    setShowAddModal(true);
  };

  // 3. Modificar handleDelete para usar deleteProduct del contexto
  const handleDelete = (product) => {
    Swal.fire({
      title: 'Eliminar producto',
      text: `¿Estás seguro que deseas eliminar ${product.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      const id = product.id ?? product._id ?? product.codigo ?? null;
      if (!id) {
        Swal.fire('Error', 'No se encontró el id del producto para eliminar.', 'error');
        return;
      }

      try {
        // ✅ USAR FUNCIÓN DEL CONTEXTO: deleteProduct
        await deleteProduct(id);
        Swal.fire('Eliminado', 'Producto eliminado correctamente.', 'success');
      } catch (error) {
        // El error ya viene formateado desde deleteProduct
        Swal.fire('Error', error.message || 'Error eliminando producto.', 'error');
      }
    });
  };

  // Modales y estado (se mantienen igual)
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const [addForm, setAddForm] = useState({ nombre: '', precio: '', precioCompra: '', stock: '', categoria: '' });
  const [adding, setAdding] = useState(false);

  const [editForm, setEditForm] = useState({ nombre: '', precio: '', precioCompra: '', stock: '', categoria: '' });
  const [editing, setEditing] = useState(false);

  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm((p) => ({ ...p, [name]: value }));
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((p) => ({ ...p, [name]: value }));
  };

  // 4. Modificar handleSaveAddProduct para usar addProduct del contexto
  const handleSaveAddProduct = async () => {
    const payload = {
      nombre: addForm.nombre,
      precio: Number(addForm.precio) || 0,
      precioCompra: Number(addForm.precioCompra) || 0,
      stock: Number(addForm.stock) || 0,
      categoria: addForm.categoria ?? ''
    };

    setAdding(true);
    try {
      // ✅ USAR FUNCIÓN DEL CONTEXTO: addProduct
      await addProduct(payload);

      Swal.fire('Creado', 'Producto creado correctamente.', 'success');
      setShowAddModal(false);
      setAddForm({ nombre: '', precio: '', precioCompra: '', stock: '', categoria: '' });
    } catch (error) {
      // El error ya viene formateado desde addProduct
      Swal.fire('Error', error.message || 'Error creando producto.', 'error');
    } finally {
      setAdding(false);
    }
  };

  // ... handleEdit (se mantiene igual, solo carga el formulario) ...
  const handleEdit = (product) => {
    setEditProduct(product);
    setEditForm({
      nombre: product.nombre ?? '',
      precio: product.precio ?? '',
      precioCompra: product.precioCompra ?? '',
      stock: product.stock ?? product.cantidad ?? '',
      categoria: product.categoria ?? ''
    });
    setShowEditModal(true);
  };

  // 5. Modificar handleSaveEditProduct para usar updateProduct del contexto
  const handleSaveEditProduct = async () => {
    if (!editProduct) return;
    const id = editProduct.id ?? editProduct._id ?? editProduct.codigo ?? null;
    if (!id) {
      Swal.fire('Error', 'No se encontró el id del producto para actualizar.', 'error');
      return;
    }

    const payload = {
      nombre: editForm.nombre,
      precio: Number(editForm.precio) || 0,
      precioCompra: Number(editForm.precioCompra) || 0,
      stock: Number(editForm.stock) || 0,
      categoria: editForm.categoria ?? ''
    };

    setEditing(true);
    try {
      // ✅ USAR FUNCIÓN DEL CONTEXTO: updateProduct
      await updateProduct(id, payload);

      Swal.fire('Actualizado', 'Producto actualizado correctamente.', 'success');
      setShowEditModal(false);
      setEditProduct(null);
    } catch (error) {
      // El error ya viene formateado desde updateProduct
      Swal.fire('Error', error.message || 'Error actualizando producto.', 'error');
    } finally {
      setEditing(false);
    }
  };

  return (
    <Layout>
      {/* Modales (sin cambios relevantes en la estructura HTML) */}
      {/* ... */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Agregar Producto</h2>
            <label>Nombre</label>
            <input name="nombre" value={addForm.nombre} onChange={handleAddFormChange} type="text" />
            <div className="modal-row">
              <div>
                <label>Precio Venta</label>
                <input name="precio" value={addForm.precio} onChange={handleAddFormChange} type="number" />
              </div>
              <div>
                <label>Precio Compra</label>
                <input name="precioCompra" value={addForm.precioCompra} onChange={handleAddFormChange} type="number" />
              </div>
            </div>
            <div className="modal-row">
              <div>
                <label>Stock</label>
                <input name="stock" value={addForm.stock} onChange={handleAddFormChange} type="number" />
              </div>
              <div>
                <label>Categoria</label>
                <input name="categoria" value={addForm.categoria} onChange={handleAddFormChange} type="text" />
              </div>
            </div>

            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className="save-button" onClick={handleSaveAddProduct} disabled={adding}>{adding ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Editar Producto</h2>
            <label>Nombre</label>
            <input name="nombre" value={editForm.nombre} onChange={handleEditFormChange} type="text" />
            <div className="modal-row">
              <div>
                <label>Precio Venta</label>
                <input name="precio" value={editForm.precio} onChange={handleEditFormChange} type="number" />
              </div>
              <div>
                <label>Precio Compra</label>
                <input name="precioCompra" value={editForm.precioCompra} onChange={handleEditFormChange} type="number" />
              </div>
            </div>
            <div className="modal-row">
              <div>
                <label>Stock</label>
                <input name="stock" value={editForm.stock} onChange={handleEditFormChange} type="number" />
              </div>
              <div>
                <label>Categoria</label>
                <input name="categoria" value={editForm.categoria} onChange={handleEditFormChange} type="text" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="save-button" onClick={handleSaveEditProduct} disabled={editing}>{editing ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
      {/* Fin Modales */}

      <div className="inventario-header">
        <h1 className="page-title">Inventario</h1>
        <div className="header-actions">
          <input
            type="text"
            placeholder="Buscar producto"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button className="add-button" onClick={handleAddProduct}>
            Agregar producto
          </button>
        </div>

      </div>

      <div className="products-card">
        <h2 className="card-title">Productos</h2>
        <table className="products-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Nombre</th>
              <th>Precio Venta</th>
              <th>Precio Compra</th>
              <th>Ganancia Bruta</th>
              <th>Categoria</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* Usamos 'loading' y 'loadError' del contexto */}
            {loading && products.length === 0 ? (
              <tr>
                <td colSpan="8">Cargando productos...</td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan="8">Error: {loadError}</td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="8">No hay productos</td>
              </tr>
            ) : (
              filteredProducts.map((product, index) => {
                const precioVenta = Number(product.precio) || 0;
                const precioCosto = Number(product.precioCompra) || 0;
                const gananciaBruta = precioVenta - precioCosto;

                return (
                  <tr key={product.id ?? index}>
                    <td>{product.codigo}</td>
                    <td>{product.nombre}</td>
                    <td>${precioVenta.toFixed(2)}</td>
                    <td>${precioCosto.toFixed(2)}</td>
                    <td>${gananciaBruta.toFixed(2)}</td>
                    <td>{product.categoria}</td>
                    <td>{product.stock ?? product.cantidad ?? 0}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(product)}
                        >
                          Eliminar
                        </button>
                        <button
                          className="edit-button"
                          onClick={() => handleEdit(product)}
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Inventario;