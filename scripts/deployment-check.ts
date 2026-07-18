import {
  envProblems,
  loadDotEnv,
  recommendedProductionEnv,
  requiredProductionEnv,
} from "./readiness-env";

loadDotEnv();

const requiredProblems = envProblems(requiredProductionEnv);
const recommendedProblems = envProblems(recommendedProductionEnv);

if (requiredProblems.length) {
  console.error(`Deployment check failed. Required production env problems: ${requiredProblems.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("Deployment required environment check passed.");
}

if (recommendedProblems.length) {
  console.warn(`Deployment warning. Recommended production env problems: ${recommendedProblems.join(", ")}`);
}
