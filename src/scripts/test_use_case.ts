import { getPublicSalesPageUseCase } from './src/domain/sales-pages/use-cases/get-public-sales-page-use-case';

async function run() {
  console.log("Testing getPublicSalesPageUseCase...");
  try {
    const result = await getPublicSalesPageUseCase('1e35fSpwU7dqfQQc03pf');
    console.log("Combo loaded successfully!");
    console.log("Bundle Products found:", result.bundleProducts?.length || 0);
    
    result.bundleProducts?.forEach((p, idx) => {
      console.log(`\n--- Product ${idx + 1} ---`);
      console.log(`Title: ${p.title}`);
      console.log(`Image URL: ${p.imageUrl ? p.imageUrl : 'NONE (Missing)'}`);
    });
    
  } catch (err) {
    console.error("Error executing use case:", err);
  }
}

run().catch(console.error);
