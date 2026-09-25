export class StaffProfileDto {
  firstName!: string;
  secondName!: string | null;
  lastName!: string;
  secondLastName!: string | null;
  email!: string;
  role!: string;
  permissions!: string[];
}
