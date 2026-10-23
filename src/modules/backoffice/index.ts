// Modulo: backoffice (Componente C-10: BackofficeModule)
// Rastreabilidade: ISO/IEC/IEEE 12207:2021, AC-5, AC-8, ADR-003, TASK-6, TASK-7, TASK-13
export const MODULE_NAME = "backoffice";
export * from "./film-schema";
export * from "./film-service";
export * from "./room-schema";
export * from "./room-service";
export * from "./session-schema";
export * from "./session-service";
export {
  UserService,
  createUserSchema,
  updateUserSchema,
  UserNotFoundError,
  EmailAlreadyInUseError,
  SelfInactivationError,
  InvalidRoleAssignmentError,
} from "@/modules/auth";
