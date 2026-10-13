declare module "virtual:macro-content" {
  export const meals: import("../lib/nutrition").Entry[]
  export const weighIns: import("../lib/nutrition").WeighIn[]
}
