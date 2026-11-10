import {
  Customer,
  Barber,
  Service,
  Appointment,
  ScheduleBlock,
  ShopSettings,
  UserProfile,
} from '../src/types/index.js';

/**
 * Data Access Layer (DAL) / Repository Interface
 *
 * This contract decouples the business rules (server/business.ts)
 * and route handlers (server.ts / Workers handlers) from the underlying storage mechanism.
 *
 * Implementations:
 * 1. JsonFileDatabase (current Node.js / database.json storage)
 * 2. D1DatabaseRepository (future Cloudflare D1 SQL storage)
 */
export interface IDataRepository {
  // Customers
  getCustomers(): Customer[] | Promise<Customer[]>;
  getCustomerById(id: string): Customer | undefined | Promise<Customer | undefined>;
  getCustomerByWhatsapp(whatsapp: string): Customer | undefined | Promise<Customer | undefined>;
  saveCustomer(customer: Customer): Customer | Promise<Customer>;
  deleteCustomer(id: string): boolean | Promise<boolean>;

  // Barbers
  getBarbers(): Barber[] | Promise<Barber[]>;
  getBarberById(id: string): Barber | undefined | Promise<Barber | undefined>;
  saveBarber(barber: Barber): Barber | Promise<Barber>;

  // Services
  getServices(): Service[] | Promise<Service[]>;
  getServiceById(id: string): Service | undefined | Promise<Service | undefined>;
  saveService(service: Service): Service | Promise<Service>;

  // Appointments
  getAppointments(): Appointment[] | Promise<Appointment[]>;
  getAppointmentById(id: string): Appointment | undefined | Promise<Appointment | undefined>;
  saveAppointment(appointment: Appointment): Appointment | Promise<Appointment>;
  deleteAppointment(id: string): boolean | Promise<boolean>;

  // Blocks
  getBlocks(): ScheduleBlock[] | Promise<ScheduleBlock[]>;
  saveBlock(block: ScheduleBlock): ScheduleBlock | Promise<ScheduleBlock>;
  deleteBlock(id: string): boolean | Promise<boolean>;

  // Settings
  getSettings(): ShopSettings | Promise<ShopSettings>;
  updateSettings(settings: Partial<ShopSettings>): ShopSettings | Promise<ShopSettings>;

  // Users
  getUsers(): UserProfile[] | Promise<UserProfile[]>;
}
