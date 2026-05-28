import z from "zod";
import { BasePermission, CreateBasePermissionProps } from "./BasePermission";

export const RegistryPermissionAPIResult = z.object({
    rpid: z.int(),
    name: z.string()
})

export interface RegistryPermission extends BasePermission {}
export interface CreateRegistryPermissionProps extends CreateBasePermissionProps {}