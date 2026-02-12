// reset-cache.ts
import { indexedDbService } from "../services/indexedDb";
import { useStore } from "../store/store";

async function resetEverything() {
  console.log('🧹 Starting fresh reset...');
  
  // 1. Clear IndexedDB
  await indexedDbService.clearAll();
  console.log('✅ IndexedDB cleared');
  
  // 2. Clear Zustand memory cache
  useStore.getState().clearCache();
  console.log('✅ Zustand memory cache cleared');
  
  // 3. Clear sessionStorage
  sessionStorage.clear();
  console.log('✅ sessionStorage cleared');
  
  // 4. Clear localStorage
  localStorage.clear();
  console.log('✅ localStorage cleared');
  
  // 5. Reset session state
  useStore.getState().closeSessionExpired();
  useStore.getState().closeProduct();
  useStore.getState().clearSelectedOffers();
  useStore.getState().setQuery('');
  useStore.getState().triggerAutocompleteReset();
  
  console.log('\n✨ All caches reset! Ready for fresh start.');
}

resetEverything().catch(console.error);