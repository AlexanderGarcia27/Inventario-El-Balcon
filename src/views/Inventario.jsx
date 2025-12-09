import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Layout from '../components/Layout';
import './Inventario.css';

const Inventario = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Extraer fetchProducts para reutilizarlo (se llama después de crear producto)
  const fetchProducts = async () => {
    setLoading(true);
    setLoadError(null);
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
        const errText = await res.text();
        throw new Error(errText || `Error ${res.status}`);
      }

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setLoadError(err.message || 'Error cargando productos');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const nombre = (product.nombre || '').toString().toLowerCase();
    const codigo = (product.codigo || '').toString().toLowerCase();
    const categoria = (product.categoria || '').toString().toLowerCase();
    const q = searchQuery.toLowerCase();
    return nombre.includes(q) || codigo.includes(q) || categoria.includes(q);
  });

  const handleAddProduct = () => {
    // Mostrar modal para agregar producto
    setShowAddModal(true);
  };

  

  const handleDelete = (product) => {
    // Confirmar y eliminar en backend
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
        const token = localStorage.getItem('token');
        const res = await fetch(`https://backend-inventario-balcon.onrender.com/productos/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });

        if (!res.ok) {
          let err = 'Error eliminando producto';
          try {
            const errJson = await res.json();
            if (errJson && errJson.message) err = errJson.message;
          } catch (e) {}
          Swal.fire('Error', err, 'error');
          return;
        }

        await fetchProducts();
        Swal.fire('Eliminado', 'Producto eliminado correctamente.', 'success');
      } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
      }
    });
  };

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [addForm, setAddForm] = useState({ nombre: '', precio: '', stock: '', categoria: '' });
  const [adding, setAdding] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: '', precio: '', stock: '', categoria: '' });
  const [editing, setEditing] = useState(false);

  const handleAddFormChange = (e) => {
    const { name, value } = e.target;
    setAddForm((p) => ({ ...p, [name]: value }));
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm((p) => ({ ...p, [name]: value }));
  };

  const handleSaveAddProduct = async () => {
    // Prepare payload according to backend
    const payload = {
      nombre: addForm.nombre,
      precio: Number(addForm.precio) || 0,
      stock: Number(addForm.stock) || 0,
      // enviar categoria como cadena vacía si no está definida para evitar undefined
      categoria: addForm.categoria ?? ''
    };

    setAdding(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('https://backend-inventario-balcon.onrender.com/productos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let err = 'Error creando producto';
        try {
          const errJson = await res.json();
          if (errJson && errJson.message) err = errJson.message;
        } catch (e) {}
        Swal.fire('Error', err, 'error');
        return;
      }

      const created = await res.json();
      // Refrescar lista desde servidor para evitar inconsistencias en la respuesta
      await fetchProducts();
      Swal.fire('Creado', 'Producto creado correctamente.', 'success');
      setShowAddModal(false);
      setAddForm({ nombre: '', precio: '', stock: '', categoria: '' });
    } catch (error) {
      Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (product) => {
    // Prefill edit form with product data
    setEditProduct(product);
    setEditForm({
      nombre: product.nombre ?? '',
      precio: product.precio ?? '',
      stock: product.stock ?? product.cantidad ?? '',
      categoria: product.categoria ?? ''
    });
    setShowEditModal(true);
  };

  const handleSaveEditProduct = async () => {
    if (!editProduct) return;
    const id = editProduct.id ?? editProduct._id ?? editProduct.codigo ?? null;
    // Prefer explicit id field from backend (Firebase id is in `id` in your example)
    if (!id) {
      Swal.fire('Error', 'No se encontró el id del producto para actualizar.', 'error');
      return;
    }

    const payload = {
      nombre: editForm.nombre,
      precio: Number(editForm.precio) || 0,
      stock: Number(editForm.stock) || 0,
      categoria: editForm.categoria ?? ''
    };

    setEditing(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`https://backend-inventario-balcon.onrender.com/productos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let err = 'Error actualizando producto';
        try {
          const errJson = await res.json();
          if (errJson && errJson.message) err = errJson.message;
        } catch (e) {}
        Swal.fire('Error', err, 'error');
        return;
      }

      // Refresh list from server
      await fetchProducts();
      Swal.fire('Actualizado', 'Producto actualizado correctamente.', 'success');
      setShowEditModal(false);
      setEditProduct(null);
    } catch (error) {
      Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
    } finally {
      setEditing(false);
    }
  };

  return (
    <Layout>
      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Agregar Producto</h2>
            <label>Nombre</label>
            <input name="nombre" value={addForm.nombre} onChange={handleAddFormChange} type="text" />
            <div className="modal-row">
              <div>
                <label>Precio</label>
                <input name="precio" value={addForm.precio} onChange={handleAddFormChange} type="number" />
              </div>
              <div>
                <label>Stock</label>
                <input name="stock" value={addForm.stock} onChange={handleAddFormChange} type="number" />
              </div>
            </div>
            <label>Categoria</label>
            <input name="categoria" value={addForm.categoria} onChange={handleAddFormChange} type="text" />
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className="save-button" onClick={handleSaveAddProduct} disabled={adding}>{adding ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Editar Producto</h2>
            <label>Nombre</label>
            <input name="nombre" value={editForm.nombre} onChange={handleEditFormChange} type="text" />
            <div className="modal-row">
              <div>
                <label>Precio</label>
                <input name="precio" value={editForm.precio} onChange={handleEditFormChange} type="number" />
              </div>
              <div>
                <label>Stock</label>
                <input name="stock" value={editForm.stock} onChange={handleEditFormChange} type="number" />
              </div>
            </div>
            <label>Categoria</label>
            <input name="categoria" value={editForm.categoria} onChange={handleEditFormChange} type="text" />
            <div className="modal-actions">
              <button className="cancel-button" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="save-button" onClick={handleSaveEditProduct} disabled={editing}>{editing ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
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
              <th>Precio</th>
              <th>Categoria</th>
              <th>Stock</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Cargando productos...</td>
              </tr>
            ) : loadError ? (
              <tr>
                <td colSpan="6">Error: {loadError}</td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6">No hay productos</td>
              </tr>
            ) : (
              filteredProducts.map((product, index) => (
                <tr key={product.id ?? index}>
                  <td>{product.codigo}</td>
                  <td>{product.nombre}</td>
                  <td>${product.precio}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
};

export default Inventario;

