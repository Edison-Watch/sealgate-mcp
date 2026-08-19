import { globalConfig } from "@/config";

console.log("Hello from Bun-Template!");
console.log(`Config loaded: ${globalConfig.exampleParent.exampleChild}`);
console.log(`Running on: ${globalConfig.runningOn}`);
