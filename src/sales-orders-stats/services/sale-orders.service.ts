import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import { SaleOrderEntity } from '../entities/sale-order.entity';
import { AuthService } from '../../auth/services/auth.service';

interface SyncResult {
  success: boolean;
  message: string;
  count: number;
  buildingId: number;
}

@Injectable()
export class SaleOrdersService {
  constructor(
    @InjectRepository(SaleOrderEntity)
    private readonly saleOrderRepository: Repository<SaleOrderEntity>,
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
    try {
      const url = `https://www.simcompanies.com/api/v2/companies/buildings/${buildingId}/sales-orders/`;

      // Obtener los headers necesarios para la petición
      const headers = await this.authService.getHeaderWithValidCookie();

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
   * Obtiene todas las sale orders ordenadas por fecha descendente
   * @param limit - Límite de registros a retornar (opcional)
   * @returns Promise con las sale orders
   */
  public async getAllSaleOrders(limit?: number): Promise<SaleOrderEntity[]> {
    const query = this.saleOrderRepository
      .createQueryBuilder('saleOrder')
      .orderBy('saleOrder.datetime', 'DESC');

    if (limit) {
      query.take(limit);
    }

    return await query.getMany();
  }

  /**
   * Obtiene sale orders resueltas
   * @param limit - Límite de registros a retornar (opcional)
   * @returns Promise con las sale orders resueltas
   */
  public async getResolvedSaleOrders(
    limit?: number,
  ): Promise<SaleOrderEntity[]> {
    const query = this.saleOrderRepository
      .createQueryBuilder('saleOrder')
      .where('saleOrder.resolved = :resolved', { resolved: true })
      .orderBy('saleOrder.datetime', 'DESC');

    if (limit) {
      query.take(limit);
    }

    return await query.getMany();
  }

  /**
   * Obtiene sale orders pendientes (no resueltas)
   * @param limit - Límite de registros a retornar (opcional)
   * @returns Promise con las sale orders pendientes
   */
  public async getPendingSaleOrders(
    limit?: number,
  ): Promise<SaleOrderEntity[]> {
    const query = this.saleOrderRepository
      .createQueryBuilder('saleOrder')
      .where('saleOrder.resolved = :resolved', { resolved: false })
      .orderBy('saleOrder.datetime', 'DESC');

    if (limit) {
      query.take(limit);
    }

    return await query.getMany();
  }

  /**
   * Actualiza el estado de resolved de una sale order
   * @param id - ID de la sale order
   * @param resolved - Nuevo estado resolved
   * @returns Promise con la sale order actualizada
   */
  public async updateResolvedStatus(
    id: number,
    resolved: boolean,
  ): Promise<SaleOrderEntity | null> {
    await this.saleOrderRepository.update(id, { resolved });
    return await this.getSaleOrderById(id);
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
   * Obtiene sale orders por building ID
   * @param buildingId - ID del edificio
   * @param limit - Límite de registros a retornar (opcional)
   * @returns Promise con las sale orders del edificio
   */
  public async getSaleOrdersByBuilding(
    buildingId: number,
    limit?: number,
  ): Promise<SaleOrderEntity[]> {
    const query = this.saleOrderRepository
      .createQueryBuilder('saleOrder')
      .leftJoinAndSelect('saleOrder.building', 'building')
      .where('building.id = :buildingId', { buildingId })
      .orderBy('saleOrder.datetime', 'DESC');

    if (limit) {
      query.take(limit);
    }

    return await query.getMany();
  }

  /**
   * Obtiene estadísticas de sale orders
   * @returns Promise con estadísticas básicas
   */
  public async getSaleOrdersStats() {
    const [total, resolved, pending] = await Promise.all([
      this.saleOrderRepository.count(),
      this.saleOrderRepository.count({ where: { resolved: true } }),
      this.saleOrderRepository.count({ where: { resolved: false } }),
    ]);

    return {
      total,
      resolved,
      pending,
      resolvedPercentage: total > 0 ? (resolved / total) * 100 : 0,
    };
  }
}
