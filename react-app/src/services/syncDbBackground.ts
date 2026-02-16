// services/backgroundSync.ts
import { dbSyncService } from './syncDb';
import { indexedDbService } from './indexedDb';
import { uiLog } from '../webhook/client/uiDebug';

class BackgroundSyncService {
  private syncInterval: number | null = null;
  private readonly SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly STORAGE_KEY = 'lastBackgroundSync';

  /**
   * Initialize background sync
   * Call this when app starts
   */
  async initialize() {
    uiLog('[BackgroundSync] Initializing...');

    // Configure sync service for background mode (no offers)
    dbSyncService.configure({ syncOffers: false });

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    
    // Check when page becomes visible again
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Set up periodic check
    this.setupPeriodicSync();
    
    // Check if we need to sync on startup
    await this.checkInitialSync();
  }

  /**
   * Handle when browser comes online
   */
  private async handleOnline() {
    uiLog('[BackgroundSync] Browser came online');
    
    // Small delay to ensure connection is stable
    setTimeout(async () => {
      await this.tryBackgroundSync('online');
    }, 5000);
  }

  /**
   * Handle when tab becomes visible again
   */
  private async handleVisibilityChange() {
    if (!document.hidden) {
      uiLog('[BackgroundSync] Tab became visible');
      await this.tryBackgroundSync('visibility');
    }
  }

  /**
   * Set up periodic background check
   */
  private setupPeriodicSync() {
    // Clear existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Check every hour if we need to sync
    this.syncInterval = window.setInterval(async () => {
      await this.tryBackgroundSync('periodic');
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Try to perform background sync if conditions are met
   */
  private async tryBackgroundSync(reason: 'online' | 'visibility' | 'periodic' | 'startup'| 'manual') {
    try {
      // Don't sync if already syncing
      if (dbSyncService.isSyncing) {
        uiLog('[BackgroundSync] Already syncing, skipping');
        return;
      }

      // Check if user is offline
      if (!navigator.onLine) {
        uiLog('[BackgroundSync] Device is offline, skipping');
        return;
      }

      // Check if we have any queries to sync
      const productKeys = await indexedDbService.getAllProductKeys();
      if (productKeys.length === 0) {
        uiLog('[BackgroundSync] No queries to sync, skipping');
        return;
      }

      // Check if enough time has passed since last sync
      const lastSync = await this.getLastSyncTime();
      const timeSinceLastSync = Date.now() - lastSync;
      
      if (timeSinceLastSync < this.SYNC_INTERVAL) {
        const hoursLeft = Math.round((this.SYNC_INTERVAL - timeSinceLastSync) / (60 * 60 * 1000));
        uiLog(`[BackgroundSync] Last sync was ${hoursLeft}h ago, next sync in ${24 - hoursLeft}h`);
        return;
      }

      // Check battery level (if available)
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        if (battery.level < 0.15 && !battery.charging) {
          uiLog('[BackgroundSync] Battery too low, skipping');
          return;
        }
      }

      // Check data saver (if available)
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection.saveData === true) {
          uiLog('[BackgroundSync] Data saver enabled, skipping');
          return;
        }
      }

      uiLog(`[BackgroundSync] Starting background sync (reason: ${reason})`);

      // Perform sync in background without progress UI
      await dbSyncService.syncDatabase({ silent: true });

      // Save last sync time
      await this.saveLastSyncTime();

      uiLog('[BackgroundSync] Background sync completed successfully');

    } catch (error) {
      uiLog(`[BackgroundSync] Error during background sync: ${error}`);
      // Don't throw - background failures should be silent
    }
  }

  /**
   * Check if we need to sync on initial startup
   */
  private async checkInitialSync() {
    const lastSync = await this.getLastSyncTime();
    
    // If never synced, or last sync was more than 24 hours ago
    if (lastSync === 0 || Date.now() - lastSync > this.SYNC_INTERVAL) {
      uiLog('[BackgroundSync] Initial sync needed');
      
      // Wait a bit for app to stabilize
      setTimeout(async () => {
        await this.tryBackgroundSync('startup');
      }, 10000); // 10 second delay after app starts
    }
  }

  /**
   * Get last sync time from localStorage
   */
  private async getLastSyncTime(): Promise<number> {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? parseInt(stored, 10) : 0;
  }

  /**
   * Save last sync time to localStorage
   */
  private async saveLastSyncTime() {
    localStorage.setItem(this.STORAGE_KEY, Date.now().toString());
  }

  /**
   * Force a background sync (can be called manually if needed)
   */
  async forceBackgroundSync() {
    await this.tryBackgroundSync('manual');
  }
}

export const backgroundSyncService = new BackgroundSyncService();