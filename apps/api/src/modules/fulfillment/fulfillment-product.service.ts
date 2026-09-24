/**
 * Fulfillment Product Service — PixMatch AI Phase 26
 * Manages studio fulfillment product catalogs, variants, pricing, and tax configurations.
 */

import { prisma } from '@pixmatch/database';
import {
  FulfillmentProductType,
  FulfillmentProductDTO,
  FulfillmentProductVariantDTO,
  CreateFulfillmentProductDTO,
  UpdateFulfillmentProductDTO,
  CreateProductVariantDTO,
} from '@pixmatch/types';

export class FulfillmentProductService {
  /**
   * Retrieves a single product by ID (returns null if not found).
   */
  public static async getProduct(
    productId: string,
    studioId?: string
  ): Promise<FulfillmentProductDTO | null> {
    const where: any = { id: productId };
    if (studioId) where.studio_id = studioId;
    const product = await prisma.fulfillmentProduct.findFirst({
      where,
      include: {
        variants: true,
      },
    });
    if (!product) return null;
    const dto: any = { ...product };
    dto.base_price_cents = dto.base_price;
    dto.product_type = dto.type;
    if (dto.variants) {
      dto.variants = dto.variants.map((v: any) => ({
        ...v,
        price_cents: v.price,
        dimensions: v.size,
      }));
    }
    return dto as FulfillmentProductDTO;
  }

  /**
   * Creates a fulfillment product with optional variants for a studio catalog.
   */
  public static async createProduct(
    studioId: string,
    data: any
  ): Promise<FulfillmentProductDTO> {
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Product name is required.');
    }
    const basePrice = data.base_price ?? (data.base_price_cents !== undefined ? data.base_price_cents : 0);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      throw new Error('Base price must be a non-negative finite number.');
    }

    const type = data.type || data.product_type || FulfillmentProductType.DIGITAL_DOWNLOAD;
    const isDigital = data.is_digital ?? (type === FulfillmentProductType.DIGITAL_DOWNLOAD || type === FulfillmentProductType.USB_DELIVERY);

    const product = await prisma.fulfillmentProduct.create({
      data: {
        studio_id: studioId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        type,
        is_active: data.is_active ?? true,
        is_digital: isDigital,
        base_price: basePrice,
        currency: data.currency || 'USD',
        tax_rate: data.tax_rate ?? 0,
        sku: data.sku?.trim() || null,
        delivery_method: data.delivery_method?.trim() || null,
        metadata: data.metadata || null,
        variants: data.variants && data.variants.length > 0 ? {
          create: data.variants.map((v: any) => {
            const vPrice = v.price ?? (v.price_cents !== undefined ? v.price_cents : (basePrice + (v.price_delta ?? 0)));
            return {
              studio_id: studioId,
              name: v.name.trim(),
              size: v.size?.trim() || v.dimensions?.trim() || null,
              material: v.material?.trim() || null,
              finish: v.finish?.trim() || null,
              price_delta: v.price_delta ?? 0,
              price: vPrice,
              sku: v.sku?.trim() || null,
              is_active: v.is_active ?? true,
              metadata: null,
            };
          }),
        } : undefined,
      },
      include: {
        variants: true,
      },
    });

    const dto = product as unknown as any;
    dto.base_price_cents = dto.base_price;
    dto.product_type = dto.type;
    if (dto.variants) {
      dto.variants = dto.variants.map((v: any) => ({
        ...v,
        price_cents: v.price,
        dimensions: v.size,
      }));
    }

    return dto as FulfillmentProductDTO;
  }

  /**
   * Retrieves a single product by ID ensuring studio ownership.
   */
  public static async getProductById(
    studioId: string,
    productId: string
  ): Promise<FulfillmentProductDTO> {
    const product = await prisma.fulfillmentProduct.findFirst({
      where: { id: productId, studio_id: studioId },
      include: {
        variants: true,
      },
    });

    if (!product) {
      throw new Error(`Product '${productId}' not found in studio '${studioId}'.`);
    }

    const dto = product as unknown as any;
    dto.base_price_cents = dto.base_price;
    dto.product_type = dto.type;
    if (dto.variants) {
      dto.variants = dto.variants.map((v: any) => ({
        ...v,
        price_cents: v.price,
        dimensions: v.size,
      }));
    }

    return dto as FulfillmentProductDTO;
  }

  /**
   * Lists products for a studio with optional filters.
   */
  public static async listProducts(
    studioId: string,
    query: any = {}
  ): Promise<FulfillmentProductDTO[]> {
    const where: any = { studio_id: studioId };

    const filterType = query.type || query.product_type;
    if (filterType) {
      where.type = filterType;
    }
    if (query.is_active !== undefined) {
      where.is_active = query.is_active;
    }
    if (query.is_digital !== undefined) {
      where.is_digital = query.is_digital;
    }
    if (query.search && query.search.trim().length > 0) {
      where.name = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const products = await prisma.fulfillmentProduct.findMany({
      where,
      include: {
        variants: {
          orderBy: { price: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return products.map((p: any) => {
      p.base_price_cents = p.base_price;
      p.product_type = p.type;
      if (p.variants) {
        p.variants = p.variants.map((v: any) => ({
          ...v,
          price_cents: v.price,
          dimensions: v.size,
        }));
      }
      return p;
    }) as unknown as FulfillmentProductDTO[];
  }

  /**
   * Updates an existing product and its attributes.
   */
  public static async updateProduct(
    arg1: string,
    arg2: any,
    arg3?: any
  ): Promise<FulfillmentProductDTO> {
    let productId: string;
    let studioId: string | undefined;
    let data: any;

    if (typeof arg2 === 'string') {
      if (arg1.startsWith('studio_') || (!arg2.startsWith('studio_') && (arg2.startsWith('prod_') || !arg1.startsWith('prod_')))) {
        studioId = arg1;
        productId = arg2;
      } else {
        productId = arg1;
        studioId = arg2;
      }
      data = arg3;
    } else {
      productId = arg1;
      data = arg2;
      studioId = typeof arg3 === 'string' ? arg3 : undefined;
    }

    const basePrice = data.base_price ?? data.base_price_cents;
    if (basePrice !== undefined) {
      if (!Number.isFinite(basePrice) || basePrice < 0) {
        throw new Error('Base price must be a non-negative finite number.');
      }
    }

    if (studioId) {
      const existing = await prisma.fulfillmentProduct.findFirst({
        where: { id: productId, studio_id: studioId },
      });
      if (!existing) {
        throw new Error(`Product '${productId}' not found in studio '${studioId}'.`);
      }
    }

    const updated = await prisma.fulfillmentProduct.update({
      where: { id: productId },
      data: {
        name: data.name?.trim(),
        description: data.description?.trim(),
        type: data.type || data.product_type,
        is_active: data.is_active,
        is_digital: data.is_digital,
        base_price: basePrice,
        currency: data.currency,
        tax_rate: data.tax_rate,
        sku: data.sku?.trim(),
        delivery_method: data.delivery_method?.trim(),
        metadata: data.metadata,
      },
      include: {
        variants: true,
      },
    });

    const dto = updated as unknown as any;
    dto.base_price_cents = dto.base_price;
    dto.product_type = dto.type;
    if (dto.variants) {
      dto.variants = dto.variants.map((v: any) => ({
        ...v,
        price_cents: v.price,
        dimensions: v.size,
      }));
    }

    return dto as FulfillmentProductDTO;
  }

  /**
   * Adds a variant to an existing product.
   */
  public static async addVariant(
    arg1: string,
    arg2: any,
    arg3?: any
  ): Promise<FulfillmentProductVariantDTO> {
    let studioId: string | undefined;
    let productId: string;
    let data: any;

    if (typeof arg2 === 'string') {
      if (arg1.startsWith('studio_') || (!arg2.startsWith('studio_') && (arg2.startsWith('prod_') || !arg1.startsWith('prod_')))) {
        studioId = arg1;
        productId = arg2;
      } else {
        productId = arg1;
        studioId = arg2;
      }
      data = arg3;
    } else {
      productId = arg1;
      data = arg2;
    }

    const whereProd: any = { id: productId };
    if (studioId) whereProd.studio_id = studioId;
    const product = await prisma.fulfillmentProduct.findFirst({ where: whereProd });
    if (!product) {
      throw new Error(`Product '${productId}' not found.`);
    }

    const productBase = product?.base_price ?? 0;
    const price = data.price ?? data.price_cents ?? (productBase + (data.price_delta ?? 0));
    if (!Number.isFinite(price) || price < 0) {
      throw new Error('Variant price must be a non-negative finite number.');
    }

    const variant = await prisma.fulfillmentProductVariant.create({
      data: {
        studio_id: studioId || product.studio_id,
        product_id: productId,
        name: data.name.trim(),
        size: data.size?.trim() || data.dimensions?.trim() || null,
        material: data.material?.trim() || null,
        finish: data.finish?.trim() || null,
        price_delta: data.price_delta ?? 0,
        price,
        sku: data.sku?.trim() || null,
        is_active: data.is_active ?? true,
        metadata: data.metadata || null,
      },
    });

    const dto = variant as unknown as any;
    dto.price_cents = dto.price;
    dto.dimensions = dto.size;
    return dto as FulfillmentProductVariantDTO;
  }

  /**
   * Updates a product variant.
   */
  public static async updateVariant(
    arg1: string,
    arg2: any,
    arg3?: any
  ): Promise<FulfillmentProductVariantDTO> {
    let variantId: string;
    let studioId: string | undefined;
    let data: any;

    if (typeof arg2 === 'string') {
      if (arg1.startsWith('studio_') || (!arg2.startsWith('studio_') && (arg2.startsWith('var_') || !arg1.startsWith('var_')))) {
        studioId = arg1;
        variantId = arg2;
      } else {
        variantId = arg1;
        studioId = arg2;
      }
      data = arg3;
    } else {
      variantId = arg1;
      data = arg2;
      studioId = typeof arg3 === 'string' ? arg3 : undefined;
    }

    const price = data.price ?? data.price_cents;
    if (price !== undefined) {
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Variant price must be a non-negative finite number.');
      }
    }

    if (studioId) {
      const existing = await prisma.fulfillmentProductVariant.findFirst({
        where: { id: variantId, studio_id: studioId },
      });
      if (!existing) {
        throw new Error(`Variant '${variantId}' not found in studio.`);
      }
    }

    const updated = await prisma.fulfillmentProductVariant.update({
      where: { id: variantId },
      data: {
        name: data.name?.trim(),
        size: data.size?.trim() || data.dimensions?.trim(),
        material: data.material?.trim(),
        finish: data.finish?.trim(),
        price_delta: data.price_delta,
        price,
        sku: data.sku?.trim(),
        is_active: data.is_active,
        metadata: data.metadata,
      },
    });

    const dto = updated as unknown as any;
    dto.price_cents = dto.price;
    dto.dimensions = dto.size;
    return dto as FulfillmentProductVariantDTO;
  }

  /**
   * Deletes a product if no orders reference it.
   */
  public static async deleteProduct(
    arg1: string,
    arg2?: string
  ): Promise<any> {
    let productId: string;
    let studioId: string | undefined;

    if (typeof arg2 === 'string') {
      if (arg1.startsWith('studio_') || (!arg2.startsWith('studio_') && (arg2.startsWith('prod_') || !arg1.startsWith('prod_')))) {
        studioId = arg1;
        productId = arg2;
      } else {
        productId = arg1;
        studioId = arg2;
      }
    } else {
      productId = arg1;
    }

    if (studioId) {
      const existing = await prisma.fulfillmentProduct.findFirst({
        where: { id: productId, studio_id: studioId },
      });
      if (!existing) {
        throw new Error(`Product '${productId}' not found in studio.`);
      }
    }

    const orderItemCount = await prisma.fulfillmentOrderItem.count({
      where: { product_id: productId },
    });

    if (orderItemCount > 0) {
      await prisma.fulfillmentProduct.update({
        where: { id: productId },
        data: { is_active: false },
      });
      return true;
    }

    await prisma.fulfillmentProduct.delete({
      where: { id: productId },
    });

    return true;
  }

  /**
   * Deletes a variant from a product.
   */
  public static async deleteVariant(
    arg1: string,
    arg2?: string
  ): Promise<any> {
    let variantId: string;
    let studioId: string | undefined;

    if (typeof arg2 === 'string') {
      if (arg1.startsWith('studio_') || (!arg2.startsWith('studio_') && (arg2.startsWith('var_') || !arg1.startsWith('var_')))) {
        studioId = arg1;
        variantId = arg2;
      } else {
        variantId = arg1;
        studioId = arg2;
      }
    } else {
      variantId = arg1;
    }

    if (studioId) {
      const existing = await prisma.fulfillmentProductVariant.findFirst({
        where: { id: variantId, studio_id: studioId },
      });
      if (!existing) {
        throw new Error(`Variant '${variantId}' not found in studio.`);
      }
    }

    await prisma.fulfillmentProductVariant.delete({
      where: { id: variantId },
    });

    return true;
  }

  /**
   * Seeds standard 5 studio default fulfillment products.
   */
  public static async seedDefaultProducts(studioId: string): Promise<FulfillmentProductDTO[]> {
    const count = await prisma.fulfillmentProduct.count({ where: { studio_id: studioId } });
    if (count > 0) {
      return this.listProducts(studioId);
    }

    const defaults: any[] = [
      {
        name: 'Fine Art Archival Prints',
        description: 'Lustre archival gallery prints on 300gsm paper.',
        type: FulfillmentProductType.PRINTS,
        product_type: FulfillmentProductType.PRINTS,
        is_digital: false,
        base_price: 2500,
        currency: 'USD',
        variants: [
          { name: '4x6" Print', size: '4x6', price: 1000 },
          { name: '5x7" Print', size: '5x7', price: 1500 },
          { name: '8x10" Archival Print', size: '8x10', price: 2500 },
          { name: '11x14" Gallery Print', size: '11x14', price: 4500 },
        ],
      },
      {
        name: 'Heirloom Flush Mount Album',
        description: 'Premium leather-bound album with seamless layflat spreads.',
        type: FulfillmentProductType.PHOTO_BOOK,
        product_type: FulfillmentProductType.PHOTO_BOOK,
        is_digital: false,
        base_price: 45000,
        currency: 'USD',
        variants: [
          { name: '8x8" 20-Page Album', size: '8x8', price: 35000 },
          { name: '10x10" 20-Page Album', size: '10x10', price: 45000 },
          { name: '12x12" 30-Page Master Album', size: '12x12', price: 65000 },
        ],
      },
      {
        name: 'Gallery Canvas Wrap',
        description: 'Museum grade 1.5" solid wood frame stretched canvas.',
        type: FulfillmentProductType.CANVAS,
        product_type: FulfillmentProductType.CANVAS,
        is_digital: false,
        base_price: 15000,
        currency: 'USD',
        variants: [
          { name: '16x20" Canvas Wrap', size: '16x20', price: 15000 },
          { name: '20x30" Canvas Wrap', size: '20x30', price: 22000 },
          { name: '24x36" Signature Canvas', size: '24x36', price: 30000 },
        ],
      },
      {
        name: 'Handcrafted Framed Fine Art Print',
        description: 'Custom framed print with museum glass and acid-free matting.',
        type: FulfillmentProductType.FRAMED_PRINT,
        product_type: FulfillmentProductType.FRAMED_PRINT,
        is_digital: false,
        base_price: 18000,
        currency: 'USD',
        variants: [
          { name: '8x10 Framed Print', size: '8x10', price: 18000 },
          { name: '11x14 Framed Print', size: '11x14', price: 26000 },
          { name: '16x20 Framed Print', size: '16x20', price: 38000 },
        ],
      },
      {
        name: 'High-Res Digital Download Collection',
        description: 'Complete set of edited high-resolution digital files with print release.',
        type: FulfillmentProductType.DIGITAL_DOWNLOAD,
        product_type: FulfillmentProductType.DIGITAL_DOWNLOAD,
        is_digital: true,
        base_price: 10000,
        currency: 'USD',
        delivery_method: 'Instant Cloud Download',
      },
    ];

    for (const d of defaults) {
      await this.createProduct(studioId, d);
    }

    return this.listProducts(studioId);
  }

  /**
   * Seeds standard studio default fulfillment products if empty.
   */
  public static async seedDefaultsIfEmpty(studioId: string): Promise<FulfillmentProductDTO[]> {
    return this.seedDefaultProducts(studioId);
  }
}
