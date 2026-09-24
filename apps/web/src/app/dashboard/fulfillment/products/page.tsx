'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api-client';
import { IFulfillmentProduct, FulfillmentProductType } from '@pixmatch/types';

export default function StudioProductCatalogPage() {
  const [products, setProducts] = useState<IFulfillmentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // New Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [productType, setProductType] = useState<FulfillmentProductType>(FulfillmentProductType.PRINTS);
  const [basePriceDollars, setBasePriceDollars] = useState<number>(15);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    const res = await fetchApi<IFulfillmentProduct[]>('/v1/fulfillment/products');
    if (res.success && res.data) {
      setProducts(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    const res = await fetchApi('/v1/fulfillment/products/defaults/seed', {
      method: 'POST',
    });
    setSeeding(false);
    if (res.success) {
      loadProducts();
    } else {
      alert(res.error?.message || 'Failed to seed default products.');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);

    const res = await fetchApi('/v1/fulfillment/products', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        product_type: productType,
        base_price_cents: Math.round(basePriceDollars * 100),
        currency: 'USD',
        description: description.trim() || undefined,
        variants: [
          {
            name: 'Standard',
            price_cents: Math.round(basePriceDollars * 100),
          },
        ],
      }),
    });

    setCreating(false);
    if (res.success) {
      setIsModalOpen(false);
      setName('');
      setDescription('');
      loadProducts();
    } else {
      alert(res.error?.message || 'Failed to create product.');
    }
  };

  const filteredProducts = products.filter((p) => {
    if (selectedType === 'ALL') return true;
    return (p.product_type || p.type) === selectedType;
  });

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/dashboard/fulfillment" className="hover:text-slate-200">
              Fulfillment
            </Link>
            <span>/</span>
            <span className="text-slate-200">Product Catalog</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Print & Product Catalog</h1>
          <p className="text-slate-400 text-sm mt-1">
            Configure studio pricing for prints, heirloom albums, gallery wraps, framing, and digital downloads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition"
          >
            {seeding ? 'Seeding...' : '⚡ Seed Default Catalog'}
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/25 flex items-center gap-2"
          >
            <span>+</span> Add Custom Product
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {(['ALL', 'PRINTS', 'PHOTO_BOOK', 'CANVAS', 'FRAMED_PRINT', 'DIGITAL_DOWNLOAD'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              selectedType === type
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {type === 'ALL' ? 'All Products' : type.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 text-xs">Loading product catalog...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <p className="text-slate-400 text-sm">No products found in this category.</p>
          <button
            onClick={handleSeedDefaults}
            className="text-xs text-indigo-400 hover:underline font-semibold"
          >
            Click here to seed industry-standard defaults (8x10 prints, leather albums, gallery canvases).
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                    {(p.product_type || p.type || '').replace(/_/g, ' ')}
                  </span>
                  <h3 className="text-base font-bold text-slate-100 mt-2">{p.name}</h3>
                  {p.description && <p className="text-xs text-slate-400 mt-1">{p.description}</p>}
                </div>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {((p.base_price_cents ?? Math.round((p.base_price || 0) * 100)) / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: p.currency || 'USD',
                  })}
                </span>
              </div>

              {/* Variants */}
              {p.variants && p.variants.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                  <p className="text-[11px] font-semibold text-slate-400">Available Variants ({p.variants.length})</p>
                  <div className="space-y-1">
                    {p.variants.map((v) => (
                      <div key={v.id} className="flex justify-between text-xs text-slate-300">
                        <span>{v.name} {v.dimensions ? `(${v.dimensions})` : ''}</span>
                        <span className="text-slate-400">
                          {((v.price_cents ?? Math.round((v.price || 0) * 100)) / 100).toLocaleString('en-US', {
                            style: 'currency',
                            currency: p.currency || 'USD',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold">Add New Product</h3>
            <p className="text-xs text-slate-400">Add an item to your studio fulfillment offering.</p>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Product Title</label>
                <input
                  type="text"
                  placeholder="e.g. Fine Art Giclée Print 11x14"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Category</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                >
                  <option value={FulfillmentProductType.PRINTS}>Lustre / Fine Art Prints</option>
                  <option value={FulfillmentProductType.PHOTO_BOOK}>Heirloom Flush Mount Album</option>
                  <option value={FulfillmentProductType.CANVAS}>Gallery Wrapped Canvas</option>
                  <option value={FulfillmentProductType.FRAMED_PRINT}>Custom Framed Print</option>
                  <option value={FulfillmentProductType.DIGITAL_DOWNLOAD}>High-Res Digital Download</option>
                  <option value={FulfillmentProductType.CUSTOM_PRODUCT}>Custom Product / Keepsake</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Base Price ($)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={basePriceDollars}
                  onChange={(e) => setBasePriceDollars(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Specifications, paper type, lab details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl font-semibold"
                >
                  {creating ? 'Creating...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
