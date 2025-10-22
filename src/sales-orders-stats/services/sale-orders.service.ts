import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import { SaleOrderEntity } from '../entities/sale-order.entity';
import { AuthService } from '../../auth/services/auth.service';
import { GetAllSaleOrdersDto } from '../dtos/sales-orders.dtos';
import { BuildingService } from '../../building/services/building.service';
import { Resource } from '../entities/sale-order.entity';

interface SyncResult {
  success: boolean;
  message: string;
  count: number;
  buildingId: number;
}

export interface ResourceAnalysis {
  resource_kind: number;
  average_price: string;
  average_quality_bonus: string;
  total_orders: number;
  total_amount: number;
  min_price: string;
  max_price: string;
}

export interface ResourceStats {
  resourceKind: number;
  totalAmount: number;
  totalOrders: number;
  averageAmount: number;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
}

@Injectable()
export class SaleOrdersService {
  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly saleOrderRepository: Repository<SaleOrderEntity>,
    private readonly buildingService: BuildingService,
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Guarda un solo registro de sale order
   * @param data - Datos de la sale order a guardar
   * @returns Promise con la entidad guardada
   */
  async saveSaleOrder(data: SaleOrderEntity): Promise<SaleOrderEntity> {
    const saleOrder = this.saleOrderRepository.create({
      ...data,
      datetime: new Date(data.datetime),
    });

    return await this.saleOrderRepository.save(saleOrder);
  }

  /**
   * Guarda múltiples registros de sale orders
   * @param dataArray - Array de datos de sale orders a guardar
   * @returns Promise con array de entidades guardadas
   */
  async saveSaleOrders(
    dataArray: SaleOrderEntity[],
  ): Promise<SaleOrderEntity[]> {
    const saleOrders = dataArray.map((data) =>
      this.saleOrderRepository.create({
        ...data,
        datetime: new Date(data.datetime),
      }),
    );

    return await this.saleOrderRepository.save(saleOrders);
  }

  /**
   * Obtiene los datos de sale orders desde la API externa de SimCompanies
   * @param buildingId - ID del edificio de la oficina de ventas
   * @returns Promise con los datos de las sale orders
   */
  async fetchSaleOrdersFromAPI(buildingId: number) {
    const url = `https://www.simcompanies.com/api/v2/companies/buildings/${buildingId}/sales-orders/`;
    // Obtener los headers necesarios para la petición
    const headers = await this.authService.getHeaderWithValidCookie();
    try {
      // Hacer la petición HTTP usando firstValueFrom para convertir Observable a Promise
      const response = await firstValueFrom(
        this.httpService.get<SaleOrderEntity[]>(url, { headers }),
      );

      return response.data;
    } catch (error: unknown) {
      // Manejo de errores específico para Axios
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError;
        throw new Error(
          `Error fetching sale orders: ${axiosError.message} - ${axiosError.response?.status}`,
        );
      }
      // Type guard para Error genérico
      if (error instanceof Error) {
        throw new Error(`Failed to fetch sale orders: ${error.message}`);
      }

      // Para cualquier otro tipo de error
      throw new Error('Failed to fetch sale orders: Unknown error');
    }
  }

  /**
   * Verifica si ya existe un registro de sale order con el mismo ID
   * @param id - ID de la sale order
   * @returns Promise con el registro encontrado o null
   */
  public async getSaleOrderById(id: number): Promise<SaleOrderEntity | null> {
    return await this.saleOrderRepository.findOne({
      where: { id },
      relations: ['building'],
    });
  }

  /**
   * Obtiene las sale orders paginadas
   * @param options - Opciones de paginación y filtrado
   * @param options.page - Número de página (comenzando en 1)
   * @param options.pageSize - Cantidad de registros por página
   * @returns Promise con las sale orders paginadas y metadatos de paginación
   */
  public async getAllSaleOrders(options: GetAllSaleOrdersDto) {
    let whereClause = {};
    const { page = 1, pageSize = 10 } = options;
    const skip = (page - 1) * pageSize;

    if (options.buildingId) {
      const building = await this.buildingService.getBuildingById(
        options.buildingId,
      );
      whereClause = { building: { id: building.id } };
    }

    if (typeof options.includeResolved !== 'undefined') {
      whereClause = { ...whereClause, resolved: options.includeResolved };
    }

    if (options.dateIni && options.dateEnd) {
      const dateIni = new Date(options.dateIni.getTime() - 47 * 60 * 60 * 1000);
      const dateEnd = new Date(options.dateEnd.getTime() - 47 * 60 * 60 * 1000);

      whereClause = {
        ...whereClause,
        datetime: Between(dateIni, dateEnd),
      };
    }

    // Obtener el total de registros
    const total = await this.saleOrderRepository.count({
      where: whereClause,
    });

    // Calcular el total de páginas
    const totalPages = Math.ceil(total / pageSize);

    // Obtener los registros paginados
    const data = await this.saleOrderRepository.find({
      skip,
      take: pageSize,
      where: whereClause,
      order: {
        datetime: 'DESC',
      },
    });

    return {
      data,
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  /**
   * Sincroniza las sale orders desde la API con la base de datos
   * @param buildingId - ID del edificio de la oficina de ventas
   * @returns Promise con el resultado de la sincronización
   */
  public async syncSaleOrdersFromAPI(buildingId: number): Promise<SyncResult> {
    try {
      // Obtener datos de la API
      const saleOrdersFromAPI = await this.fetchSaleOrdersFromAPI(buildingId);

      // Guardar o actualizar los registros en la base de datos
      const savedOrders: SaleOrderEntity[] = [];

      for (const orderData of saleOrdersFromAPI) {
        const existingOrder = await this.getSaleOrderById(orderData.id);

        if (existingOrder) {
          // Determinar si la orden ahora está resuelta
          const isResolved =
            orderData.qualityBonus !== undefined &&
            orderData.speedBonus !== undefined &&
            Array.isArray(orderData.resources) &&
            orderData.resources.length > 0;

          // Actualizar registro existente
          await this.saleOrderRepository.update(orderData.id, {
            ...orderData,
            resolved: isResolved,
            datetime: new Date(orderData.datetime),
          });

          const updatedOrder = await this.getSaleOrderById(orderData.id);
          if (updatedOrder) {
            savedOrders.push(updatedOrder);
          }
        } else {
          // Determinar si la orden nueva está resuelta
          const isResolved =
            orderData.qualityBonus !== undefined &&
            orderData.speedBonus !== undefined &&
            Array.isArray(orderData.resources) &&
            orderData.resources.length > 0;

          // Crear nuevo registro con la relación al building
          const newOrder = await this.saveSaleOrder({
            ...orderData,
            resolved: isResolved,
            building: { id: buildingId },
          } as SaleOrderEntity);
          savedOrders.push(newOrder);
        }
      }

      return {
        success: true,
        message: 'Sale orders sincronizadas correctamente',
        count: savedOrders.length,
        buildingId,
      };
    } catch (error) {
      throw new Error(
        `Error de sincronización de sale orders: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Sincroniza las sale orders de todos los edificios con la base de datos
   * @param buildingIds - Array de IDs de edificios (oficinas de ventas) a sincronizar
   * @returns Promise con el resultado de la sincronización
   */
  public async syncAllSaleOrdersFromAPI(buildingIds: number[]) {
    const results: SyncResult[] = [];
    let totalCount = 0;

    for (const buildingId of buildingIds) {
      try {
        const result = await this.syncSaleOrdersFromAPI(buildingId);
        results.push(result);
        totalCount += result.count;
      } catch (error) {
        results.push({
          success: false,
          message: `Error sincronizando edificio ${buildingId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          count: 0,
          buildingId,
        });
      }
    }

    return {
      success: true,
      message: 'Sincronización completada',
      totalCount,
      results,
    };
  }

  /**
   * Obtiene el promedio de precios por recurso en una fecha específica
   * @param date - Fecha en formato YYYY-MM-DD (fecha de resolución real)
   * @returns Promise con el promedio de precios por recurso incluyendo bono de calidad
   */
  public async getAveragePricesByDate(date: string) {
    // Primero obtener el total de sale orders del día
    // Ajustamos la fecha restando 47 horas para encontrar las órdenes que se resolvieron en la fecha solicitada
    const totalOrdersQuery = `
      SELECT COUNT(*) as total_sale_orders_analyzed
      FROM sale_orders 
      WHERE (datetime + INTERVAL '47 hours')::date = $1
        AND resolved = true 
        AND jsonb_array_length(resources) > 0
        AND "qualityBonus" IS NOT NULL
    `;

    const totalOrdersResult: [{ total_sale_orders_analyzed: string }] =
      await this.saleOrderRepository.query(totalOrdersQuery, [date]);

    const totalSaleOrdersAnalyzed = parseInt(
      totalOrdersResult[0].total_sale_orders_analyzed,
    );

    const query = `
      SELECT
        (resource_data->>'kind')::integer as resource_kind,
        ROUND(AVG((resource_data->>'price')::numeric), 2) as average_price,
        ROUND(AVG(so."qualityBonus"), 4) as average_quality_bonus,
        COUNT(*) as total_orders,
        SUM((resource_data->>'amount')::integer) as total_amount,
        MIN((resource_data->>'price')::numeric) as min_price,
        MAX((resource_data->>'price')::numeric) as max_price
      FROM sale_orders so,
           jsonb_array_elements(so.resources) as resource_data
      WHERE (so.datetime + INTERVAL '47 hours')::date = $1
        AND so.resolved = true
        AND jsonb_array_length(so.resources) > 0
        AND so."qualityBonus" IS NOT NULL
      GROUP BY (resource_data->>'kind')::integer
      ORDER BY resource_kind
    `;

    const resourceData: ResourceAnalysis[] =
      await this.saleOrderRepository.query(query, [date]);

    return {
      date,
      total_sale_orders_analyzed: totalSaleOrdersAnalyzed,
      resources: resourceData,
    };
  }

  /**
   * Obtiene estadísticas de órdenes de venta para una fecha o un rango de fechas
   * @param dateIni - Fecha de inicio del rango
   * @param dateEnd - Fecha de fin del rango (opcional, si no se proporciona se usa dateIni)
   * @param buildingId - ID del edificio (opcional)
   * @returns Estadísticas de las órdenes de venta incluyendo artículos vendidos por tipo
   */
  public async getSaleOrdersStatsByDate(
    dateIni: Date,
    dateEnd?: Date,
    buildingId?: number,
  ) {
    // Si no se proporciona dateEnd, usar dateIni como rango de un día
    const endDate = dateEnd || new Date(dateIni);
    endDate.setHours(23, 59, 59, 999);

    // Objeto para almacenar todas las órdenes
    const allOrders: SaleOrderEntity[] = [];
    let currentPage = 1;
    const pageSize = 100; // Tamaño de página para procesar en lotes
    let hasMorePages = true;

    // Obtener todas las órdenes usando paginación
    while (hasMorePages) {
      const result = await this.getAllSaleOrders({
        dateIni,
        dateEnd: endDate,
        buildingId,
        page: currentPage,
        pageSize,
        includeResolved: true,
      });

      allOrders.push(...result.data);
      hasMorePages = currentPage < result.totalPages;
      currentPage++;
    }

    // Calcular estadísticas generales
    const totalOrders = allOrders.length;
    const totalSearchCost = allOrders.reduce(
      (acc, order) => acc + order.searchCost,
      0,
    );
    const averageSearchCost =
      totalOrders > 0 ? totalSearchCost / totalOrders : 0;

    // Agrupar y contar artículos por tipo de recurso
    const resourceStats = new Map<
      number,
      {
        resourceKind: number;
        totalAmount: number;
        totalOrders: number;
        averageAmount: number;
        totalPrice: number;
        averagePrice: number;
        minPrice: number;
        maxPrice: number;
        orderIds: Set<number>; // Para rastrear órdenes únicas por recurso
      }
    >();

    allOrders.forEach((order) => {
      if (order.resources && Array.isArray(order.resources)) {
        order.resources.forEach((resource: Resource) => {
          const kind = resource.kind;
          const amount = resource.amount || 0;
          const price = resource.price || 0;

          if (resourceStats.has(kind)) {
            // Si el recurso ya existe, actualizar las estadísticas
            const stats = resourceStats.get(kind)!;
            stats.totalAmount += amount;

            // Actualizar estadísticas de precio
            stats.totalPrice += price;
            stats.minPrice = Math.min(stats.minPrice, price);
            stats.maxPrice = Math.max(stats.maxPrice, price);

            // Solo contar la orden si es la primera vez que la vemos para este recurso
            if (!stats.orderIds.has(order.id)) {
              stats.orderIds.add(order.id);
              stats.totalOrders += 1;
            }

            // Recalcular promedios
            stats.averageAmount = stats.totalAmount / stats.totalOrders;
            stats.averagePrice = stats.totalPrice / stats.totalOrders;
          } else {
            // Si es la primera vez que vemos este recurso, crearlo
            const orderIds = new Set<number>();
            orderIds.add(order.id);

            resourceStats.set(kind, {
              resourceKind: kind,
              totalAmount: amount,
              totalOrders: 1,
              averageAmount: amount,
              totalPrice: price,
              averagePrice: price,
              minPrice: price,
              maxPrice: price,
              orderIds,
            });
          }
        });
      }
    });

    // Convertir el Map a un array ordenado por resourceKind y formatear los valores
    const resourcesSold: ResourceStats[] = Array.from(resourceStats.values())
      .map((stats) => ({
        resourceKind: stats.resourceKind,
        totalAmount: stats.totalAmount,
        totalOrders: stats.totalOrders,
        averageAmount: parseFloat(stats.averageAmount.toFixed(2)),
        averagePrice: parseFloat(stats.averagePrice.toFixed(2)),
        minPrice: parseFloat(stats.minPrice.toFixed(2)),
        maxPrice: parseFloat(stats.maxPrice.toFixed(2)),
      }))
      .sort((a, b) => a.resourceKind - b.resourceKind);

    return {
      dateRange: {
        start: dateIni.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
      },
      buildingId: buildingId || null,
      totalOrders,
      totalResolvedOrders: allOrders.filter((o) => o.resolved).length,
      averageSearchCost: parseFloat(averageSearchCost.toFixed(2)),
      totalSearchCost: parseFloat(totalSearchCost.toFixed(2)),
      resourcesSold,
    };
  }
}
