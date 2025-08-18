import {
  Injectable,
  BadGatewayException,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import { BuildingEntity } from '../entities/building.entity';
import { AuthService } from '../../auth/services/auth.service';

@Injectable()
export class BuildingService {
  constructor(
    @InjectRepository(BuildingEntity)
    private readonly buildingRepository: Repository<BuildingEntity>,
    private readonly httpService: HttpService,
    private readonly authService: AuthService,
  ) {}

  // ... (resto del código igual que el original)

  /**
   * Guarda un solo edificio/restaurante
   * @param data - Datos del edificio a guardar
   * @returns Promise con la entidad guardada
   */
  private async saveBuilding(data: BuildingEntity): Promise<BuildingEntity> {
    const building = this.buildingRepository.create(data);
    return await this.buildingRepository.save(building);
  }

  /**
   * Obtiene un edificio por su ID
   * @param id - ID del edificio
   * @returns Promise con el edificio encontrado o null
   */
  private async getBuildingById(id: number): Promise<BuildingEntity | null> {
    return await this.buildingRepository.findOne({ where: { id } });
  }

  /**
   * Obtiene todos los edificios de la base de datos
   * @returns Promise con la lista de todos los edificios
   */
  public async getAllBuildings(): Promise<BuildingEntity[]> {
    return await this.buildingRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Obtiene un edificio específico por su ID con sus estadísticas relacionadas
   * @param id - ID del edificio
   * @returns Promise con el edificio encontrado o null
   */
  public async getBuildingByIdWithStats(
    id: number,
  ): Promise<BuildingEntity | null> {
    return await this.buildingRepository.findOne({
      where: { id },
      relations: ['restaurantStats'],
      order: {
        restaurantStats: { datetime: 'DESC' },
      },
    });
  }

  /**
   * Obtiene los datos de los edificos desde la API de SimCompanies
   * @returns Promise con los datos de los edificios
   */
  private async fetchBuildingsFromAPI() {
    const url = 'https://www.simcompanies.com/api/v2/companies/me/buildings/';
    // Obtener los headers necesarios para la petición
    const headers = await this.authService.getHeaderWithValidCookie();
    // Agregar timestamp actual
    headers['x-prot'] = 'e4a1c87287a24ceefcac11950b995e82';
    headers['x-ts'] = '1755541009353';

    try {
      const response = await firstValueFrom(
        this.httpService.get<BuildingEntity[]>(url, { headers }),
      );

      const restaurants = response.data
        .filter((building: BuildingEntity) => building.category === 'sales')
        .map((building) => {
          return {
            id: building.id,
            name: building.name,
            size: building.size,
            kind: building.kind,
            cost: building.cost,
          };
        });
      return restaurants;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError;
        // Si hay respuesta del servidor remoto
        if (axiosError.response) {
          throw new BadGatewayException({
            message: 'Error al obtener edificios desde SimCompanies',
            status: axiosError.response.status,
            details: axiosError.message,
          });
        }
        // Si no hay respuesta (problema de red, timeout, etc)
        throw new ServiceUnavailableException({
          message: 'No se pudo conectar con SimCompanies',
          details: axiosError.message,
        });
      }
      if (error instanceof Error) {
        throw new HttpException(
          {
            message: 'Error inesperado al obtener edificios',
            details: error.message,
          },
          500,
        );
      }
      throw new HttpException(
        {
          message: 'Error desconocido al obtener edificios',
        },
        500,
      );
    }
  }

  /**
   * Sincroniza los edificios obtenidos de la API con la base de datos
   * @returns Promise con los edificios sincronizados
   */
  public async syncBuildingsFromAPI() {
    const buildingsFromAPI = await this.fetchBuildingsFromAPI();

    const created: { id: number; name: string }[] = [];
    const updated: { id: number; name: string }[] = [];

    for (const buildingData of buildingsFromAPI) {
      const existingBuilding = await this.getBuildingById(buildingData.id);

      if (existingBuilding) {
        // Actualizar edificio existente
        await this.buildingRepository.update(buildingData.id, buildingData);
        const updatedBuilding = await this.getBuildingById(buildingData.id);

        if (updatedBuilding) {
          updated.push({ id: updatedBuilding.id, name: updatedBuilding.name });
        }
      } else {
        // Crear nuevo edificio
        const newBuilding = await this.saveBuilding(buildingData);
        created.push({ id: newBuilding.id, name: newBuilding.name });
      }
    }

    return {
      success: true,
      message: 'Sincronización completada',
      total: created.length + updated.length,
      creados: created,
      actualizados: updated,
    };
  }
}
