import { Injectable } from '@nestjs/common';
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
   * Obtiene los datos de buildings desde la API externa de SimCompanies
   * @returns Promise con los datos de los edificios
   */
  private async fetchBuildingsFromAPI() {
    try {
      const url = 'https://www.simcompanies.com/api/v2/companies/me/buildings/';

      // Obtener los headers necesarios para la petición
      const headers = await this.authService.getHeaderWithValidCookie();

      // Agregar timestamp actual
      headers['x-prot'] = 'b26059eb62ca4f2691eb13f6e8ec93a4';
      headers['x-ts'] = '1751842560596';

      // Hacer la petición HTTP usando firstValueFrom para convertir Observable a Promise
      const response = await firstValueFrom(
        this.httpService.get<BuildingEntity[]>(url, { headers }),
      );

      // Filtrar solo los edificios que son Oficinas de Ventas (category = "sales")
      const restaurants = response.data
        .filter(
          (building: BuildingEntity) =>
            building.category === 'sales' && building.kind === 'B',
        )
        .map((building) => {
          // Retornar solo los campos necesarios
          return {
            id: building.id,
            name: building.name,
            size: building.size,
          };
        });

      return restaurants;
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError;
        console.log(axiosError.request);

        throw new Error(
          `Error fetching buildings: ${axiosError.message} - ${axiosError.response?.status}`,
        );
      }
      // Type guard para Error genérico
      if (error instanceof Error) {
        throw new Error(`Failed to fetch buildings: ${error.message}`);
      }

      // Para cualquier otro tipo de error
      throw new Error('Failed to fetch buildings: Unknown error');
    }
  }

  /**
   * Sincroniza los edificios obtenidos de la API con la base de datos
   * @returns Promise con los edificios sincronizados
   */
  public async syncBuildingsFromAPI() {
    const buildingsFromAPI = await this.fetchBuildingsFromAPI();

    // Guardar o actualizar los edificios en la base de datos
    const savedBuildings: BuildingEntity[] = [];

    for (const buildingData of buildingsFromAPI) {
      const existingBuilding = await this.getBuildingById(buildingData.id);

      if (existingBuilding) {
        // Actualizar edificio existente
        await this.buildingRepository.update(buildingData.id, buildingData);
        const updatedBuilding = await this.getBuildingById(buildingData.id);

        if (updatedBuilding) {
          savedBuildings.push(updatedBuilding);
        }
      } else {
        // Crear nuevo edificio
        const newBuilding = await this.saveBuilding(buildingData);
        savedBuildings.push(newBuilding);
      }
    }

    return {
      success: true,
      message: 'Edificios sincronizados correctamente',
      count: savedBuildings.length,
    };
  }
}
